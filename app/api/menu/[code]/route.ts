import { NextRequest, NextResponse } from 'next/server';
import { createServerApiClient } from '@/lib/api';

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

    return NextResponse.json(menuData);
  } catch (error) {
    console.error('Menu API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu' },
      { status: 500 }
    );
  }
}
