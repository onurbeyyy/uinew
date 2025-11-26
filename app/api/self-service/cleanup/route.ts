import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const apiUrl = process.env.API_URL || 'https://canlimenu.online';
    const response = await fetch(`${apiUrl}/api/SelfService/CleanupExpiredSessions`, {
      method: 'POST',
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
    console.error('❌ Cleanup API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
