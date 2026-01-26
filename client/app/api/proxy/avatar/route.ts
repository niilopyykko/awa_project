import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function GET(req: NextRequest) {
  try {
    // Prefer explicit Authorization header, otherwise read token from cookie.
    let token = req.headers.get('authorization') || ''
    if (!token) {
      const cookieToken = req.cookies.get('token')?.value
      if (cookieToken) token = `Bearer ${cookieToken}`
    }

    const headers: Record<string, string> = {}
    if (token) headers.Authorization = token
    // forward raw cookie header for HttpOnly token support
    const rawCookie = req.headers.get('cookie')
    if (rawCookie) headers['cookie'] = rawCookie

    const res = await fetch(`${BACKEND_URL}/user/me/avatar`, {
      headers
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      return NextResponse.json(data || { message: 'Error fetching avatar' }, { status: res.status })
    }

    const arrayBuffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'application/octet-stream'

    return new NextResponse(arrayBuffer, {
      status: res.status,
      headers: { 'Content-Type': contentType }
    })
  } catch (err) {
    console.error('Avatar proxy error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
