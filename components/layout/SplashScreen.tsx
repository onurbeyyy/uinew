'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface SplashScreenProps {
  logoUrl: string;
  backgroundUrl?: string;
  onComplete: () => void;
}

export default function SplashScreen({ logoUrl, backgroundUrl, onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Add liquid-morph class after 600ms
      const splash = document.querySelector('.splash-screen');
      splash?.classList.add('liquid-morph');

      // Hide after animation completes (600ms)
      setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 600);
    }, 600);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  const bgStyle = backgroundUrl
    ? {
        backgroundImage: `url('${backgroundUrl}')`,
        backgroundPosition: 'center center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat'
      }
    : { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };

  return (
    <div className="splash-screen active" style={bgStyle}>
      <div className="splash-content">
        {!imageError ? (
          <Image
            src={logoUrl}
            alt="Logo"
            width={350}
            height={350}
            className="splash-logo"
            priority
            onError={() => setImageError(true)}
          />
        ) : (
          <div style={{
            width: '350px',
            height: '350px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            color: 'white',
            fontWeight: 'bold'
          }}>
            LOGO
          </div>
        )}
      </div>
    </div>
  );
}
