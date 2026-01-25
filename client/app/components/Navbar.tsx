'use client'
import Image from 'next/image';
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'



const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || ''
const ORIGIN = API.replace(/\/api$/, '')

export default function Navbar() {
    const { token, user, logout } = useAuth() //Must have if we want login and logout to refresh navbar and drivepage
    const [menuOpen, setMenuOpen] = useState(false)
    const [profilePic, setProfilePic] = useState<string | null>(null)

    useEffect(() => {
        if (!token) {
            // clear any previously shown avatar when logged out
            setTimeout(() => setProfilePic(null), 0)
            return
        }

        let mounted = true
        let currentUrl: string = '';

        (async () => {
            // clear stale avatar while fetching (defer to avoid sync setState warnings)
            setTimeout(() => setProfilePic(null), 0)
            try {
                const response = await fetch(`${ORIGIN}/user/me/avatar`, {
                    headers: { Authorization: token ? `Bearer ${token}` : '' }
                })
                if (response.ok && mounted) {
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    currentUrl = url
                    setProfilePic(url);
                } else {
                    // ensure we don't keep a stale avatar if server returns no image
                    if (mounted) setTimeout(() => setProfilePic(null), 0)
                }
            } catch (err) {
                console.error('Failed to fetch profile', err)
                if (mounted) setTimeout(() => setProfilePic(null), 0)
            }
        })()

        return () => {
            mounted = false
            if (currentUrl) {
                try { URL.revokeObjectURL(currentUrl) } catch { }
            }
        }
    }, [token])

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white h-16">
            <div className="flex items-center w-full gap-4 h-full px-4">
                {/* HOMEBUTTON */}
                <Link href="/" className='bg-blue-500 p-2 rounded hover:bg-blue-700 active:bg-blue-800'>Home</Link>

                {/* Desktop menu (hidden on mobile) */}
                <div className="hidden md:flex gap-4 items-center">
                    <Link href="/editor" className='bg-blue-500 p-2 rounded hover:bg-blue-700 active:bg-blue-800' onClick={() => {
                        try {
                            sessionStorage.removeItem('editorContent')
                            sessionStorage.removeItem('editorName')
                            sessionStorage.removeItem('editorId')
                            sessionStorage.removeItem('editorEditors')
                            sessionStorage.removeItem('editorCommenter')
                            sessionStorage.removeItem('editorViewer')
                            sessionStorage.removeItem('editorIsPublic')
                        } catch { }
                    }}>New Text Document</Link>
                    <Link href="/upload" className='bg-blue-500 p-2 rounded hover:bg-blue-700 active:bg-blue-800'>Upload</Link>
                </div>

                {/* Right side auth (desktop) */}
                <div className="ml-auto hidden md:flex gap-4 items-center">
                    {!token && <Link href="/login" className='bg-blue-500 p-2 rounded hover:bg-blue-700 active:bg-blue-800'>Log in</Link>}
                    {!token && <Link href="/register" className='bg-blue-500 p-2 rounded hover:bg-blue-700 active:bg-blue-800'>Register</Link>}

                    {token && (
                        <>
                            <div className="flex items-center gap-2">
                                {profilePic ? (<Image
                                    src={profilePic}
                                    alt="Profile Avatar"
                                    width={40}
                                    height={40}
                                    className="rounded-full"
                                />) : (null)}
                                <span className="text-sm">
                                    Logged in as <span className="font-semibold">{user}</span>
                                </span>
                            </div>
                            <button
                                onClick={logout}
                                className="bg-red-500 p-2 rounded hover:bg-red-600 hover:cursor-pointer"
                            >
                                Log out
                            </button>
                        </>)}
                </div>

                {/* Burger button (mobile) - visible only on small screens */}
                <button
                    className="md:hidden ml-auto text-2xl hover:bg-blue-700 active:bg-blue-800 border-2 bg-blue-500 rounded-md p-1"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle menu"
                >
                    ☰
                </button>
            </div>

            {/* Mobile menu: shown below nav on small screens */}
            {menuOpen && (
                <div className="md:hidden mt-2 p-4 flex flex-col gap-4 bg-blue-600 text-white">
                    <Link href="/editor" onClick={() => { try { sessionStorage.removeItem('editorContent'); sessionStorage.removeItem('editorName'); sessionStorage.removeItem('editorId'); sessionStorage.removeItem('editorEditors'); sessionStorage.removeItem('editorCommenter'); sessionStorage.removeItem('editorViewer'); sessionStorage.removeItem('editorIsPublic'); } catch { } setMenuOpen(false); }}>
                        New Text Document
                    </Link>
                    <Link href="/upload" onClick={() => setMenuOpen(false)}>
                        Upload
                    </Link>

                    {!token && (
                        <Link href="/login" onClick={() => setMenuOpen(false)}>
                            Log in
                        </Link>
                    )}
                    {!token && (
                        <Link href="/register" onClick={() => setMenuOpen(false)}>
                            Register
                        </Link>
                    )}

                    {token && (<>
                        <div className="flex items-center gap-3 bg-blue-500 px-3 py-1 rounded-full shadow">
                            {profilePic && (
                                <Image
                                    src={profilePic}
                                    alt="avatar"
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 rounded-full object-cover"
                                    unoptimized
                                />
                            )}
                            <span className="text-sm">
                                Logged in as <span className="font-semibold">{user}</span>
                            </span>
                        </div>
                        <button
                            onClick={() => { logout(); setMenuOpen(false); }}
                            className="bg-red-500 px-2 py-1 rounded hover:bg-red-600 text-left"
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
