import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://apicanlimenu.online';

// GET - Kullanıcının adreslerini getir
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Yetkilendirme gerekli' },
        { status: 401 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/api/enduser/addresses`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Adres listesi hatası:', error);
    return NextResponse.json(
      { success: false, error: 'Adresler getirilemedi' },
      { status: 500 }
    );
  }
}

// POST - Yeni adres ekle
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Yetkilendirme gerekli' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/api/enduser/addresses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Adres ekleme hatası:', error);
    return NextResponse.json(
      { success: false, error: 'Adres eklenemedi' },
      { status: 500 }
    );
  }
}
