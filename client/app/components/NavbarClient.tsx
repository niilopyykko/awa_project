'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { IoMenu } from "react-icons/io5"
import ThemeToggle from "./ThemeToggle"
import { fetchUserAvatar } from "./fetchUserAvatar"
type Props = {
    user: string | null
    avatarUrl: string | null
}

export default function NavbarClient({ user, avatarUrl }: Props) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [profilePic, setProfilePic] = useState(
        avatarUrl ?? "/siesta.jpg"
    )

    useEffect(() => {
        async function loadAvatar() {
            if (!avatarUrl && user) {
                const fresh = await fetchUserAvatar()
                if (fresh) { setProfilePic(`${fresh}?ts=${Date.now()}`) }
            } else if (avatarUrl) { setProfilePic(`${avatarUrl}?ts=${Date.now()}`) }
        } loadAvatar()
    }, [avatarUrl, user])

    const handleLogout = async () => {
        await fetch("/api/proxy/logout", {
            method: "POST",
            credentials: "include",
        })
        // Force UI refresh after logout
        window.location.reload()
    }

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-blue-400 dark:bg-blue-900 text-white h-16 shadow-md">
            <div className="flex items-center w-full gap-4 h-full px-4">

                <Link
                    href="/"
                    className="bg-blue-600 dark:bg-blue-700 p-2 rounded hover:bg-blue-800 dark:hover:bg-blue-600 transition-colors"
                >
                    Home
                </Link>

                <div className="hidden md:flex gap-4 items-center">
                    <Link
                        href="/editor"
                        className="bg-blue-600 dark:bg-blue-700 p-2 rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                        onClick={() => {
                            try {
                                sessionStorage.clear()
                            } catch { }
                        }}
                    >
                        New Text Document
                    </Link>

                    <Link
                        href="/upload"
                        className="bg-blue-600 dark:bg-blue-700 p-2 rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                    >
                        Upload
                    </Link>
                </div>


                <div className="ml-auto hidden md:flex gap-4 items-center">
                    <ThemeToggle />

                    {!user && (
                        <>
                            <Link
                                href="/login"
                                className="bg-blue-600 dark:bg-blue-700 p-2 rounded hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors"
                            >
                                Log in
                            </Link>
                            <Link
                                href="/register"
                                className="bg-blue-600 dark:bg-blue-700 p-2 rounded hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors"
                            >
                                Register
                            </Link>
                        </>
                    )}

                    {user && (
                        <>
                            <div className="flex items-center gap-2 bg-blue-700 dark:bg-blue-950 rounded-2xl p-1 px-2 shadow-sm">
                                <Image
                                    src={profilePic}
                                    alt="avatar"
                                    width={40}
                                    height={40}
                                    className="rounded-full object-cover w-10 h-10"
                                    loading="eager"
                                    unoptimized
                                    onError={() => setProfilePic("/siesta.jpg")}
                                />
                                <span className="text-sm">
                                    Logged in as <span className="font-semibold">{user}</span>
                                </span>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="bg-red-500 dark:bg-red-700 p-2 rounded hover:bg-red-600 dark:hover:bg-red-600 transition-colors"
                            >
                                Log out
                            </button>
                        </>
                    )}
                </div>

                <button
                    className="md:hidden ml-auto text-2xl hover:bg-blue-700 dark:hover:bg-blue-700 border-2 bg-blue-500 dark:bg-blue-800 rounded-md p-1 transition-colors"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    <IoMenu />
                </button>
            </div>

            {menuOpen && (
                <div className="md:hidden mt-2 p-4 flex flex-col gap-4 bg-blue-500 dark:bg-blue-900 text-white shadow-lg">
                    <ThemeToggle showLabel variant="ghost" />

                    <Link href="/editor" onClick={() => setMenuOpen(false)}>
                        New Text Document
                    </Link>

                    <Link href="/upload" onClick={() => setMenuOpen(false)}>
                        Upload
                    </Link>

                    {!user && (
                        <>
                            <Link href="/login" onClick={() => setMenuOpen(false)}>
                                Log in
                            </Link>
                            <Link href="/register" onClick={() => setMenuOpen(false)}>
                                Register
                            </Link>
                        </>
                    )}

                    {user && (
                        <>
                            <div className="flex items-center gap-3 bg-blue-500 dark:bg-blue-950 px-3 py-1 rounded-full shadow">
                                <Image
                                    src={profilePic}
                                    alt="avatar"
                                    width={32}
                                    height={32}
                                    className="rounded-full object-cover"
                                    unoptimized
                                    onError={() => setProfilePic("/default-avatar.png")}
                                />
                                <span className="text-sm">
                                    Logged in as <span className="font-semibold">{user}</span>
                                </span>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="bg-red-500 dark:bg-red-700 px-2 py-1 rounded hover:bg-red-600 dark:hover:bg-red-600 transition-colors"
                            >
                                Log out
                            </button>
                        </>
                    )}
                </div>
            )}
        </nav>
    )
}
