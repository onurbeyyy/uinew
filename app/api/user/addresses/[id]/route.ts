import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://apicanlimenu.online';

// PUT - Adres güncelle
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

    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/api/enduser/addresses/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Adres güncelleme hatası:', error);
    return NextResponse.json(
      { success: false, error: 'Adres güncellenemedi' },
      { status: 500 }
    );
  }
}

// DELETE - Adres sil
export async function DELETE(
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

    const response = await fetch(`${API_BASE_URL}/api/enduser/addresses/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Adres silme hatası:', error);
    return NextResponse.json(
      { success: false, error: 'Adres silinemedi' },
      { status: 500 }
    );
  }
}
