import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // API ve statik dosyaları atla
  if (pathname.startsWith('/api/') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/static/') ||
      pathname.includes('.')) {
    return NextResponse.next();
  }

  const code = searchParams.get('code');
  const table = searchParams.get('table');

  // Eski URL formatlarını destekle (QR kodlar için geriye uyumluluk)
  // /?code=filia
  // /Home/Index?code=filia
  // /Table/Info?code=23_s2 (legacy format)
  const legacyPaths = ['/', '/Home/Index', '/Table/Info', '/home/index', '/table/info'];

  if (legacyPaths.some(p => pathname === p || pathname.toLowerCase() === p.toLowerCase())) {
    if (code) {
      // 🔒 GÜVENLİK: Masa kodunu cookie'ye kaydet ve URL'den TAMAMEN gizle
      const url = request.nextUrl.clone();
      url.pathname = `/${code}`;
      url.searchParams.delete('code');
      url.searchParams.delete('table');

      const response = NextResponse.redirect(url);

      if (table) {
        response.cookies.set('tableCode', table, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 15,
          path: '/'
        });
      } else {
        const existingCookie = request.cookies.get('tableCode');
        if (existingCookie) {
          response.cookies.delete('tableCode');
        }
      }

      return response;
    }
  }

  // 🔒 YENİ: /[customerCode]?table=xxx formatı - doğrudan müşteri sayfası
  // Örn: /canlimenu?table=lfl4fdwq
  if (table && pathname !== '/' && !pathname.startsWith('/api')) {
    const url = request.nextUrl.clone();
    url.searchParams.delete('table');

    const response = NextResponse.redirect(url);

    response.cookies.set('tableCode', table, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15,
      path: '/'
    });

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
