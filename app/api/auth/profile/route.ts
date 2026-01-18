import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_URL || 'https://apicanlimenu.online';

// Cache-control headers - API response'larını cache'leme
const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'No authorization header' },
        { status: 401, headers: noCacheHeaders }
      );
    }

    const response = await fetch(`${API_BASE_URL}/api/EndUser/profile`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Profile fetch failed' },
        { status: response.status, headers: noCacheHeaders }
      );
    }

    const result = await response.json();
    return NextResponse.json(result, { status: 200, headers: noCacheHeaders });
  } catch (error) {
    console.error('Profile API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
