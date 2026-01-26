import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001"
const DISABLE_REGISTRATION = process.env.DISABLE_REGISTRATION === "true"

type RegisterData = {
  token?: string
  username?: string
  user?: string | { username?: string }
  message?: string
  [key: string]: unknown
}

export async function POST(req: NextRequest) {
  try {
    // Short-circuit if registration is disabled so backend (and multer) never sees the payload
    if (DISABLE_REGISTRATION) {
      return NextResponse.json({ message: "Registration is disabled" }, { status: 403 })
    }

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

    let data: RegisterData = {}
    try {
      const parsed: unknown = await res.json()
      if (parsed && typeof parsed === 'object') {
        data = parsed as RegisterData
      } else {
        data = { message: String(parsed) }
      }
    } catch (e) {
      const textFallback = await res.text().catch(() => '')
      data = { message: textFallback || 'Unknown error' }
    }
    // If backend returned token/username in JSON, set cookies on response
    const out = NextResponse.json(data, { status: res.status })
    try {
      const token = data?.token;
      const username = data?.username || (typeof data?.user === 'string' ? data.user : data?.user?.username);
      const baseCookieOptions = { path: '/', sameSite: 'lax' as const };
      const secureOption = process.env.NODE_ENV === 'production' ? { secure: true as const } : {};

      if (token) {
        out.cookies.set('token', token, { ...baseCookieOptions, ...secureOption, httpOnly: true });
      }
      if (username) {
        out.cookies.set('user', String(username), { ...baseCookieOptions, ...secureOption });
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
