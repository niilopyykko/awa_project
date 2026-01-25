'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Link from 'next/link'
import Image from 'next/image'
import { useRef } from 'react'

export default function Navbar() {
    const { token, user, avatarUrl, logout } = useAuth()
    const [profilePic, setProfilePic] = useState<string>(avatarUrl ?? '/vercel.svg')
    const objectUrlRef = useRef<string | null>(null)
    const [menuOpen, setMenuOpen] = useState(false)

    // Fetch avatar when `user` changes (we rely on HttpOnly token cookie on server)
    useEffect(() => {
        if (!user) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setProfilePic('/vercel.svg')
            return
        }

        const fetchAvatar = async () => {
            try {
                const res = await fetch('/api/proxy/avatar', {
                    credentials: 'include',

                })

                if (!res.ok) {
                    const text = await res.text().catch(() => null)
                    console.error('Avatar fetch failed', res.status, text)
                    setProfilePic('/vercel.svg')
                    return
                }

                const blob = await res.blob()
                const newUrl = URL.createObjectURL(blob)
                // revoke previous
                if (objectUrlRef.current && objectUrlRef.current.startsWith('blob:')) {
                    URL.revokeObjectURL(objectUrlRef.current)
                }
                objectUrlRef.current = newUrl
                setProfilePic(newUrl)
            } catch (err) {
                console.error('Failed to fetch avatar', err)
                setProfilePic('/vercel.svg')
            }
        }

        fetchAvatar()
        return () => {
            // revoke any created object URL on cleanup
            if (objectUrlRef.current && objectUrlRef.current.startsWith('blob:')) {
                URL.revokeObjectURL(objectUrlRef.current)
                objectUrlRef.current = null
            }
        }
    }, [user])


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
                    {!user && <Link href="/login" className='bg-blue-500 p-2 rounded hover:bg-blue-700 active:bg-blue-800'>Log in</Link>}
                    {!user && <Link href="/register" className='bg-blue-500 p-2 rounded hover:bg-blue-700 active:bg-blue-800'>Register</Link>}

                    {user && (
                        <>
                            <div className="flex items-center gap-2 bg-blue-700 rounded-2xl p-1 px-2">
                                {profilePic ? (<Image
                                    src={profilePic || '/vercel.svg'}
                                    alt="Profile Avatar"
                                    width={40}
                                    height={40}
                                    className="rounded-full"
                                    unoptimized
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

                    {!user && (
                        <Link href="/login" onClick={() => setMenuOpen(false)}>
                            Log in
                        </Link>
                    )}
                    {!user && (
                        <Link href="/register" onClick={() => setMenuOpen(false)}>
                            Register
                        </Link>
                    )}

                    {user && (<>
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
