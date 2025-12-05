import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, deviceName, userAgent } = body;

    if (!code) {
      return NextResponse.json({ success: false, error: 'Aktivasyon kodu gerekli' }, { status: 400 });
    }

    const apiUrl = process.env.API_URL || 'https://canlimenu.online';
    const response = await fetch(`${apiUrl}/api/SelfService/ActivateDevice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code, deviceName, userAgent })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('ActivateDevice API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
