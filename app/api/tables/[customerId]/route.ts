import { NextRequest, NextResponse } from 'next/server';
import { createServerApiClient } from '@/lib/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    const api = createServerApiClient();
    const tables = await api.getTablesByCustomerId(parseInt(customerId));
    return NextResponse.json(tables);
  } catch (error) {
    console.error('Tables API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}
