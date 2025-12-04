'use client';

import { useState, useEffect } from 'react';

export default function InstallPWA() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // iOS kontrolü
    const iOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIOS(iOS);

    // Standalone mod kontrolü (zaten PWA olarak açılmış mı)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Daha önce kapatılmış mı kontrol et (kalıcı)
    const dismissed = localStorage.getItem('pwa-install-dismissed');

    // Sadece iOS'ta ve daha önce kapatılmamışsa göster
    if (iOS && !standalone && !dismissed) {
      // 3 saniye sonra göster
      setTimeout(() => setShowInstallPrompt(true), 3000);
    }

    // Android için beforeinstallprompt eventi
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android - native prompt göster
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallPrompt(false);
      }
      setDeferredPrompt(null);
    }
    // iOS için modal zaten açık, kullanıcı adımları takip edecek
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    setShowInstallPrompt(false);
  };

  if (!showInstallPrompt || isStandalone) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '90px',
      left: '10px',
      right: '10px',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      borderRadius: '16px',
      padding: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      zIndex: 9998,
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      {/* Kapatma butonu */}
      <button
        onClick={handleDismiss}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '4px',
        }}
      >
        ×
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #ff6b00, #ff9500)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
        }}>
          📱
        </div>
        <div>
          <h3 style={{ margin: 0, color: 'white', fontSize: '16px', fontWeight: 700 }}>
            Uygulamayı Yükle
          </h3>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
            Tam ekran deneyim için ana ekrana ekle
          </p>
        </div>
      </div>

      {isIOS ? (
        // iOS için adımlar
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '12px',
        }}>
          <p style={{ color: 'white', fontSize: '13px', margin: '0 0 10px', fontWeight: 600 }}>
            Safari'de şu adımları izleyin:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.9)', fontSize: '13px' }}>
              <span style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#ff6b00',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
              }}>1</span>
              <span>Alttaki <strong style={{ fontSize: '18px' }}>⬆️</strong> paylaş butonuna tıklayın</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.9)', fontSize: '13px' }}>
              <span style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#ff6b00',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
              }}>2</span>
              <span>"<strong>Ana Ekrana Ekle</strong>" seçeneğini bulun</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.9)', fontSize: '13px' }}>
              <span style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#ff6b00',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
              }}>3</span>
              <span>"<strong>Ekle</strong>" butonuna tıklayın</span>
            </div>
          </div>
        </div>
      ) : (
        // Android için buton
        <button
          onClick={handleInstallClick}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, #ff6b00, #ff9500)',
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span>📲</span> Ana Ekrana Ekle
        </button>
      )}
    </div>
  );
}
