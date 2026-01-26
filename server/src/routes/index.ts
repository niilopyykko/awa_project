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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.name}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:100%; height:100%; }
    body { font-family:system-ui; background:#1a1a1a; display:flex; flex-direction:column; }
    h1 { font-size:1.5rem; color:#fff; }
    p { font-size:0.95rem; color:#ccc; margin-bottom:15px; }
    .container { flex:1; display:flex; flex-direction:column; gap:15px; padding:15px; max-width:100%; overflow:auto; }
    img, video { flex:0 0 auto; max-height:85vh; width:100%; object-fit:contain; border-radius:4px; }
    a { display:inline-block; margin-top:15px; padding:12px 24px; background:#007bff; color:white; text-decoration:none; border-radius:4px; width:fit-content; }
    a:hover { background:#0056b3; }
    .text-content { white-space:pre-wrap; border:1px solid #444; padding:15px; background:#2a2a2a; border-radius:4px; margin-top:20px; color:#ddd; flex:none; max-height:60vh; overflow:auto; }
  </style>
</head>
<body>
  <div class="container">
    <div>
      <h1>${doc.name}</h1>
      <p>Uploaded by: <strong>${(doc.owner as any)?.username ?? 'unknown'}</strong></p>
    </div>
`

    if (uploadsUrl) {
      const ext = doc.filepath.split('.').pop()?.toLowerCase()

      if (['png','jpg','jpeg','webp','gif','avif'].includes(ext!)) {
        html += `<img src="${uploadsUrl}" alt="${doc.name}" />`
      } else if (['mp4','webm','ogg'].includes(ext!)) {
        html += `<video src="${uploadsUrl}" controls></video>`
      } else {
        html += `<a href="${uploadsUrl}" download>Download file</a>`
      }
    } else if (doc.content) {
      html += `<div class="text-content">${doc.content}</div>`
    } else {
      html += `<p>No content available</p>`
    }

    html += `</div></body></html>`

    res.setHeader('Content-Type', 'text/html')
    res.send(html)
  } catch (err) {
    console.error(err)
    res.status(500).send('Internal server error')
  }
})

export default router;

