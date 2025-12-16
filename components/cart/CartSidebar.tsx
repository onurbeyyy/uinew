'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMenu } from '@/contexts/MenuContext';
import { useAuth } from '@/contexts/UserContext';
import { useTable } from '@/contexts/TableContext';
import { saveCart as saveCartToStorage, loadCart as loadCartFromStorage, clearCart as clearCartFromStorage } from '@/utils/cartUtils';
import ProductSuggestions from './ProductSuggestions';

interface CartItem {
  id: number;
  productId: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  note?: string;
  sambaId?: number;
  tokenQuantity?: number; // Kaç adet jeton ile alınacak
  portionName?: string;
  sambaPortionId?: number;
  linkedProductId?: number; // Happy Hour bağlı ürün ID'si
}

interface DeliveryInfo {
  address: {
    city: string;
    district: string;
    neighborhood: string;
    street: string;
    buildingNo: string;
    floor?: string;
    apartmentNo?: string;
    directions?: string;
  };
  deliveryFee: number;
  minOrderAmount: number;
  freeDeliveryThreshold: number;
}

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  tableId?: string;
  customerCode?: string;
  deliveryInfo?: DeliveryInfo;
  isSelfService?: boolean; // Delivery sayfasından gelen selfservice modu
}

export default function CartSidebar({ isOpen, onClose, tableId, customerCode, deliveryInfo, isSelfService: isSelfServiceProp }: CartSidebarProps) {
  const { customerData, productTokenSettings, portionTokenSettings, getTokenSettingsForItem, cartKey: menuCartKey, isSelfService: isSelfServiceContext, sessionId, openProfile } = useMenu();
  // Prop değeri varsa onu kullan (delivery sayfasından gelen), yoksa context'ten al
  const isSelfService = isSelfServiceProp ?? isSelfServiceContext;
  const isDelivery = !!deliveryInfo && !isSelfService; // Self-service modunda delivery gibi davranma
  const { isAuthenticated, currentUser, refreshUserProfile } = useAuth();
  const { clearTableInfo } = useTable();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerNote, setCustomerNote] = useState('');
  const [userTokenBalance, setUserTokenBalance] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'ticket' | 'edenred' | 'sodexo' | 'multinet' | 'setcard' | 'metropol'>('cash');
  const [showOtherPayments, setShowOtherPayments] = useState(false);

  // Use cartKey from MenuContext, fallback to tableId prop
  const cartKey = menuCartKey || tableId || '';

  const loadCart = useCallback(() => {
    if (!cartKey || !customerCode) return;
    const items = loadCartFromStorage(cartKey, customerCode);
    setItems(items);
  }, [cartKey, customerCode]);

  useEffect(() => {
    if (cartKey && isOpen) {
      loadCart();
    }
  }, [cartKey, isOpen, loadCart]);

  useEffect(() => {
    const handleCartUpdate = () => {
      loadCart();
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [loadCart]);

  useEffect(() => {
    const handleTokenBalanceUpdate = (event: any) => {
      const { balance, message } = event.detail;

      setUserTokenBalance(balance);

      // Bildirim göster
      if (message) {
        showNotification(message, 'success');
      }
    };

    window.addEventListener('tokenBalanceUpdated', handleTokenBalanceUpdate);
    return () => window.removeEventListener('tokenBalanceUpdated', handleTokenBalanceUpdate);
  }, []);

  // Bildirim gösterme fonksiyonu
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Basit toast notification
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 100001;
      font-size: 14px;
      font-weight: 600;
      max-width: 90%;
      text-align: center;
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  };

  // Load user token balance (localStorage cached - 60 saniye)
  useEffect(() => {
    const loadTokenBalance = async () => {
      const userData = localStorage.getItem('userData');

      if (!userData || !customerCode) return;

      try {
        const user = JSON.parse(userData);
        const userId = user.id || user.userId || user.Id;

        if (!userId) return;

        // localStorage cache kontrolü (60 saniye) - ana sayfa ile paylaşımlı
        const cacheKey = `tokenBalance_${userId}_${customerCode}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { balance, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 60000) { // 60 saniye
            setUserTokenBalance(balance);
            return;
          }
        }

        const response = await fetch(
          `/api/user/token-balance?userId=${userId}&customerCode=${customerCode}`
        );

        if (!response.ok) return; // 429 veya diğer hatalar için sessizce çık

        const result = await response.json();

        if (result.balance) {
          const tokenBalance = result.balance.currentTokens || result.balance.CurrentTokens || 0;
          setUserTokenBalance(tokenBalance);
          // Cache'e kaydet
          localStorage.setItem(cacheKey, JSON.stringify({ balance: tokenBalance, timestamp: Date.now() }));
        }
      } catch {
        // Sessizce başarısız ol
      }
    };

    if (isOpen) {
      loadTokenBalance();
    }
  }, [isOpen, customerCode]);

  // Sepeti kaydet
  const saveCart = (newItems: CartItem[]) => {
    if (cartKey && customerCode) {
      saveCartToStorage(cartKey, newItems, customerCode);
      setItems(newItems);
      // Event dispatch ederek diğer componentleri bilgilendir
      window.dispatchEvent(new Event('cartUpdated'));
    }
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId);
      return;
    }
    const newItems = items.map((item) =>
      item.productId === productId ? { ...item, quantity: newQuantity } : item
    );
    saveCart(newItems);
  };

  const updateItemNote = (productId: number, note: string) => {
    const newItems = items.map((item) =>
      item.productId === productId ? { ...item, note } : item
    );
    saveCart(newItems);
  };

  const removeItem = (productId: number) => {
    const item = items.find(i => i.productId === productId);
    const itemName = item?.name || 'Bu ürünü';

    if (confirm(`${itemName} sepetten kaldırılsın mı?`)) {
      const newItems = items.filter((item) => item.productId !== productId);
      saveCart(newItems);
    }
  };

  const clearCart = () => {
    if (confirm('Sepeti temizlemek istediğinize emin misiniz?')) {
      if (cartKey) {
        clearCartFromStorage(cartKey);
        setItems([]);
        setCustomerNote('');
      }
    }
  };

  // Önerilen ürünü sepete ekle
  const handleAddSuggestedProduct = (product: any) => {
    // 🔐 Giriş kontrolü
    if (!isAuthenticated) {
      onClose();
      setTimeout(() => openProfile(), 300);
      return;
    }

    const productId = product.id || product.Id;
    const existingItem = items.find(item => item.productId === productId);

    if (existingItem) {
      // Varsa miktarı artır
      updateQuantity(productId, existingItem.quantity + 1);
    } else {
      // Yoksa yeni ekle
      const getImageUrl = (picture?: string) => {
        if (!picture) return '';
        if (picture.startsWith('http')) return picture.replace('http://', 'https://');
        const cleanPath = picture.startsWith('Uploads/') ? picture.substring(8) : picture;
        return `https://apicanlimenu.online/Uploads/${cleanPath}`;
      };

      const newItem: CartItem = {
        id: Date.now(),
        productId: productId,
        sambaId: product.sambaId || product.SambaId,
        sambaPortionId: product.sambaPortionId || product.SambaPortionId,
        name: product.title || product.Title || '',
        price: product.price || product.Price || 0,
        quantity: 1,
        image: getImageUrl(product.picture || product.Picture),
        linkedProductId: product.linkedProductId || product.LinkedProductId, // HH bağlı ürün
      };

      saveCart([...items, newItem]);
    }
  };

  const toggleTokenPurchase = (productId: number) => {
    const item = items.find(i => i.productId === productId);
    if (!item) return;

    // Get token settings for this product/portion (porsiyon bazlı öncelikli)
    const tokenSettings = getTokenSettingsForItem(item.sambaId || item.productId, item.sambaPortionId);
    if (!tokenSettings || tokenSettings.redeemTokens <= 0) return;

    const currentTokenQty = item.tokenQuantity || 0;
    const maxAffordable = Math.floor(userTokenBalance / tokenSettings.redeemTokens);
    const maxTokenQuantity = Math.min(item.quantity, maxAffordable);

    let newTokenQty = 0;
    if (currentTokenQty === 0 && maxTokenQuantity > 0) {
      // Activate: set to 1
      newTokenQty = 1;
    } else if (currentTokenQty < maxTokenQuantity) {
      // Increase by 1
      newTokenQty = currentTokenQty + 1;
    } else {
      // Deactivate: set to 0
      newTokenQty = 0;
    }

    const newItems = items.map(i =>
      i.productId === productId ? { ...i, tokenQuantity: newTokenQty } : i
    );
    saveCart(newItems);
  };

  const showOrderConfirmation = (): Promise<boolean> => {
    return new Promise((resolve) => {
      // Get user data from context (most up-to-date) and localStorage as fallback
      const userData = localStorage.getItem('userData');
      const user = currentUser || (userData ? JSON.parse(userData) : null);

      // Get table name from localStorage or use tableId/sessionId
      const storedTableName = localStorage.getItem('currentTableName');
      const displayTableName = isSelfService
        ? 'Self-Servis'
        : (storedTableName || `Masa ${tableId}`);

      // Delivery için hesaplamalar
      const actualDeliveryFee = isDelivery && deliveryInfo
        ? (totalPrice >= deliveryInfo.freeDeliveryThreshold ? 0 : deliveryInfo.deliveryFee)
        : 0;
      const grandTotal = totalPrice + actualDeliveryFee;

      // Delivery adresi formatla
      const formatDeliveryAddress = () => {
        if (!isDelivery || !deliveryInfo?.address) return '';
        const addr = deliveryInfo.address;
        return `${addr.neighborhood} Mah. ${addr.street} No:${addr.buildingNo}${addr.floor ? ', Kat:' + addr.floor : ''}${addr.apartmentNo ? ', Daire:' + addr.apartmentNo : ''}`;
      };

      // Create modal HTML
      const modalHTML = `
        <div id="orderConfirmationModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100000;">
          <div style="background: white; border-radius: 15px; padding: 25px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
            <div style="text-align: center; margin-bottom: 20px;">
              <h3 style="color: ${isDelivery ? '#ff6b00' : isSelfService ? '#9c27b0' : '#2c5530'}; margin: 0; font-size: 22px;">
                <i class="fas ${isDelivery ? 'fa-motorcycle' : isSelfService ? 'fa-utensils' : 'fa-receipt'}" style="margin-right: 8px;"></i>
                ${isDelivery ? 'Paket Sipariş Özeti' : isSelfService ? 'Self Servis Sipariş' : 'Sipariş Özeti'}
              </h3>
            </div>

            <div style="background: #f8f9fa; border-radius: 10px; padding: 15px; margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span><strong>👤 Müşteri:</strong></span>
                <span>${user ? user.firstName + (user.nickName ? ` (${user.nickName})` : '') : 'Misafir'}</span>
              </div>
              ${isDelivery ? `
              <!-- Delivery Bilgileri -->
              <div style="background: #fff8f0; border: 1px solid #ffd699; border-radius: 8px; padding: 12px; margin-top: 10px;">
                <div style="margin-bottom: 8px;">
                  <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">📍 Teslimat Adresi</div>
                  <div style="font-size: 14px; color: #333; font-weight: 500;">${formatDeliveryAddress()}</div>
                  <div style="font-size: 12px; color: #666;">${deliveryInfo?.address?.district || ''}/${deliveryInfo?.address?.city || ''}</div>
                  ${deliveryInfo?.address?.directions ? `<div style="font-size: 11px; color: #888; margin-top: 4px; font-style: italic;">📝 ${deliveryInfo.address.directions}</div>` : ''}
                </div>
                <div style="border-top: 1px dashed #ffd699; padding-top: 8px; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: 600;">💳 Ödeme Yöntemi</div>
                    <div style="font-size: 14px; color: ${paymentMethod === 'cash' ? '#28a745' : paymentMethod === 'card' ? '#007bff' : '#ff6b00'}; font-weight: 600;">
                      Kapıda ${{
                        cash: 'Nakit',
                        card: 'Kredi Kartı',
                        ticket: 'Ticket',
                        edenred: 'Edenred',
                        sodexo: 'Sodexo',
                        multinet: 'Multinet',
                        setcard: 'Setcard',
                        metropol: 'Metropol'
                      }[paymentMethod] || 'Nakit'}
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 11px; color: #666;">🚚 Teslimat</div>
                    <div style="font-size: 14px; color: ${actualDeliveryFee === 0 ? '#28a745' : '#ff6b00'}; font-weight: 600;">
                      ${actualDeliveryFee === 0 ? 'Ücretsiz' : actualDeliveryFee.toFixed(2) + ' ₺'}
                    </div>
                  </div>
                </div>
              </div>
              ` : `
              <div style="display: flex; justify-content: space-between;">
                <span><strong>🍽️ Masa:</strong></span>
                <span>${displayTableName}</span>
              </div>
              `}
            </div>

            <div style="margin-bottom: 20px;">
              <h4 style="color: #2c5530; margin-bottom: 15px; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">
                <i class="fas fa-shopping-cart" style="margin-right: 8px;"></i>
                Sipariş Detayları
              </h4>
              <div id="orderItemsList">
                ${items.map(item => {
                  const tokenQty = item.tokenQuantity || 0;
                  const tokenSettings = getTokenSettingsForItem(item.sambaId || item.productId, item.sambaPortionId);

                  let tokenInfo = '';
                  let priceInfo = `${item.quantity} x ${item.price.toFixed(2)} ₺`;
                  let totalInfo = `${(item.price * item.quantity).toFixed(2)} ₺`;

                  if (tokenQty > 0 && tokenSettings?.redeemTokens) {
                    const tokensUsed = tokenQty * tokenSettings.redeemTokens;
                    const cashQty = item.quantity - tokenQty;

                    tokenInfo = `<div style="font-size: 11px; color: #28a745; font-weight: 600;">🪙 ${tokenQty} adet jeton ile (${tokensUsed} jeton)</div>`;
                    totalInfo = `<span style="text-decoration: line-through; color: #999;">${(item.price * item.quantity).toFixed(2)} ₺</span> <span style="color: #28a745; font-weight: 700;">${(item.price * cashQty).toFixed(2)} ₺</span>`;
                  }

                  return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; background: #fff;">
                      <div style="flex: 1;">
                        <div style="font-weight: 600; color: #333; margin-bottom: 4px;">${item.name}</div>
                        ${tokenInfo}
                        ${item.note ? `<div style="font-size: 12px; color: #666; font-style: italic;">💬 ${item.note}</div>` : ''}
                      </div>
                      <div style="text-align: right; margin-left: 15px;">
                        <div style="font-weight: 600; color: #2c5530;">${priceInfo}</div>
                        <div style="font-size: 12px; color: #666;">${totalInfo}</div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            ${customerNote ? `
              <div style="margin-bottom: 20px;">
                <h4 style="color: #2c5530; margin-bottom: 10px;">
                  <i class="fas fa-comment" style="margin-right: 8px;"></i>
                  Özel İsteğiniz
                </h4>
                <div style="background: #fff3cd; border: 2px solid #dc3545; border-radius: 8px; padding: 15px; font-style: italic; color: #856404;">
                  "${customerNote}"
                </div>
              </div>
            ` : ''}

            ${totalTokensUsed > 0 ? `
              <div style="background: linear-gradient(135deg, rgba(40, 167, 69, 0.15), rgba(32, 201, 151, 0.1)); border: 1px solid rgba(40, 167, 69, 0.3); border-radius: 8px; padding: 10px 12px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="color: #28a745; font-weight: 600; font-size: 14px;">🪙 Jeton Kullanımı</span>
                  <span style="color: #28a745; font-weight: 700; font-size: 14px;">${totalTokensUsed} jeton</span>
                </div>
              </div>
            ` : ''}

            ${isDelivery ? `
            <!-- Delivery Toplam Özeti -->
            <div style="background: linear-gradient(135deg, #ff6b00, #ff9500); border-radius: 10px; padding: 15px; margin-bottom: 25px; color: white;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
                <span>Ürün Toplamı:</span>
                <span>${totalPrice.toFixed(2)} ₺</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
                <span>Teslimat Ücreti:</span>
                <span>${actualDeliveryFee === 0 ? 'Ücretsiz 🎉' : actualDeliveryFee.toFixed(2) + ' ₺'}</span>
              </div>
              <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 10px; margin-top: 8px; display: flex; justify-content: space-between; font-size: 20px; font-weight: bold;">
                <span>TOPLAM:</span>
                <span>${grandTotal.toFixed(2)} ₺</span>
              </div>
            </div>
            ` : `
            <div style="background: linear-gradient(135deg, #2c5530, #3a6b3f); border-radius: 10px; padding: 15px; margin-bottom: 25px; color: white; text-align: center;">
              <div style="font-size: 18px; font-weight: bold;">
                <i class="fas fa-calculator" style="margin-right: 8px;"></i>
                TOPLAM: ${totalPrice.toFixed(2)} ₺
              </div>
            </div>
            `}

            <div style="display: flex; gap: 15px; justify-content: center;">
              <button id="confirmOrderBtn" style="flex: 1; max-width: 180px; background: linear-gradient(135deg, #28a745, #20c997); color: white; border: none; padding: 15px 20px; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer;">
                <i class="fas fa-check" style="margin-right: 8px;"></i>
                Onayla
              </button>
              <button id="cancelOrderBtn" style="flex: 1; max-width: 180px; background: linear-gradient(135deg, #dc3545, #c82333); color: white; border: none; padding: 15px 20px; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer;">
                <i class="fas fa-times" style="margin-right: 8px;"></i>
                İptal
              </button>
            </div>
          </div>
        </div>
      `;

      // Add modal to DOM
      document.body.insertAdjacentHTML('beforeend', modalHTML);

      // Button event listeners
      document.getElementById('confirmOrderBtn')!.addEventListener('click', () => {
        document.getElementById('orderConfirmationModal')!.remove();
        resolve(true);
      });

      document.getElementById('cancelOrderBtn')!.addEventListener('click', () => {
        document.getElementById('orderConfirmationModal')!.remove();
        resolve(false);
      });

      // Click outside to close
      document.getElementById('orderConfirmationModal')!.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).id === 'orderConfirmationModal') {
          document.getElementById('orderConfirmationModal')!.remove();
          resolve(false);
        }
      });
    });
  };

  const submitOrder = async () => {
    // Çift tıklama koruması
    if (isSubmitting) return;
    if (items.length === 0) return;

    // Delivery mode check
    if (isDelivery) {
      if (!customerCode) {
        alert('Müşteri bilgisi bulunamadı.');
        return;
      }
      if (!deliveryInfo?.address?.city || !deliveryInfo?.address?.street) {
        alert('Lütfen teslimat adresinizi eksiksiz girin.\n\nAşağıdaki "Adresler" butonundan adres ekleyebilirsiniz.');
        return;
      }
      // Minimum sipariş tutarı kontrolü
      if (deliveryInfo && totalPrice < deliveryInfo.minOrderAmount) {
        alert(`Minimum sipariş tutarı ${deliveryInfo.minOrderAmount.toFixed(0)} ₺'dir.\n\nSepetinize daha fazla ürün ekleyin.`);
        return;
      }
    } else if (!customerCode || (!tableId && !sessionId)) {
      // 🔧 Cookie'den tableCode kontrol et (TableContext sync sorunu için fallback)
      const tableCodeCookie = document.cookie.split(';').find(c => c.trim().startsWith('tableCode='));
      const tableIdCookie = document.cookie.split(';').find(c => c.trim().startsWith('tableId='));
      const cookieTableId = tableCodeCookie?.split('=')[1] || tableIdCookie?.split('=')[1];

      if (!cookieTableId && !sessionId) {
        alert(isSelfService ? 'Oturum bilgisi bulunamadı.' : 'Masa bilgisi bulunamadı. Lütfen QR kodu tekrar okutun.');
        return;
      }
    }

    // 🔐 Giriş kontrolü - Sipariş vermek için giriş şart
    if (!isAuthenticated) {
      alert('Sipariş vermek için giriş yapmalısınız.');
      onClose();
      setTimeout(() => openProfile(), 300);
      return;
    }

    // Show confirmation modal
    const confirmed = await showOrderConfirmation();
    if (!confirmed) {
      return; // User cancelled
    }

    setIsSubmitting(true);
    try {
      // Get user data if logged in
      const userDataStr = localStorage.getItem('userData');
      const userDataParsed = userDataStr ? JSON.parse(userDataStr) : null;
      const endUserId = userDataParsed?.id || null;
      const userNickname = userDataParsed?.nickName || userDataParsed?.nickname || '';

      // Delivery için tableName = "Paket Servis" + kullanıcı adı
      // Self-service için tableName = kullanıcı nickname'i (eski yapı gibi)
      // Normal masa için tableName = localStorage'dan veya cookie'den al
      // 🔧 Cookie'den tableId al (fallback)
      const tableCodeCookie = document.cookie.split(';').find(c => c.trim().startsWith('tableCode='));
      const tableIdCookie = document.cookie.split(';').find(c => c.trim().startsWith('tableId='));
      const cookieTableId = tableCodeCookie?.split('=')[1] || tableIdCookie?.split('=')[1];

      // Normal masa: tableId (secureId) kullan - garson çağırma ile aynı
      let orderTableName = tableId || cookieTableId || '';
      if (isDelivery) {
        orderTableName = `Paket - ${userNickname || 'Müşteri'}`;
      } else if (isSelfService && userNickname && userNickname.trim() !== '') {
        orderTableName = userNickname;
      } else if (isSelfService) {
        orderTableName = sessionId || 'Self-Service';
      }
      // Normal masa modu: tableId zaten secureId olarak ayarlandı

      // Teslimat ücreti hesapla
      const actualDeliveryFee = isDelivery && deliveryInfo
        ? (totalPrice >= deliveryInfo.freeDeliveryThreshold ? 0 : deliveryInfo.deliveryFee)
        : 0;

      // Sipariş verisini hazırla
      // Delivery modunda isSelfService false olmalı (cookie'den true kalmasını önle)
      const actualIsSelfService = isDelivery ? false : isSelfService;

      const orderData: any = {
        customerCode: customerCode,
        tableName: orderTableName,
        endUserId: endUserId, // Logged in user ID (for token deduction)
        Source: 'UI',
        isSelfService: actualIsSelfService,
        isDelivery: isDelivery,
        orderType: isDelivery ? 'Delivery' : (actualIsSelfService ? 'SelfService' : 'Table'), // Sipariş tipi
        items: items.map(item => {
          const tokenSettings = getTokenSettingsForItem(item.sambaId || item.productId, item.sambaPortionId);
          const tokenQty = item.tokenQuantity || 0;

          // 🍺 Happy Hour: Bağlı ürün varsa onu kullan (sipariş sistemine normal ürün gider)
          const effectiveProductId = item.linkedProductId || item.sambaId || item.productId;

          return {
            productId: effectiveProductId, // SambaProductId (HH varsa bağlı ürün)
            actualProductId: item.productId, // Gerçek ID (UI'daki ürün)
            originalProductId: item.sambaId || item.productId, // Orijinal ID (log için)
            linkedProductId: item.linkedProductId, // HH bağlı ürün ID (log için)
            portionId: item.sambaPortionId, // Porsiyon ID (jeton için)
            productName: item.name,
            quantity: item.quantity,
            price: item.price,
            orderTag: item.note || '',
            tokenQuantity: tokenQty, // Jeton ile alınan miktar
            tokensPerItem: tokenSettings?.redeemTokens || 0 // Her bir ürün/porsiyon için gereken jeton
          };
        }),
        notificationMessage: customerNote ? `📝 Müşteri Notu: ${customerNote}` : '',
        customerNote: customerNote
      };

      // Delivery ise adres bilgilerini ekle
      if (isDelivery && deliveryInfo) {
        const addr = deliveryInfo.address;
        // Mahalle adı zaten "Mah." içeriyorsa ekleme
        const neighborhoodText = addr.neighborhood.includes('Mah.') ? addr.neighborhood : `${addr.neighborhood} Mah.`;
        const fullAddress = `${neighborhoodText} ${addr.street} No:${addr.buildingNo}${addr.floor ? ' Kat:' + addr.floor : ''}${addr.apartmentNo ? ' Daire:' + addr.apartmentNo : ''}, ${addr.district}/${addr.city}`;
        // Kullanıcı telefon numarası (UserContext'ten al - en güncel veri)
        const userPhone = currentUser?.phoneNumber || userDataParsed?.phoneNumber || userDataParsed?.phone || '';
        const paymentMethodLabels: Record<string, string> = {
          cash: 'Nakit',
          card: 'Kredi Kartı',
          ticket: 'Ticket',
          edenred: 'Edenred',
          sodexo: 'Sodexo',
          multinet: 'Multinet',
          setcard: 'Setcard',
          metropol: 'Metropol'
        };
        const paymentMethodText = paymentMethodLabels[paymentMethod] || 'Nakit';

        // Delivery bilgilerini orderData'ya ekle (backend uyumlu)
        orderData.deliveryAddress = fullAddress;
        orderData.deliveryFee = actualDeliveryFee;
        orderData.customerPhone = userPhone; // Müşteri telefon numarası
        orderData.paymentMethod = paymentMethod;
        orderData.paymentMethodText = paymentMethodText;
        // Adres, telefon ve ödeme bilgisini Notes alanına da ekle (her zaman görünsün)
        orderData.customerNote = `📍 Adres: ${fullAddress}${addr.directions ? `\n🗺️ Tarif: ${addr.directions}` : ''}${userPhone ? `\n📞 Tel: ${userPhone}` : ''}\n💳 Ödeme: Kapıda ${paymentMethodText}${customerNote ? `\n📝 Not: ${customerNote}` : ''}`;
        orderData.notificationMessage = `📍 Paket Servis - ${addr.district}/${addr.city}${userPhone ? ` - Tel: ${userPhone}` : ''}\n💳 Ödeme: Kapıda ${paymentMethodText}`;
      }

      const response = await fetch('/api/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Uyarı kontrolü
        if (result.warning && result.warningMessage) {
          const confirmed = confirm(
            `⚠️ UYARI\n\n${result.warningMessage}\n\n` +
            `Siparişleriniz birleştirilebilir.\n\n` +
            `Devam etmek istiyor musunuz?`
          );

          if (!confirmed) {
            setIsSubmitting(false);
            return;
          }
        }

        // Sepeti temizle
        if (cartKey) {
          clearCartFromStorage(cartKey);
          setItems([]);
          setCustomerNote('');
        }

        // 📝 Table/session bilgisi artık sipariş sonrası silinmiyor
        // Cookie süresi (15 dk) dolana kadar tekrar sipariş verilebilir

        onClose();

        // ✅ Başarı mesajı göster
        if (isDelivery) {
          alert(`🎉 Paket siparişiniz başarıyla alındı!\n\nSipariş No: #${result.orderNumber || 'N/A'}\n\nSiparişiniz en kısa sürede hazırlanıp adresinize teslim edilecektir.`);
          // Delivery'de sayfada kal (yeni sipariş için tekrar gelebilir)
        } else if (isSelfService) {
          alert(`🍽️ Siparişiniz alındı!\n\nSipariş No: #${result.orderNumber || 'N/A'}`);
          // Self-service'de sayfada kal
        } else {
          alert(`Siparişiniz başarıyla alındı! Sipariş No: #${result.orderNumber || 'N/A'}\n\nYeni sipariş için QR kodu tekrar okutun.`);
          // Sayfada kal - yenileme gerek yok
        }
      } else {
        // Hata durumları
        if (result.requiresLogin) {
          alert('Sipariş vermek için giriş yapmalısınız.');
          onClose();
          setTimeout(() => openProfile(), 300);
        } else if (result.userBlocked) {
          alert('Hesabınız askıya alınmıştır. Lütfen destek ile iletişime geçin.');
        } else if (result.restaurantBlocked) {
          alert(result.error || 'Bu restorandan sipariş verme yetkiniz kaldırılmıştır.');
        } else if (result.dailyLimitReached) {
          alert('Bu restorandan bugün 7 sipariş verdiniz. Günlük limit doldu.');
        } else if (result.differentTableError) {
          alert(result.error || 'Farklı masadan sipariş verme hatası.');
        } else {
          alert(result.error || 'Sipariş gönderilirken bir hata oluştu.');
        }
      }
    } catch (error) {
      console.error('Order submission error:', error);
      alert('Sipariş gönderilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate total with token discount (porsiyon bazlı destekli)
  const calculateTotal = () => {
    let totalPrice = 0;
    let totalTokensUsed = 0;

    items.forEach(item => {
      const tokenQty = item.tokenQuantity || 0;
      const cashQuantity = item.quantity - tokenQty;

      // Cash portion
      totalPrice += cashQuantity * item.price;

      // Token portion (porsiyon bazlı kontrol)
      if (tokenQty > 0) {
        const tokenSettings = getTokenSettingsForItem(item.sambaId || item.productId, item.sambaPortionId);
        if (tokenSettings) {
          totalTokensUsed += tokenQty * tokenSettings.redeemTokens;
        }
      }
    });

    return { totalPrice, totalTokensUsed };
  };

  const { totalPrice, totalTokensUsed } = calculateTotal();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Overlay */}
      <div
        className="cart-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          transition: 'all 0.3s ease',
          zIndex: 99998,
        }}
      />

      {/* Sidebar */}
      <div
        className={`cart-sidebar ${isOpen ? 'sidebar-open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          right: isOpen ? 0 : '-100%',
          width: '100vw',
          maxWidth: '100vw',
          height: '100dvh',
          margin: 0,
          padding: 0,
          background: 'rgba(245, 245, 245, 0.98)',
          backdropFilter: 'blur(10px)',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.2)',
          transition: 'right 0.3s ease',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header - Tek Satır */}
        <div
          className="cart-header"
          style={{
            background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
            color: 'white',
            padding: '12px 15px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          {/* Sol: Sepetim + Ürün sayısı */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <i className="fas fa-shopping-cart" style={{ fontSize: '16px' }}></i>
            <span style={{ fontSize: '16px', fontWeight: 600 }}>Sepetim</span>
            <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
              {totalItems}
            </span>
          </div>

          {/* Orta: Jeton bakiyesi (Kalan) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', flex: 1, justifyContent: 'center' }}>
            {userTokenBalance > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                <span style={{ fontSize: '9px', opacity: 0.9, fontWeight: 500 }}>Jeton</span>
                <span style={{ background: 'rgba(255, 255, 255, 0.25)', padding: '4px 12px', borderRadius: '6px', fontWeight: 700, fontSize: '16px' }}>
                  🪙 {userTokenBalance - totalTokensUsed}
                </span>
              </div>
            )}
          </div>

          {/* Sağ: Toplam */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '10px', opacity: 0.95, fontWeight: 600, letterSpacing: '0.5px' }}>TOPLAM</span>
            <span style={{ background: 'rgba(255, 255, 255, 0.3)', padding: '6px 14px', borderRadius: '8px', fontWeight: 800, fontSize: '20px', letterSpacing: '0.5px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              {totalPrice.toFixed(2)} ₺
            </span>
          </div>

          {/* Sağ: Kapat butonu */}
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              color: 'white',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 'bold',
              flexShrink: 0,
              marginLeft: '8px',
            }}
          >
            ×
          </button>
        </div>

        {/* Items List */}
        <div
          className="cart-items"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '15px',
          }}
        >
          {items.length === 0 ? (
            <div
              className="empty-cart"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                textAlign: 'center',
                color: '#666',
              }}
            >
              <i className="fas fa-shopping-cart" style={{ fontSize: '60px', marginBottom: '20px', opacity: 0.3 }}></i>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 600 }}>Sepetiniz boş</h4>
              <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
                Ürün eklemek için menüdeki "Sepete Ekle" butonlarını kullanın
              </p>
            </div>
          ) : (
            <>
            {items.map((item, index) => (
              <div
                key={item.id || `${item.productId}-${item.portionName || ''}-${index}`}
                className="cart-item"
                style={{
                  background: 'white',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  marginBottom: '6px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Product Name + Price + Quantity Controls */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#333', flex: 1, minWidth: 0 }}>
                        {item.name}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                        {/* Price */}
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#28a745' }}>
                          {(item.price * item.quantity).toFixed(2)} ₺
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          style={{
                            width: '26px',
                            height: '26px',
                            border: '1px solid #ddd',
                            background: 'white',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            color: '#666',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          −
                        </button>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#333', minWidth: '20px', textAlign: 'center' }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          style={{
                            width: '26px',
                            height: '26px',
                            border: '1px solid #28a745',
                            background: '#28a745',
                            color: 'white',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Token Info */}
                    {(() => {
                      const tokenQty = item.tokenQuantity || 0;
                      const tokenSettings = getTokenSettingsForItem(item.sambaId || item.productId, item.sambaPortionId);

                      if (tokenQty > 0 && tokenSettings) {
                        const cashQuantity = item.quantity - tokenQty;

                        if (cashQuantity > 0) {
                          // Partial token payment
                          return (
                            <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                              <div style={{ color: '#28a745', fontWeight: 'bold' }}>
                                🪙 {tokenQty} adet jeton ile ({tokenQty * tokenSettings.redeemTokens} jeton)
                              </div>
                              <div style={{ color: '#666' }}>
                                {cashQuantity} adet nakit: {(cashQuantity * item.price).toFixed(2)} ₺
                              </div>
                            </div>
                          );
                        } else {
                          // All with tokens
                          return (
                            <div style={{ color: '#28a745', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>
                              🪙 {tokenQty} adet x {tokenSettings.redeemTokens} jeton
                            </div>
                          );
                        }
                      }

                      // Earn tokens info (only if not using tokens)
                      if (tokenSettings && tokenSettings.earnTokens > 0) {
                        return (
                          <div style={{ fontSize: '11px', color: '#28a745', marginBottom: '4px' }}>
                            +{tokenSettings.earnTokens * item.quantity} jeton kazanacaksınız
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Item Note */}
                    <input
                      type="text"
                      placeholder="Nasıl olsun? sade, demli, acısız vs. (opsiyonel)"
                      value={item.note || ''}
                      onChange={(e) => updateItemNote(item.productId, e.target.value)}
                      maxLength={100}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '12px',
                        marginBottom: '8px',
                      }}
                    />

                    {/* Token Button */}
                    {(() => {
                      const lookupKey = item.sambaId || item.productId;
                      const tokenSettings = getTokenSettingsForItem(lookupKey, item.sambaPortionId);

                      if (!tokenSettings || tokenSettings.redeemTokens <= 0) return null;

                      const tokenQty = item.tokenQuantity || 0;
                      const maxAffordable = Math.floor(userTokenBalance / tokenSettings.redeemTokens);
                      const maxTokenQuantity = Math.min(item.quantity, maxAffordable);
                      const hasEnoughTokens = userTokenBalance >= tokenSettings.redeemTokens;

                      return (
                        <button
                          onClick={() => toggleTokenPurchase(item.productId)}
                          disabled={!hasEnoughTokens}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            marginBottom: '8px',
                            background: tokenQty > 0 ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' : (hasEnoughTokens ? 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)' : '#e9ecef'),
                            color: hasEnoughTokens ? 'white' : '#adb5bd',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: hasEnoughTokens ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s',
                          }}
                        >
                          🪙 {tokenQty === 0
                            ? `${tokenSettings.redeemTokens} Jeton kullan${!hasEnoughTokens ? ' (Yetersiz)' : ''}`
                            : tokenQty < maxTokenQuantity
                            ? `${tokenQty}/${maxTokenQuantity} adet (tıkla: +1)`
                            : `${tokenQty}/${maxTokenQuantity} adet (tıkla: iptal)`
                          }
                        </button>
                      );
                    })()}

                  </div>
                </div>
              </div>
            ))}

            {/* Ürün Önerileri - Sepette ürün varsa göster (delivery'de gizli) */}
            {!isDelivery && (
              <ProductSuggestions
                cartItems={items}
                onAddToCart={handleAddSuggestedProduct}
                maxSuggestions={4}
              />
            )}
            </>
          )}
        </div>

        {/* Footer - Sadece Not ve Butonlar */}
        {items.length > 0 && (
          <div
            className="cart-footer"
            style={{
              borderTop: '1px solid #e2e8f0',
              padding: '12px 15px',
              paddingBottom: '20px',
              background: 'white',
              flexShrink: 0,
            }}
          >
            {/* Customer Note */}
            <div style={{ marginBottom: '10px' }}>
              <textarea
                placeholder="Sipariş notu (opsiyonel)..."
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                maxLength={200}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  resize: 'none',
                  height: '50px',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Delivery Info Section - Kompakt */}
            {isDelivery && deliveryInfo && (
              <div style={{
                background: '#fff8f0',
                border: '1px solid #ffd699',
                borderRadius: '8px',
                padding: '8px 10px',
                marginBottom: '8px',
                fontSize: '11px',
              }}>
                {/* Adres + Ücretler Yan Yana veya Alt Alta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Teslimat Adresi */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <i className="fas fa-map-marker-alt" style={{ color: '#ff6b00', marginTop: '2px' }}></i>
                    {deliveryInfo.address.city ? (
                      <span style={{ color: '#333', lineHeight: 1.3 }}>
                        {deliveryInfo.address.neighborhood}, {deliveryInfo.address.street} No:{deliveryInfo.address.buildingNo}
                        {deliveryInfo.address.floor && ` K:${deliveryInfo.address.floor}`}
                        {deliveryInfo.address.apartmentNo && ` D:${deliveryInfo.address.apartmentNo}`}
                        <span style={{ color: '#888' }}> - {deliveryInfo.address.district}/{deliveryInfo.address.city}</span>
                      </span>
                    ) : (
                      <span style={{ color: '#dc3545' }}>⚠️ Adres giriniz</span>
                    )}
                  </div>

                  {/* Ücret Özeti - Tek Satır */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #ffd699', paddingTop: '6px' }}>
                    <div style={{ display: 'flex', gap: '10px', color: '#666' }}>
                      <span>Ürün: <b style={{ color: '#333' }}>{totalPrice.toFixed(0)}₺</b></span>
                      <span>Teslimat: <b style={{ color: totalPrice >= deliveryInfo.freeDeliveryThreshold ? '#28a745' : '#333' }}>
                        {totalPrice >= deliveryInfo.freeDeliveryThreshold ? 'Ücretsiz' : `${deliveryInfo.deliveryFee.toFixed(0)}₺`}
                      </b></span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#ff6b00', fontSize: '13px' }}>
                      {(totalPrice + (totalPrice >= deliveryInfo.freeDeliveryThreshold ? 0 : deliveryInfo.deliveryFee)).toFixed(2)} ₺
                    </span>
                  </div>

                  {/* Min Sipariş Uyarısı */}
                  {totalPrice < deliveryInfo.minOrderAmount && (
                    <div style={{ fontSize: '10px' }}>
                      <span style={{ color: '#856404', background: '#fff3cd', padding: '2px 6px', borderRadius: '4px' }}>
                        ⚠️ Min. {deliveryInfo.minOrderAmount.toFixed(0)}₺ sipariş tutarı gerekli
                      </span>
                    </div>
                  )}

                  {/* Ödeme Yöntemi Seçimi */}
                  <div style={{ borderTop: '1px dashed #ffd699', paddingTop: '8px', marginTop: '4px' }}>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px', fontWeight: 600 }}>💳 Ödeme Yöntemi:</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => { setPaymentMethod('cash'); setShowOtherPayments(false); }}
                        style={{
                          flex: 1,
                          padding: '8px 6px',
                          border: paymentMethod === 'cash' ? '2px solid #28a745' : '1px solid #ddd',
                          background: paymentMethod === 'cash' ? 'linear-gradient(135deg, #e8f5e9, #c8e6c9)' : '#fff',
                          borderRadius: '8px',
                          fontSize: '10px',
                          fontWeight: paymentMethod === 'cash' ? 700 : 500,
                          color: paymentMethod === 'cash' ? '#28a745' : '#666',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        💵 Nakit
                      </button>
                      <button
                        onClick={() => { setPaymentMethod('card'); setShowOtherPayments(false); }}
                        style={{
                          flex: 1,
                          padding: '8px 6px',
                          border: paymentMethod === 'card' ? '2px solid #007bff' : '1px solid #ddd',
                          background: paymentMethod === 'card' ? 'linear-gradient(135deg, #e3f2fd, #bbdefb)' : '#fff',
                          borderRadius: '8px',
                          fontSize: '10px',
                          fontWeight: paymentMethod === 'card' ? 700 : 500,
                          color: paymentMethod === 'card' ? '#007bff' : '#666',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        💳 Kart
                      </button>
                      <button
                        onClick={() => setShowOtherPayments(!showOtherPayments)}
                        style={{
                          flex: 1,
                          padding: '8px 6px',
                          border: ['ticket', 'edenred', 'sodexo', 'multinet', 'setcard', 'metropol'].includes(paymentMethod) ? '2px solid #ff6b00' : '1px solid #ddd',
                          background: ['ticket', 'edenred', 'sodexo', 'multinet', 'setcard', 'metropol'].includes(paymentMethod) ? 'linear-gradient(135deg, #fff3e0, #ffe0b2)' : '#fff',
                          borderRadius: '8px',
                          fontSize: '10px',
                          fontWeight: ['ticket', 'edenred', 'sodexo', 'multinet', 'setcard', 'metropol'].includes(paymentMethod) ? 700 : 500,
                          color: ['ticket', 'edenred', 'sodexo', 'multinet', 'setcard', 'metropol'].includes(paymentMethod) ? '#ff6b00' : '#666',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        🎫 Diğer {showOtherPayments ? '▲' : '▼'}
                      </button>
                    </div>

                    {/* Diğer Ödeme Yöntemleri */}
                    {showOtherPayments && (
                      <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                        {[
                          { id: 'ticket', label: 'Ticket', icon: '🎟️' },
                          { id: 'edenred', label: 'Edenred', icon: '🔴' },
                          { id: 'sodexo', label: 'Sodexo', icon: '🟠' },
                          { id: 'multinet', label: 'Multinet', icon: '🟣' },
                          { id: 'setcard', label: 'Setcard', icon: '🔵' },
                          { id: 'metropol', label: 'Metropol', icon: '🟢' },
                        ].map((method) => (
                          <button
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id as any)}
                            style={{
                              padding: '6px 4px',
                              border: paymentMethod === method.id ? '2px solid #ff6b00' : '1px solid #ddd',
                              background: paymentMethod === method.id ? 'linear-gradient(135deg, #fff3e0, #ffe0b2)' : '#fff',
                              borderRadius: '6px',
                              fontSize: '9px',
                              fontWeight: paymentMethod === method.id ? 700 : 500,
                              color: paymentMethod === method.id ? '#ff6b00' : '#666',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            {method.icon} {method.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={clearCart}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <i className="fas fa-trash-alt"></i>
                <span>Temizle</span>
              </button>
              <button
                onClick={submitOrder}
                disabled={isSubmitting || (isDelivery && deliveryInfo && (totalPrice < deliveryInfo.minOrderAmount || !deliveryInfo.address.city))}
                style={{
                  flex: 2,
                  padding: '12px',
                  background: isSubmitting || (isDelivery && deliveryInfo && (totalPrice < deliveryInfo.minOrderAmount || !deliveryInfo.address.city))
                    ? '#ccc'
                    : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isSubmitting || (isDelivery && deliveryInfo && (totalPrice < deliveryInfo.minOrderAmount || !deliveryInfo.address.city)) ? 'not-allowed' : 'pointer',
                  boxShadow: isSubmitting || (isDelivery && deliveryInfo && (totalPrice < deliveryInfo.minOrderAmount || !deliveryInfo.address.city)) ? 'none' : '0 4px 12px rgba(40, 167, 69, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <i className="fas fa-paper-plane"></i>
                <span>
                  {isSubmitting
                    ? 'Gönderiliyor...'
                    : isDelivery && deliveryInfo && !deliveryInfo.address.city
                      ? 'Adres Gerekli'
                      : isDelivery && deliveryInfo && totalPrice < deliveryInfo.minOrderAmount
                        ? `Min. ${deliveryInfo.minOrderAmount}₺`
                        : 'Sipariş Ver'
                  }
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
