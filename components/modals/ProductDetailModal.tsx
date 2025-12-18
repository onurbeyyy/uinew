'use client';

import { useEffect, useState, useRef } from 'react';
import { useMenu } from '@/contexts/MenuContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/UserContext';
import { getTitle, getDescription } from '@/utils/language';
import { saveCart, loadCart } from '@/utils/cartUtils';
import AllergenWarning from '@/components/common/AllergenWarning';
import { useToast } from '@/components/ui/Toast';
import type { ProductPortion, Product } from '@/types/api';

export default function ProductDetailModal() {
  const { menuData, customerData, customerCode, selectedProduct, selectedCategory, isProductDetailModalOpen, closeProductDetailModal, openProductDetailModal, isTableMode, canUseBasket, cartKey, getTokenSettingsForItem, openProfile, canOrderProduct, todayHappyHourTimeRange } = useMenu();
  const { language, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { showCartToast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedPortion, setSelectedPortion] = useState<ProductPortion | null>(null);

  // Swipe navigation için
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Font ve renk customization
  const productFont = customerData?.customer.productFont || 'Inter, sans-serif';

  // Mevcut kategorideki ürünler
  const currentProducts: Product[] = selectedCategory?.products || [];
  const currentProductIndex = currentProducts.findIndex(
    (p) => (p.id ?? p.Id) === (selectedProduct?.id ?? selectedProduct?.Id)
  );

  // Porsiyonları al (API'den gelen Portions veya portions)
  const portions: ProductPortion[] = selectedProduct?.Portions ?? selectedProduct?.portions ?? [];
  const hasPortions = portions.length > 1;

  // Önceki/sonraki ürüne geçiş
  const goToPrevProduct = () => {
    if (currentProductIndex > 0) {
      openProductDetailModal(currentProducts[currentProductIndex - 1]);
    }
  };

  const goToNextProduct = () => {
    if (currentProductIndex < currentProducts.length - 1) {
      openProductDetailModal(currentProducts[currentProductIndex + 1]);
    }
  };

  // Swipe handler
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;
    handleSwipe();
  };

  const handleSwipe = () => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Sola kaydır - sonraki ürün
        goToNextProduct();
      } else {
        // Sağa kaydır - önceki ürün
        goToPrevProduct();
      }
    }
  };

  // Modal her açıldığında quantity'yi ve porsiyon seçimini sıfırla
  useEffect(() => {
    if (isProductDetailModalOpen && selectedProduct) {
      setQuantity(1);
      setImageLoaded(false);
      // İlk porsiyonu varsayılan olarak seç
      const productPortions = selectedProduct.Portions ?? selectedProduct.portions ?? [];
      if (productPortions.length > 0) {
        setSelectedPortion(productPortions[0]);
      } else {
        setSelectedPortion(null);
      }
    }
  }, [isProductDetailModalOpen, selectedProduct]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isProductDetailModalOpen) {
        closeProductDetailModal();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isProductDetailModalOpen, closeProductDetailModal]);

  const handleAddToCart = () => {
    if (!selectedProduct || !isTableMode || !cartKey || !customerCode) return;

    // Not: Login kontrolü kaldırıldı - WiFi sisteminde herkes sepete ekleyebilir
    // Sipariş verirken WiFi veya login kontrolü yapılacak (CartSidebar'da)

    let cartItems = loadCart(cartKey, customerCode);

    // Porsiyon varsa porsiyon ID'sini, yoksa ürün ID'sini kullan
    const productId = selectedPortion?.id ?? selectedProduct.Id ?? selectedProduct.id;
    const portionName = selectedPortion?.name || '';

    // Aynı ürün + aynı porsiyon kombinasyonunu bul
    const existingItemIndex = cartItems.findIndex(
      (item: any) => item.productId === productId && item.portionName === portionName
    );

    if (existingItemIndex >= 0) {
      cartItems[existingItemIndex].quantity += quantity;
    } else {
      const productName = getTitle(selectedProduct, language);
      const displayName = portionName ? `${productName} (${portionName})` : productName;
      const itemPrice = selectedPortion?.price ?? selectedProduct.Price ?? selectedProduct.price ?? 0;

      cartItems.push({
        id: Date.now(),
        productId: productId,
        sambaId: selectedProduct.SambaId ?? selectedProduct.sambaId,
        sambaPortionId: selectedPortion?.sambaPortionId,
        portionName: portionName,
        name: displayName,
        price: itemPrice,
        quantity: quantity,
        image: selectedProduct.Picture ?? selectedProduct.picture,
        linkedProductId: selectedProduct.LinkedProductId ?? selectedProduct.linkedProductId, // HH bağlı ürün
      });
    }

    saveCart(cartKey, cartItems, customerCode);
    window.dispatchEvent(new Event('cartUpdated'));

    const productName = getTitle(selectedProduct, language);
    const displayName = portionName ? `${productName} (${portionName})` : productName;
    showCartToast(displayName, '', () => {
      window.dispatchEvent(new CustomEvent('openCart'));
    });

    closeProductDetailModal();
  };

  if (!isProductDetailModalOpen || !selectedProduct) return null;

  const getImageUrl = (picture?: string) => {
    // Boş string veya undefined ise logo kullan
    if (!picture || picture.trim() === '') {
      const customerLogo = menuData?.customerLogo;
      if (customerLogo && customerLogo.trim() !== '') {
        if (customerLogo.startsWith('http')) {
          return customerLogo.replace('http://', 'https://');
        }
        const cleanPath = customerLogo.startsWith('Uploads/') ? customerLogo.substring(8) : customerLogo;
        return `https://apicanlimenu.online/Uploads/${cleanPath}`;
      }
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%231a1a2e" width="800" height="600"/%3E%3C/svg%3E';
    }
    if (picture.startsWith('http')) {
      return picture.replace('http://', 'https://');
    }
    const cleanPath = picture.startsWith('Uploads/') ? picture.substring(8) : picture;
    return `https://apicanlimenu.online/Uploads/${cleanPath}`;
  };

  const productImageUrl = getImageUrl(selectedProduct.Picture ?? selectedProduct.picture);
  const productTitle = getTitle(selectedProduct, language);
  const productDescription = getDescription(selectedProduct, language);

  // Fiyat: Seçili porsiyon varsa onu, yoksa ürün fiyatını kullan
  const price = selectedPortion?.price ?? selectedProduct.Price ?? selectedProduct.price ?? 0;
  const totalPrice = price * quantity;

  // Token bilgisi - porsiyon bazlı ayarları da kontrol et
  const sambaId = selectedProduct.SambaId ?? selectedProduct.sambaId;
  const sambaPortionId = selectedPortion?.sambaPortionId ?? (selectedProduct as any).SambaPortionId ?? (selectedProduct as any).sambaPortionId;
  const tokenSetting = getTokenSettingsForItem(sambaId, sambaPortionId);
  const hasEarn = tokenSetting && tokenSetting.earnTokens > 0;
  const hasRedeem = tokenSetting && tokenSetting.redeemTokens > 0;

  return (
    <div className="product-detail-modal-v2" onClick={closeProductDetailModal}>
      <div
        className="pdm-container"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Navigasyon okları */}
        {currentProducts.length > 1 && (
          <>
            {currentProductIndex > 0 && (
              <button
                className="pdm-nav-btn pdm-nav-prev"
                onClick={(e) => { e.stopPropagation(); goToPrevProduct(); }}
                aria-label="Önceki ürün"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
            )}
            {currentProductIndex < currentProducts.length - 1 && (
              <button
                className="pdm-nav-btn pdm-nav-next"
                onClick={(e) => { e.stopPropagation(); goToNextProduct(); }}
                aria-label="Sonraki ürün"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            )}
          </>
        )}

        {/* Kapatma butonu */}
        <button className="pdm-close" onClick={closeProductDetailModal} aria-label={t('close')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Görsel Alanı */}
        <div className="pdm-image-section">
          <div className={`pdm-image-wrapper ${imageLoaded ? 'loaded' : ''}`}>
            <img
              src={productImageUrl}
              alt={productTitle}
              className="pdm-image"
              onLoad={() => setImageLoaded(true)}
            />
            <div className="pdm-image-overlay"></div>
          </div>

          {/* Alerjen uyarısı */}
          <AllergenWarning
            productAllergens={selectedProduct.Allergens ?? selectedProduct.allergens}
            className="pdm-allergen"
          />
        </div>

        {/* İçerik Alanı */}
        <div className="pdm-content">
          {/* Başlık */}
          <h1 className="pdm-title" style={{ fontFamily: productFont }}>
            {productTitle}
          </h1>

          {/* Açıklama - porsiyon yoksa göster (porsiyon varsa description zaten porsiyon adı) */}
          {productDescription && !hasPortions && (
            <p className="pdm-description" style={{ fontFamily: productFont }}>
              {productDescription}
            </p>
          )}

          {/* Porsiyon Seçimi */}
          {hasPortions && (
            <div className="pdm-portions">
              <div className="pdm-portions-label">Porsiyon Seçin</div>
              <div className="pdm-portions-list">
                {portions.map((portion) => (
                  <button
                    key={portion.id}
                    className={`pdm-portion-btn ${selectedPortion?.id === portion.id ? 'active' : ''}`}
                    onClick={() => setSelectedPortion(portion)}
                  >
                    <span className="pdm-portion-name">
                      {language === 'en' ? (portion.nameEnglish || portion.nameEn || portion.name) : portion.name}
                    </span>
                    <span className="pdm-portion-price">{portion.price.toFixed(2)} TL</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Jeton Bilgisi */}
          {isTableMode && canUseBasket && (hasEarn || hasRedeem) && (
            <div className="pdm-tokens">
              {hasEarn && (
                <div className="pdm-token pdm-token-earn">
                  <span className="pdm-token-icon">🎁</span>
                  <div className="pdm-token-info">
                    <span className="pdm-token-label">Jeton Kazanın</span>
                    <span className="pdm-token-value">+{tokenSetting.earnTokens} jeton</span>
                  </div>
                </div>
              )}
              {hasRedeem && (
                <div className="pdm-token pdm-token-redeem">
                  <span className="pdm-token-icon">🪙</span>
                  <div className="pdm-token-info">
                    <span className="pdm-token-label">Jetonla Alın</span>
                    <span className="pdm-token-value">{tokenSetting.redeemTokens} jeton</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sepete Ekleme Alanı */}
          {isTableMode && canUseBasket && canOrderProduct(selectedProduct) && (
            <div className="pdm-cart-section">
              {/* Miktar Seçici */}
              <div className="pdm-quantity">
                <button
                  className="pdm-qty-btn pdm-qty-minus"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <span className="pdm-qty-value">{quantity}</span>
                <button
                  className="pdm-qty-btn pdm-qty-plus"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </div>

              {/* Sepete Ekle Butonu */}
              <button className="pdm-add-btn" onClick={handleAddToCart}>
                <span className="pdm-add-btn-text">{t('addToCart')}</span>
                <span className="pdm-add-btn-price">{totalPrice.toFixed(2)} TL</span>
              </button>
            </div>
          )}

          {/* Happy Hour dışında HH ürünü mesajı */}
          {isTableMode && canUseBasket && !canOrderProduct(selectedProduct) && todayHappyHourTimeRange && (
            <div className="pdm-hh-message">
              <span className="pdm-hh-icon">🍺</span>
              <span className="pdm-hh-text">
                Bu ürün {todayHappyHourTimeRange} saatlerinde sipariş edilebilir
              </span>
            </div>
          )}

          {/* Sadece fiyat göster (sepet yoksa) */}
          {(!isTableMode || !canUseBasket) && price > 0 && (
            <div className="pdm-price-display">
              <span className="pdm-price-label">Fiyat</span>
              <span className="pdm-price-amount">{price.toFixed(2)} TL</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
