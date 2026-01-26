import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ message: "Missing file id" }, { status: 400 });

    let token = req.headers.get("authorization") || "";
    if (!token) {
      const cookieToken = req.cookies.get("token")?.value;
      if (cookieToken) token = `Bearer ${cookieToken}`;
    }

    const headers: Record<string, string> = {};
    if (token) headers["authorization"] = token;

    const rawCookie = req.headers.get("cookie");
    if (rawCookie) headers["cookie"] = rawCookie;

    const resBackend = await fetch(`${BACKEND_URL}/api/uploads/${id}`, { headers });

    if (!resBackend.ok) {
      const text = await resBackend.text().catch(() => "<unreadable>");
      return new NextResponse(text, { status: resBackend.status });
    }

    const arrayBuffer = await resBackend.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": resBackend.headers.get("content-type") || "application/octet-stream",
        "Content-Length": arrayBuffer.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error("Uploads proxy GET error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
