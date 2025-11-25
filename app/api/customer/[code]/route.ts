import { NextRequest, NextResponse } from 'next/server';
import { createServerApiClient } from '@/lib/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const api = createServerApiClient();
    const customerData = await api.getCustomer(code);

    return NextResponse.json(customerData);
  } catch (error) {
    console.error('Customer API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}
