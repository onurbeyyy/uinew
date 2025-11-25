import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://canlimenu.online';

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
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Advertisements API Error:', error);
    return NextResponse.json(
      { success: false, data: [], error: 'Failed to fetch advertisements' },
      { status: 500 }
    );
  }
}
