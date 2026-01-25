import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function POST(_req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/user/logout`, { method: 'POST' })

    // Build headers as an array of tuples to preserve multiple Set-Cookie entries
    const headersArr: [string, string][] = []
    res.headers.forEach((value, key) => {
      headersArr.push([key, value])
    })

    // Stream backend response body through to the client so Set-Cookie headers are delivered
    const body = await res.text().catch(() => '')
    return new NextResponse(body, { status: res.status, headers: headersArr.length ? headersArr : undefined })
  } catch (err) {
    console.error('Logout proxy error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
