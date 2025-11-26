'use client';

import { useEffect } from 'react';
import Image from 'next/image';

interface BannerModalProps {
  bannerUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function BannerModal({ bannerUrl, isOpen, onClose }: BannerModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="banner-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        opacity: 1,
        transition: 'opacity 0.3s ease'
      }}
      onClick={onClose}
    >
      <div
        className="banner-content"
        style={{
          position: 'relative',
          maxWidth: window.innerWidth <= 480 ? '95%' : '90%',
          maxHeight: window.innerWidth <= 480 ? '80%' : '90%',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          transition: 'transform 0.3s ease'
        }}
        onClick={onClose}
      >
        <button
          className="banner-close-btn"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Kapat"
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '32px',
            height: '32px',
            background: 'rgba(0, 0, 0, 0.7)',
            border: 'none',
            borderRadius: '50%',
            color: 'white',
            fontSize: '20px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'background 0.2s ease, transform 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ×
        </button>
        <img
          src={bannerUrl}
          alt="Banner"
          className="banner-image"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            cursor: 'pointer',
            maxHeight: '90vh',
            objectFit: 'contain'
          }}
        />
      </div>
    </div>
  );
}
