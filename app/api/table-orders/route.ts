import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://apicanlimenu.online';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/api/tableorders/get-table-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Table orders proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'API bağlantı hatası' },
      { status: 500 }
    );
  }
}
