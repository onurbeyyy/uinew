import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_URL || 'https://apicanlimenu.online';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customerId');
    const sessionId = searchParams.get('sessionId');
    const endUserId = searchParams.get('endUserId');
    const userAgent = request.headers.get('user-agent') || '';

    // IP adresini al
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || '';

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'CustomerId required' },
        { status: 400 }
      );
    }

    // API'ye ziyaret kaydı gönder
    const params = new URLSearchParams({
      customerId: customerId,
      sessionId: sessionId || '',
    });

    if (endUserId) params.append('endUserId', endUserId);
    if (userAgent) params.append('userAgent', userAgent.substring(0, 500));
    if (ipAddress) params.append('ipAddress', ipAddress);

    const response = await fetch(
      `${API_BASE_URL}/api/Customer/CountUnique?${params.toString()}`,
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
