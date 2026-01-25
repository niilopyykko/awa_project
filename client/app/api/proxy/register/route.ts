import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function POST(req: NextRequest) {
  console.log("Register proxy hit!")

  try {
    const formData = await req.formData()

    const backendFormData = new FormData()
    formData.forEach((value, key) => {
      backendFormData.append(key, value)
    })

    const res = await fetch(`${BACKEND_URL}/user/register`, {
      method: 'POST',
      body: backendFormData
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error('Register proxy error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
