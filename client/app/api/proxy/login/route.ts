import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const username = formData.get('username')
    const password = formData.get('password')

    const res = await fetch(`${BACKEND_URL}/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include'
    })

    const data = await res.json()

    const nextRes = NextResponse.json(data, { status: res.status })

    if (data.token) {
      nextRes.cookies.set('token', data.token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      })
    

    // Also set a readable `user` cookie so client UI can read username after refresh.
    if (username) {
      try {
        const uname = typeof username === 'string' ? username : String(username)
        nextRes.cookies.set('user', uname, { path: '/', sameSite: 'lax' })
      } catch {
        // ignore cookie set errors
      }
    }
  }
    return nextRes
  } catch (err) {
    console.error('Login proxy error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
