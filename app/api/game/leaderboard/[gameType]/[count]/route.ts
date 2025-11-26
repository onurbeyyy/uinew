import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.GAME_API_URL || 'https://canlimenu.online';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameType: string; count: string }> }
) {
  try {
    const { gameType, count } = await params;

    const response = await fetch(
      `${API_BASE_URL}/api/GameLeaderboard/${gameType}/top/${count}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Her zaman güncel verileri al
      }
    );

    if (!response.ok) {
      return NextResponse.json([], { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
