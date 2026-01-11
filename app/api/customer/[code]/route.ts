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
    const table = searchParams.get('table') || undefined;

    const api = createServerApiClient();
    const customerData = await api.getCustomer(code, table);

    return NextResponse.json(customerData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (error) {
    console.error('Customer API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}
