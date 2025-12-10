'use client';

import { useEffect, useState, useRef } from 'react';
import type { MenuDto, CategoryDto, Advertisement } from '@/types/api';

interface ImagePreloadContainerProps {
  menuData: MenuDto | null;
  categoriesData?: CategoryDto[];
  advertisements?: Advertisement[] | null;
  customerLogo?: string;
  backgroundUrl?: string;
  bannerUrl?: string;
  onImagesLoaded?: () => void;
}

/**
 * Ürün Görselleri Preload Container
 *
 * NOT: Kritik görseller (reklamlar, kategoriler, logo, background) artık
 * page.tsx'de loading ekranı sırasında preload ediliyor.
 *
 * Bu component sadece ÜRÜN görsellerini arka planda yükler:
 * - Modal açıldığında görseller zaten cache'te olduğu için ANINDA görünür
 * - Düşük öncelikli, kullanıcı deneyimini bloklamaz
 */
export default function ImagePreloadContainer({
  menuData,
  onImagesLoaded
}: ImagePreloadContainerProps) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const loadedCountRef = useRef(0);
  const totalCountRef = useRef(0);
  const callbackCalledRef = useRef(false);

  useEffect(() => {
    if (!menuData) return;

    const productUrls: string[] = [];
    const seenUrls = new Set<string>();

    // Helper: URL'yi düzelt
    const normalizeUrl = (url: string): string => {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        const cleanPath = url.startsWith('Uploads/') ? url.substring('Uploads/'.length) : url;
        return `https://apicanlimenu.online/Uploads/${cleanPath}`;
      }
      return url.replace('http://', 'https://');
    };

    // Sadece ürün görselleri (kritik görseller page.tsx'de yükleniyor)
    menuData.menu.forEach(category => {
      category.products.forEach(product => {
        if (product.picture) {
          const normalized = normalizeUrl(product.picture);
          if (!seenUrls.has(normalized)) {
            seenUrls.add(normalized);
            productUrls.push(normalized);
          }
        }
      });
    });

    setImageUrls(productUrls);
    totalCountRef.current = productUrls.length;
    loadedCountRef.current = 0;
    callbackCalledRef.current = false;

    if (productUrls.length > 0) {
      console.log(`📦 ${productUrls.length} ürün görseli arka planda yükleniyor...`);
    }
  }, [menuData]);

  const handleImageLoad = () => {
    loadedCountRef.current++;

    // Tüm görseller yüklendi mi?
    if (loadedCountRef.current >= totalCountRef.current && !callbackCalledRef.current) {
      callbackCalledRef.current = true;
      console.log(`✅ Tüm ürün görselleri yüklendi`);
      if (onImagesLoaded) onImagesLoaded();
    }
  };

  const handleImageError = () => {
    loadedCountRef.current++;

    // Hata olsa da devam et
    if (loadedCountRef.current >= totalCountRef.current && !callbackCalledRef.current) {
      callbackCalledRef.current = true;
      if (onImagesLoaded) onImagesLoaded();
    }
  };

  if (imageUrls.length === 0) return null;

  return (
    <div
      id="imagePreloadContainer"
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
        opacity: 0,
        pointerEvents: 'none'
      }}
      aria-hidden="true"
    >
      {imageUrls.map((url, index) => (
        <img
          key={`preload-${index}`}
          src={url}
          alt=""
          loading="eager"
          fetchPriority="low"
          decoding="async"
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ display: 'none' }}
        />
      ))}
    </div>
  );
}
