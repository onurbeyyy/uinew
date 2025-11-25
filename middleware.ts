import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Eski URL formatlarını destekle (QR kodlar için geriye uyumluluk)
  // /?code=filia
  // /Home/Index?code=filia
  // /Table/Info?code=23_s2 (legacy format)
  const supportedPaths = ['/', '/Home/Index', '/Table/Info', '/home/index', '/table/info'];

  if (supportedPaths.some(p => pathname === p || pathname.toLowerCase() === p.toLowerCase())) {
    const code = searchParams.get('code');
    const table = searchParams.get('table');

    if (code) {
      // 🔒 GÜVENLİK: Masa kodunu cookie'ye kaydet ve URL'den gizle
      const url = request.nextUrl.clone();
      url.pathname = `/${code}`;

      // code parametresini kaldır
      url.searchParams.delete('code');

      // table parametresini cookie'ye kaydet ve URL'den kaldır
      const response = NextResponse.rewrite(url);

      if (table) {
        // 🔒 Yeni masa kodu geldiğinde eski cookie'yi sil ve yenisini yaz
        // Bu şekilde farklı müşteriler karışmaz
        response.cookies.set('tableCode', table, {
          httpOnly: false, // Frontend'den okunabilir olmalı (sipariş gönderirken gerekli)
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 20, // 20 dakika (sipariş verdikten sonra otomatik silinecek)
          path: '/'
        });

        // Table parametresini URL'den kaldır (kullanıcı görmeyecek)
        url.searchParams.delete('table');
      } else {
        // Table parametresi yoksa eski cookie'yi temizle
        // (Başka bir QR kod okutulmuş olabilir)
        const existingCookie = request.cookies.get('tableCode');
        if (existingCookie) {
          response.cookies.delete('tableCode');
        }
      }

      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/Home/Index', '/Table/Info', '/home/index', '/table/info'],
};
