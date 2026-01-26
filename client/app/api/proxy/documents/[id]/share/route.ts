import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(req: NextRequest,  { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params; 
    const body = await req.json().catch(() => null);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    // Authorization header first
    const token = req.headers.get('authorization') || req.cookies.get('token')?.value;
    if (token) headers['authorization'] = `Bearer ${token}`;

    // Forward raw cookie for HttpOnly
    const rawCookie = req.headers.get('cookie');
    if (rawCookie) headers['cookie'] = rawCookie;

    try {
        const res = await fetch(`${BACKEND_URL}/api/documents/${id}/share`, {
            method: 'POST',
            headers,
            body: body ? JSON.stringify(body) : undefined
        });

        const data = await res.json().catch(() => null);
        const out = NextResponse.json(data, { status: res.status });
        const setCookie = res.headers.get('set-cookie');
        if (setCookie) out.headers.set('set-cookie', setCookie);
        return out;
    } catch (err) {
        console.error('Share proxy error:', err);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
