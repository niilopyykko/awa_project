import NavbarClient from "./NavbarClient"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

export default async function NavbarServer() {
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value ?? null

    let userData = null
    if (token) {
        userData = await fetch(`${backend}/user/me`, {
            cache: "no-store",
            headers: { Authorization: `Bearer ${token}` },
        }).then(r => (r.ok ? r.json() : null))
    }

    const user = userData?.username ?? null
    const avatarUrl = user ? `${backend}/user/me/avatar` : null

    return <NavbarClient user={user} avatarUrl={avatarUrl} />
}
