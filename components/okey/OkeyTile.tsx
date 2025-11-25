'use client';

interface OkeyTileProps {
  renk: 'kirmizi' | 'siyah' | 'mavi' | 'sari' | 'joker';
  sayi: number;
  sahteJoker?: boolean;
  isJoker?: boolean; // Gerçek joker taşı mı?
  onClick?: () => void;
  secili?: boolean;
}

export default function OkeyTile({ renk, sayi, sahteJoker = false, isJoker = false, onClick, secili = false }: OkeyTileProps) {
  // Renk kodları
  const renkKodlari: Record<string, string> = {
    kirmizi: '#dc2626',
    siyah: '#000000',
    mavi: '#2563eb',
    sari: '#ca8a04',
    joker: '#ea580c',
  };

  const yaziRengi = renkKodlari[renk] || '#000000';

  return (
    <div
      onClick={onClick}
      style={{
        width: '48px',
        height: '64px',
        background: sahteJoker
          ? 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)'
          : isJoker
          ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
          : 'white',
        border: secili
          ? '3px solid #3b82f6'
          : isJoker
          ? '2px solid #f59e0b'
          : '2px solid #d1d5db',
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isJoker ? '0 0 12px rgba(245, 158, 11, 0.5)' : '0 4px 6px rgba(0, 0, 0, 0.2)',
        userSelect: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease',
        transform: secili ? 'translateY(-8px)' : 'translateY(0)'
      }}
    >
      {/* Sahte Joker (Yıldız) */}
      {sahteJoker ? (
        <span style={{
          fontSize: '32px',
          color: 'white',
          fontWeight: 'bold'
        }}>
          ★
        </span>
      ) : (
        <>
          {/* Joker İşareti */}
          {isJoker && (
            <div style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#f59e0b'
            }}>
              ⭐
            </div>
          )}

          {/* Taşın üstündeki büyük sayı */}
          <span style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: yaziRengi,
            lineHeight: '1'
          }}>
            {sayi}
          </span>

          {/* Alt kısımdaki küçük dekoratif çizgi */}
          <div style={{
            width: '50%',
            height: '4px',
            marginTop: '4px',
            borderRadius: '2px',
            background: yaziRengi
          }}></div>
        </>
      )}
    </div>
  );
}
