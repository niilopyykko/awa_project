import express, { Express } from "express"
import path from "path"
import fs from "fs"
import router from "./src/routes/index"
import documentsRouter from "./src/routes/documents"
import userRouter from "./src/routes/user"
import morgan from "morgan"
import mongoose, { Connection } from 'mongoose'
import dotenv from "dotenv"
import cors, { CorsOptions } from 'cors'

dotenv.config()

// Ensure uploads directory exists (some routes may read files directly)
const uploadsDir = path.resolve(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) {
    try {
        fs.mkdirSync(uploadsDir, { recursive: true })
        console.log('Created uploads directory:', uploadsDir)
    } catch (e) {
        console.error('Failed to create uploads directory', e)
    }
}

const app: Express = express()
const port: number = parseInt(process.env.PORT as string) || 3001

const SERVER_PORT = parseInt(process.env.PORT || "3001");
const SERVER_HOST = process.env.SERVER_HOST || "localhost";
const SERVER_URL = process.env.SERVER_URL || `http://${SERVER_HOST}:${SERVER_PORT}`;
// Client origin used for CORS (can be set to your frontend URL, e.g. http://localhost:3000)
const CLIENT_URL = process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || `http://localhost:3000`;

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/awa_db";

mongoose.connect(MONGO_URI)
mongoose.Promise = Promise
const db: Connection = mongoose.connection

db.on("error", console.error.bind(console, "MongoDB connection error"))

const allowedOrigins = (process.env.CLIENT_URLS || "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map(u => u.trim());

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      console.log("CORS: internal request (no origin) allowed");
      return callback(null, true);
    }

    console.log("CORS: request from origin:", origin);

    if (allowedOrigins.includes(origin)) return callback(null, true);

    if (origin.startsWith("http://awa_frontend") || origin.startsWith("http://backend")) {
      console.log("CORS: allowed internal Docker origin", origin);
      return callback(null, true);
    }

    console.log("CORS: blocked origin", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(morgan("dev"))


app.use("/api", documentsRouter)
app.use("/", router)
app.use("/user", userRouter)

app.listen(SERVER_PORT, () => {
    console.log(`Server running on ${SERVER_URL}`);
    console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
});