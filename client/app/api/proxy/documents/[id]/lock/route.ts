import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function GET(req: NextRequest) {
  try {
    // extract document id from pathname (NextURL may not expose params)
    const pathname = req.nextUrl.pathname || ''
    const match = pathname.match(/\/documents\/([^\/]+)/)
    const id = match ? match[1] : undefined
    if (!id) return NextResponse.json({ message: 'Missing document id' }, { status: 400 })
    // derive token from Authorization header or cookie
    let token = req.headers.get('authorization') || ''
    if (!token) {
      const cookieToken = req.cookies.get('token')?.value
      if (cookieToken) token = `Bearer ${cookieToken}`
    }

    const headers: Record<string, string> = {}
    if (token) headers.Authorization = token

    const res = await fetch(`${BACKEND_URL}/api/documents/${id}/lock`, {
      method: 'GET',
      headers
    })

    const data = await res.json().catch(() => null)
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error('Document lock proxy error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // extract document id from pathname (NextURL may not expose params)
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

    const res = await fetch(`${BACKEND_URL}/api/documents/${id}/lock`, {
      method: 'POST',
      headers
    })

    const data = await res.json().catch(() => null)
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error('Document lock POST proxy error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
