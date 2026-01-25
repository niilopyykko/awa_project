import { Request, Response, Router } from 'express'
import { body, Result, ValidationError, validationResult } from 'express-validator'
import bcrypt from 'bcrypt'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { User, IUser } from '../models/User'
import path from 'path'
import fs from 'fs'
import upload from '../middleware/multer-config'
import { CustomRequest, validateToken } from '../middleware/validateToken'

const router: Router = Router()

router.post("/register",
    upload.single('profilePic'),
    body("username").trim().isLength({ min: 3 }).escape().withMessage("Username too short"),
    body("password").isLength({ min: 5 }).withMessage("Password too short").matches(/[0-9]/).withMessage("Password must contain a number"),
    //SHOULD HAVE USED .isStrongPassword
    async (req: Request, res: Response) => {
        if (process.env.DISABLE_REGISTRATION === "true") {
            return res.status(403).json({ message: "Registration is disabled" });
        }
        const errors: Result<ValidationError> = validationResult(req)

        if (!errors.isEmpty()) {
            console.log(errors);
            return res.status(400).json({ errors: errors.array() })

        }
        try {
            const existingUser: IUser | null = await User.findOne({ username: req.body.username })
            console.log(existingUser)
            if (existingUser) {
                return res.status(403).json({ username: "username already in use" })
            }

            const salt: string = bcrypt.genSaltSync(10)
            const hash: string = bcrypt.hashSync(req.body.password, salt)

            const userData: any = {
                username: req.body.username,
                password: hash
            }

            if (req.file && req.file.path) {
                userData.profilePic = req.file.path
            }

            const createdUser = await User.create(userData)

            const jwtPayload: JwtPayload = {
                id: createdUser._id,
                username: createdUser.username
            }
            const token: string = jwt.sign(jwtPayload, process.env.SECRET as string, { expiresIn: '24h' })
            // set HttpOnly token cookie and a non-HttpOnly username cookie
            const cookieOptions = {
                httpOnly: true,
                path: '/',
                sameSite: 'lax' as const,
                secure: process.env.NODE_ENV === 'production'
            }
            res.cookie('token', token, cookieOptions)
            // expose username in a readable cookie for SSR display
            res.cookie('user', createdUser.username, { path: '/', sameSite: 'lax' })

            return res.status(200).json({ message: "User registered successfully", token })

        } catch (error: any) {
            console.error(`Error during registration: ${error}`)
            return res.status(500).json({ error: "Internal Server Error" })
        }

    }
)

// Return current authenticated user's profile
router.get('/me/avatar', validateToken, async (req: CustomRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).send('User ID missing in token');

        const user = await User.findById(userId);
        if (!user) {
            console.warn('[Avatar] User not found for ID:', userId);
            return res.status(404).send('User not found');
        }

        if (!user.profilePic) {
            console.warn('[Avatar] User has no profilePic:', userId);
            return res.status(404).send('No profile image');
        }

        const profilePicPath = path.join(process.cwd(), 'uploads', path.basename(user.profilePic));
        if (!fs.existsSync(profilePicPath)) {
            console.warn('[Avatar] File not found:', profilePicPath);
            return res.status(404).send('File not found');
        }

        return res.sendFile(profilePicPath);
    } catch (err) {
        console.error('[Avatar] Internal server error:', err);
        return res.status(500).send('Internal server error');
    }
});

router.post("/me/avatar", validateToken, upload.single("profilePic"), async (req: CustomRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ message: "User not found in token" })

    if (!req.file) return res.status(400).json({ message: "No file uploaded" })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: "User not found" })

    user.profilePic = req.file.path
    await user.save()

    res.status(200).json({ message: "Profile picture updated" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
})


router.post("/login",
    body("username").trim().escape(),
    body("password"),
    async (req: Request, res: Response) => {
        try {
            const user: IUser | null = await User.findOne({ username: req.body.username })

            //console.log(user)

            if (!user) {
                return res.status(401).json({ message: "Login failed" })
            }

            if (bcrypt.compareSync(req.body.password, user.password)) {
                const jwtPayload: JwtPayload = {
                    id: user._id,
                    username: user.username
                }
                const token: string = jwt.sign(jwtPayload, process.env.SECRET as string, { expiresIn: "24h" })
                const cookieOptions = {
                    httpOnly: true,
                    path: '/',
                    sameSite: 'lax' as const,
                    secure: process.env.NODE_ENV === 'production'
                }
                res.cookie('token', token, cookieOptions)
                res.cookie('user', user.username, { path: '/', sameSite: 'lax' })

                return res.status(200).json({ success: true, token })
            }
            return res.status(401).json({ message: "Login failed" })



        } catch (error: any) {
            console.error(`Error during user login: ${error}`)
            return res.status(500).json({ error: 'Internal Server Error' })
        }
    }
)

export default router