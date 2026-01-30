"use server"
import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:3001";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;


  // Forward Bearer token as Authorization header if present in cookies or request
  const headers: Record<string, string> = {};
  const cookie = req.headers.get("cookie");
  if (cookie) headers["cookie"] = cookie;

  // Try to extract Bearer token from Authorization header or cookies
  let bearerToken: string | null = null;
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    bearerToken = authHeader;
  } else if (cookie) {
    // Try to extract token from cookie (e.g., 'token=...')
    const match = cookie.match(/(?:^|; )token=([^;]+)/);
    if (match) {
      bearerToken = `Bearer ${decodeURIComponent(match[1])}`;
    }
  }
  if (bearerToken) {
    headers["authorization"] = bearerToken;
  }

  const backendRes = await fetch(`${BACKEND}/api/documents/${id}/file`, {
    cache: "no-store",
    headers,
  });

  if (!backendRes.ok) {
    return new NextResponse("File not found", { status: 404 });
  }

  const contentType = backendRes.headers.get("content-type") || "application/octet-stream";
  const contentLength = backendRes.headers.get("content-length");
  const contentDisposition = backendRes.headers.get("content-disposition");

  return new NextResponse(backendRes.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      ...(contentLength ? { "Content-Length": contentLength } : {}),
      ...(contentDisposition ? { "Content-Disposition": contentDisposition } : {}),
    },
  });
}
