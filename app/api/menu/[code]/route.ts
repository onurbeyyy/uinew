import { NextRequest, NextResponse } from 'next/server';
import { createServerApiClient } from '@/lib/api';

// Cache'i devre dışı bırak - her zaman güncel veri
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const searchParams = request.nextUrl.searchParams;
    const screenCode = searchParams.get('screenCode') || undefined;

    const api = createServerApiClient();
    const menuData = await api.getMenu(code, screenCode);

    return NextResponse.json(menuData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (error) {
    console.error('Menu API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu' },
      { status: 500 }
    );
  }
}
