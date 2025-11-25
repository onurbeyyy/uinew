'use client';

import React, { useMemo } from 'react';
import { useMenu } from '@/contexts/MenuContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTitle } from '@/utils/language';
import { useToast } from '@/components/ui/Toast';

interface CartItem {
  productId: number;
  sambaId?: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface ProductSuggestionsProps {
  cartItems: CartItem[];
  onAddToCart: (product: any) => void;
  maxSuggestions?: number;
}

export default function ProductSuggestions({
  cartItems,
  onAddToCart,
  maxSuggestions = 4
}: ProductSuggestionsProps) {
  const { menuData, categoriesData, customerData } = useMenu();
  const { language, t } = useLanguage();
  const { showCartToast } = useToast();

  // Customization
  const productFont = customerData?.customer?.productFont || 'Inter, sans-serif';

  // Sepetteki ürün ID'leri
  const cartProductIds = useMemo(() =>
    new Set(cartItems.map(item => item.productId)),
    [cartItems]
  );

  // menuData.menu'dan kategorileri al (ürünler burada)
  const menuCategories = menuData?.menu || [];

  // Sepetteki ürünlerin kategorilerini bul
  const cartCategoryIds = useMemo(() => {
    const categoryIds = new Set<number>();

    if (!menuCategories.length) return categoryIds;

    cartItems.forEach(cartItem => {
      menuCategories.forEach((category: any) => {
        const products = category.products || [];
        if (products.some((p: any) => (p.id || p.Id) === cartItem.productId)) {
          const categoryId = category.sambaId || category.id || 0;
          categoryIds.add(categoryId);
        }
      });
    });

    return categoryIds;
  }, [cartItems, menuCategories]);

  // Önerilen ürünleri hesapla
  const suggestedProducts = useMemo(() => {
    if (!menuCategories.length || cartItems.length === 0) return [];

    const suggestions: any[] = [];

    // 1. Öncelik: Aynı kategorideki diğer ürünler
    menuCategories.forEach((category: any) => {
      const categoryId = category.sambaId || category.id || 0;
      if (cartCategoryIds.has(categoryId)) {
        const products = category.products || [];
        products.forEach((product: any) => {
          const productId = product.id || product.Id;
          if (!cartProductIds.has(productId) && suggestions.length < maxSuggestions * 2) {
            suggestions.push({
              ...product,
              suggestionReason: 'same_category',
              categoryTitle: category.title || ''
            });
          }
        });
      }
    });

    // 2. Popüler ürünler (farklı kategorilerden)
    if (suggestions.length < maxSuggestions) {
      menuCategories.forEach((category: any) => {
        const products = category.products || [];
        products.slice(0, 3).forEach((product: any) => { // Her kategoriden ilk 3
          const productId = product.id || product.Id;
          if (!cartProductIds.has(productId) &&
              !suggestions.some(s => (s.id || s.Id) === productId)) {
            suggestions.push({
              ...product,
              suggestionReason: 'popular',
              categoryTitle: category.title || ''
            });
          }
        });
      });
    }

    // Shuffle ve limit
    return suggestions
      .sort(() => Math.random() - 0.5)
      .slice(0, maxSuggestions);
  }, [menuCategories, cartItems, cartProductIds, cartCategoryIds, maxSuggestions]);

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
      return '';
    }
    if (picture.startsWith('http')) {
      return picture.replace('http://', 'https://');
    }
    const cleanPath = picture.startsWith('Uploads/') ? picture.substring(8) : picture;
    return `https://canlimenu.online/Uploads/${cleanPath}`;
  };

  const handleAddSuggestion = (product: any) => {
    onAddToCart(product);

    // Toast göster
    const productName = getTitle(product, language);
    showCartToast(productName, '');
  };

  if (suggestedProducts.length === 0) return null;

  return (
    <div style={{
      padding: '16px',
      borderTop: '1px solid #e2e8f0',
      background: '#f8f9fa',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
      }}>
        <i className="fas fa-lightbulb" style={{ color: '#ffc107', fontSize: '16px' }} />
        <span style={{
          fontFamily: productFont,
          fontSize: '14px',
          fontWeight: '600',
          color: '#333',
        }}>
          {language === 'tr' ? 'Bunları da ekle' : 'You might also like'}
        </span>
      </div>

      {/* Ürün listesi - Horizontal scroll */}
      <div style={{
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        paddingBottom: '8px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {suggestedProducts.map((product, index) => {
          const productId = product.id || product.Id;
          const productName = getTitle(product, language);
          const productPrice = product.price || product.Price || 0;
          const productImage = getImageUrl(product.picture || product.Picture);

          return (
            <div
              key={`suggestion-${productId}-${index}`}
              style={{
                minWidth: '110px',
                maxWidth: '110px',
                background: '#fff',
                borderRadius: '10px',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              }}
            >
              {/* Ürün resmi */}
              <div style={{
                width: '100%',
                height: '70px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {productImage ? (
                  <img
                    src={productImage}
                    alt={productName}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <i className="fas fa-utensils" style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)' }} />
                  </div>
                )}
              </div>

              {/* Ürün bilgileri */}
              <div style={{ padding: '8px' }}>
                <div style={{
                  fontFamily: productFont,
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '6px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {productName}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#28a745',
                  }}>
                    {productPrice.toFixed(2)} ₺
                  </span>

                  <button
                    onClick={() => handleAddSuggestion(product)}
                    style={{
                      background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <i className="fas fa-plus" style={{ color: '#fff', fontSize: '10px' }} />
                    <span style={{ color: '#fff', fontSize: '10px', fontWeight: '600' }}>Ekle</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollbar gizle */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
