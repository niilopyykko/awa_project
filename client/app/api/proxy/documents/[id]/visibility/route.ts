import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ message: "Missing document ID" }, { status: 400 });

    const body = await req.json();

    const headers: Record<string, string> = { "Content-Type": "application/json" };

    // Forward Authorization header from client or cookie
    const auth = req.headers.get("authorization");
    if (auth) headers["Authorization"] = auth;
    const cookie = req.headers.get("cookie");
    if (cookie) headers["Cookie"] = cookie;

    const res = await fetch(`${BACKEND_URL}/api/documents/${id}/visibility`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json({ message: data?.message || "Backend error" }, { status: res.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Proxy visibility error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = await params;
  const res = await fetch(`${BACKEND_URL}/api/documents/${id}`, {
    headers: req.headers,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
