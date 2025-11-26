import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Client-side logout - just return success
  // The actual token clearing is done in UserContext
  return NextResponse.json({ success: true });
}
