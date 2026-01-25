import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function GET(req: NextRequest) {
  try {
    // `NextURL` doesn't expose `params` in this environment — extract id from pathname.
    const pathname = req.nextUrl.pathname || ''
    const match = pathname.match(/\/documents\/([^\/]+)/)
    const id = match ? match[1] : undefined
    if (!id) return NextResponse.json({ message: 'Missing document id' }, { status: 400 })
    let token = req.headers.get('authorization') || ''
    if (!token) {
      const cookieToken = req.cookies.get('token')?.value
      if (cookieToken) token = `Bearer ${cookieToken}`
    }

    const headers: Record<string, string> = {}
    if (token) headers.Authorization = token

    const res = await fetch(`${BACKEND_URL}/api/documents/${id}`, {
      method: 'GET',
      headers
    })

    const data = await res.json().catch(() => null)
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error('Document proxy error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
