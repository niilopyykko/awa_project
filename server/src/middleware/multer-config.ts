import multer, { StorageEngine, Multer } from "multer"
import path from 'path'
import fs from 'fs'

const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads')

// Ensure the uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage: StorageEngine = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
})

const upload: Multer = multer({ storage: storage })

export default upload