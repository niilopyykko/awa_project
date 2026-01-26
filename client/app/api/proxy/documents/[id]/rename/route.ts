import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => null)

    let token = req.headers.get('authorization') || ''
    if (!token) {
      const cookieToken = req.cookies.get('token')?.value
      if (cookieToken) token = `Bearer ${cookieToken}`
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = token
    const rawCookie = req.headers.get('cookie')
    if (rawCookie) headers['cookie'] = rawCookie

    const res = await fetch(`${BACKEND_URL}/api/documents/${id}/rename`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    const data = await res.json().catch(() => null)
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error('Rename proxy error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
