"use server"

export async function fetchUserAvatar() {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL

  const res = await fetch(`${backend}/user/me`, {
    cache: "no-store",
    credentials: "include",
  })

  if (!res.ok) return null

  const data = await res.json()
  if (!data?.username) return null

  return `${backend}/user/me/avatar`
}
