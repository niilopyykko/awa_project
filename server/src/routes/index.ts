import { Request, Response, Router } from "express";
import { UserDocument } from "../models/Document";
import path from 'path'

const router: Router = Router();

// Serve read-only view for a shared document (public link)
router.get('/documents/:shareToken/readonly', async (req: Request, res: Response) => {
  try {
    const doc = await UserDocument
      .findOne({ shareToken: req.params.shareToken })
      .populate('owner', 'username')

    if (!doc || doc.trash) {
      return res.status(404).send('Document not found')
    }

    const uploadsUrl = doc.filepath
      ? `/api/uploads/${doc.shareToken}`
      : null

    let html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${doc.name}</title>
</head>
<body style="font-family:system-ui;padding:20px">
  <h1>${doc.name}</h1>
  <p>Uploaded by: ${(doc.owner as any)?.username ?? 'unknown'}</p>
`

    if (uploadsUrl) {
      const ext = doc.filepath.split('.').pop()?.toLowerCase()

      if (['png','jpg','jpeg','webp','gif','avif'].includes(ext!)) {
        html += `<img src="${uploadsUrl}" style="max-width:100%" />`
      } else if (['mp4','webm','ogg'].includes(ext!)) {
        html += `<video src="${uploadsUrl}" controls style="max-width:100%"></video>`
      } else {
        html += `<a href="${uploadsUrl}" download>Download file</a>`
      }
    } else if (doc.content) {
      html += `<div style="white-space:pre-wrap;border:1px solid #ddd;padding:12px">${doc.content}</div>`
    } else {
      html += `<p>No content available</p>`
    }

    html += `</body></html>`

    res.setHeader('Content-Type', 'text/html')
    res.send(html)
  } catch (err) {
    console.error(err)
    res.status(500).send('Internal server error')
  }
})

export default router;

