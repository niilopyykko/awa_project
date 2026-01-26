import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function POST(
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

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = token
    const rawCookie = req.headers.get('cookie')
    if (rawCookie) headers['cookie'] = rawCookie

    const res = await fetch(`${BACKEND_URL}/api/documents/${id}/generate-share-link`, {
      method: 'POST',
      headers
    })

    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await res.json().catch(() => null)
      return NextResponse.json(body, { status: res.status })
    } else {
      const text = await res.text().catch(() => '')
      return new NextResponse(text, {
        status: res.status,
        headers: { 'content-type': contentType || 'text/plain; charset=utf-8' }
      })
    }
  } catch (err) {
    console.error('Generate share link proxy error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
