import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://canlimenu.online';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const suggestionData = {
      customerName: body.customerName || 'Anonim',
      venueCode: body.venueCode || 'bilinmiyor',
      newVenueRequest: body.newVenueRequest || '',
      suggestionType: body.suggestionType,
      suggestionContent: body.suggestionContent,
      customerIP: '', // Backend'de set edilecek
      userAgent: body.userAgent || '',
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(`${API_BASE_URL}/api/CustomerSuggestion/Create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(suggestionData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return NextResponse.json({
        success: true,
        message: 'Öneriniz Canlı Menü ekibine ulaştı! Geri bildiriminiz için teşekkür ederiz!',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.message || 'Bir hata oluştu. Lütfen tekrar deneyin.',
        },
        { status: response.status || 400 }
      );
    }
  } catch (error) {
    console.error('Suggestion API error:', error);
    return NextResponse.json(
      { success: false, error: 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.' },
      { status: 500 }
    );
  }
}
