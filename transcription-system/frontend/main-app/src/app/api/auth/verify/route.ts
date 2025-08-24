import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    // Forward the request to our backend
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/auth/verify', {
      method: 'GET',
      headers: {
        'Authorization': authHeader || '',
      }
    })

    const data = await backendResponse.json()
    
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('Auth verify proxy error:', error)
    return NextResponse.json(
      { success: false, message: 'שגיאה בשרת' }, 
      { status: 500 }
    )
  }
}