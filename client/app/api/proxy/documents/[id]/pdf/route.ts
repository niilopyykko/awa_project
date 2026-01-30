import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL!

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const backendUrl = `${BACKEND_URL}/api/documents/${id}/pdf`

        const headers: Record<string, string> = {}

        const auth = req.headers.get("authorization")
        if (auth) headers.Authorization = auth

        const cookie = req.headers.get("cookie")
        if (cookie) headers.cookie = cookie

        const res = await fetch(backendUrl, { headers })

        if (!res.ok) {
            const data = await res.json().catch(() => null)
            return NextResponse.json(data || { message: "Error fetching PDF" }, { status: res.status })
        }

        const arrayBuffer = await res.arrayBuffer()
        const contentType = res.headers.get("content-type") || "application/pdf"

        return new NextResponse(arrayBuffer, {
            status: 200,
            headers: { "Content-Type": contentType }
        })
    } catch (err) {
        console.error("PDF proxy error:", err)
        return NextResponse.json({ message: "Internal server error" }, { status: 500 })
    }
}
