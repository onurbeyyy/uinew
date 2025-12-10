import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const deviceToken = searchParams.get('deviceToken');

  if (!deviceToken) {
    return NextResponse.json({ success: false, error: 'Device token gerekli' }, { status: 400 });
  }

  try {
    const apiUrl = process.env.API_URL || 'https://apicanlimenu.online';
    const response = await fetch(`${apiUrl}/api/SelfService/ValidateDevice?deviceToken=${deviceToken}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('ValidateDevice API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
