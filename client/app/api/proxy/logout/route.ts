import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function POST(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/user/logout`, { method: 'POST' })

    // Build headers as array of tuples for multiple Set-Cookie
    const headersArr: [string, string][] = []
    res.headers.forEach((value, key) => {
      headersArr.push([key, value])
    })

    // Ensure cookies are cleared in the browser
    headersArr.push(['set-cookie', 'token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax'])
    headersArr.push(['set-cookie', 'user=; Path=/; Max-Age=0; SameSite=Lax'])

    const body = await res.text().catch(() => '')
    return new NextResponse(body, { status: res.status, headers: headersArr.length ? headersArr : undefined })
  } catch (err) {
    console.error('Logout proxy error:', err)
    const headersArr: [string, string][] = []
    headersArr.push(['set-cookie', 'token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax'])
    headersArr.push(['set-cookie', 'user=; Path=/; Max-Age=0; SameSite=Lax'])
    return new NextResponse(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: headersArr
    })
  }
}
