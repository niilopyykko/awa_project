import multer, { StorageEngine, Multer } from "multer"
import path from "path"
import fs from "fs"

const uploadsDir = process.env.UPLOAD_DIR || "/uploads"

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

const upload: Multer = multer({ storage })

export default upload
