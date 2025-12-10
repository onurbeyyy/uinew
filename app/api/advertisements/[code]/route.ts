import { NextRequest, NextResponse } from 'next/server';

// Vercel edge cache'i devre dışı bırak
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const API_BASE_URL = process.env.API_URL || 'https://apicanlimenu.online';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const apiUrl = `${API_BASE_URL}/api/Advertisements/GetActiveTabs?customerCode=${code}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Her zaman güncel veri al
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (error) {
    console.error('Advertisements API Error:', error);
    return NextResponse.json(
      { success: false, data: [], error: 'Failed to fetch advertisements' },
      { status: 500 }
    );
  }
}
