'use client';

interface WaiterCallRateLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorMessage: string;
  remainingSeconds: number;
  isRegistered: boolean;
}

export default function WaiterCallRateLimitModal({
  isOpen,
  onClose,
  errorMessage,
  remainingSeconds,
  isRegistered,
}: WaiterCallRateLimitModalProps) {
  if (!isOpen) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeText = minutes > 0 ? `${minutes} dakika ${seconds} saniye` : `${seconds} saniye`;

  const infoText = isRegistered
    ? 'ℹ️ Üye kullanıcılar 10 dakikada bir garson çağırabilir'
    : 'ℹ️ Misafirler 30 dakikada bir garson çağırabilir';

  const registerHint = !isRegistered ? '💡 Üye olun ve 10 dakikada bir çağırın!' : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(5px)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.95) 0%, rgba(251, 140, 0, 0.95) 100%)',
          color: 'white',
          padding: '30px',
          borderRadius: '20px',
          textAlign: 'center',
          fontSize: '15px',
          fontWeight: 500,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
          maxWidth: '450px',
          width: '100%',
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '15px' }}>⏰</div>

        <div style={{ fontWeight: 700, fontSize: '20px', marginBottom: '15px' }}>
          Garson Çağırma Limiti
        </div>

        <div style={{ marginBottom: '20px', fontSize: '15px', opacity: 0.95 }}>{errorMessage}</div>

        {/* Remaining Time Card */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '15px',
            borderRadius: '12px',
            marginBottom: '20px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
          }}
        >
          <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px' }}>Kalan Süre:</div>
          <div style={{ fontSize: '24px', fontWeight: 700 }}>{timeText}</div>
        </div>

        {/* Info Section */}
        <div
          style={{
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.3)',
            fontSize: '14px',
            opacity: 0.95,
          }}
        >
          <div style={{ marginBottom: registerHint ? '8px' : 0 }}>{infoText}</div>
          {registerHint && (
            <div style={{ fontWeight: 600, fontSize: '15px', marginTop: '8px' }}>{registerHint}</div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            marginTop: '25px',
            width: '100%',
            padding: '14px',
            background: 'rgba(255, 255, 255, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
          }}
        >
          Tamam
        </button>
      </div>
    </div>
  );
}
