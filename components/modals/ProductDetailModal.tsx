'use client';

import { useEffect, useState } from 'react';
import { useMenu } from '@/contexts/MenuContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/UserContext';
import { getTitle, getDescription } from '@/utils/language';
import { saveCart, loadCart } from '@/utils/cartUtils';
import AllergenWarning from '@/components/common/AllergenWarning';
import { useToast } from '@/components/ui/Toast';

export default function ProductDetailModal() {
  const { menuData, customerData, selectedProduct, isProductDetailModalOpen, closeProductDetailModal, isTableMode, canUseBasket, cartKey, productTokenSettings, openProfile } = useMenu();
  const { language, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { showCartToast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Font ve renk customization
  const productFont = customerData?.customer.productFont || 'Inter, sans-serif';

  // Modal her açıldığında quantity'yi sıfırla
  useEffect(() => {
    if (isProductDetailModalOpen) {
      setQuantity(1);
      setImageLoaded(false);
    }
  }, [isProductDetailModalOpen]);

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
    if (!selectedProduct || !isTableMode || !cartKey || !menuData) return;

    // Giriş kontrolü
    if (!isAuthenticated) {
      showCartToast('Sepete eklemek için giriş yapmalısınız', '');
      closeProductDetailModal();
      setTimeout(() => openProfile(), 300);
      return;
    }

    const customerCode = menuData.customerTitle || 'unknown';
    let cartItems = loadCart(cartKey, customerCode);

    const productId = selectedProduct.Id ?? selectedProduct.id;
    const existingItemIndex = cartItems.findIndex(
      (item: any) => item.productId === productId
    );

    if (existingItemIndex >= 0) {
      cartItems[existingItemIndex].quantity += quantity;
    } else {
      const productName = getTitle(selectedProduct, language);
      cartItems.push({
        id: Date.now(),
        productId: productId,
        sambaId: selectedProduct.SambaId ?? selectedProduct.sambaId,
        name: productName,
        price: selectedProduct.Price ?? selectedProduct.price ?? 0,
        quantity: quantity,
        image: selectedProduct.Picture ?? selectedProduct.picture,
      });
    }

    saveCart(cartKey, cartItems, customerCode);
    window.dispatchEvent(new Event('cartUpdated'));

    const productName = getTitle(selectedProduct, language);
    showCartToast(productName, '', () => {
      window.dispatchEvent(new CustomEvent('openCart'));
    });

    closeProductDetailModal();
  };

  if (!isProductDetailModalOpen || !selectedProduct) return null;

  const getImageUrl = (picture?: string) => {
    if (!picture) {
      const customerLogo = menuData?.customerLogo;
      if (customerLogo) {
        if (customerLogo.startsWith('http')) {
          return customerLogo.replace('http://', 'https://');
        }
        const cleanPath = customerLogo.startsWith('Uploads/') ? customerLogo.substring(8) : customerLogo;
        return `https://canlimenu.online/Uploads/${cleanPath}`;
      }
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%231a1a2e" width="800" height="600"/%3E%3C/svg%3E';
    }
    if (picture.startsWith('http')) {
      return picture.replace('http://', 'https://');
    }
    const cleanPath = picture.startsWith('Uploads/') ? picture.substring(8) : picture;
    return `https://canlimenu.online/Uploads/${cleanPath}`;
  };

  const productImageUrl = getImageUrl(selectedProduct.Picture);
  const productTitle = getTitle(selectedProduct, language);
  const productDescription = getDescription(selectedProduct, language);
  const price = selectedProduct.Price ?? selectedProduct.price ?? 0;
  const totalPrice = price * quantity;

  // Token bilgisi
  const productId = selectedProduct.Id ?? selectedProduct.id;
  const sambaId = selectedProduct.SambaId ?? selectedProduct.sambaId;
  const tokenSetting = (productId && productTokenSettings[productId]) || (sambaId && productTokenSettings[sambaId]);
  const hasEarn = tokenSetting && tokenSetting.earnTokens > 0;
  const hasRedeem = tokenSetting && tokenSetting.redeemTokens > 0;

  return (
    <div className="product-detail-modal-v2" onClick={closeProductDetailModal}>
      <div className="pdm-container" onClick={(e) => e.stopPropagation()}>

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

          {/* Fiyat badge */}
          {price > 0 && (
            <div className="pdm-price-badge">
              <span className="pdm-price-value">{price.toFixed(2)}</span>
              <span className="pdm-price-currency">TL</span>
            </div>
          )}
        </div>

        {/* İçerik Alanı */}
        <div className="pdm-content">
          {/* Başlık */}
          <h1 className="pdm-title" style={{ fontFamily: productFont }}>
            {productTitle}
          </h1>

          {/* Açıklama */}
          {productDescription && (
            <p className="pdm-description" style={{ fontFamily: productFont }}>
              {productDescription}
            </p>
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
          {isTableMode && canUseBasket && (
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
