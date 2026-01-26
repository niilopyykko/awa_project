import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001"

export async function POST(req: NextRequest) {
  try {
    // Forward the raw request body and relevant headers so multipart/form-data uploads work
    const contentType = req.headers.get('content-type') || '';
    const cookieHeader = req.headers.get('cookie') || '';
    const raw = await req.arrayBuffer();

    const res = await fetch(`${BACKEND_URL}/user/register`, {
      method: 'POST',
      headers: {
        ...(contentType ? { 'content-type': contentType } : {}),
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: raw,
      // allow backend to set cookies via Set-Cookie header in response
      credentials: 'include',
    })

    let data = null
    try {
      data = await res.json()
    } catch (e) {
      data = { message: await res.text() }
    }
    // If backend returned token/username in JSON, set cookies on response
    const out = NextResponse.json(data, { status: res.status })
    try {
      const token = data?.token;
      const username = data?.username || data?.user || (data && data.user?.username);
      const cookieOptions: any = { path: '/', sameSite: 'lax' };
      if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

      if (token) {
        out.cookies.set('token', token, { ...cookieOptions, httpOnly: true });
      }
      if (username) {
        out.cookies.set('user', String(username), { ...cookieOptions });
      }
    } catch (e) {
      // ignore cookie-setting errors but still return response body
      console.warn('Failed to attach cookies in register proxy', e);
    }

    return out
  } catch (err) {
    console.error("Register JSON proxy error:", err)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  // Simple endpoint to allow client to ping the proxy (used to ensure cookies are set)
  return NextResponse.json({ ok: true })
}
