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

    const headers: Record<string, string> = {}
    if (token) headers.Authorization = token

    const res = await fetch(`${BACKEND_URL}/api/documents/${id}/trash`, {
      method: 'POST',
      headers,
    })

    const data = await res.json().catch(() => null)
    const out = NextResponse.json(data, { status: res.status })
    const setCookie = res.headers.get('set-cookie')
    if (setCookie) out.headers.set('set-cookie', setCookie)
    return out
  } catch (err) {
    console.error('Trash proxy error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
