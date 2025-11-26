import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.GAME_API_URL || 'https://canlimenu.online';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nickname: string }> }
) {
  try {
    const { nickname } = await params;

    const response = await fetch(
      `${API_BASE_URL}/api/GameLeaderboard/player/${encodeURIComponent(nickname)}/stats`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      return NextResponse.json(null, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Player stats fetch error:', error);
    return NextResponse.json(null, { status: 500 });
  }
}
