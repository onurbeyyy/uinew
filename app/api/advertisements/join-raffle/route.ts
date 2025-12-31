import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://apicanlimenu.online';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { raffleId, endUserId } = body;

    if (!raffleId || !endUserId) {
      return NextResponse.json(
        { success: false, message: 'RaffleId ve EndUserId gerekli' },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/api/Advertisements/JoinRaffle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raffleId,
        endUserId,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Join raffle error:', error);
    return NextResponse.json(
      { success: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
