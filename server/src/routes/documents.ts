import { Request, Response, Router } from "express";
import { IUserDocument, UserDocument } from "../models/Document";
import upload from "../middleware/multer-config";
import { validateToken, CustomRequest } from "../middleware/validateToken";
import { randomUUID } from "crypto";
import jwt, { JwtPayload } from "jsonwebtoken";
import { IUser, User } from "../models/User";
import path from "path";
import fs from "fs";
import { Types } from 'mongoose';
import mime from "mime";

const router: Router = Router();

// ------------------------
// GET all user's documents (owner/editor/public)
// ------------------------
router.get("/documents", validateToken, async (req: CustomRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userObjectId = new Types.ObjectId(userId);

    const documents: IUserDocument[] = await UserDocument.find({
      $and: [
        {
          $or: [
            { owner: userObjectId },
            { editors: userObjectId },
            { isVisibleNonAuth: true },
          ],
        },
        { $or: [{ owner: userObjectId }, { trash: { $ne: true } }] },
      ],
    })
      .populate("owner", "username")
      .populate("editors", "username");

    if (!documents || documents.length === 0) {
      return res.status(404).json({ message: "No documents found" });
    }

    return res.json(documents);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ------------------------
// Upload or update document
// ------------------------
router.post(
  "/upload",
  validateToken,
  upload.single("file"),
  async (req: CustomRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { name, content, isPublic, documentId, editors } = req.body;

      const editorsArray = (editors || "")
        .toString()
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);

      const editorUsers = await User.find({ username: { $in: editorsArray } }).select("_id");
      const editorIds = editorUsers.map(u => u._id);

      // Update existing document
      if (documentId) {
        const updated = await UserDocument.findOneAndUpdate(
          {
            _id: documentId,
            $or: [{ owner: userId }, { editors: userId }],
          },
          {
            $set: {
              name: name?.trim() || "Untitled",
              content: content || "",
              isVisibleNonAuth: isPublic === "true" || isPublic === true,
              editors: editorIds,
              filepath: req.file?.path ?? null,
            },
          },
          { new: true }
        );

        if (!updated)
          return res.status(404).json({ message: "Document not found or no permission" });

        return res.json({ message: "Document updated", document: updated });
      }

      // Create new document
      const shareToken = randomUUID();
      // PUBLIC_SERVER_URL is the externally reachable host (e.g., https://app.example.com)
      // Fallbacks keep backward compatibility but may point to an internal hostname if not set.
      const PUBLIC_URL = process.env.PUBLIC_SERVER_URL || `http://localhost:${process.env.PORT}`;
      const readOnlyLink = `${PUBLIC_URL}/documents/${shareToken}/readonly`;
      const newDoc = new UserDocument({
        name: name?.trim() || "Untitled",
        content: content || "",
        owner: userId,
        isVisibleNonAuth: isPublic === "true" || isPublic === true,
        editors: editorIds,
        filepath: req.file?.path ?? null,
        shareToken,
        readOnlyLink,
        createdAt: new Date(),
      });

      await newDoc.save();
      return res.status(201).json({ message: "File uploaded", readOnlyLink: newDoc.readOnlyLink });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// ------------------------
// PATCH /documents/:id → rename, visibility, add/remove editor
// ------------------------
router.patch("/documents/:id", validateToken, async (req: CustomRequest, res: Response) => {
  try {
    const docId = req.params.id;
    const userId = req.user!.id;
    const { name, makePublic, addEditor, removeEditor } = req.body;

    const doc = await UserDocument.findById(docId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const isOwner = doc.owner.toString() === userId;
    const editorsArr = (doc.editors || []).map((e: any) => (e._id ? e._id.toString() : e));
    const isEditor = editorsArr.includes(userId);

    if (!isOwner && !isEditor) return res.status(403).json({ message: "No permission" });

    if (name) doc.name = name;
    if (typeof makePublic === "boolean" && isOwner) doc.isVisibleNonAuth = makePublic;
    if (isOwner) {
      if (addEditor) doc.editors = [...new Set([...(doc.editors || []), addEditor])];
      if (removeEditor) doc.editors = (doc.editors || []).filter(e => (e._id?.toString() || e) !== removeEditor);
    }

    await doc.save();
    return res.json({ message: "Document updated", document: doc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ------------------------
// Document lock management
// ------------------------
router.post("/documents/:id/lock", validateToken, async (req: CustomRequest, res: Response) => {
  try {
    const docId = req.params.id;
    const userId = req.user!.id;
    const now = new Date();

    const doc = await UserDocument.findById(docId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    if (doc.lockedBy && doc.lockExpiresAt && doc.lockExpiresAt > now && doc.lockedBy.toString() !== userId)
      return res.status(409).json({ locked: true, lockedBy: doc.lockedBy });

    doc.lockedBy = userId;
    doc.lockExpiresAt = new Date(now.getTime() + 2 * 60 * 1000);
    await doc.save();
    return res.json({ locked: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/documents/:id/renewLock", validateToken, async (req: CustomRequest, res: Response) => {
  try {
    const doc = await UserDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    if (doc.lockedBy?.toString() !== req.user!.id) return res.status(403).json({ message: "Not lock owner" });

    doc.lockExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
    await doc.save();
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/documents/:id/unlock", validateToken, async (req: CustomRequest, res: Response) => {
  try {
    const doc = await UserDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    if (doc.lockedBy?.toString() !== req.user!.id) return res.status(403).json({ message: "Not lock owner" });

    doc.lockedBy = undefined;
    doc.lockExpiresAt = undefined;
    await doc.save();
    return res.json({ unlocked: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/documents/:id/lock", validateToken, async (req: CustomRequest, res: Response) => {
  try {
    const doc = await UserDocument.findById(req.params.id).populate("lockedBy", "username");
    if (!doc) return res.status(404).json({ message: "Document not found" });
    return res.json({ locked: !!doc.lockedBy, lockedBy: doc.lockedBy });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ------------------------
// Trash / restore / delete
// ------------------------
router.post("/documents/:id/trash", validateToken, async (req: CustomRequest, res: Response) => {
  try {
    const doc = await UserDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const userId = req.user!.id;
    const isOwner = String(doc.owner) === userId;
    const editorsArr: string[] = (doc.editors || []).map((e: any) => (e._id ? e._id.toString() : e.toString()));
    const isEditor = editorsArr.includes(userId);

    if (isOwner) {
      doc.trash = true;
      await doc.save();
      return res.json({ message: "Moved to trash", document: doc });
    }

    if (isEditor) {
      doc.editors = (doc.editors || []).filter(e => (e._id?.toString() || e) !== userId);
      await doc.save();
      return res.json({ message: "Removed you as collaborator", document: doc });
    }

    return res.status(403).json({ message: "No permission" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/documents/:id/restore", validateToken, async (req: CustomRequest, res: Response) => {
  try {
    const updated = await UserDocument.findOneAndUpdate(
      { _id: req.params.id, $or: [{ owner: req.user!.id }, { editors: req.user!.id }] },
      { $set: { trash: false } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Document not found or no permission" });
    return res.json({ message: "Restored from trash", document: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/documents/:id", validateToken, async (req: CustomRequest, res: Response) => {
  try {
    const doc = await UserDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    if (String(doc.owner) !== req.user!.id) return res.status(403).json({ message: "Only owner can delete" });

    if (doc.filepath) {
      const uploadsDir = process.env.UPLOAD_DIR || "/uploads";
      const filePath = path.join(uploadsDir, doc.filepath);
      if (fs.existsSync(filePath)) await fs.promises.unlink(filePath);
    }
    await UserDocument.deleteOne({ _id: req.params.id });
    return res.json({ message: "Document permanently deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ------------------------
// Get document by ID (permission check)
// ------------------------
router.get("/documents/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    let userId: string | null = null;

    try {
      const auth = req.header("authorization")?.split(" ")[1];
      if (auth) userId = (jwt.verify(auth, process.env.SECRET as string) as any).id || null;
    } catch (e) { userId = null; }

    const doc = await UserDocument.findById(id).populate("owner", "username").populate("editors", "username");
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const isOwner = String((doc.owner as any)?._id || doc.owner) === String(userId);
    const editorsArr: string[] = (doc.editors || []).map((e: any) => (e._id ? e._id.toString() : e.toString()));
    const isEditor = userId ? editorsArr.includes(String(userId)) : false;

    if (!doc.isVisibleNonAuth && !isOwner && !isEditor) return res.status(403).json({ message: "Forbidden" });

    return res.json({ document: doc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ------------------------
// Public documents listing
// ------------------------
router.get("/publicDocuments", async (req: Request, res: Response) => {
  try {
    let userId: string | null = null;
    try {
      const authHeader = req.header("authorization")?.split(" ")[1];
      if (authHeader) userId = (jwt.verify(authHeader, process.env.SECRET as string) as any).id || null;
    } catch (e) { userId = null; }

    const query: any = { trash: { $ne: true } };
    if (userId) query.$or = [{ isVisibleNonAuth: true }, { owner: userId }, { editors: userId }];
    else query.isVisibleNonAuth = true;

    const docs = await UserDocument.find(query).populate("owner", "username").populate("editors", "username");
    if (!docs || docs.length === 0) return res.status(404).json({ message: "No documents found" });

    return res.json(docs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ------------------------
// PDF generation
// ------------------------
router.get("/documents/:id/pdf", async (req: Request, res: Response) => {
  try {
    const doc = await UserDocument.findById(req.params.id).populate("owner", "username").populate("editors", "username");
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;padding:24px;} .title{font-size:20px;font-weight:600;margin-bottom:12px}</style></head><body><div class="title">${doc.name}</div>${doc.content || ""}</body></html>`;

    const html_to_pdf = require("html-pdf-node");
    const options = {
      format: "A4",
      printBackground: true,
      launchOptions: {
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      }
    };
    const pdfBuffer = await html_to_pdf.generatePdf({ content: html }, options);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${doc.name || "document"}.pdf"`);
    return res.send(Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "PDF generation error" });
  }
});

// ------------------------
// Serve uploaded files
// ------------------------

router.get("/uploads/:id", async (req: Request, res: Response) => {
  const docId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!docId) return res.status(400).send("Missing file ID");

  const isObjectId = Types.ObjectId.isValid(docId) && docId.length === 24;
  const doc = isObjectId
    ? await UserDocument.findById(docId)
    : await UserDocument.findOne({ shareToken: docId });

  if (!doc) return res.status(404).send("Document not found");
  if (!doc.filepath) return res.status(404).send("File not found");

  const filePath = doc.filepath;

  if (!fs.existsSync(filePath)) return res.status(404).send("File not found");

  const mimeType = mime.getType(filePath) || "application/octet-stream";
  res.type(mimeType);
  return res.sendFile(filePath);
});


export default router;