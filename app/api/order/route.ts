import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_URL || 'https://apicanlimenu.online';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Not: endUserId kontrolü kaldırıldı - WiFi sisteminde backend kontrol ediyor
    // Backend'de WiFi'deyse misafir sipariş kabul, değilse login zorunlu

    // Client IP'yi backend'e ilet (WiFi kontrolü için)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (forwardedFor) {
      headers['X-Forwarded-For'] = forwardedFor;
    }
    if (realIp) {
      headers['X-Real-IP'] = realIp;
    }

    const response = await fetch(`${API_BASE_URL}/api/Order/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const responseText = await response.text();

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { success: false, error: responseText };
    }

    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('Order API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
