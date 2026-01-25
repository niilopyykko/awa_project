import { Request, Response, Router } from 'express'

const router: Router = Router()

router.post('/logout', (_req: Request, res: Response) => {
  try {
    res.clearCookie('token', { path: '/' })
    res.clearCookie('user', { path: '/' })
    return res.status(200).json({ message: 'Logged out' })
  } catch (err) {
    console.error('Logout error', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
