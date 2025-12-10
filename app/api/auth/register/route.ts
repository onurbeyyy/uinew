import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_URL || 'https://apicanlimenu.online';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // EndUser kaydı için doğru endpoint'i kullan
    const response = await fetch(`${API_BASE_URL}/api/EndUser/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    return NextResponse.json(result, { status: response.status });
  } catch (error: any) {
    console.error('Register API Error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to register' },
      { status: 500 }
    );
  }
}
