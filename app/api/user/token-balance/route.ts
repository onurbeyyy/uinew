import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://canlimenu.online';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const customerCode = searchParams.get('customerCode');

    if (!userId || !customerCode) {
      return NextResponse.json(
        { success: false, error: 'userId and customerCode required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${API_BASE_URL}/api/UserTokens/by-code?userId=${userId}&customerCode=${customerCode}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('Token Balance API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch token balance' },
      { status: 500 }
    );
  }
}
