import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const formData = await req.formData()

  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()

  const res = await fetch(`${process.env.BACKEND_URL}/user/me/avatar`, {
    method: "POST",
    body: formData,
    credentials: "include",
    headers: {Cookie: cookieHeader}
  })

  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
