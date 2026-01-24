import { Request, Response, Router } from "express";
import { IUserDocument, UserDocument } from "../models/Document";
import upload from "../middleware/multer-config";
import { validateToken } from "../middleware/validateToken";
import { CustomRequest } from "../middleware/validateToken";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import path from "path";
import fs from "fs";

const router: Router = Router();

router.get("/documents", validateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as CustomRequest).user!.id;

    // Return documents where the user is owner, is listed in editors, or the document is public
    // Additionally: if the document is trashed, only the owner should see it. Non-owners must not see trashed items.
    const documents: IUserDocument[] | null = await UserDocument.find({
      $and: [
        {
          $or: [
            { owner: userId },
            { editors: userId },
            { isVisibleNonAuth: true },
          ],
        },
        {
          $or: [{ owner: userId }, { trash: { $ne: true } }],
        },
      ],
    })
      .populate("owner", "username")
      .populate("editors", "username");

    if (!documents) {
      return res.status(404).json({ message: "No documents found" });
    }

    res.status(200).json(documents);
    console.log("Images fetched successfully from database");
  } catch (error: any) {
    console.error(`Error while fetching a file: ${error}`);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post(
  "/upload",
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

      const editorIds = editorUsers.map((u) => u._id);

      const serverPort = process.env.PORT ?? "3001";
      const serverBase =
        process.env.SERVER_URL ??
        process.env.APP_URL ??
        `http://localhost:${serverPort}`;

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
          return res.status(404).json({
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
        readOnlyLink: `${serverBase}/documents/${shareToken}/readonly`,
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

router.patch("/documents/:id", async (req: Request, res: Response) => {
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

// Rename a document (owner or editor)
router.post(
  "/documents/:id/rename",
  validateToken,
  async (req: CustomRequest, res: Response) => {
    try {
      const docId = req.params.id;
      const newName = req.body.name;
      if (!newName) return res.status(400).json({ message: "Missing name" });

      const userId = req.user!.id;

      const updated = await UserDocument.findOneAndUpdate(
        { _id: docId, $or: [{ owner: userId }, { editors: userId }] },
        { $set: { name: newName } },
        { new: true },
      );

      if (!updated)
        return res
          .status(404)
          .json({ message: "Document not found or no permission" });

      return res.json({ message: "Renamed", document: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
);

router.post(
  "/documents/:id/lock",
  validateToken,
  async (req: CustomRequest, res: Response) => {
    try {
      const docId = req.params.id;
      const userId = req.user!.id;
      const now = new Date();

      const doc = await UserDocument.findById(docId);
      if (!doc) return res.status(404).json({ message: "Document not found" });

      if ( // check if document is locked by another user and lock has not expired
        doc.lockedBy &&
        doc.lockExpiresAt &&
        doc.lockExpiresAt > now &&
        doc.lockedBy.toString() !== userId
      ) {
        return res.status(409).json({
          locked: true,
          lockedBy: doc.lockedBy,
        });
      }

      doc.lockedBy = userId;
      doc.lockExpiresAt = new Date(now.getTime() + 2 * 60 * 1000); // 2 min
      await doc.save();

      return res.json({ locked: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
);

// This api is called during document modification in order to keep lock alive
router.post( 
  "/documents/:id/renewLock",
  validateToken,
  async (req: CustomRequest, res: Response) => {
    const doc = await UserDocument.findById(req.params.id)
    if (!doc) return res.status(404).json({ message: "Not found" })

    if (doc.lockedBy?.toString() !== req.user!.id) {
      return res.status(403).json({ message: "Not lock owner" })
    }

    doc.lockExpiresAt = new Date(Date.now() + 2 * 60 * 1000)
    await doc.save()

    return res.json({ ok: true })
  }
)

// This api is called during document save in order to unlock the file 
router.post(
  "/documents/:id/unlock",
  validateToken,
  async (req: CustomRequest, res: Response) => {
    const doc = await UserDocument.findById(req.params.id)
    if (!doc) return res.status(404).json({ message: "Not found" })

    if (doc.lockedBy?.toString() !== req.user!.id) {
      return res.status(403).json({ message: "Not lock owner" })
    }

    doc.lockedBy = undefined
    doc.lockExpiresAt = undefined
    await doc.save()

    return res.json({ unlocked: true })
  }
)

// GET lock status without modifying it
router.get(
  "/documents/:id/lock",
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

// Move document to trash (owner or editor)
router.post(
  "/documents/:id/trash",
  validateToken,
  async (req: CustomRequest, res: Response) => {
    try {
      const docId = req.params.id;
      const userId = req.user!.id;

      const updated = await UserDocument.findOneAndUpdate(
        { _id: docId, $or: [{ owner: userId }, { editors: userId }] },
        { $set: { trash: true } },
        { new: true },
      );

      if (!updated)
        return res
          .status(404)
          .json({ message: "Document not found or no permission" });

      return res.json({ message: "Moved to trash", document: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
);

// Restore document from trash (owner or editor)
router.post(
  "/documents/:id/restore",
  validateToken,
  async (req: CustomRequest, res: Response) => {
    try {
      const docId = req.params.id;
      const userId = req.user!.id;

      const updated = await UserDocument.findOneAndUpdate(
        { _id: docId, $or: [{ owner: userId }, { editors: userId }] },
        { $set: { trash: false } },
        { new: true },
      );

      if (!updated)
        return res
          .status(404)
          .json({ message: "Document not found or no permission" });

      return res.json({ message: "Restored from trash", document: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
);

// Permanently delete a document (owner only)
router.delete(
  "/documents/:id",
  validateToken,
  async (req: CustomRequest, res: Response) => {
    try {
      const docId = req.params.id;
      const userId = req.user!.id;

      const doc = await UserDocument.findById(docId);
      if (!doc) return res.status(404).json({ message: "Document not found" });

      if (String(doc.owner) !== String(userId))
        return res
          .status(403)
          .json({ message: "Only owner can permanently delete" });

      // delete file on disk if present
      if (doc.filepath) {
        try {
          if (fs.existsSync(String(doc.filepath))) {
            await fs.promises.unlink(String(doc.filepath));
          }
        } catch (e) {
          console.error("Failed to delete file from disk", e);
        }
      }

      await UserDocument.deleteOne({ _id: docId });

      return res.json({ message: "Document permanently deleted" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
);

router.get("/publicDocuments", async (req: Request, res: Response) => {
  try {
    // Return documents that are marked public (no auth required)
    // Exclude trashed documents from public listings
    const documents: IUserDocument[] | null = await UserDocument.find({
      isVisibleNonAuth: true,
      trash: { $ne: true },
    })
      .populate("owner", "username")
      .populate("editors", "username");

    if (!documents) {
      return res.status(404).json({ message: "No documents found" });
    }

    res.status(200).json(documents);
    console.log("Images fetched successfully from database");
  } catch (error: any) {
    console.error(`Error while fetching a file: ${error}`);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Unified share endpoint: add collaborator and/or create a read-only link (owner only for both)
router.post(
  "/documents/:id/share",
  validateToken,
  async (req: CustomRequest, res: Response) => {
    try {
      const docId = req.params.id;
      const { collaborator } = req.body || {};

      const doc = await UserDocument.findById(docId);
      if (!doc) return res.status(404).json({ message: "Document not found" });

      // only owner can modify sharing
      if (doc.owner.toString() !== req.user!.id)
        return res
          .status(403)
          .json({ message: "Only owner can manage sharing" });

      const result: any = {};

      if (collaborator) {
        // find user by username
        const user = await User.findOne({
          $or: [{ username: collaborator }, { email: collaborator }],
        }).select("_id");
        if (!user)
          return res.status(404).json({ message: "Collaborator not found" });
        const uid = user._id;
        if (!doc.editors) doc.editors = [] as any;
        if (
          !doc.editors.map((e: any) => e.toString()).includes(uid.toString())
        ) {
          doc.editors.push(uid as any);
          result.collaborator = collaborator;
        }
      }

      if (collaborator) {
        await doc.save();
        return res.json({ message: "OK", collaborator });
      }

      return res.json({ message: "OK" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
);

// Get a document by id with backend permission checks (optional auth)
router.get("/documents/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    // optional token parsing
    let userId: string | null = null;
    const auth = req.header("authorization");
    if (auth) {
      const token = auth.split(" ")[1];
      if (token) {
        try {
          const payload: any = jwt.verify(token, process.env.SECRET as string);
          userId = payload.id || payload._id || payload.sub || null;
        } catch (e) {
          // ignore invalid token, treat as unauthenticated
          userId = null;
        }
      }
    }

    const doc = await UserDocument.findById(id)
      .populate("owner", "username")
      .populate("editors", "username");
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const isPublic = !!doc.isVisibleNonAuth;
    const isOwner =
      userId &&
      doc.owner &&
      String((doc.owner as any)._id || (doc.owner as any)) === String(userId);
    const editorsArr: any[] = (doc.editors || []).map((e: any) =>
      e._id ? String(e._id) : String(e),
    );
    const isEditor = userId && editorsArr.includes(String(userId));

    // If the document is trashed, only the owner may view it
    if (doc.trash && !isOwner) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const canView = isPublic || Boolean(isOwner) || Boolean(isEditor);
    if (!canView) return res.status(403).json({ message: "Forbidden" });

    const permissions = {
      canView: true,
      canEdit: Boolean(isOwner || isEditor),
      canShare: Boolean(isOwner),
      canDelete: Boolean(isOwner),
    };

    // Build a simple response with file URL when appropriate
    const basename = doc.filepath ? path.basename(String(doc.filepath)) : null;
    const fileUrl = basename
      ? `${req.protocol}://${req.get("host")}/uploads/${basename}`
      : null;

    // Ensure readOnlyLink points to this server's public readonly route (in case stored value is stale)
    const serverPort = process.env.PORT ?? "3001";
    const serverBase =
      process.env.SERVER_URL ??
      process.env.APP_URL ??
      `${req.protocol}://${req.get("host")}`;
    const readOnlyLink = doc.shareToken
      ? `${serverBase}/documents/${doc.shareToken}/readonly`
      : doc.readOnlyLink || null;

    return res.json({ document: doc, permissions, fileUrl, readOnlyLink });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get(
  "/uploads/:id",
  validateToken,
  async (req: Request, res: Response) => {
    try {
      const idRaw = req.params.id;
      const docId = Array.isArray(idRaw) ? idRaw[0] : idRaw;

      const doc = await UserDocument.findById(docId);
      if (!doc) return res.status(404).send("Document not found");

      const isOwner = (req as any).user?.id === doc.owner.toString();
      if (!doc.isVisibleNonAuth && !isOwner) {
        return res.status(403).send("Forbidden");
      }

      if (!fs.existsSync(doc.filepath))
        return res.status(404).send("File not found");
      return res.sendFile(doc.filepath);
    } catch (err) {
      console.error(err);
      return res.status(500).send("Server error");
    }
  },
);

router.get(
  "/public/uploads/:shareToken",
  async (req: Request, res: Response) => {
    try {
      const doc = await UserDocument.findOne({
        shareToken: req.params.shareToken,
        trash: { $ne: true },
      });

      if (!doc) return res.status(404).send("Not found");

      return res.sendFile(doc.filepath);
    } catch (e) {
      console.error(e);
      res.status(500).send("Server error");
    }
  },
);

export default router;
