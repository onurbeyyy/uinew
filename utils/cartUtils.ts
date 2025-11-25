/**
 * Sepet yönetimi utility fonksiyonları
 * Eski proje referansı: UI/wwwroot/js/cartManager.js
 */

const CART_EXPIRY_TIME = 3 * 60 * 60 * 1000; // 3 saat (milisaniye)

interface CartData {
  items: any[];
  timestamp: number;
  customerCode: string;
}

/**
 * Sepeti customerCode ile kaydet
 */
export function saveCart(cartKey: string, items: any[], customerCode: string) {
  try {
    const cartData: CartData = {
      items,
      timestamp: Date.now(),
      customerCode,
    };
    localStorage.setItem(`cart_${cartKey}`, JSON.stringify(cartData));
  } catch (error) {
    console.error('Cart save error:', error);
  }
}

/**
 * Sepeti yükle ve geçerlilik kontrolü yap
 * - Başka customerCode'dan geliyorsa temizle
 * - 3 saatten eski ise temizle
 */
export function loadCart(cartKey: string, currentCustomerCode: string): any[] {
  try {
    const stored = localStorage.getItem(`cart_${cartKey}`);
    if (!stored) return [];

    const parsed = JSON.parse(stored);

    // Eski format desteği: Eğer direkt array ise, yeni formata çevir
    if (Array.isArray(parsed)) {
      // Eski format - direkt items array
      // Yeni formata kaydet ve devam et
      saveCart(cartKey, parsed, currentCustomerCode);
      return parsed;
    }

    const cartData: CartData = parsed;

    // 1. CustomerCode kontrolü - başka customer ise temizle (case-insensitive)
    if (cartData.customerCode && cartData.customerCode.toLowerCase() !== currentCustomerCode.toLowerCase()) {
      console.log('🗑️ Cart cleared: Different customer code', {
        old: cartData.customerCode,
        new: currentCustomerCode,
      });
      clearCart(cartKey);
      return [];
    }

    // 2. Zaman kontrolü - 3 saatten eski ise temizle (sadece timestamp varsa)
    if (cartData.timestamp) {
      const now = Date.now();
      const age = now - cartData.timestamp;
      if (age > CART_EXPIRY_TIME) {
        console.log('🗑️ Cart cleared: Expired (> 3 hours)');
        clearCart(cartKey);
        return [];
      }
    }

    return cartData.items || [];
  } catch (error) {
    console.error('Cart load error:', error);
    return [];
  }
}

/**
 * Sepeti temizle
 */
export function clearCart(cartKey: string) {
  try {
    localStorage.removeItem(`cart_${cartKey}`);
    // cartUpdated event'i dispatch et
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cartUpdated'));
    }
  } catch (error) {
    console.error('Cart clear error:', error);
  }
}

/**
 * Sepet kontrolü - customer değiştiğinde veya zaman aşımında temizle
 */
export function checkAndCleanCart(cartKey: string, customerCode: string) {
  if (!cartKey || !customerCode) return;
  loadCart(cartKey, customerCode);
}
