import { Request, Response, Router } from "express";
import { UserDocument } from "../models/Document";
import path from 'path'

const router: Router = Router();

// Serve read-only view for a shared document (public link)
router.get('/documents/:shareToken/readonly', async (req: Request, res: Response) => {
    try {
        const token = req.params.shareToken;
        const doc = await UserDocument.findOne({ shareToken: token }).populate('owner', 'username');
        if (!doc) return res.status(404).send('Document not found');

        // If the document has been moved to trash, do not serve it via the public readonly link
        if (doc.trash) return res.status(404).send('Document not found');

        // If file exists, serve an HTML page embedding the file via /uploads
        const basename = doc.filepath ? path.basename(String(doc.filepath)) : null;
        const uploadsUrl = basename ? `${req.protocol}://${req.get('host')}/uploads/${basename}` : null;

        // simple HTML response
        let html = `<!doctype html><html><head><meta charset="utf-8"><title>${doc.name}</title></head><body style="font-family:system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding:20px">`;
        html += `<h1>${doc.name}</h1>`;
        html += `<p>Uploaded by: ${(doc.owner as any)?.username ?? 'unknown'}</p>`;

        if (uploadsUrl) {
            const ext = (basename || '').split('.').pop()?.toLowerCase() || '';
            if (['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif'].includes(ext)) {
                html += `<img src="${uploadsUrl}" style="max-width:100%;height:auto" alt="${doc.name}"/>`;
            } else if (['mp4', 'webm', 'ogg'].includes(ext)) {
                html += `<video src="${uploadsUrl}" controls style="max-width:100%;height:auto"></video>`;
            } else {
                html += `<a href="${uploadsUrl}" download>Download file</a>`;
            }
        } else if (doc.content) {
            html += `<div style="white-space:pre-wrap;border:1px solid #ddd;padding:12px;margin-top:12px">${String(doc.content)}</div>`;
        } else {
            html += '<p>No content available</p>';
        }

        html += '</body></html>';
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }
});

export default router;

