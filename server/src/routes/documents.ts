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
import { uploadsDir } from "../../server";


const router: Router = Router();

// ------------------------
// GET all user's documents (owner/editor/public)
// ------------------------
router.get("/documents", validateToken, async (req: CustomRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userObjectId = new Types.ObjectId(userId);

    // URL-parametrit
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const sort = (req.query.sort as string) ?? "name";
    const order = (req.query.order as string) === "desc" ? -1 : 1;
    const query = (req.query.query as string) ?? "";
    const trash = req.query.trash === "true";

    // baseFilter
    const baseFilter: any = {
      $and: [
        {
          $or: [
            { owner: userObjectId },
            { editors: userObjectId },
            { isVisibleNonAuth: true },
          ],
        },
      ],
    };

    // search filter
    if (query.trim() !== "") {
      baseFilter.$and.push({
        name: { $regex: query, $options: "i" },
      });
    }

    // Sorting
    const sortOptions: any = {};
    sortOptions[sort] = order;

    // Calculate total count
    const totalCount = await UserDocument.countDocuments(baseFilter);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    // Fetch paginated data
    const documents = await UserDocument.find(baseFilter)
      .sort(sortOptions)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("owner", "username")
      .populate("editors", "username");

    return res.json({
      documents,
      totalPages,
      totalCount,
      page,
    });

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

      // Use original filename with extension if no name provided
      const documentName = name?.trim() || req.file?.originalname || "Untitled";

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
              name: documentName,
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

      // Create new document (shareToken and readOnlyLink generated on-demand when user clicks "Get Share Link")
      const newDoc = new UserDocument({
        name: documentName,
        content: content || "",
        owner: userId,
        isVisibleNonAuth: isPublic === "true" || isPublic === true,
        editors: editorIds,
        filepath: req.file?.path ?? null,
        createdAt: new Date(),
      });

      await newDoc.save();
      return res.status(201).json({ message: "File uploaded", document: newDoc });
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
    const docId = req.params.id

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
// Public share file download/preview
// ------------------------
router.get("/share/:shareToken/file", async (req: Request, res: Response) => {
  try {
    const doc = await UserDocument.findOne({ shareToken: req.params.shareToken });
    if (!doc || doc.trash || !doc.filepath) {
      return res.status(404).json({ message: "File not found" });
    }

    const absolutePath = path.join(uploadsDir, path.basename(doc.filepath));
    if (!fs.existsSync(absolutePath)) {
      console.error("File not found:", absolutePath);
      return res.status(404).json({ message: "File not found on disk" });
    }

    const download = req.query.download === "1" || req.query.download === "true";
    if (download) {
      const downloadName = doc.name || path.basename(doc.filepath);
      res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    }

    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.sendFile(absolutePath);
  } catch (err) {
    console.error("Share file error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ------------------------
// Secure file download/preview for document cards (owner/editor/public only)
// ------------------------
router.get("/documents/:id/file", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    let userId: string | null = null;

    // Try to extract userId from Authorization header (JWT)
    try {
      const auth = req.header("authorization")?.split(" ")[1];
      if (auth) userId = (jwt.verify(auth, process.env.SECRET as string) as any).id || null;
    } catch (e) { userId = null; }

    const doc = await UserDocument.findById(id);
    if (!doc || doc.trash || !doc.filepath) {
      return res.status(404).json({ message: "File not found" });
    }

    const isOwner = String((doc.owner as any)?._id || doc.owner) === String(userId);
    const editorsArr: string[] = (doc.editors || []).map((e: any) => (e._id ? e._id.toString() : e.toString()));
    const isEditor = userId ? editorsArr.includes(String(userId)) : false;
    const isPublic = doc.isVisibleNonAuth === true;

    if (!isPublic && !isOwner && !isEditor) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const absolutePath = path.join(uploadsDir, path.basename(doc.filepath));
    if (!fs.existsSync(absolutePath)) {
      console.error("File not found:", absolutePath);
      return res.status(404).json({ message: "File not found on disk" });
    }

    const download = req.query.download === "1" || req.query.download === "true";
    if (download) {
      const downloadName = doc.name || path.basename(doc.filepath);
      res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    }

    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    return res.sendFile(absolutePath);
  } catch (err) {
    console.error("Secure file error:", err);
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

// ------------------------
// Generate share link on-demand
// ------------------------
router.post("/documents/:id/generate-share-link", validateToken, async (req: CustomRequest, res: Response) => {
  try {
    const docId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = req.user!.id;

    if (!Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ message: "Invalid document id" });
    }

    const doc = await UserDocument.findById(docId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const isOwner = doc.owner.toString() === userId;
    const editorsArr = (doc.editors || []).map((e: any) => (e._id ? e._id.toString() : e));
    const isEditor = editorsArr.includes(userId);

    if (!isOwner && !isEditor) {
      return res.status(403).json({ message: "No permission" });
    }

    // If shareToken already exists, return it
    if (doc.shareToken && doc.readOnlyLink) {
      return res.json({ readOnlyLink: doc.readOnlyLink, shareToken: doc.shareToken });
    }

    // Generate new shareToken and readOnlyLink

    const shareToken = randomUUID();
    const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

    // New correct link for gateway architecture
    const readOnlyLink = `${CLIENT_URL}/share/${shareToken}`;

    doc.shareToken = shareToken;
    doc.readOnlyLink = readOnlyLink;
    await doc.save();

    return res.json({ readOnlyLink, shareToken });
  } catch (err) {
    console.error("generate-share-link error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ message });
  }
});


// ------------------------
// Public share data (frontend embedded view)
// ------------------------
router.get("/share/:shareToken", async (req: Request, res: Response) => {

  const doc = await UserDocument.findOne({ shareToken: req.params.shareToken });

  try {
    const doc = await UserDocument
      .findOne({ shareToken: req.params.shareToken })
      .populate("owner", "username");

    if (!doc || doc.trash) {
      return res.status(404).json({ message: "Document not found" });
    }

    const fileUrl = doc.filepath ? `/api/share/${doc.shareToken}/file` : null;

    return res.json({
      document: {
        id: doc._id,
        name: doc.name,
        owner: (doc.owner as any)?.username ?? null,
        content: doc.content ?? null,
        filepath: doc.filepath ?? null,
        fileUrl,
      },
    });
  } catch (err) {
    console.error("Share data error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ------------------------
// Public share file download/preview
// ------------------------
router.get("/share/:shareToken/file", async (req: Request, res: Response) => {
  try {
    const doc = await UserDocument.findOne({ shareToken: req.params.shareToken });
    if (!doc || doc.trash || !doc.filepath) {
      return res.status(404).json({ message: "File not found" });
    }

    const absolutePath = path.join(uploadsDir, path.basename(doc.filepath));
    if (!fs.existsSync(absolutePath)) {
      console.error("File not found:", absolutePath);
      return res.status(404).json({ message: "File not found on disk" });
    }

    const download = req.query.download === "1" || req.query.download === "true";
    if (download) {
      const downloadName = doc.name || path.basename(doc.filepath);
      res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    }

    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.sendFile(absolutePath);
  } catch (err) {
    console.error("Share file error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/documents/:id/rename", validateToken, async (req: CustomRequest, res: Response) => {
  try {
    const docId = req.params.id
    const userId = req.user!.id;
    const { name } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    const doc = await UserDocument.findById(docId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const isOwner = doc.owner.toString() === userId;
    const editorsArr = (doc.editors || []).map((e: any) => (e._id ? e._id.toString() : e));
    const isEditor = editorsArr.includes(userId);

    if (!isOwner && !isEditor) return res.status(403).json({ message: "No permission" });

    doc.name = name.trim();
    await doc.save();

    return res.json({ message: "Renamed", document: doc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ------------------------
// Share document with a collaborator (adds to editors)
// ------------------------
router.post("/documents/:id/share", validateToken, async (req: CustomRequest, res: Response) => {
  try {
    const docId = req.params.id
    const userId = req.user!.id;
    const { collaborator, remove, removeUsername } = req.body || {};

    const doc = await UserDocument.findById(docId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const isOwner = doc.owner.toString() === userId;
    const editorIds = (doc.editors || []).map((e: any) => (e._id ? e._id.toString() : e.toString()));
    const isEditor = editorIds.includes(userId);

    // Allow an editor to remove themselves
    if (remove) {
      if (!isEditor) return res.status(403).json({ message: "No permission" });
      doc.editors = (doc.editors || []).filter(e => (e._id?.toString() || e.toString()) !== userId);
      await doc.save();

      const populated = await doc.populate([
        { path: "owner", select: "username" },
        { path: "editors", select: "username" },
      ]);

      return res.json({ message: "Removed collaborator", document: populated });
    }

    // Owner can remove a specific collaborator
    if (removeUsername) {
      if (!isOwner) return res.status(403).json({ message: "No permission" });
      const targetUser = await User.findOne({ username: removeUsername.trim() });
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      const targetId = targetUser._id.toString();
      doc.editors = (doc.editors || []).filter(e => (e._id?.toString() || e.toString()) !== targetId);
      await doc.save();

      const populated = await doc.populate([
        { path: "owner", select: "username" },
        { path: "editors", select: "username" },
      ]);

      return res.json({ message: "Removed collaborator", document: populated });
    }

    // Adding a collaborator: owner only
    if (!collaborator || typeof collaborator !== "string" || !collaborator.trim()) {
      return res.status(400).json({ message: "collaborator username is required" });
    }

    if (!isOwner) return res.status(403).json({ message: "No permission" });

    const targetUser = await User.findOne({ username: collaborator.trim() });
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    const targetId = targetUser._id.toString();
    if (targetId === userId) return res.status(400).json({ message: "Cannot share with yourself" });

    const existingEditors = new Set((doc.editors || []).map((e: any) => (e._id ? e._id.toString() : e.toString())));
    if (!existingEditors.has(targetId)) {
      doc.editors = [...(doc.editors || []), targetUser._id];
      await doc.save();
    }

    const populated = await doc.populate([
      { path: "owner", select: "username" },
      { path: "editors", select: "username" },
    ]);

    return res.json({ message: "Shared", document: populated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ------------------------
// Revoke share link
// ------------------------
router.post("/documents/:id/revoke-share-link", validateToken, async (req: CustomRequest, res: Response) => {
  try {
    const docId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = req.user!.id;

    if (!Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ message: "Invalid document id" });
    }

    const doc = await UserDocument.findById(docId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const isOwner = doc.owner.toString() === userId;
    const editorsArr = (doc.editors || []).map((e: any) => (e._id ? e._id.toString() : e));
    const isEditor = editorsArr.includes(userId);

    // Only owner can revoke link
    if (!isOwner) return res.status(403).json({ message: "No permission" });

    doc.shareToken = undefined as any;
    doc.readOnlyLink = undefined as any;
    await doc.save();

    const populated = await doc.populate([
      { path: "owner", select: "username" },
      { path: "editors", select: "username" },
    ]);

    return res.json({ message: "Share link revoked", document: populated });
  } catch (err) {
    console.error("revoke-share-link error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ message });
  }
});

// ------------------------
// Toggle visibility (public/private)
// ------------------------
router.post("/documents/:id/visibility", validateToken, async (req: CustomRequest, res: Response) => {
  try {
    const docId = req.params.id
    const userId = req.user!.id;

    const doc = await UserDocument.findById(docId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const isOwner = doc.owner.toString() === userId;
    if (!isOwner) return res.status(403).json({ message: "No permission" });

    doc.isVisibleNonAuth = !doc.isVisibleNonAuth;
    await doc.save();

    return res.json({ message: "Visibility toggled", isVisibleNonAuth: doc.isVisibleNonAuth });
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
      doc.isVisibleNonAuth = false;
      doc.editors = [];
      doc.shareToken = null;
      doc.readOnlyLink = null;
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
      const filePath = path.join(uploadsDir, path.basename(doc.filepath));
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
    const id = req.params.id
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
// PDF generation (protected)
// ------------------------
router.get(
  "/documents/:id/pdf",
  validateToken,
  async (req: CustomRequest, res: Response) => {
    try {
      const doc = await UserDocument
        .findById(req.params.id)
        .populate("owner", "username")
        .populate("editors", "username");

      if (!doc) return res.status(404).json({ message: "Document not found" });

      const userId = req.user?.id;
      const isOwner = doc.owner && doc.owner._id.toString() === String(userId);
      const isEditor = Array.isArray(doc.editors) && doc.editors.some(
        (e: any) => e._id.toString() === String(userId)
      );
      const isPublic = doc.isVisibleNonAuth === true;

      if (!isOwner && !isEditor && !isPublic) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;padding:24px;} .title{font-size:20px;font-weight:600;margin-bottom:12px}</style></head><body><div class="title">${doc.name}</div>${doc.content || ""}</body></html>`;

      // Use Playwright for PDF generation
      const { chromium } = require('playwright');
      const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true
      });
      await browser.close();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${doc.name || "document"}.pdf"`
      );
      return res.send(pdfBuffer);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "PDF generation error" });
    }
  }
);

// ------------------------
// Serve uploaded files (protected)
// ------------------------
router.get("/uploads/:id", validateToken, async (req, res) => {
  try {
    const doc = await UserDocument.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    // filepath = "uploads/file-xxxx.jpg"
    const absolutePath = path.join(uploadsDir, path.basename(doc.filepath));

    if (!fs.existsSync(absolutePath)) {
      console.error("File not found:", absolutePath);
      return res.status(404).json({ message: "File not found on disk" });
    }

    const download = req.query.download === "1" || req.query.download === "true";
    if (download) {
      const downloadName = doc.name || path.basename(doc.filepath);
      res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    }

    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.sendFile(absolutePath);
  } catch (err) {
    console.error("Error serving file:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/publicUploads/:id", async (req, res) => {
  try {
    const doc = await UserDocument.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    // filepath = "uploads/file-xxxx.jpg"
    const absolutePath = path.join(uploadsDir, path.basename(doc.filepath));

    if (!fs.existsSync(absolutePath)) {
      console.error("File not found:", absolutePath);
      return res.status(404).json({ message: "File not found on disk" });
    }
    if (doc.isVisibleNonAuth) {
      const download = req.query.download === "1" || req.query.download === "true";
      if (download) {
        const downloadName = doc.name || path.basename(doc.filepath);
        res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
      }
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.sendFile(absolutePath);
    }

  } catch (err) {
    console.error("Error serving file:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


export default router;