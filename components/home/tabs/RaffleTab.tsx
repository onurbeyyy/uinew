'use client';

import { useState } from 'react';
import type { Advertisement } from '@/types/api';
import RaffleModal from '@/components/modals/RaffleModal';

interface RaffleTabProps {
  tab: Advertisement;
}

export default function RaffleTab({ tab }: RaffleTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Görsel URL'sini düzenle
  const getImageUrl = (url?: string) => {
    if (!url || url.trim() === '') return null;
    const trimmedUrl = url.trim();
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      return trimmedUrl.replace('http://', 'https://');
    }
    const cleanPath = trimmedUrl.startsWith('Uploads/') ? trimmedUrl.substring(8) : trimmedUrl;
    return `https://apicanlimenu.online/Uploads/${cleanPath}`;
  };

  // imageUrl virgülle ayrılmış olabilir, ilkini al
  const rawImageUrl = tab.imageUrl?.split(',')[0]?.trim();
  const prizeImage = getImageUrl(rawImageUrl);

  const prizeDescription = tab.campaignText;
  const title = tab.title || 'Çekilişe Katıl';

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: prizeImage
            ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url('${prizeImage}')`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          padding: '20px',
          paddingBottom: '30px',
        }}
      >
        {/* Ödül açıklaması - üstte */}
        {prizeDescription && (
          <p
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              right: '20px',
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
              margin: 0,
              textShadow: '0 2px 8px rgba(0,0,0,0.7)',
              textAlign: 'center',
            }}
          >
            {prizeDescription}
          </p>
        )}

        {/* Çekilişe Katıl butonu - en altta */}
        <div
          style={{
            position: 'absolute',
            bottom: '15px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'inline-flex',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
            padding: '14px 32px',
            borderRadius: '25px',
            color: 'white',
            fontWeight: 700,
            fontSize: '16px',
            boxShadow: '0 4px 15px rgba(243, 156, 18, 0.5)',
          }}
        >
          Çekilişe Katıl
        </div>
      </div>

      {/* Çekiliş Modal */}
      <RaffleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        raffleId={tab.id}
        raffleTitle={title}
        prizeDescription={prizeDescription}
        prizeImage={prizeImage || undefined}
      />
    </>
  );
}
