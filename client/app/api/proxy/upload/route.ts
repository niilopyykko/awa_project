import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const backendFormData = new FormData()
    formData.forEach((value, key) => {
      backendFormData.append(key, value)
    })

    // Derive Authorization header from incoming request or cookies (use NextRequest.cookies)
    let token = req.headers.get('authorization') || ''
    if (!token) {
      const cookieToken = req.cookies.get('token')?.value
      if (cookieToken) token = `Bearer ${cookieToken}`
    }

    const headers: Record<string, string> = {}
    if (token) headers.Authorization = token
    // forward raw cookie header so backend can parse HttpOnly cookies
    const rawCookie = req.headers.get('cookie')
    if (rawCookie) headers['cookie'] = rawCookie

    const res = await fetch(`${BACKEND_URL}/api/upload`, {
      method: 'POST',
      headers,
      body: backendFormData
    })

    // Try to parse JSON; if backend returned HTML (error page) fall back to text
    let body: any = null
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      body = await res.json().catch(() => null)
      return NextResponse.json(body, { status: res.status })
    } else {
      // Return raw text (could be an HTML error page) so caller can see the error
      const text = await res.text().catch(() => '')
      return new NextResponse(text, {
        status: res.status,
        headers: { 'content-type': contentType || 'text/plain; charset=utf-8' }
      })
    }
  } catch (err) {
    console.error('Upload proxy error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
