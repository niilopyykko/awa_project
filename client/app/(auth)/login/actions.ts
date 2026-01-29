"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001"

export type LoginState = {
  error?: string
  success?: boolean
  username?: string
} | null

export async function performLogin(username: string, password: string) {
  const res = await fetch(`${BACKEND_URL}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })

  const data = await res.json()
  if (!res.ok) return { error: data?.message ?? "Login failed" }

  const cookieStore = await cookies()

  if (data.token) {
    cookieStore.set("token", data.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    })
  }


  return { success: true, username: data.username }
}

export async function loginAction(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = formData.get("username") as string
  const password = formData.get("password") as string

  await performLogin(username, password)
  redirect("/")
}
