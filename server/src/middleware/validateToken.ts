import { Request, Response, NextFunction } from "express"
import jwt, { JwtPayload } from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

export interface CustomRequest extends Request {
    user?: JwtPayload
}

export const validateToken = (req: CustomRequest, res: Response, next: NextFunction) => {
    const authHeader = req.header('authorization');

    if (!authHeader) {
        console.warn('[Auth] Missing Authorization header');
        return res.status(401).json({ message: "Access denied, missing Authorization header" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        console.warn('[Auth] Token missing in Authorization header');
        return res.status(401).json({ message: "Access denied, missing token" });
    }

    try {
        req.user = jwt.verify(token, process.env.SECRET as string) as JwtPayload;
        // Only log successful verification
        console.log('[Auth] Token verified for user ID:', req.user.id);
        next();
    } catch (error: any) {
        console.error('[Auth] JWT verification failed:', error.message);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}
