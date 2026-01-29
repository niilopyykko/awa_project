import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:3001";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;


  const backendRes = await fetch(`${BACKEND}/api/share/${token}/file`, {
    cache: "no-store",
  });

  if (!backendRes.ok) {
    return new NextResponse("File not found", { status: 404 });
  }

  const contentType =
    backendRes.headers.get("content-type") || "application/octet-stream";
  const contentLength = backendRes.headers.get("content-length");

  return new NextResponse(backendRes.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      ...(contentLength ? { "Content-Length": contentLength } : {}),
    },
  });
}
