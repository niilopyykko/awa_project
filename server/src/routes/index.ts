import { Request, Response, Router } from "express";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const router: Router = Router();

// Redirect legacy share link to frontend
router.get('/documents/:shareToken/readonly', (req: Request, res: Response) => {
  res.redirect(302, `${CLIENT_URL}/share/${req.params.shareToken}`)
})

export default router;

