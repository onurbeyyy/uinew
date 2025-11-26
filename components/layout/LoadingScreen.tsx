'use client';

import Image from 'next/image';

interface LoadingScreenProps {
  logoUrl?: string;
  backgroundUrl?: string;
}

export default function LoadingScreen({ logoUrl, backgroundUrl }: LoadingScreenProps) {
  const bgStyle = backgroundUrl
    ? {
        backgroundImage: `url('${backgroundUrl}')`,
        backgroundPosition: 'center center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat'
      }
    : { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };

  return (
    <div
      style={{
        ...bgStyle,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9998
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}
      >
        {logoUrl ? (
          <div
            style={{
              animation: 'pulse 1s ease-in-out infinite',
              transformOrigin: 'center'
            }}
          >
            <Image
              src={logoUrl}
              alt="Logo"
              width={200}
              height={200}
              priority
              style={{
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))'
              }}
            />
          </div>
        ) : (
          <div
            style={{
              width: '60px',
              height: '60px',
              border: '4px solid rgba(255, 255, 255, 0.3)',
              borderTop: '4px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
