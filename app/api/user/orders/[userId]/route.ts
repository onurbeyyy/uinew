import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_URL || 'https://apicanlimenu.online';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const params = await context.params;
    const { userId } = params;

    // Get authorization header from request
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${API_BASE_URL}/api/EndUser/orders/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
    });

    const result = await response.json();

    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('Orders API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
