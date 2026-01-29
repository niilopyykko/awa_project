import { Request, Response, Router } from 'express'
import { body, validationResult } from 'express-validator'
import bcrypt from 'bcrypt'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { User, IUser } from '../models/User'
import path from 'path'
import fs from 'fs'
import upload from '../middleware/multer-config'
import { CustomRequest, validateToken } from '../middleware/validateToken'
import { uploadsDir } from '../../server'

const router: Router = Router()

// --- Helpers ---
const createToken = (payload: JwtPayload) => {
  return jwt.sign(payload, process.env.SECRET as string, { expiresIn: '24h' })
}

const setAuthCookies = (res: Response, token: string, username: string) => {
  const cookieOptions = {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production'
  }
  res.cookie('token', token, cookieOptions)
  res.cookie('user', username, { path: '/', sameSite: 'lax' })
}

// --- Routes ---

// Registration
router.post(
  "/register",
  upload.single('profilePic'),
  body("username").trim().isLength({ min: 3 }).escape().withMessage("Username too short"),
  body("password").isLength({ min: 5 }).withMessage("Password too short").matches(/[0-9]/).withMessage("Password must contain a number"),
  async (req: Request, res: Response) => {
    if (process.env.DISABLE_REGISTRATION === "true") {
      return res.status(403).json({ message: "Registration is disabled" })
    }

    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    try {
      const { username, password } = req.body
      const existingUser = await User.findOne({ username })
      if (existingUser) return res.status(403).json({ username: "username already in use" })

      const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10))
      const userData: Partial<IUser> = { username, password: hash }

      if (req.file?.path) userData.profilePic = req.file.path

      const createdUser = await User.create(userData)

      const token = createToken({ id: createdUser._id, username: createdUser.username })
      setAuthCookies(res, token, createdUser.username)

      // Include username so proxies can set a readable `user` cookie for client UI
      res.status(200).json({ message: "User registered successfully", token, username: createdUser.username })
    } catch (error) {
      console.error("Registration error:", error)
      res.status(500).json({ error: "Internal Server Error" })
    }
  }
)

// Get current user's avatar
router.get('/me/avatar', validateToken, async (req: CustomRequest, res: Response) => {
  try {
    const userId = req.user?.id as string | undefined
    console.log('[avatar] GET /me/avatar - userId:', userId)
    
    if (!userId) {
      console.warn('[avatar] Missing user id in token')
      return res.status(401).send('Unauthorized')
    }
    
    const user = await User.findById(userId)
    if (!user) {
      console.warn('[avatar] User not found for id', userId)
      return res.status(404).send('User not found')
    }
    
    console.log('[avatar] User found:', user.username, 'profilePic:', user.profilePic)
    
    if (!user.profilePic) {
      console.warn('[avatar] No profilePic set for user', user.username)
      return res.status(404).send('No profile image')
    }

    let profilePicPath = user.profilePic
    console.log('[avatar] Initial path:', profilePicPath)

    // If it's not absolute, resolve against uploadsDir and basename to avoid stray paths
    if (!path.isAbsolute(profilePicPath)) {
      profilePicPath = path.join(uploadsDir, path.basename(profilePicPath))
      console.log('[avatar] Converted to full path:', profilePicPath)
    }

    // Normalize to absolute for sendFile
    profilePicPath = path.resolve(profilePicPath)

    console.log('[avatar] Checking file at:', profilePicPath)

    if (!fs.existsSync(profilePicPath)) {
      console.error('[avatar] File not found on disk at:', profilePicPath)
      return res.status(404).send('File not found')
    }

    console.log('[avatar] Serving file successfully')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.sendFile(profilePicPath)
  } catch (err) {
    console.error('Avatar error:', err)
    res.status(500).send('Internal server error')
  }
})

// Update avatar
router.post('/me/avatar', validateToken, upload.single('profilePic'), async (req: CustomRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id)
    if (!user) return res.status(404).json({ message: "User not found" })
    if (!req.file) return res.status(400).json({ message: "No file uploaded" })

    user.profilePic = req.file.path
    await user.save()
    res.status(200).json({ message: "Profile picture updated" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
})

// Login
router.post(
  "/login",
  body("username").trim().escape(),
  body("password"),
  async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body
      const user = await User.findOne({ username })
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ message: "Login failed" })
      }

      const token = createToken({ id: user._id, username: user.username })
      setAuthCookies(res, token, user.username)

      res.status(200).json({ success: true, token })
    } catch (error) {
      console.error("Login error:", error)
      res.status(500).json({ error: 'Internal Server Error' })
    }
  }
)

// Get current user info
router.get("/me", validateToken, async (req: CustomRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId).select("username email _id profilePic");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user._id,
      username: user.username,
      profilePic: user.profilePic ?? null
    });
  } catch (err) {
    console.error("Error in /user/me:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


export default router
