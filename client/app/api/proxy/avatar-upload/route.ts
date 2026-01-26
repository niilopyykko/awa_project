import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001"

export async function POST(req: NextRequest) {
  try {
    let token = req.headers.get('authorization') || ''
    if (!token) {
      const cookieToken = req.cookies.get('token')?.value
      if (cookieToken) token = `Bearer ${cookieToken}`
    }

    if (!token) return NextResponse.json({ message: 'No token' }, { status: 401 })

    const headers: Record<string, string> = {}
    if (token) headers.Authorization = token
    // forward raw cookie header for HttpOnly token support
    const rawCookie = req.headers.get('cookie')
    if (rawCookie) headers['cookie'] = rawCookie

    // Read raw body and forward content-type so multipart boundary is preserved
    const contentType = req.headers.get('content-type') || '';
    const raw = await req.arrayBuffer();

    const forwardHeaders: Record<string, string> = { ...headers };
    if (contentType) forwardHeaders['content-type'] = contentType;

    const res = await fetch(`${BACKEND_URL}/user/me/avatar`, {
      method: 'POST',
      headers: forwardHeaders,
      body: raw,
      credentials: 'include'
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error("Avatar proxy error:", err)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
