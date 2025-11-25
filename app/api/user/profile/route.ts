import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://canlimenu.online';

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Yetkilendirme gerekli' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, phoneNumber, birthDate, gender } = body;

    // Validate phone number if provided
    if (phoneNumber) {
      if (phoneNumber.length !== 11) {
        return NextResponse.json(
          { success: false, error: 'Telefon numarası 11 haneli olmalıdır' },
          { status: 400 }
        );
      }
      if (!phoneNumber.startsWith('05')) {
        return NextResponse.json(
          { success: false, error: 'Telefon numarası 05 ile başlamalıdır' },
          { status: 400 }
        );
      }
    }

    // Validate email if provided
    if (email && !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Geçerli bir e-posta adresi giriniz' },
        { status: 400 }
      );
    }

    // Call backend API
    const response = await fetch(`${API_BASE_URL}/api/EndUser/UpdateProfile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        Email: email || null,
        PhoneNumber: phoneNumber || null,
        BirthDate: birthDate || null,
        Gender: gender || null,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Profil başarıyla güncellendi',
        user: data.user || data,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: data.message || data.error || 'Profil güncellenemedi',
        },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Profile update API error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
