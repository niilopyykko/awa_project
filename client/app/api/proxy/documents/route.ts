import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const query = url.search

    // derive token from Authorization header or cookie
    let token = req.headers.get('authorization') || ''
    if (!token) {
      const cookieToken = req.cookies.get('token')?.value
      if (cookieToken) token = `Bearer ${cookieToken}`
    }

    const headers: Record<string, string> = {}
    if (token) headers.Authorization = token

    const res = await fetch(`${BACKEND_URL}/api/documents${query}`, {
      method: 'GET',
      headers
    })

    const data = await res.json().catch(() => null)
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error('Documents proxy error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}