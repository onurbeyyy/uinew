import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, expirySeconds } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'CustomerId gerekli' }, { status: 400 });
    }

    const apiUrl = process.env.API_URL || 'https://apicanlimenu.online';
    const response = await fetch(`${apiUrl}/api/SelfService/CreateSession`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ customerId, expirySeconds })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ CreateSession API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
