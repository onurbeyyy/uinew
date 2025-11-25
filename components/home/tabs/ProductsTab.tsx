'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTitle } from '@/utils/language';
import type { Advertisement, Product } from '@/types/api';

interface ProductsTabProps {
  tab: Advertisement;
}

export default function ProductsTab({ tab }: ProductsTabProps) {
  const { language, t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [productIds, setProductIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // Parse product IDs from tab data
  useEffect(() => {
    if (tab.selectedProductIds) {
      try {
        const ids = JSON.parse(tab.selectedProductIds);
        setProductIds(ids);
      } catch (error) {
        console.error('Failed to parse product IDs:', error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [tab.selectedProductIds]);

  // Load product details (from window.menuData if available, or fetch)
  useEffect(() => {
    if (productIds.length === 0) {
      setLoading(false);
      return;
    }

    // Try to get products from global menuData
    const loadProducts = async () => {
      try {
        // In a real app, you'd get this from context or props
        // For now, we'll just create placeholders
        const placeholders: Product[] = productIds.map((id) => ({
          id,
          sambaId: id,
          title: t('productLoading'),
          price: 0,
          categoryId: 0,
          orderNo: 0,
        }));
        setProducts(placeholders);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load products:', error);
        setLoading(false);
      }
    };

    loadProducts();
  }, [productIds]);

  if (loading) {
    return (
      <div className="header-content-products">
        <div className="header-products-title">
          {tab.tabType === 'FavoriteProducts' ? t('featuredProducts') : t('bestSelling')}
        </div>
        <div className="header-products-scroll">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="header-product-card" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
              <div style={{ width: '100%', height: '80px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <div className="header-product-info">
                <div style={{ width: '80%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '4px' }} />
                <div style={{ width: '50%', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="header-content-products">
        <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.7)' }}>
          {t('noProductsFound')}
        </div>
      </div>
    );
  }

  const title = tab.tabType === 'FavoriteProducts' ? t('featuredProducts') : t('bestSelling');

  return (
    <div className="header-content-products">
      <div className="header-products-title">{title}</div>
      <div className="header-products-scroll">
        {products.map((product) => {
          const productTitle = getTitle(product, language);

          return (
            <div
              key={product.id}
              className="header-product-card"
              onClick={() => {
                console.log('Product clicked:', product.id);
                // TODO: Open product modal
              }}
            >
              {product.picture ? (
                <Image
                  src={
                    product.picture.startsWith('http')
                      ? product.picture.replace('http://', 'https://')
                      : `https://canlimenu.online/Uploads/${product.picture.replace('Uploads/', '')}`
                  }
                  alt={productTitle}
                  width={100}
                  height={80}
                  className="header-product-image"
                  loading="eager"
                />
              ) : (
                <div className="header-product-image" style={{ background: 'rgba(0,0,0,0.2)' }} />
              )}
              <div className="header-product-info">
                <div className="header-product-name">{productTitle}</div>
                <div className="header-product-price">
                  {product.price > 0 ? `${product.price.toFixed(2)} ₺` : t('noPrice')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
