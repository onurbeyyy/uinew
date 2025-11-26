import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_URL || 'https://canlimenu.online';

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/Customer/ActiveCustomerList`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Active customers API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
