import { Request, Response, NextFunction } from "express"
import jwt, { JwtPayload } from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

export interface CustomRequest extends Request {
    user?: JwtPayload
}

export const validateToken = (req: CustomRequest, res: Response, next: NextFunction) => {
    // Prefer Authorization header but also accept a cookie named `token`.
    let authHeader = req.header('authorization');
    let token: string | undefined;

    if (authHeader) {
        token = authHeader.split(" ")[1];
    } else if (typeof req.headers.cookie === 'string') {
        // crude cookie parse for `token=...` if Authorization header isn't present
        if (req.headers.cookie) {
            const cookies = req.headers.cookie.split(";").map(c => c.trim());
            const tokenCookie = cookies.find(c => c.startsWith("token="));
            if (tokenCookie) {
                token = tokenCookie.split("=")[1];
                // remove any trailing attributes (in case cookie string contains ';')
                if (token && token.includes(';')) token = token.split(';')[0];
                if (token) token = decodeURIComponent(token);
            }
        }
    }

    if (!token) {
        console.warn('[Auth] Missing Authorization header or token cookie');
        return res.status(401).json({ message: "Access denied, missing Authorization header or token cookie" });
    }

    try {
        const payload = jwt.verify(token, process.env.SECRET as string) as JwtPayload | any;
        // Normalize common id fields into `id` for downstream handlers
        const normalizedId = payload && (payload.id || payload._id || payload.sub);
        if (normalizedId) payload.id = String(normalizedId);
        req.user = payload as JwtPayload;
        // Only log successful verification
        console.log('[Auth] Token verified for user ID:', (req.user as any).id);
        next();
    } catch (error: any) {
        console.error('[Auth] JWT verification failed:', error.message);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}
