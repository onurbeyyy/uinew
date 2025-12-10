'use client';

import { useState, useEffect, useRef } from 'react';
import type { Advertisement } from '@/types/api';
import ImageSliderTab from './tabs/ImageSliderTab';
import VideoTab from './tabs/VideoTab';
import CampaignTab from './tabs/CampaignTab';
import ProductsTab from './tabs/ProductsTab';

interface HeaderTabsProps {
  customerCode: string;
  fallbackLogoUrl?: string;
  advertisements?: Advertisement[] | null; // null = henüz yüklenmedi, [] = yüklendi ama boş
}

export default function HeaderTabs({ customerCode, fallbackLogoUrl, advertisements }: HeaderTabsProps) {
  const [tabs, setTabs] = useState<Advertisement[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const autoRotateRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Prop olarak gelirse direkt kullan (preload edilmiş, anında göster)
  // null/undefined = henüz yüklenmedi, [] = yüklendi ama boş, [...] = yüklendi ve dolu
  useEffect(() => {
    if (advertisements !== null && advertisements !== undefined) {
      // Prop geldi (boş veya dolu), API çağrısı yapma
      setTabs(advertisements);
      setLoading(false);
    }
  }, [advertisements]);

  // Prop yoksa (null/undefined) API'den çek (fallback - eski sayfalar için)
  useEffect(() => {
    // Prop tanımlıysa (boş bile olsa) API çağrısı yapma
    if (advertisements !== null && advertisements !== undefined) return;

    async function fetchTabs() {
      try {
        const response = await fetch(`/api/advertisements/${customerCode}`);
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
          setTabs(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch header tabs:', error);
      } finally {
        setLoading(false);
      }
    }

    if (customerCode) {
      fetchTabs();
    } else {
      setLoading(false);
    }
  }, [customerCode, advertisements]);

  // Auto-rotation
  useEffect(() => {
    if (tabs.length <= 1) return;

    const startAutoRotation = () => {
      autoRotateRef.current = setInterval(() => {
        setActiveTabIndex((prev) => (prev + 1) % tabs.length);
      }, 5000); // 5 seconds
    };

    startAutoRotation();

    return () => {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
      }
    };
  }, [tabs.length]);

  // Touch events for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    handleSwipe();
  };

  const handleSwipe = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swipe left - next tab
        setActiveTabIndex((prev) => (prev + 1) % tabs.length);
      } else {
        // Swipe right - previous tab
        setActiveTabIndex((prev) => (prev - 1 + tabs.length) % tabs.length);
      }
    }
  };

  const switchTab = (index: number) => {
    setActiveTabIndex(index);
    // Reset auto-rotation
    if (autoRotateRef.current) {
      clearInterval(autoRotateRef.current);
    }
  };

  // Show fallback logo if no tabs
  if (!loading && tabs.length === 0 && fallbackLogoUrl) {
    return (
      <div id="headerArea" className="restaurant-info logo-container">
        <div className="header-tabs-wrapper" style={{ display: 'flex' }}>
          <div
            className="header-content-image"
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={fallbackLogoUrl}
              alt="Logo"
              loading="eager"
              fetchPriority="high"
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                objectFit: 'contain',
                borderRadius: '12px',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (loading || tabs.length === 0) return null;

  return (
    <div id="headerArea" className="restaurant-info logo-container">
      <div className="header-tabs-wrapper" style={{ display: 'flex' }}>
        {/* Tab Content Slider */}
        <div
          className="header-tabs-slider"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              className={`header-tab-content ${index === activeTabIndex ? 'active' : ''}`}
              style={{
                position: index === activeTabIndex ? 'relative' : 'absolute',
                visibility: index === activeTabIndex ? 'visible' : 'hidden',
                opacity: index === activeTabIndex ? 1 : 0,
                width: '100%',
                height: '100%',
              }}
            >
              {tab.tabType === 'Image' && <ImageSliderTab tab={tab} />}
              {tab.tabType === 'Video' && <VideoTab tab={tab} />}
              {tab.tabType === 'Campaign' && <CampaignTab tab={tab} />}
              {(tab.tabType === 'FavoriteProducts' || tab.tabType === 'BestSellingProducts') && (
                <ProductsTab tab={tab} />
              )}
            </div>
          ))}
        </div>

        {/* Slider Dots Navigation */}
        {tabs.length > 1 && (
          <div className="header-tabs-dots">
            {tabs.map((_, index) => (
              <span
                key={index}
                className={`header-tab-dot ${index === activeTabIndex ? 'active' : ''}`}
                onClick={() => switchTab(index)}
                data-index={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
