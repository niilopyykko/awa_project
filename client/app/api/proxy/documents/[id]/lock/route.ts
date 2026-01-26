import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function GET(
    req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        let token = req.headers.get('authorization') || ''
        if (!token) {
            const cookieToken = req.cookies.get('token')?.value
            if (cookieToken) token = `Bearer ${cookieToken}`
        }

    const headers: Record<string, string> = {}
    if (token) headers.Authorization = token
    const rawCookie = req.headers.get('cookie')
    if (rawCookie) headers['cookie'] = rawCookie

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

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params
        let token = req.headers.get('authorization') || ''
        if (!token) {
            const cookieToken = req.cookies.get('token')?.value
            if (cookieToken) token = `Bearer ${cookieToken}`
        }
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = token
    const rawCookie = req.headers.get('cookie')
    if (rawCookie) headers['cookie'] = rawCookie

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
