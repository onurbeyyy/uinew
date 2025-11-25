'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { Advertisement } from '@/types/api';

interface ImageSliderTabProps {
  tab: Advertisement;
}

export default function ImageSliderTab({ tab }: ImageSliderTabProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    // Parse comma-separated image URLs
    if (tab.imageUrl) {
      const imageList = tab.imageUrl
        .split(',')
        .map((url) => url.trim())
        .filter((url) => url)
        .map((url) => {
          // Convert to full URL if needed
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            const cleanPath = url.startsWith('Uploads/') ? url.substring(8) : url;
            return `https://canlimenu.online/Uploads/${cleanPath}`;
          }
          return url.replace('http://', 'https://');
        });
      setImages(imageList);
    }
  }, [tab.imageUrl]);

  // Auto-rotation for multiple images
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, tab.sliderInterval || 8000);

    return () => clearInterval(interval);
  }, [images.length, tab.sliderInterval]);

  if (images.length === 0) {
    return (
      <div className="header-content-image">
        <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.7)' }}>
          Görsel bulunamadı
        </div>
      </div>
    );
  }

  return (
    <div className="header-content-image">
      <div className="header-image-slider">
        {images.map((img, idx) => (
          <div
            key={idx}
            className={`header-image-slide ${idx === currentSlide ? 'active' : ''}`}
            data-slide={idx}
          >
            <Image
              src={img}
              alt={`Slide ${idx + 1}`}
              width={1920}
              height={1080}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="eager"
              fetchPriority="high"
            />
          </div>
        ))}

        {/* Slider Dots */}
        {images.length > 1 && (
          <div className="header-slider-dots">
            {images.map((_, idx) => (
              <span
                key={idx}
                className={`header-slider-dot ${idx === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(idx)}
                data-slide={idx}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
