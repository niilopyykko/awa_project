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

        const documents: IUserDocument[] | null = await UserDocument.find({
            $or: [
                { owner: (req as CustomRequest).user!.id },
                { editors: (req as CustomRequest).user!.id }
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

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" })
        }
        let editors: string[] = [] //this handles the editor list conversion from frontend to backend
        if (req.body.editors && req.body.editors.trim()) {
            editors = req.body.editors.split(',').map((e: string) => e.trim())
        } //TODO: Needs to varify the editor user exists and maybe store editors as userIds

        const shareToken = randomUUID()
        const baseUrl = process.env.APP_URL ?? "http://localhost:3000"

        const file = new UserDocument({
            name: req.file.originalname,
            owner: req.user!.id,
            editors: editors,
            createdAt: new Date(),
            isVisibleNonAuth: req.body.isPublic,
            filepath: req.file.path,
            readOnlyToken: shareToken,
            readOnlyLink: `${baseUrl}/documents/${shareToken}/readonly`
        })
        await file.save()
        console.log("File uploaded and saved in the database")
        return res.status(201).json({
            message: "File uploaded and saved in the database", readOnlyLink: file.readOnlyLink
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


export default router