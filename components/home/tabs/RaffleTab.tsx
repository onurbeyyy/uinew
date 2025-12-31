'use client';

import { useState } from 'react';
import type { Advertisement } from '@/types/api';
import RaffleModal from '@/components/modals/RaffleModal';
import { useAuth } from '@/contexts/UserContext';
import { useMenu } from '@/contexts/MenuContext';

interface RaffleTabProps {
  tab: Advertisement;
}

export default function RaffleTab({ tab }: RaffleTabProps) {
  const { currentUser } = useAuth();
  const { openProfile } = useMenu();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleClick = () => {
    if (!currentUser) {
      setShowLoginPrompt(true);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleLoginClick = () => {
    setShowLoginPrompt(false);
    openProfile();
  };

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
        onClick={handleClick}
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

      {/* Kayıt Ol Uyarı Modalı */}
      {showLoginPrompt && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
          onClick={() => setShowLoginPrompt(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: '20px',
              padding: '30px',
              maxWidth: '350px',
              width: '100%',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎯</div>
            <h3 style={{ color: 'white', fontSize: '20px', marginBottom: '10px' }}>
              Kayıt Olmalısınız
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '25px' }}>
              Çekilişe katılmak için önce kayıt olmanız gerekmektedir.
            </p>
            <button
              onClick={handleLoginClick}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: '10px',
              }}
            >
              Kayıt Ol / Giriş Yap
            </button>
            <button
              onClick={() => setShowLoginPrompt(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'transparent',
                color: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </>
  );
}
