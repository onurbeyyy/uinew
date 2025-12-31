import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://apicanlimenu.online';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raffleId = searchParams.get('raffleId');
    const endUserId = searchParams.get('endUserId');

    if (!raffleId || !endUserId) {
      return NextResponse.json(
        { success: false, message: 'RaffleId ve EndUserId gerekli' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${API_BASE_URL}/api/Advertisements/CheckRaffleParticipation?raffleId=${raffleId}&endUserId=${endUserId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Check participation error:', error);
    return NextResponse.json(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
