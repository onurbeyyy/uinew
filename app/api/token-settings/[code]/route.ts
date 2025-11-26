import { NextRequest, NextResponse } from 'next/server';
import { createServerApiClient } from '@/lib/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const api = createServerApiClient();
    const tokenSettings = await api.getProductTokenSettings(code);
    return NextResponse.json(tokenSettings);
  } catch (error) {
    console.error('Token Settings API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token settings' },
      { status: 500 }
    );
  }
}
