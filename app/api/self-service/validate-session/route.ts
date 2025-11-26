import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'SessionId parametresi gerekli' }, { status: 400 });
  }

  try {
    const apiUrl = process.env.API_URL || 'https://canlimenu.online';
    const response = await fetch(`${apiUrl}/api/SelfService/ValidateSession?sessionId=${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ ValidateSession API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
