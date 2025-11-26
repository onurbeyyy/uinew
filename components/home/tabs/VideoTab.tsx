'use client';

import type { Advertisement } from '@/types/api';

interface VideoTabProps {
  tab: Advertisement;
}

export default function VideoTab({ tab }: VideoTabProps) {
  if (!tab.videoUrl) {
    return (
      <div className="header-content-video">
        <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.7)' }}>
          Video bulunamadı
        </div>
      </div>
    );
  }

  return (
    <div className="header-content-video">
      <video autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }}>
        <source src={tab.videoUrl} type="video/mp4" />
        Tarayıcınız video oynatmayı desteklemiyor.
      </video>
    </div>
  );
}
