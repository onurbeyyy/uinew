import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_URL || 'https://apicanlimenu.online';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 🔐 Kullanıcı doğrulaması - endUserId olmadan sipariş verilemez
    if (!body.endUserId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sipariş vermek için giriş yapmalısınız.',
          requiresLogin: true
        },
        { status: 401 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/api/Order/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('Order API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
