'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'


export default function Navbar() {

    const [token, setToken] = useState<string | null>(null)
    const [user, setUser] = useState<string | null>(null)
    const [menuOpen, setMenuOpen] = useState(false)


    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setToken(localStorage.getItem('token'))
        setUser(localStorage.getItem('user'))

    }, [])

    const logout = () => {
        localStorage.removeItem('token')
        setToken(null)
        localStorage.removeItem('user')
        setUser(null)
        location.reload();

    }


    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white h-16">
            <div className="flex items-center w-full gap-4 h-full px-4">
                {/* HOMEBUTTON */}
                <Link href="/" className='bg-blue-500 p-2 rounded hover:bg-blue-700 active:bg-blue-800'>Home</Link>

                {/* Desktop menu (hidden on mobile) */}
                <div className="hidden md:flex gap-4 items-center">
                    <Link href="/editor" className='bg-blue-500 p-2 rounded hover:bg-blue-700 active:bg-blue-800'>Editor</Link>
                    <Link href="/upload" className='bg-blue-500 p-2 rounded hover:bg-blue-700 active:bg-blue-800'>Upload</Link>
                </div>

                {/* Right side auth (desktop) */}
                <div className="ml-auto hidden md:flex gap-4 items-center">
                    {!token && <Link href="/login" className='bg-blue-500 p-2 rounded hover:bg-blue-700 active:bg-blue-800'>Log in</Link>}
                    {!token && <Link href="/register" className='bg-blue-500 p-2 rounded hover:bg-blue-700 active:bg-blue-800'>Register</Link>}

                    {token && (
                        <>
                            <span className="text-sm">
                                Logged in as <span className="font-semibold">{user}</span>
                            </span>                            <button
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
                    <Link href="/editor" onClick={() => setMenuOpen(false)}>
                        Editor
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
                            <span className="text-sm">
                                Logged in as <span className="font-semibold">{user}</span>
                            </span>
                        </div>                        <button
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
