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

  // Font ve renk customization
  const productFont = customerData?.customer.productFont || 'Inter, sans-serif';
  const productTitleColor = customerData?.customer.productTitleColor || '#FFFFFF';
  const productDescriptionColor = customerData?.customer.productDescriptionColor || 'rgba(255, 255, 255, 0.88)';

  // Modal her açıldığında quantity'yi sıfırla
  useEffect(() => {
    if (isProductDetailModalOpen) {
      setQuantity(1);
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

    // 🔐 Giriş kontrolü - Sepete eklemek için giriş şart
    if (!isAuthenticated) {
      showCartToast('Sepete eklemek için giriş yapmalısınız', '');
      closeProductDetailModal();
      setTimeout(() => openProfile(), 300);
      return;
    }

    // Customer code al (menuData'dan)
    const customerCode = menuData.customerTitle || 'unknown';

    // Mevcut sepeti yükle (cartUtils ile - otomatik temizlik var)
    let cartItems = loadCart(cartKey, customerCode);

    // Ürün zaten sepette var mı?
    const productId = selectedProduct.Id ?? selectedProduct.id;
    const existingItemIndex = cartItems.findIndex(
      (item: any) => item.productId === productId
    );

    if (existingItemIndex >= 0) {
      // Varsa miktarı artır
      cartItems[existingItemIndex].quantity += quantity;
    } else {
      // Yoksa yeni ekle
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

    // Sepeti kaydet (cartUtils ile - customerCode ve timestamp ile)
    saveCart(cartKey, cartItems, customerCode);

    // Dispatch event to update cart sidebar
    window.dispatchEvent(new Event('cartUpdated'));

    // Success feedback - Toast ile göster
    const productName = getTitle(selectedProduct, language);
    const productPicture = selectedProduct.Picture ?? selectedProduct.picture;
    let imageUrl = '';
    if (productPicture) {
      if (productPicture.startsWith('http')) {
        imageUrl = productPicture.replace('http://', 'https://');
      } else {
        const cleanPath = productPicture.startsWith('Uploads/') ? productPicture.substring(8) : productPicture;
        imageUrl = `https://canlimenu.online/Uploads/${cleanPath}`;
      }
    }

    showCartToast(productName, '', () => {
      // Sepete git - cart sidebar'ı aç
      window.dispatchEvent(new CustomEvent('openCart'));
    });

    // Modal'ı kapat
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
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%23667eea" width="800" height="600"/%3E%3C/svg%3E';
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
  const productDetail = getDescription(selectedProduct, language);

  return (
    <div
      className="single-product-modal"
      style={{
        display: isProductDetailModalOpen ? 'flex' : 'none',
      }}
    >
      <div className="modal-overlay" onClick={closeProductDetailModal} />

      <div className="modal-content">
        <button className="modal-close" onClick={closeProductDetailModal} aria-label={t('close')}>
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="modal-image-container" style={{ position: 'relative' }}>
          <AllergenWarning productAllergens={selectedProduct.Allergens ?? selectedProduct.allergens} className="allergen-on-image" />
          <img
            src={productImageUrl}
            alt={productTitle}
            className="modal-product-image"
            loading="eager"
          />
        </div>

        <div className="modal-info-container">
          <h1 className="modal-product-title" style={{ fontFamily: productFont, color: productTitleColor }}>
            {productTitle}
          </h1>

          {productDescription && (
            <p className="modal-product-description" style={{ fontFamily: productFont, color: productDescriptionColor }}>
              {productDescription}
            </p>
          )}

          {productDetail && (
            <div className="modal-product-detail">
              <p style={{ fontFamily: productFont, color: productDescriptionColor }}>
                {productDetail}
              </p>
            </div>
          )}

          {/* Jeton Bilgisi */}
          {isTableMode && canUseBasket && (() => {
            const productId = selectedProduct.Id ?? selectedProduct.id;
            const sambaId = selectedProduct.SambaId ?? selectedProduct.sambaId;
            const tokenSetting = (productId && productTokenSettings[productId]) || (sambaId && productTokenSettings[sambaId]);
            const hasEarn = tokenSetting && tokenSetting.earnTokens > 0;
            const hasRedeem = tokenSetting && tokenSetting.redeemTokens > 0;

            if (!hasEarn && !hasRedeem) return null;

            return (
              <div style={{ marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {hasEarn && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.25), rgba(46, 125, 50, 0.2))',
                    border: '2px solid rgba(76, 175, 80, 0.5)',
                    backdropFilter: 'blur(10px)',
                  }}>
                    <span style={{ fontSize: '24px' }}>🎁</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#4caf50', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Jeton Kazanın
                      </span>
                      <span style={{ color: 'white', fontSize: '1.1rem', fontWeight: 700 }}>
                        +{tokenSetting.earnTokens} jeton kazanacaksınız
                      </span>
                    </div>
                  </div>
                )}
                {hasRedeem && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.25), rgba(255, 109, 0, 0.2))',
                    border: '2px solid rgba(255, 152, 0, 0.5)',
                    backdropFilter: 'blur(10px)',
                  }}>
                    <span style={{ fontSize: '24px' }}>🪙</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#ff9800', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Jetonla Alın
                      </span>
                      <span style={{ color: 'white', fontSize: '1.1rem', fontWeight: 700 }}>
                        {tokenSetting.redeemTokens} jetona alabilirsiniz
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="modal-product-price">
            {(selectedProduct.Price ?? selectedProduct.price ?? 0) > 0 ? `${(selectedProduct.Price ?? selectedProduct.price ?? 0).toFixed(2)} TL` : t('noPriceInfo')}
          </div>

          {isTableMode && canUseBasket && (
            <>
              {/* Quantity Selector */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '15px',
                  margin: '20px 0',
                }}
              >
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{
                    width: '40px',
                    height: '40px',
                    border: '2px solid #ddd',
                    background: 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#666',
                  }}
                >
                  -
                </button>
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    minWidth: '40px',
                    textAlign: 'center',
                    color: 'white',
                  }}
                >
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  style={{
                    width: '40px',
                    height: '40px',
                    border: '2px solid #28a745',
                    background: '#28a745',
                    color: 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 600,
                  }}
                >
                  +
                </button>
              </div>

              {/* Add to Cart Button */}
              <button className="modal-add-to-cart-btn" onClick={handleAddToCart}>
                <i className="fa-solid fa-cart-plus"></i>
                <span>{t('addToCart')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
