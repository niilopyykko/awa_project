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
3. Configure environment variables:

   ```bash
   # Server: copy and edit server/.env (SECRET, PORT, MONGO_URI, optional SERVER_URL)
   cp server/.env.example server/.env

   # Client: set the public API base used by the frontend
   # Edit client/.env and set NEXT_PUBLIC_API_URL (e.g. http://localhost:3001/api)
   # or set the variable in your deployment environment.
   cp client/.env.example client/.env || true
   ```

4. Start dev servers (from repo root):
   ```bash
   npm run dev
   # Default dev URLs: client -> http://localhost:3000, server -> http://localhost:3001
   # Note: these can change if you set PORT, SERVER_URL (server) or NEXT_PUBLIC_API_URL (client).
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

Configuration / Environment

- Server environment (see `server/.env.example`):
  - `SECRET` — JWT secret
  - `PORT` — server port (default: `3001`)
  - `MONGO_URI` — MongoDB connection string
  - `SERVER_URL` or `APP_URL` — full server URL (e.g. `http://localhost:3001`); used when generating read-only links and CORS.

- Client environment (frontend):
  - `NEXT_PUBLIC_API_URL` — public API base used by the client (e.g. `http://localhost:3001/api`). Set in `client/.env` for local development or in your hosting environment for production.

When deploying, ensure `SERVER_URL` and `NEXT_PUBLIC_API_URL` point to the proper production endpoints so links and API calls resolve correctly.

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

- "Failed to fetch": ensure the backend is running (`npm run dev`) and that CORS allows your client origin. Set `SERVER_URL` and/or include your client origin (for example `http://localhost:3000`) in the server CORS configuration.
- Missing PostCSS or Tailwind errors: run `cd client && npm install`.
- If uploads don't appear, ensure `uploads/` exists and is writable (server now creates it at startup).
