import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params
        let token = req.headers.get('authorization') || ''
        if (!token) {
            const cookieToken = req.cookies.get('token')?.value
            if (cookieToken) token = `Bearer ${cookieToken}`
        }
        const headers: Record<string, string> = {}
        if (token) headers.Authorization = token
        const rawCookie = req.headers.get('cookie')
        if (rawCookie) headers['cookie'] = rawCookie

        const res = await fetch(`${BACKEND_URL}/api/documents/${id}`, {
            method: 'GET',
            headers
        })

        const data = await res.json().catch(() => null)
        return NextResponse.json(data, { status: res.status })
    } catch (err) {
        console.error('Document proxy error:', err)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params

        let token = req.headers.get('authorization') || ''
        if (!token) {
            const cookieToken = req.cookies.get('token')?.value
            if (cookieToken) token = `Bearer ${cookieToken}`
        }

        const headers: Record<string, string> = {}
        if (token) headers.Authorization = token
        const rawCookie = req.headers.get('cookie')
        if (rawCookie) headers['cookie'] = rawCookie

        const res = await fetch(`${BACKEND_URL}/api/documents/${id}`, {
            method: 'DELETE',
            headers
        })

        // try JSON, but tolerate non-JSON responses
        const data = await res.json().catch(async () => {
            try {
                const txt = await res.text()
                return { text: txt }
            } catch {
                return null
            }
        })

        const out = NextResponse.json(data, { status: res.status })
        const setCookie = res.headers.get('set-cookie')
        if (setCookie) out.headers.set('set-cookie', setCookie)
        return out
    } catch (err) {
        console.error('Document DELETE proxy error:', err)
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
    }
}
