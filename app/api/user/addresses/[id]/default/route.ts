import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://canlimenu.online';

// PUT - Varsayılan adres yap
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Yetkilendirme gerekli' },
        { status: 401 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/api/enduser/addresses/${id}/default`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Varsayılan adres güncelleme hatası:', error);
    return NextResponse.json(
      { success: false, error: 'Varsayılan adres güncellenemedi' },
      { status: 500 }
    );
  }
}
