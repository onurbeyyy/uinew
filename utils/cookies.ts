/**
 * Cookie Utility Functions
 *
 * Güvenlik için hassas bilgileri cookie'de saklama ve okuma
 */

/**
 * Cookie'den tableCode'u oku
 * Middleware tarafından set edilen masa kodunu döndürür
 */
export function getTableCode(): string | null {
  if (typeof window === 'undefined') return null;

  const cookies = document.cookie.split(';');
  const tableCookie = cookies.find(cookie => cookie.trim().startsWith('tableCode='));

  if (tableCookie) {
    return tableCookie.split('=')[1];
  }

  return null;
}

/**
 * Cookie'yi temizle
 */
export function clearTableCode(): void {
  if (typeof window === 'undefined') return;

  document.cookie = 'tableCode=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

/**
 * Tüm cookie'leri obje olarak döndür
 */
export function getAllCookies(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  return document.cookie
    .split(';')
    .reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>);
}
