'use client';

import Image from 'next/image';

interface HeaderAreaProps {
  logoUrl?: string;
  showLogo?: boolean;
}

export default function HeaderArea({ logoUrl, showLogo = true }: HeaderAreaProps) {
  if (!showLogo || !logoUrl) return null;

  return (
    <div id="headerArea" className="restaurant-info logo-container">
      <div className="header-tabs-wrapper" style={{ display: 'flex' }}>
        <div className="header-content-image" style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Image
            src={logoUrl}
            alt="Restaurant Logo"
            width={1920}
            height={1080}
            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '12px' }}
            priority
          />
        </div>
      </div>
    </div>
  );
}
