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

    const res = await fetch(`${BACKEND_URL}/user/me/avatar`, {
      method: 'POST',
      headers,
      body: req.body,
      duplex: 'half' // required for FormData
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error("Avatar proxy error:", err)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
