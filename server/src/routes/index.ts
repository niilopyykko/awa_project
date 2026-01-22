import { Request, Response, Router } from "express"
import { compile } from "morgan"
import { IUserDocument, UserDocument } from "../models/Document"
import upload from "../middleware/multer-config"
import { validateToken } from '../middleware/validateToken'
import { CustomRequest } from "../middleware/validateToken"
import { randomUUID } from "crypto"



const router: Router = Router()

router.get("/api/documents", validateToken, async (req: Request, res: Response) => {
    try {

        const userId = (req as CustomRequest).user!.id

        // Return documents where the user is owner, is listed in editors, or the document is public
        const documents: IUserDocument[] | null = await UserDocument.find({
            $or: [
                { owner: userId },
                { editors: userId },
                { isVisibleNonAuth: true }
            ]
        }).populate('owner', 'username')

        if (!documents) {
            return res.status(404).json({ message: 'No documents found' })
        }


        res.status(200).json(documents)
        console.log('Images fetched successfully from database')
    } catch (error: any) {
        console.error(`Error while fetching a file: ${error}`)
        return res.status(500).json({ message: 'Internal server error' })
    }

})
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

router.post("/api/upload", validateToken, upload.single("file"), async (req: CustomRequest, res: Response) => {
    try {
        console.log("Upload request received:")
        console.log("Uploaded file:", req.file)
        console.log("Uploaded body:", req.body)

        let { name, content, isPublic, editors, documentId } = req.body


        if (!req.file && !req.body.content) {
            return res.status(400).json({ message: "No file or text uploaded" })
        }
        let editorsArray: string[] = [] //this handles the editor list conversion from frontend to backend
        if (req.body.editors && req.body.editors.trim()) {
            editorsArray = req.body.editors.split(',').map((e: string) => e.trim())
        } //TODO: Needs to varify the editor user exists and maybe store editors as userIds

        //for naming of files and texts
        name =
            req.body.name?.trim() || //if generated from texteditor
            req.file?.originalname || //if fileupload
            'Untitled document' //if left empty

        const baseUrl = process.env.APP_URL ?? "http://localhost:3000"


        //Update existing file
        if (documentId) {
      const updatedDoc = await UserDocument.findOneAndUpdate(
        { _id: documentId, $or: [ {owner: req.user!.id}, {editors: req.user!.id}] },
        { 
          $set: {
            name: name || 'Untitled',
            content: content || '',
            isVisibleNonAuth: isPublic === 'true',
            editors: editorsArray
          }
        },
        { new: true }
      )

      if (!updatedDoc) return res.status(404).json({ message: "Document not found or you are not the owner" })

      return res.json({ message: "Document updated", document: updatedDoc })
    }

        //New file
        const shareToken = randomUUID()

        const doc = new UserDocument({
            name: name,
            owner: req.user!.id,
            editors: editorsArray,
            createdAt: new Date(),
            isVisibleNonAuth: req.body.isPublic,
            filepath: req.file?.path ?? null, //if fileupload
            content: req.body.content ?? '', //if generated from texteditor
            readOnlyToken: shareToken,
            readOnlyLink: `${baseUrl}/documents/${shareToken}/readonly`,
        })

        await doc.save()

        console.log("File uploaded and saved in the database")
        return res.status(201).json({
            message: "File uploaded and saved in the database", readOnlyLink: doc.readOnlyLink
        })
        } catch (error: any) {
            console.error(`Error while uploading file: ${error}`)
            return res.status(500).json({ message: 'Internal server error' })
        }
})

router.patch("/api/documents/:id", async (req: Request, res: Response) => {
    try {
        const document: IUserDocument | null = await UserDocument.findById(req.params.id)

        if (!document) {
            return res.status(404).json({ message: 'Image not found' })
        }


        res.status(200).json({ message: "Image updated" })
        console.log('Image updated')

    } catch (error: any) {
        console.error(`Error while updating a file: ${error}`)
        return res.status(500).json({ message: 'Internal server error' })
    }


})

router.post("/api/documents/:id/lock", validateToken, async (req: CustomRequest, res: Response) => {
    try {
        const docId = req.params.id
        const userId = req.user!.id

        const doc = await UserDocument.findById(docId)
        if (!doc) return res.status(404).json({ message: "Document not found" })

        // If the document is locked by the same user, toggle unlock
        if (doc.lockedBy && doc.lockedBy.toString() === userId) {
            doc.lockedBy = undefined
            await doc.save()
            return res.json({ success: true, locked: false })
        }

        // If locked by another user, indicate conflict
        if (doc.lockedBy) {
            return res.status(409).json({ success: false, message: "Locked by another user" })
        }

        // Otherwise lock it for the requesting user
        doc.lockedBy = userId
        await doc.save()
        return res.json({ success: true, locked: true })

    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
})

// GET lock status without modifying it
router.get("/api/documents/:id/lock", validateToken, async (req: CustomRequest, res: Response) => {
    try {
        const docId = req.params.id
        const doc = await UserDocument.findById(docId).populate('lockedBy', 'username')
        if (!doc) return res.status(404).json({ message: "Document not found" })

        const locked = !!doc.lockedBy
        const lockedBy = doc.lockedBy ? { id: (doc.lockedBy as any)._id, username: (doc.lockedBy as any).username } : null
        return res.json({ locked, lockedBy })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
})


export default router

// Public documents endpoint (no auth required)
router.get("/api/documents/public", async (req: Request, res: Response) => {
    try {
        const documents: IUserDocument[] | null = await UserDocument.find({
            isVisibleNonAuth: true
        }).populate('owner', 'username')

        if (!documents) {
            return res.status(404).json({ message: 'No public documents found' })
        }

        res.status(200).json(documents)
        console.log('Public documents fetched successfully from database')
    } catch (error: any) {
        console.error(`Error while fetching public documents: ${error}`)
        return res.status(500).json({ message: 'Internal server error' })
    }

})