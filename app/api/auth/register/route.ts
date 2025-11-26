import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_URL || 'https://canlimenu.online';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Register request body:', body);

    const response = await fetch(`${API_BASE_URL}/api/Auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    console.log('Register API response:', result, 'Status:', response.status);

    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('Register API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register' },
      { status: 500 }
    );
  }
}
