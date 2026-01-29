import express, { Express } from "express"
import fs from "fs"
import path from "path"
import router from "./src/routes/index"
import documentsRouter from "./src/routes/documents"
import userRouter from "./src/routes/user"
import logoutRouter from "./src/routes/logout"
import morgan from "morgan"
import mongoose, { Connection } from "mongoose"
import dotenv from "dotenv"
import cors, { CorsOptions } from "cors"

dotenv.config()

// ---------- Upload Directory ----------
export const uploadsDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(__dirname, "..", "uploads")

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log("Created uploads directory:", uploadsDir)
}

// ---------- Express App ----------
const app: Express = express()
const PORT = parseInt(process.env.PORT || "3001")

// ---------- MongoDB ----------
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/awa_db"
mongoose.connect(MONGO_URI)
mongoose.Promise = Promise
const db: Connection = mongoose.connection
db.on("error", console.error.bind(console, "MongoDB connection error"))

// ---------- CORS Configuration ----------
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000"

const corsOptions: CorsOptions = {
  origin: CLIENT_URL,
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Set-Cookie"], // Required for cookie auth
  optionsSuccessStatus: 200,
}

app.use(cors(corsOptions))

// ---------- Middleware ----------
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: false, limit: "50mb" }))
app.use(morgan("dev"))

// ---------- Routes ----------
app.use("/api", documentsRouter)
app.use("/", router)
app.use("/user", userRouter)
app.use("/user", logoutRouter)

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`Server running on ${process.env.SERVER_URL || `http://localhost:${PORT}`}`)
  console.log(`CORS allowed origin: ${CLIENT_URL}`)
})
