import multer, { StorageEngine, Multer } from "multer"
import path from "path"
import fs from "fs"

const uploadsDir = process.env.UPLOAD_DIR || "./uploads"
const maxUploadMb = parseInt(process.env.MAX_UPLOAD_MB || "25", 10)
const maxUploadBytes = maxUploadMb * 1024 * 1024

// Ensure the uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage: StorageEngine = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (_req, file, cb) => {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    )
  },
})

const upload: Multer = multer({
  storage,
  limits: {
    fileSize: maxUploadBytes,
  },
})

export default upload
