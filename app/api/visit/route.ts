import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_URL || 'https://apicanlimenu.online';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customerId');
    const sessionId = searchParams.get('sessionId');

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'CustomerId required' },
        { status: 400 }
      );
    }

    // API'ye ziyaret kaydı gönder
    const response = await fetch(
      `${API_BASE_URL}/api/Customer/CountUnique?customerId=${customerId}&sessionId=${sessionId || ''}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Visit tracking error:', error);
    return NextResponse.json(
      { success: false, message: 'Visit tracking failed' },
      { status: 500 }
    );
  }
}
