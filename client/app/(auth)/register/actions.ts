"use server"

import {LoginState, performLogin} from "../login/actions"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001"

export async function registerAction(prev: LoginState, formData:FormData) {
  const username = formData.get("username") as string
  const password = formData.get("password") as string

  // 1) Register the user
  const res = await fetch(`${BACKEND_URL}/user/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
  console.log(res)

  const data = await res.json()
  if (!res.ok) return { message: data.message }

  // 2) Log the user in (without redirect)
  const loginResult = await performLogin(username, password)
  if (loginResult.error) return { message: loginResult.error }

  return { success: true }
}
