import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:3001'

export async function POST(req: NextRequest) {
  try {
    const body = await req.body

    const res = await fetch(`${BACKEND_URL}/user/register`, {
      method: 'POST',
      body, 
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error('Register proxy error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
