'use client';

import { useEffect, useState, useRef } from 'react';
import { useMenu } from '@/contexts/MenuContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/UserContext';
import { getTitle, getDescription } from '@/utils/language';
import AllergenWarning from '@/components/common/AllergenWarning';
import { useToast } from '@/components/ui/Toast';
import { saveCart as saveCartToStorage, loadCart as loadCartFromStorage } from '@/utils/cartUtils';
import FeatureSelectionModal from '@/components/modals/FeatureSelectionModal';
import type { FeatureGroup } from '@/types/api';

// Kategori ismini "/" ile alt alta göster
const formatCategoryName = (name: string) => {
  if (!name || !name.includes('/')) return name;
  return name.split('/').map((part, i, arr) => (
    <span key={i}>
      {part.trim()}
      {i < arr.length - 1 && <br />}
    </span>
  ));
};

export default function ProductListModal() {
  const {
    menuData,
    customerData,
    customerCode,
    categoriesData,
    selectedCategory,
    setSelectedCategory,
    isProductListModalOpen,
    closeProductListModal,
    openProductDetailModal,
    isTableMode,
    canUseBasket,
    cartKey,
    getTokenSettingsForItem,
    popularProductIds,
    openProfile,
    canOrderProduct,
    todayHappyHourTimeRange,
  } = useMenu();
  const { language, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { showCartToast } = useToast();

  const [activeCategory, setActiveCategory] = useState(selectedCategory);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<string>(''); // SubCategoryTag için aktif tab
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);
  const [selectedProductForFeature, setSelectedProductForFeature] = useState<any>(null);
  const [checkingFeatures, setCheckingFeatures] = useState<number | null>(null); // hangi ürün için kontrol ediliyor
  const sliderRef = useRef<HTMLDivElement>(null);
  const productListRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndY = useRef<number>(0);

  // Load cart items from cartUtils
  useEffect(() => {
    const loadCart = () => {
      if (isTableMode && cartKey && customerCode) {
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

  // Ürün özelliklerini kontrol et
  const checkProductFeatures = async (product: any): Promise<FeatureGroup[] | null> => {
    if (!product || !customerData?.customer?.id) return null;

    try {
      const productId = product.id ?? product.Id;
      const sambaProductId = product.sambaId ?? product.SambaId;
      const categoryId = product.categoryId ?? product.CategoryId ?? activeCategory?.sambaId ?? (activeCategory as any)?.Id;
      const categorySambaId = activeCategory?.sambaId ?? (activeCategory as any)?.SambaId;
      const customerId = customerData.customer.id;

      let url = `https://apicanlimenu.online/api/menu/product-features?customerId=${customerId}`;
      if (productId) url += `&productId=${productId}`;
      if (sambaProductId) url += `&sambaProductId=${sambaProductId}`;
      if (categoryId) url += `&categoryId=${categoryId}`;
      if (categorySambaId) url += `&categorySambaId=${categorySambaId}`;

      console.log('🔍 Feature check URL:', url);

      const response = await fetch(url);
      const data = await response.json();
      console.log('🔍 Feature check response:', data);

      if (data.success && data.features && data.features.length > 0) {
        return data.features as FeatureGroup[];
      }
      return null;
    } catch (err) {
      console.error('Feature check error:', err);
      return null;
    }
  };

  const handleAddToCart = async (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isTableMode || !cartKey || !menuData) return;
    if (!customerCode) return;

    // Özellik kontrolü yap
    const productId = product.id ?? product.Id;
    setCheckingFeatures(productId);
    const features = await checkProductFeatures(product);
    setCheckingFeatures(null);

    if (features && features.length > 0) {
      // Özellikler varsa modal aç
      setSelectedProductForFeature(product);
      setIsFeatureModalOpen(true);
      return;
    }

    // Özellik yoksa doğrudan sepete ekle
    addToCartDirectly(product, e);
  };

  const addToCartDirectly = (product: any, e?: React.MouseEvent) => {
    if (!customerCode || !cartKey) return;

    let items = loadCartFromStorage(cartKey, customerCode);

    const existingItemIndex = items.findIndex(
      (item: any) => item.productId === product.id && !item.features?.length
    );

    if (existingItemIndex >= 0) {
      items[existingItemIndex].quantity += 1;
    } else {
      const productImageUrl = getImageUrl(product.picture, customerLogo, product.pictureId);
      const productName = getTitle(product, language);
      items.push({
        id: Date.now(),
        productId: product.id,
        sambaId: product.sambaId,
        name: productName,
        price: product.price,
        quantity: 1,
        image: productImageUrl,
        linkedProductId: product.LinkedProductId ?? product.linkedProductId, // HH bağlı ürün
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
    if (!e) return;
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
      // Kategori değişince subTab'ı sıfırla
      const products = selectedCategory.products || [];
      const tags = [...new Set(products.map((p: any) => p.subCategoryTag || p.SubCategoryTag || '').filter((t: string) => t))].sort();
      if (tags.length > 0) {
        setActiveSubTab(tags[0] as string);
      } else {
        setActiveSubTab('');
      }
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
    touchStartY.current = e.changedTouches[0].screenY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;
    touchEndY.current = e.changedTouches[0].screenY;
    handleSwipe();
  };

  const handleSwipe = () => {
    const swipeThreshold = 150; // Yatay swipe için minimum mesafe (belirgin swipe)
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY.current;

    // Yatay hareket dikey hareketin en az 3 katı olmalı (çok belirgin yatay swipe)
    if (Math.abs(diffX) < Math.abs(diffY) * 3) {
      return;
    }

    if (Math.abs(diffX) > swipeThreshold && categories.length > 0) {
      const currentIndex = categories.findIndex((cat) => cat.sambaId === activeCategory?.sambaId);

      if (currentIndex !== -1) {
        if (diffX > 0) {
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
    // Context'i de güncelle - ProductDetailModal navigasyonu için
    if (newCategory) {
      setSelectedCategory(newCategory);
    }
  };

  const getImageUrl = (picture?: string, fallbackLogo?: string, pictureId?: number) => {
    if (!picture) {
      return fallbackLogo || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23e0e0e0" width="300" height="300"/%3E%3C/svg%3E';
    }
    // Cache-busting parametresi
    const cacheBuster = pictureId ? `?v=${pictureId}` : '';
    if (picture.startsWith('http')) {
      return picture.replace('http://', 'https://') + cacheBuster;
    }
    const cleanPath = picture.startsWith('Uploads/') ? picture.substring(8) : picture;
    return 'https://apicanlimenu.online/Uploads/' + cleanPath + cacheBuster;
  };

  const customerLogo = menuData?.customerLogo ? getImageUrl(menuData.customerLogo) : undefined;

  // Background URL
  const backgroundUrl = customerData?.customer.webBackground
    ? customerData.customer.webBackground.startsWith('http')
      ? customerData.customer.webBackground.replace('http://', 'https://')
      : `https://apicanlimenu.online/Uploads/${customerData.customer.webBackground.replace('Uploads/', '')}`
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
                    const cacheBuster = categoryWithPicture.pictureId ? `?v=${categoryWithPicture.pictureId}` : '';
                    if (picture.startsWith('http')) {
                      categoryImageUrl = picture.replace('http://', 'https://') + cacheBuster;
                    } else {
                      const picturePath = picture.startsWith('Uploads/')
                        ? picture.substring('Uploads/'.length)
                        : picture;
                      categoryImageUrl = `https://apicanlimenu.online/Uploads/${picturePath}${cacheBuster}`;
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
                      <div className="category-title">{formatCategoryName(categoryName)}</div>
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
                    ) : (() => {
                      // SubCategoryTag'e göre grupla
                      const groupedProducts: { [key: string]: any[] } = {};
                      const ungroupedProducts: any[] = [];

                      products.forEach((product: any) => {
                        const tag = product.subCategoryTag || product.SubCategoryTag || '';
                        if (tag) {
                          if (!groupedProducts[tag]) {
                            groupedProducts[tag] = [];
                          }
                          groupedProducts[tag].push(product);
                        } else {
                          ungroupedProducts.push(product);
                        }
                      });

                      const uniqueTags = Object.keys(groupedProducts).sort();
                      const hasTags = uniqueTags.length > 0;
                      const hasUngrouped = ungroupedProducts.length > 0;
                      const currentActiveTab = activeSubTab || (hasTags ? uniqueTags[0] : 'ungrouped');

                      // Ürün kartı render fonksiyonu
                      const renderProductCard = (product: any) => {
                    const productImageUrl = getImageUrl(product.picture, customerLogo, product.pictureId);
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
                        {/* Token Earn Badge - Sol üstte */}
                        {isTableMode && canUseBasket && (() => {
                          const tokenSetting = getTokenSettingsForItem(product.sambaId, product.sambaPortionId);
                          if (!tokenSetting || !tokenSetting.earnTokens || tokenSetting.earnTokens <= 0) return null;
                          const hasPopularBadge = popularProductIds.has(product.id);

                          return (
                            <div style={{
                              position: 'absolute',
                              top: hasPopularBadge ? '42px' : '10px',
                              left: '8px',
                              zIndex: 10,
                              pointerEvents: 'none',
                            }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                                color: 'white',
                                borderRadius: '14px',
                                fontSize: '11px',
                                fontWeight: 700,
                                boxShadow: '0 2px 8px rgba(76, 175, 80, 0.4)',
                                border: '1.5px solid rgba(255, 255, 255, 0.3)',
                              }}>
                                🎁 +{tokenSetting.earnTokens} jeton kazan
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
                                    {portions.map((portion: any) => {
                                      const portionTokenSetting = getTokenSettingsForItem(product.sambaId, portion.sambaPortionId);
                                      const portionHasRedeem = portionTokenSetting && portionTokenSetting.redeemTokens > 0;

                                      return (
                                        <div key={portion.id} style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          padding: '8px 10px',
                                          background: 'rgba(255,255,255,0.1)',
                                          borderRadius: '8px',
                                          gap: '4px',
                                        }}>
                                          <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
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
                                          {/* Porsiyon için jetonla al */}
                                          {isTableMode && canUseBasket && portionHasRedeem && (
                                            <div style={{ textAlign: 'center' }}>
                                              <span style={{
                                                display: 'inline-block',
                                                padding: '4px 10px',
                                                fontSize: '11px',
                                                color: '#fff',
                                                fontWeight: 600,
                                                borderRadius: '12px',
                                                background: 'linear-gradient(135deg, #ff9800, #ff6d00)',
                                              }}>
                                                veya 🪙 {portionTokenSetting.redeemTokens} jetonla al
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              } else {
                                // Tek porsiyon veya porsiyon yok - normal fiyat göster
                                return product.price > 0 ? (
                                  <>
                                    <div className="price-container moved">
                                      <div className="product-price price">
                                        <span className="kdv-label"><span>KDV</span><span>Dahil</span></span>
                                        <span className="price-value" style={{fontFamily: productFont}}>
                                          {product.price.toFixed(2)} ₺
                                        </span>
                                      </div>
                                    </div>
                                    {/* Jetonla al - fiyatın altında ayrı satır */}
                                    {isTableMode && canUseBasket && (() => {
                                      const tokenSetting = getTokenSettingsForItem(product.sambaId, product.sambaPortionId);
                                      if (!tokenSetting || !tokenSetting.redeemTokens || tokenSetting.redeemTokens <= 0) return null;
                                      return (
                                        <div style={{
                                          width: '100%',
                                          textAlign: 'center',
                                          marginTop: '8px',
                                        }}>
                                          <span style={{
                                            display: 'inline-block',
                                            padding: '6px 14px',
                                            fontSize: '12px',
                                            color: '#fff',
                                            fontWeight: 600,
                                            borderRadius: '20px',
                                            background: 'linear-gradient(135deg, #ff9800, #ff6d00)',
                                            boxShadow: '0 2px 8px rgba(255, 152, 0, 0.4)',
                                          }}>
                                            veya 🪙 {tokenSetting.redeemTokens} jetonla al
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  </>
                                ) : null;
                              }
                            })()}
                            {/* Ürün açıklaması */}
                            {productDetail && (
                              <p className="product-detail" data-detail-tr={product.detail} data-detail-en={product.detailEn || product.DetailEn || product.detail} style={descriptionStyle}>
                                {productDetail}
                              </p>
                            )}
                            {isTableMode && canUseBasket && canOrderProduct(product) && (
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
                                disabled={checkingFeatures === product.id}
                              >
                                {checkingFeatures === product.id ? (
                                  <>
                                    <i className="fas fa-spinner fa-spin"></i>
                                    Yükleniyor...
                                  </>
                                ) : (
                                  <>
                                    <i className="fas fa-shopping-cart"></i>
                                    {t('addToCart')}
                                  </>
                                )}
                              </button>
                            )}
                            {/* HH dışında HH ürünleri için mesaj */}
                            {isTableMode && canUseBasket && !canOrderProduct(product) && todayHappyHourTimeRange && (
                              <div style={{
                                width: '100%',
                                padding: '8px',
                                marginTop: '8px',
                                background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.15), rgba(255, 165, 0, 0.15))',
                                border: '1px solid rgba(255, 107, 107, 0.3)',
                                borderRadius: '8px',
                                fontSize: '11px',
                                color: '#ff6b6b',
                                textAlign: 'center',
                              }}>
                                <span style={{ marginRight: '4px' }}>🍺</span>
                                Bu ürün {todayHappyHourTimeRange} saatlerinde sipariş edilebilir
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                          );
                      };

                      // Tab yapısı veya düz liste
                      if (hasTags) {
                        return (
                          <div className="product-list-container">
                            <div className="product-tabs-container">
                              {/* Tab Navigation */}
                              <div
                                className="product-tab-nav"
                                style={{
                                  display: 'flex',
                                  gap: '8px',
                                  overflowX: 'scroll',
                                  overflowY: 'hidden',
                                  paddingBottom: '12px',
                                  marginBottom: '12px',
                                  marginTop: '-10px',
                                  borderBottom: '1px solid rgba(255,255,255,0.2)',
                                  WebkitOverflowScrolling: 'touch',
                                  scrollbarWidth: 'none',
                                  msOverflowStyle: 'none',
                                  touchAction: 'pan-x',
                                } as React.CSSProperties}
                                onTouchStart={(e) => e.stopPropagation()}
                                onTouchEnd={(e) => e.stopPropagation()}
                              >
                                {uniqueTags.map((tag) => (
                                  <button
                                    key={tag}
                                    className={`product-tab-btn ${currentActiveTab === tag ? 'active' : ''}`}
                                    onClick={() => setActiveSubTab(tag)}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: '16px',
                                      border: 'none',
                                      background: currentActiveTab === tag
                                        ? 'linear-gradient(135deg, #f39c12, #e67e22)'
                                        : 'rgba(255,255,255,0.15)',
                                      color: 'white',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      transition: 'all 0.2s ease',
                                    }}
                                  >
                                    {tag}
                                  </button>
                                ))}
                                {hasUngrouped && (
                                  <button
                                    className={`product-tab-btn ${currentActiveTab === 'ungrouped' ? 'active' : ''}`}
                                    onClick={() => setActiveSubTab('ungrouped')}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: '16px',
                                      border: 'none',
                                      background: currentActiveTab === 'ungrouped'
                                        ? 'linear-gradient(135deg, #f39c12, #e67e22)'
                                        : 'rgba(255,255,255,0.15)',
                                      color: 'white',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      transition: 'all 0.2s ease',
                                    }}
                                  >
                                    Diğer
                                  </button>
                                )}
                              </div>

                              {/* Tab Contents */}
                              <div className="product-tabs-content">
                                <div className="products-no-tabs-wrapper">
                                  {uniqueTags.map((tag) => (
                                    currentActiveTab === tag && groupedProducts[tag].map(renderProductCard)
                                  ))}
                                  {hasUngrouped && currentActiveTab === 'ungrouped' && ungroupedProducts.map(renderProductCard)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Hiç tag yoksa düz liste
                      return (
                        <div className="product-list-container">
                          <div className="products-no-tabs-wrapper">
                            {ungroupedProducts.map(renderProductCard)}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Feature Selection Modal */}
      <FeatureSelectionModal
        isOpen={isFeatureModalOpen}
        onClose={() => {
          setIsFeatureModalOpen(false);
          setSelectedProductForFeature(null);
        }}
        product={selectedProductForFeature}
        portion={null}
        quantity={1}
        onAddToCart={() => {
          setIsFeatureModalOpen(false);
          setSelectedProductForFeature(null);
        }}
      />
    </>
  );
}
