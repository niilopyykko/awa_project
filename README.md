<div align="center">
  <h1>Awa Project</h1>
  <p>A lightweight full-stack document editor & file-sharing demo.</p>
</div>

---

## Disclaimer

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
   cd client && npm install && cd ..
   cd server && npm install && cd ..
   ```
3. Configure environment variables:

   ```bash
   # Server: copy and edit server/.env
   cp server/.env.example server/.env

   # Client: copy and edit client/.env
   cp client/.env.example client/.env
   ```

4. Start dev servers:

   ```bash
   # Terminal 1 - Start DB server
   mongod

   # Terminal 2 - Start backend server
   cd server && npm run dev

   # Terminal 3 - Start frontend
   cd client && npm run dev

   # Default dev URLs: client -> http://localhost:3000, server -> http://localhost:3001
   ```

Production

1. Build both apps:
   ```bash
   cd client && npm run build && cd ..
   cd server && npm run build && cd ..
   ```
2. Start production servers:

   ```bash
   # Terminal 1 - Start DB server
   mongod

   # Terminal 2 - Start backend
   cd server && npm start

   # Terminal 3 - Start frontend
   cd client && npm start
   ```

Configuration / Environment

- Server environment (see `server/.env.example`):
  - `SECRET` — JWT secret (required)
  - `PORT` — server port (default: `3001`)
  - `MONGO_URI` — MongoDB connection string (required)
  - `PUBLIC_SERVER_URL` — full server URL for logging (e.g. `http://localhost:3001`)
  - `CLIENT_URL` — frontend URL for CORS (default: `http://localhost:3000`)
  - `UPLOAD_DIR` — uploads directory (default: `./uploads`)
  - `MAX_UPLOAD_MB` — server-side upload size cap (default: `1000` MB)
  - `DISABLE_REGISTRATION` — set to `true` to disable new user registration (default: `false`)

- Client environment (see `client/.env.example`):
  - `NEXT_PUBLIC_FRONTEND_URL` — public frontend URL (e.g. `http://localhost:3000`)
  - `NEXT_PUBLIC_BACKEND_URL` — public backend URL used by client-side code (e.g. `http://localhost:3001`)
  - `BACKEND_URL` — internal backend URL for Next.js server actions and rewrites (e.g. `http://localhost:3001` or `http://awa_backend:3001` in Docker)
  - `PORT` — frontend port (default: `3000`)
  - `NEXT_PUBLIC_MAX_UPLOAD_MB` — client-side upload limit (should match server `MAX_UPLOAD_MB`)
  - `DISABLE_REGISTRATION` — set to `true` to disable registration UI (default: `false`)

When deploying, ensure all URLs point to proper production endpoints. In Docker networks, set `BACKEND_URL` to the backend service name (e.g. `http://awa_backend:3001`).

Tech Stack

| Layer    | Technology                       |
| -------- | -------------------------------- |
| Frontend | Next.js 16, React 19, TypeScript |
| Editor   | TipTap 3 (rich text)             |
| UI       | HeroUI, Tailwind CSS 4           |
| Backend  | Node.js, Express 5, TypeScript   |
| Database | MongoDB, Mongoose                |
| Uploads  | multer (disk storage)            |
| PDF      | Playwright (Chromium-based)      |
| Auth     | JWT (jsonwebtoken)               |

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

- "Failed to fetch": ensure the backend is running (`cd server && npm run dev`) and that CORS allows your client origin. Set `CLIENT_URL` in server/.env to match your frontend URL (default: `http://localhost:3000`).
- Missing PostCSS or Tailwind errors: run `cd client && npm install`.
- If uploads don't appear, ensure `uploads/` exists and is writable (server creates it at startup).
- Environment variable issues: ensure both `client/.env` and `server/.env` are copied from their respective `.env.example` files and configured correctly.
