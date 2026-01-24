<div align="center">
  <h1>Awa Project</h1>
  <p>A lightweight full-stack document editor & file-sharing demo.</p>
</div>

---

## ⚠️ Disclaimer

This project is a **development/demo application**.

- Not tested for production use
- No security hardening
- Do **not** use with sensitive data
- Treat all uploaded content as potentially public

Brief: a Next.js frontend with an Express + TypeScript backend, storing documents in MongoDB. Features include user accounts, avatars, file uploads, sharing, and PDF generation.

Quick start (development)

1. Clone the repo:
   ```bash
   git clone <repo-url>
   cd awa_project
   ```
2. Install dependencies:
   ```bash
   npm install
   cd client && npm install && cd ../server && npm install && cd ..
   ```
3. Configure server env:
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env as needed (SECRET, PORT, MONGODB_URI)
   ```
4. Start dev servers (from repo root):
   ```bash
   npm run dev
   # client -> http://localhost:3000, server -> http://localhost:3001
   ```

Production

1. Build both apps:
   ```bash
   npm run build
   ```
2. Start production servers:
   ```bash
   npm start
   ```

Environment

- See `server/.env.example` for required variables (SECRET, PORT).

Tech Stack

| Layer    | Technology                       |
| -------- | -------------------------------- |
| Frontend | Next.js 16, React 19, TypeScript |
| Backend  | Node.js, Express, TypeScript     |
| Database | MongoDB, Mongoose                |
| Uploads  | multer (disk storage)            |
| PDF      | html-pdf-node (Chromium wrapper) |
| Auth     | JWT (jsonwebtoken)               |
| Styling  | Tailwind CSS                     |

Core features

- Create/edit rich text documents
- Share via read-only links and add collaborators
- File uploads served from `/uploads`
- PDF export of documents
- User registration, login, profile avatars

WIP features

- Commenting documents
- User management

Known issues

- Uploaded files are publicly accessible by URL
- No access control on file downloads
- Locking and collaboration features are experimental

Troubleshooting

- "Failed to fetch": ensure the backend is running (`npm run dev`) and that CORS allows `http://localhost:3000`.
- Missing PostCSS or Tailwind errors: run `cd client && npm install`.
- If uploads don't appear, ensure `uploads/` exists and is writable (server now creates it at startup).
