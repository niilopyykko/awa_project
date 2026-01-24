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

const mongoDB: string = "mongodb://127.0.0.1:27017/ProjectDB"
mongoose.connect(mongoDB)
mongoose.Promise = Promise
const db: Connection = mongoose.connection

db.on("error", console.error.bind(console, "MongoDB connection error"))

const corsOptions: CorsOptions = {
    origin: [
        'http://localhost:3000'
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    allowedHeaders: ['Content-Type', 'Authorization']
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(morgan("dev"))


app.use("/api", documentsRouter)
app.use("/", router)
app.use("/user", userRouter)

app.listen(port, () => {
    console.log(`Server running on port ${port}`)

})