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

    const headers: HeadersInit = {}
    if (token) headers['authorization'] = token
    const rawCookie = req.headers.get('cookie')
    if (rawCookie) headers['cookie'] = rawCookie

    const res = await fetch(`${BACKEND_URL}/api/documents/${id}/pdf`, {
      method: 'GET',
      headers,
    })

    const contentType = res.headers.get('content-type') || 'application/octet-stream'
    const arrayBuffer = await res.arrayBuffer()

    const out = new NextResponse(arrayBuffer, {
      status: res.status,
      headers: {
        'content-type': contentType,
        'content-disposition': res.headers.get('content-disposition') || ''
      }
    })

    const setCookie = res.headers.get('set-cookie')
    if (setCookie) out.headers.set('set-cookie', setCookie)

    return out
  } catch (err) {
    console.error('PDF proxy error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
