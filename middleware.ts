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
      // 🔒 GÜVENLİK: Masa kodunu cookie'ye kaydet ve URL'den TAMAMEN gizle
      const url = request.nextUrl.clone();
      url.pathname = `/${code}`;

      // 🔒 ÖNCELİKLE tüm parametreleri URL'den kaldır (tarayıcı geçmişinde görünmesin!)
      url.searchParams.delete('code');
      url.searchParams.delete('table');

      // 🔒 Redirect kullan - tarayıcı geçmişinde temiz URL görünsün
      const response = NextResponse.redirect(url);

      if (table) {
        // 🔒 Masa kodunu cookie'ye kaydet (sadece backend bilsin)
        response.cookies.set('tableCode', table, {
          httpOnly: false, // Frontend'den okunabilir olmalı (sipariş gönderirken gerekli)
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 15, // 15 dakika geçerli
          path: '/'
        });
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
