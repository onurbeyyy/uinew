'use client';

import { useEffect, useState, useRef } from 'react';
import { useMenu } from '@/contexts/MenuContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/UserContext';
import { getTitle, getDescription } from '@/utils/language';
import AllergenWarning from '@/components/common/AllergenWarning';
import { useToast } from '@/components/ui/Toast';
import { saveCart as saveCartToStorage, loadCart as loadCartFromStorage } from '@/utils/cartUtils';

export default function ProductListModal() {
  const {
    menuData,
    customerData,
    categoriesData,
    selectedCategory,
    isProductListModalOpen,
    closeProductListModal,
    openProductDetailModal,
    isTableMode,
    canUseBasket,
    cartKey,
    productTokenSettings,
    popularProductIds,
    openProfile,
  } = useMenu();
  const { language, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { showCartToast } = useToast();

  const [activeCategory, setActiveCategory] = useState(selectedCategory);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const sliderRef = useRef<HTMLDivElement>(null);
  const productListRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Load cart items from cartUtils
  useEffect(() => {
    const loadCart = () => {
      if (isTableMode && cartKey && menuData) {
        const customerCode = menuData.customerTitle || 'unknown';
        const items = loadCartFromStorage(cartKey, customerCode);
        setCartItems(items);
      }
    };

    loadCart();

    // Listen for cart updates
    const handleCartUpdate = () => {
      loadCart();
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [isTableMode, cartKey, menuData]);

  const getCartQuantity = (productId: number) => {
    const item = cartItems.find((item: any) => item.productId === productId);
    return item ? item.quantity : 0;
  };

  const handleAddToCart = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isTableMode || !cartKey || !menuData) return;

    // 🔐 Giriş kontrolü - Sepete eklemek için giriş şart
    if (!isAuthenticated) {
      showCartToast('Sepete eklemek için giriş yapmalısınız', '');
      closeProductListModal();
      setTimeout(() => openProfile(), 300);
      return;
    }

    const customerCode = menuData.customerTitle || 'unknown';
    let items = loadCartFromStorage(cartKey, customerCode);

    const existingItemIndex = items.findIndex(
      (item: any) => item.productId === product.id
    );

    if (existingItemIndex >= 0) {
      items[existingItemIndex].quantity += 1;
    } else {
      const productImageUrl = getImageUrl(product.picture, customerLogo);
      const productName = getTitle(product, language);
      items.push({
        id: Date.now(),
        productId: product.id,
        sambaId: product.sambaId,
        name: productName,
        price: product.price,
        quantity: 1,
        image: productImageUrl,
      });
    }

    saveCartToStorage(cartKey, items, customerCode);
    setCartItems(items);

    // Dispatch event to update cart sidebar
    window.dispatchEvent(new Event('cartUpdated'));

    // Toast notification göster
    const productName = getTitle(product, language);
    showCartToast(productName, '', () => {
      window.dispatchEvent(new CustomEvent('openCart'));
    });

    // Button feedback
    const btn = e.currentTarget as HTMLButtonElement;
    const originalHTML = btn.innerHTML;
    const originalBg = btn.style.background;
    btn.innerHTML = '<i class="fas fa-check"></i> Eklendi!';
    btn.style.background = 'linear-gradient(135deg, #28a745, #20c997)';

    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.style.background = originalBg;
    }, 1500);
  };

  useEffect(() => {
    if (selectedCategory) {
      setActiveCategory(selectedCategory);
    }
  }, [selectedCategory]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isProductListModalOpen) {
        closeProductListModal();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isProductListModalOpen, closeProductListModal]);

  // Swipe handling for category switching
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

    if (Math.abs(diff) > swipeThreshold && categories.length > 0) {
      const currentIndex = categories.findIndex((cat) => cat.sambaId === activeCategory?.sambaId);

      if (currentIndex !== -1) {
        if (diff > 0) {
          // Swipe left - next category
          const nextIndex = (currentIndex + 1) % categories.length;
          switchCategory(categories[nextIndex]);
        } else {
          // Swipe right - previous category
          const prevIndex = (currentIndex - 1 + categories.length) % categories.length;
          switchCategory(categories[prevIndex]);
        }
      }
    }
  };

  useEffect(() => {
    if (sliderRef.current && activeCategory && menuData?.menu) {
      const categoryIndex = menuData.menu.findIndex((cat) => cat.sambaId === activeCategory.sambaId);
      if (categoryIndex !== -1) {
        const categoryElements = sliderRef.current.querySelectorAll('.category-item');
        const activeElement = categoryElements[categoryIndex] as HTMLElement;
        if (activeElement) {
          setTimeout(() => {
            const scrollLeft = activeElement.offsetLeft - sliderRef.current!.offsetWidth / 2 + activeElement.offsetWidth / 2;
            sliderRef.current?.scrollTo({ left: scrollLeft, behavior: 'smooth' });
          }, 100);
        }
      }
    }
  }, [activeCategory, menuData]);

  const categories = menuData?.menu || [];

  const switchCategory = (newCategory: typeof activeCategory) => {
    setActiveCategory(newCategory);
  };

  const getImageUrl = (picture?: string, fallbackLogo?: string) => {
    if (!picture) {
      return fallbackLogo || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23e0e0e0" width="300" height="300"/%3E%3C/svg%3E';
    }
    if (picture.startsWith('http')) {
      return picture.replace('http://', 'https://');
    }
    const cleanPath = picture.startsWith('Uploads/') ? picture.substring(8) : picture;
    return 'https://canlimenu.online/Uploads/' + cleanPath;
  };

  const customerLogo = menuData?.customerLogo ? getImageUrl(menuData.customerLogo) : undefined;

  // Background URL
  const backgroundUrl = customerData?.customer.webBackground
    ? customerData.customer.webBackground.startsWith('http')
      ? customerData.customer.webBackground.replace('http://', 'https://')
      : `https://canlimenu.online/Uploads/${customerData.customer.webBackground.replace('Uploads/', '')}`
    : undefined;

  const containerStyle = backgroundUrl
    ? {
        backgroundImage: `url('${backgroundUrl}')`,
        backgroundPosition: 'center center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
      }
    : { background: '#f5f5f5' };

  // Font ve renk customization
  const productFont = customerData?.customer.productFont || 'Inter, sans-serif';
  const productTitleColor = customerData?.customer.productTitleColor || '#FFFFFF';
  const productDescriptionColor = customerData?.customer.productDescriptionColor || 'rgba(255, 255, 255, 0.88)';

  const titleStyle = {
    fontFamily: productFont,
    color: productTitleColor,
  };

  const descriptionStyle = {
    fontFamily: productFont,
    color: productDescriptionColor,
  };

  return (
    <>
      <div
        className="product-modal-overlay"
        onClick={closeProductListModal}
        style={{
          display: isProductListModalOpen ? 'block' : 'none',
          opacity: isProductListModalOpen ? 1 : 0,
        }}
      />

      <div
        className="product-modal-container"
        style={{
          ...containerStyle,
          display: isProductListModalOpen ? 'flex' : 'none',
          opacity: isProductListModalOpen ? 1 : 0,
          transform: isProductListModalOpen ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(20px)',
        }}
      >
        <div className="page-content">
          <div className="container page-header" style={{ marginBottom: 0, paddingBottom: 0 }}>
            <a href="#" onClick={(e) => { e.preventDefault(); closeProductListModal(); }} style={{ fontSize: '20px', color: 'white' }}>
              <i className="fa-solid fa-caret-left"></i> {t('back')}
            </a>
          </div>

          <div className="container" style={{ paddingBottom: 0 }}>
            <div className="current-category-title">
              <h2 id="modalCategoryTitle">
                {(() => {
                  if (!activeCategory) return '';
                  // activeCategory için titleEnglish'i categoriesData'dan al
                  const activeCatData = categoriesData.find((c) => c.category.sambaId === activeCategory.sambaId);
                  const titleEnglish = activeCatData?.category?.titleEnglish || '';
                  return language === 'en' && titleEnglish ? titleEnglish : activeCategory.title;
                })()}
              </h2>
            </div>
          </div>

          <div className="container" style={{ paddingBottom: 0, overflowX: 'visible' }}>
            <div className="category-slider-section">
              <div className="category-slider" id="modalCategorySlider" ref={sliderRef}>
                {categories.map((cat) => {
                  // categoriesData'dan bu kategorinin picture'ını VE titleEnglish'ini bul
                  const categoryWithPicture = categoriesData.find((c) => c.category.sambaId === cat.sambaId);
                  let categoryImageUrl = '';

                  if (categoryWithPicture && categoryWithPicture.picture) {
                    // Picture varsa URL'i oluştur
                    const picture = categoryWithPicture.picture;
                    if (picture.startsWith('http')) {
                      categoryImageUrl = picture.replace('http://', 'https://');
                    } else {
                      const picturePath = picture.startsWith('Uploads/')
                        ? picture.substring('Uploads/'.length)
                        : picture;
                      categoryImageUrl = `https://canlimenu.online/Uploads/${picturePath}`;
                    }
                  } else if (customerLogo) {
                    // Picture yoksa logo kullan
                    categoryImageUrl = customerLogo;
                  } else {
                    // Placeholder
                    categoryImageUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23e0e0e0" width="300" height="300"/%3E%3C/svg%3E';
                  }

                  const isActive = cat.sambaId === activeCategory?.sambaId;
                  // titleEnglish'i categoriesData'dan al ve dile göre seç
                  const titleEnglish = categoryWithPicture?.category?.titleEnglish || '';
                  const categoryName = language === 'en' && titleEnglish ? titleEnglish : cat.title;

                  return (
                    <a
                      key={cat.sambaId}
                      href="#"
                      className={'category-item category-slide' + (isActive ? ' active' : '')}
                      data-category-id={cat.sambaId}
                      onClick={(e) => {
                        e.preventDefault();
                        switchCategory(cat);
                      }}
                    >
                      <div className="image-box">
                        <img src={categoryImageUrl} alt={categoryName} loading="eager" />
                      </div>
                      <div className="category-title">{categoryName}</div>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="container" style={{ paddingTop: 0, paddingBottom: '120px' }}>
            <div
              className="serach-area"
              id="modalProductList"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* ⚡ TÜM KATEGORİLERİ RENDER ET - Eski sistem gibi DOM cache */}
              {categories.map((category) => {
                const products = category.products || [];
                const isActive = category.sambaId === activeCategory?.sambaId;

                return (
                  <div
                    key={`category-container-${category.sambaId}`}
                    data-category-container={`cat_${category.sambaId}`}
                    style={{ display: isActive ? 'block' : 'none' }}
                  >
                    {products.length === 0 ? (
                      <div style={{ padding: '50px', textAlign: 'center', color: 'white' }}>
                        {t('noProductsInCategory')}
                      </div>
                    ) : (
                      <div className="product-list-container">
                        <div className="products-no-tabs-wrapper">
                          {products.map((product) => {
                    const productImageUrl = getImageUrl(product.picture, customerLogo);
                    const productTitle = getTitle(product, language);
                    const productDetail = getDescription(product, language);

                    return (
                      <div
                        key={product.id}
                        className="product-card product-item"
                        style={{ cursor: 'pointer', position: 'relative' }}
                        data-product-id={product.id}
                        data-samba-product-id={product.sambaId}
                        onClick={() => openProductDetailModal(product)}
                      >
                        {isTableMode && canUseBasket && getCartQuantity(product.id) > 0 && (
                          <span className="cart-badge" style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: '#dc3545',
                            color: 'white',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            zIndex: 10,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          }}>
                            {getCartQuantity(product.id)}
                          </span>
                        )}
                        {/* Popüler Badge - Sol üstte */}
                        {popularProductIds.has(product.id) && (
                          <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            zIndex: 10,
                            pointerEvents: 'none',
                          }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                              color: 'white',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 700,
                              boxShadow: '0 4px 12px rgba(238, 90, 36, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)',
                              border: '2px solid rgba(255, 255, 255, 0.3)',
                            }}>
                              🔥 Popüler
                            </span>
                          </div>
                        )}
                        {/* Token Earn Badge - Sol üstte (Popüler yoksa) veya altında */}
                        {isTableMode && canUseBasket && (() => {
                          const tokenSetting = productTokenSettings[product.id] || productTokenSettings[product.sambaId];
                          if (!tokenSetting || !tokenSetting.earnTokens || tokenSetting.earnTokens <= 0) return null;
                          const hasPopularBadge = popularProductIds.has(product.id);

                          return (
                            <div style={{
                              position: 'absolute',
                              top: hasPopularBadge ? '42px' : '10px',
                              left: '10px',
                              zIndex: 10,
                              pointerEvents: 'none',
                            }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                                color: 'white',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 700,
                                boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)',
                                border: '2px solid rgba(255, 255, 255, 0.3)',
                              }}>
                                +{tokenSetting.earnTokens} jeton kazan
                              </span>
                            </div>
                          );
                        })()}
                        <div className="product-content">
                          <div className="product-image" style={{ position: 'relative' }}>
                            <AllergenWarning productAllergens={product.allergens} className="allergen-on-image" />
                            {productImageUrl ? (
                              <img
                                src={productImageUrl}
                                alt={productTitle}
                                loading="eager"
                                decoding="async"
                              />
                            ) : (
                              <div className="no-image-placeholder">🍽️</div>
                            )}
                            <div className="product-header">
                              <h3 className="product-name product-title" data-title-tr={product.title} data-title-en={product.titleEn || product.title} style={titleStyle}>
                                {productTitle}
                              </h3>
                            </div>
                          </div>
                          <div className="product-info">
                            {/* Porsiyon listesi veya tek fiyat */}
                            {(() => {
                              const portions = product.Portions || product.portions || [];
                              const hasManyPortions = portions.length > 1;

                              if (hasManyPortions) {
                                // Birden fazla porsiyon var - liste olarak göster
                                return (
                                  <div className="portions-price-list" style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                  }}>
                                    {portions.map((portion: any) => (
                                      <div key={portion.id} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '6px 10px',
                                        background: 'rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                      }}>
                                        <span style={{
                                          fontSize: '15px',
                                          color: productDescriptionColor,
                                          fontFamily: productFont,
                                        }}>
                                          {language === 'en' ? (portion.nameEnglish || portion.name) : portion.name}
                                        </span>
                                        <span style={{
                                          fontSize: '16px',
                                          fontWeight: 700,
                                          color: '#FFFFFF',
                                          fontFamily: productFont,
                                        }}>
                                          {portion.price.toFixed(2)} ₺
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              } else {
                                // Tek porsiyon veya porsiyon yok - normal fiyat göster
                                return product.price > 0 ? (
                                  <div className="price-container moved">
                                    <div className="product-price price">
                                      <span className="kdv-label"><span>KDV</span><span>Dahil</span></span>
                                      <span className="price-value" style={{fontFamily: productFont}}>
                                        {product.price.toFixed(2)} ₺
                                        {/* Token Redeem Badge - Fiyatın yanında */}
                                        {isTableMode && canUseBasket && (() => {
                                          const tokenSetting = productTokenSettings[product.id] || productTokenSettings[product.sambaId];
                                          if (!tokenSetting || !tokenSetting.redeemTokens || tokenSetting.redeemTokens <= 0) return null;

                                          return (
                                            <span style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              marginLeft: '8px',
                                              padding: '4px 10px',
                                              background: 'linear-gradient(135deg, #ff9800, #ff6d00)',
                                              color: 'white',
                                              borderRadius: '12px',
                                              fontSize: '11px',
                                              fontWeight: 700,
                                              boxShadow: '0 2px 6px rgba(255, 152, 0, 0.4)',
                                              border: '1px solid rgba(255, 255, 255, 0.3)',
                                            }}>
                                              🪙 {tokenSetting.redeemTokens} jetona al
                                            </span>
                                          );
                                        })()}
                                      </span>
                                    </div>
                                  </div>
                                ) : null;
                              }
                            })()}
                            {/* Porsiyon yoksa detail göster (porsiyonlu ürünlerde description zaten porsiyon adı) */}
                            {productDetail && !((product.Portions || product.portions || []).length > 1) && (
                              <p className="product-detail" data-detail-tr={product.detail} data-detail-en={product.detailEn || product.DetailEn || product.detail} style={descriptionStyle}>
                                {productDetail}
                              </p>
                            )}
                            {isTableMode && canUseBasket && (
                              <button
                                type="button"
                                className="add-to-cart-btn"
                                onClick={(e) => {
                                  const portions = product.Portions || product.portions || [];
                                  if (portions.length > 1) {
                                    // Porsiyonlu ürün - detay modalını aç
                                    e.stopPropagation();
                                    openProductDetailModal(product);
                                  } else {
                                    // Tek porsiyon - direkt sepete ekle
                                    handleAddToCart(product, e);
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  marginTop: '8px',
                                  background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                }}
                              >
                                <i className="fas fa-shopping-cart"></i>
                                {t('addToCart')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                          );
                        })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
