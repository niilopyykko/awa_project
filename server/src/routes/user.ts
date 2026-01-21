import { Request, Response, Router } from 'express'
import { body, Result, ValidationError, validationResult } from 'express-validator'
import bcrypt from 'bcrypt'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { User, IUser } from '../models/User'
import { validateToken } from '../middleware/validateToken'

const router: Router = Router()

router.post("/register",
    body("username").trim().escape(),
    body("password").escape(),
    async (req: Request, res: Response) => {
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

            await User.create({
                username: req.body.username,
                password: hash
            })

            return res.status(200).json({ message: "User registered successfully" })

        } catch (error: any) {
            console.error(`Error during registration: ${error}`)
            return res.status(500).json({ error: "Internal Server Error" })
        }

    }
)

router.post("/login",
    body("username").trim().escape(),
    body("password").escape(),
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