'use client';

import { useEffect, useState, useRef } from 'react';
import type { MenuDto, CategoryDto } from '@/types/api';

interface ImagePreloadContainerProps {
  menuData: MenuDto | null;
  categoriesData?: CategoryDto[];
  customerLogo?: string;
  backgroundUrl?: string;
  bannerUrl?: string;
  onImagesLoaded?: () => void;
}

/**
 * Görsel Preload Container
 *
 * Eski sistemdeki hızlı yükleme stratejisini uygular:
 * - Tüm ürün görsellerini gizli bir div içinde eager loading ile yükler
 * - Modal açıldığında görseller zaten cache'te olduğu için ANINDA görünür
 * - opacity: 0 ile tamamen gizli ama browser yine de yüklüyor
 */
export default function ImagePreloadContainer({
  menuData,
  categoriesData,
  customerLogo,
  backgroundUrl,
  bannerUrl,
  onImagesLoaded
}: ImagePreloadContainerProps) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const loadedCountRef = useRef(0);
  const totalCountRef = useRef(0);
  const callbackCalledRef = useRef(false);

  useEffect(() => {
    if (!menuData) return;

    const urls: string[] = [];
    const urlSet = new Set<string>(); // Duplicate önlemek için

    // Kritik görseller - en yüksek öncelik
    if (backgroundUrl) urlSet.add(backgroundUrl);
    if (customerLogo) urlSet.add(customerLogo);
    if (bannerUrl) urlSet.add(bannerUrl);

    // Kategori görsellerini ekle (CategoryGrid'de gösteriliyor)
    if (categoriesData) {
      categoriesData.forEach(categoryData => {
        if (categoryData.picture) {
          let pictureUrl = categoryData.picture;

          // URL format düzelt
          if (!pictureUrl.startsWith('http://') && !pictureUrl.startsWith('https://')) {
            const picturePath = pictureUrl.startsWith('Uploads/')
              ? pictureUrl.substring('Uploads/'.length)
              : pictureUrl;
            pictureUrl = `https://canlimenu.online/Uploads/${picturePath}`;
          } else if (pictureUrl.startsWith('http://')) {
            pictureUrl = pictureUrl.replace('http://', 'https://');
          }

          urlSet.add(pictureUrl);
        }
      });
    }

    // Tüm ürün görsellerini topla
    menuData.menu.forEach(category => {
      category.products.forEach(product => {
        if (product.picture) {
          let pictureUrl = product.picture;

          // URL format düzelt
          if (!pictureUrl.startsWith('http://') && !pictureUrl.startsWith('https://')) {
            const picturePath = pictureUrl.startsWith('Uploads/')
              ? pictureUrl.substring('Uploads/'.length)
              : pictureUrl;
            pictureUrl = `https://canlimenu.online/Uploads/${picturePath}`;
          } else if (pictureUrl.startsWith('http://')) {
            pictureUrl = pictureUrl.replace('http://', 'https://');
          }

          urlSet.add(pictureUrl);
        }
      });
    });

    // Set'ten array'e çevir (duplicate'ler otomatik temizlendi)
    const uniqueUrls = Array.from(urlSet);
    setImageUrls(uniqueUrls);
    totalCountRef.current = uniqueUrls.length;
    loadedCountRef.current = 0;
    callbackCalledRef.current = false;
  }, [menuData, categoriesData, customerLogo, backgroundUrl, bannerUrl]);

  const handleImageLoad = () => {
    loadedCountRef.current++;

    // Tüm görseller yüklendi mi?
    if (loadedCountRef.current >= totalCountRef.current && !callbackCalledRef.current && onImagesLoaded) {
      callbackCalledRef.current = true;
      onImagesLoaded();
    }
  };

  const handleImageError = (url: string) => {
    loadedCountRef.current++;

    // Hata olsa da devam et
    if (loadedCountRef.current >= totalCountRef.current && !callbackCalledRef.current && onImagesLoaded) {
      callbackCalledRef.current = true;
      onImagesLoaded();
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
          alt={`Preload ${index}`}
          loading="eager"
          fetchPriority={index < 50 ? 'high' : 'auto'}
          decoding="async"
          onLoad={handleImageLoad}
          onError={() => handleImageError(url)}
          style={{ display: 'none' }}
        />
      ))}
    </div>
  );
}
