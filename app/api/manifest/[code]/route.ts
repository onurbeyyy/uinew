import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const manifest = {
    name: "Canlı Menü",
    short_name: "Menü",
    description: "QR Menü ve Sipariş Sistemi",
    start_url: `/${code}`,
    scope: `/${code}`,
    display: "standalone",
    orientation: "any",
    background_color: "#000000",
    theme_color: "#ff6b00",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  });
}
