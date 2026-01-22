import { Request, Response, Router } from "express";
import { compile } from "morgan";
import { IUserDocument, UserDocument } from "../models/Document";
import upload from "../middleware/multer-config";
import { validateToken } from "../middleware/validateToken";
import { CustomRequest } from "../middleware/validateToken";
import { randomUUID } from "crypto";
import { User } from "../models/User";

const router: Router = Router();

router.get(
    "/api/documents",
    validateToken,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as CustomRequest).user!.id;

            // Return documents where the user is owner, is listed in editors, or the document is public
            const documents: IUserDocument[] | null = await UserDocument.find({
                $or: [
                    { owner: userId },
                    { editors: userId },
                    { isVisibleNonAuth: true },
                ],
            }).populate("owner", "username").populate("editors", "username");

            if (!documents) {
                return res.status(404).json({ message: "No documents found" });
            }

            res.status(200).json(documents);
            console.log("Images fetched successfully from database");
        } catch (error: any) {
            console.error(`Error while fetching a file: ${error}`);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
);
/*
router.get("/api/documents/:id", async (req: Request, res: Response) => {
    try {
        const document: IImage | null = await Image.findById(req.params.id)

        if (!document) {
            return res.status(404).json({ message: 'Image not found' })
        }
        res.status(200).json(document)
        console.log('Image fetched successfully from database')

    } catch (error: any) {
        console.error(`Error while fetching a file: ${error}`)
        return res.status(500).json({ message: 'Internal server error' })
    }
})*/

router.post(
    "/api/upload",
    validateToken,
    upload.single("file"),
    async (req: CustomRequest, res: Response) => {
        try {
            console.log("Upload request received:");
            console.log("Uploaded file:", req.file);
            console.log("Uploaded body:", req.body);

            if (!req.file && !req.body.content) {
                return res.status(400).json({ message: "No file or text uploaded" });
            }

            // Normalize inputs
            const name: string =
                req.body.name?.toString().trim() ||
                req.file?.originalname ||
                "Untitled document";
            const content: string = req.body.content ?? "";
            const isPublicBool: boolean =
                req.body.isPublic === "true" || req.body.isPublic === true;
            const documentId: string | undefined = req.body.documentId || undefined;

            const editorsArray: string[] = (req.body.editors || "")
                .toString()
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean);

            const editorUsers = await User.find({
                username: { $in: editorsArray },
            }).select("_id"); //this finds users ids based on user submitted names

            const editorIds = editorUsers.map(u => u._id)


            const baseUrl = process.env.APP_URL ?? "http://localhost:3000";

            // If documentId provided, attempt to update (owner or editor)
            if (documentId) {
                const updatedDoc = await UserDocument.findOneAndUpdate(
                    {
                        _id: documentId,
                        $or: [{ owner: req.user!.id }, { editors: req.user!.id }],
                    },
                    {
                        $set: {
                            name: name || "Untitled",
                            content: content || "",
                            isVisibleNonAuth: isPublicBool,
                            editors: editorIds,
                            filepath: req.file?.path ?? null,
                        },
                    },
                    { new: true },
                );

                if (!updatedDoc)
                    return res
                        .status(404)
                        .json({
                            message: "Document not found or you are not the owner/editor",
                        });

                return res.json({ message: "Document updated", document: updatedDoc });
            }

            // Otherwise create new document
            const shareToken = randomUUID();
            const newDoc = new UserDocument({
                name: name || "Untitled",
                content: content || "",
                owner: req.user!.id,
                isVisibleNonAuth: isPublicBool,
                editors: editorIds,
                filepath: req.file?.path ?? null,
                shareToken: shareToken,
                readOnlyLink: `${baseUrl}/documents/${shareToken}/readonly`,
                createdAt: new Date(),
            });

            await newDoc.save();
            console.log("File uploaded and saved in the database");
            return res.status(201).json({
                message: "File uploaded and saved in the database",
                readOnlyLink: newDoc.readOnlyLink,
            });
        } catch (error: any) {
            console.error(`Error while uploading file: ${error}`);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
);

router.patch("/api/documents/:id", async (req: Request, res: Response) => {
    try {
        const document: IUserDocument | null = await UserDocument.findById(
            req.params.id,
        );

        if (!document) {
            return res.status(404).json({ message: "Image not found" });
        }

        res.status(200).json({ message: "Image updated" });
        console.log("Image updated");
    } catch (error: any) {
        console.error(`Error while updating a file: ${error}`);
        return res.status(500).json({ message: "Internal server error" });
    }
});

router.post(
    "/api/documents/:id/lock",
    validateToken,
    async (req: CustomRequest, res: Response) => {
        try {
            const docId = req.params.id;
            const userId = req.user!.id;

            const doc = await UserDocument.findById(docId);
            if (!doc) return res.status(404).json({ message: "Document not found" });

            // If the document is locked by the same user, toggle unlock
            if (doc.lockedBy && doc.lockedBy.toString() === userId) {
                doc.lockedBy = undefined;
                await doc.save();
                return res.json({ success: true, locked: false });
            }

            // If locked by another user, indicate conflict
            if (doc.lockedBy) {
                return res
                    .status(409)
                    .json({ success: false, message: "Locked by another user" });
            }

            // Otherwise lock it for the requesting user
            doc.lockedBy = userId;
            await doc.save();
            return res.json({ success: true, locked: true });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
);

// GET lock status without modifying it
router.get(
    "/api/documents/:id/lock",
    validateToken,
    async (req: CustomRequest, res: Response) => {
        try {
            const docId = req.params.id;
            const doc = await UserDocument.findById(docId).populate(
                "lockedBy",
                "username",
            );
            if (!doc) return res.status(404).json({ message: "Document not found" });

            const locked = !!doc.lockedBy;
            const lockedBy = doc.lockedBy
                ? {
                    id: (doc.lockedBy as any)._id,
                    username: (doc.lockedBy as any).username,
                }
                : null;
            return res.json({ locked, lockedBy });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
);

router.get(
    "/api/publicDocuments",
    async (req: Request, res: Response) => {
            try {
                // Return documents that are marked public (no auth required)
                const documents: IUserDocument[] | null = await UserDocument.find({
                isVisibleNonAuth: true
                }).populate("owner", "username").populate("editors", "username");

            if (!documents) {
                return res.status(404).json({ message: "No documents found" });
            }

            res.status(200).json(documents);
            console.log("Images fetched successfully from database");
        } catch (error: any) {
            console.error(`Error while fetching a file: ${error}`);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
);

export default router;
