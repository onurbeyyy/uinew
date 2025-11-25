import { NextRequest, NextResponse } from 'next/server';
import { createServerApiClient } from '@/lib/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const api = createServerApiClient();
    const categoriesData = await api.getCategoriesByCode(code);

    return NextResponse.json(categoriesData);
  } catch (error) {
    console.error('Categories API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
