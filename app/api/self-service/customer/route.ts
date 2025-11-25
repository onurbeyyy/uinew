import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Code parametresi gerekli' }, { status: 400 });
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://canlimenu.online';
    const response = await fetch(`${apiUrl}/api/Customer/CustomerInfoByCode?code=${code}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Müşteri bulunamadı' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ Customer API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
