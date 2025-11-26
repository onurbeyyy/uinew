import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_URL || 'https://canlimenu.online';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.sessionId) {
      return NextResponse.json(
        { success: false, message: 'SessionId required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${API_BASE_URL}/api/SelfService/UseSession`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: body.sessionId,
          endUserId: body.endUserId || null,
          ipAddress: body.ipAddress || null,
          userAgent: body.userAgent || null,
        }),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('UseSession proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'UseSession failed' },
      { status: 500 }
    );
  }
}
