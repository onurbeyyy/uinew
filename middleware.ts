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

  // Mevcut cookie'leri al
  const existingTableCode = request.cookies.get('tableCode')?.value;
  const existingCustomerCode = request.cookies.get('tableCustomerCode')?.value;

  // Eski URL formatlarını destekle (QR kodlar için geriye uyumluluk)
  // /?code=filia
  // /Home/Index?code=filia
  const legacyPaths = ['/', '/Home/Index', '/Table/Info', '/home/index', '/table/info'];

  if (legacyPaths.some(p => pathname === p || pathname.toLowerCase() === p.toLowerCase())) {
    if (code) {
      const url = request.nextUrl.clone();
      url.pathname = `/${code}`;
      url.searchParams.delete('code');
      url.searchParams.delete('table');

      const response = NextResponse.redirect(url);

      if (table) {
        // Yeni masa kodu - kaydet
        response.cookies.set('tableCode', table, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 15,
          path: '/'
        });
        // Hangi müşteriye ait olduğunu da kaydet
        response.cookies.set('tableCustomerCode', code, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 15,
          path: '/'
        });
      } else {
        // Table yok - eski cookie'leri sil
        if (existingTableCode) {
          response.cookies.delete('tableCode');
          response.cookies.delete('tableCustomerCode');
        }
      }

      return response;
    }
  }

  // /[customerCode]?table=xxx formatı
  if (table && pathname !== '/' && !pathname.startsWith('/api')) {
    const customerCode = pathname.split('/')[1]; // /canlimenu -> canlimenu
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
    response.cookies.set('tableCustomerCode', customerCode, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15,
      path: '/'
    });

    return response;
  }

  // 🔒 FARKLI MÜŞTERİYE GEÇİŞ KONTROLÜ
  // Eğer /[customerCode] sayfasındayız ve bu müşteri cookie'deki müşteriden farklıysa
  // eski masa bilgisini sil
  const pathParts = pathname.split('/').filter(Boolean);
  const currentCustomerCode = pathParts[0];

  if (currentCustomerCode &&
      existingTableCode &&
      existingCustomerCode &&
      existingCustomerCode !== currentCustomerCode &&
      !pathname.includes('/delivery') &&
      !pathname.includes('/self')) {
    // Farklı müşteriye geçildi - eski masa bilgisini sil
    const response = NextResponse.next();
    response.cookies.delete('tableCode');
    response.cookies.delete('tableCustomerCode');
    response.cookies.delete('tableId');
    response.cookies.delete('tableCreatedAt');
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
