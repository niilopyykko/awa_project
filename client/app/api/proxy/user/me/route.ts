import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL

  const res = await fetch(`${backend}/user/me`, {
    credentials: "include",
    headers: {
      // Forward cookies to backend
      Cookie: (await headers()).get("cookie") ?? "",
    },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
