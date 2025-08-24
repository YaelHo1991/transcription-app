import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Forward the request to our backend
    const backendResponse = await fetch((process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000') + '/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    const data = await backendResponse.json()
    
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('Auth proxy error:', error)
    return NextResponse.json(
      { success: false, message: 'שגיאה בשרת' }, 
      { status: 500 }
    )
  }
}