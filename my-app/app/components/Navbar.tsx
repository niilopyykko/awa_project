'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Navbar() {
    const [token, setToken] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => { //this makes it async and i get no more errors
            setToken(localStorage.getItem('token'))
            setMounted(true)
        }, 0)

        return () => clearTimeout(timer)
    }, [])

    const logout = () => {
        localStorage.removeItem('token')
        setToken(null)
    }

    if (!mounted) {
        return (
            <nav className="bg-blue-600 text-white p-4 flex gap-4">
                <Link href="/">Home</Link>
                <Link href="/about">About</Link>
                <Link href="/editor">Editor</Link>
                <Link href="/upload">Upload</Link>
                <Link href="/login">Log in</Link>
            </nav>
        )
    }

    return (
        <nav className="bg-blue-600 text-white p-4 flex gap-4">
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
            <Link href="/editor">Editor</Link>
            <Link href="/upload">Upload</Link>

            {!token && <Link href="/login">Log in</Link>}
            {!token && <Link href="/register">Register</Link>}

            {token && (
                <button
                    onClick={logout}
                    className="bg-red-500 px-2 py-1 rounded hover:bg-red-600"
                >
                    Log out
                </button>
            )}
        </nav>
    )
}
