'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CookiePreferences {
  necessary: boolean; // Zorunlu - her zaman true
  functional: boolean; // İşlevsel
  analytics: boolean; // Analitik
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    functional: true,
    analytics: false,
  });

  useEffect(() => {
    // Check if user already made a choice
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Delay showing banner for better UX
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem('cookieConsent', JSON.stringify({
      ...prefs,
      timestamp: new Date().toISOString(),
    }));
    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    savePreferences({
      necessary: true,
      functional: true,
      analytics: true,
    });
  };

  const acceptNecessary = () => {
    savePreferences({
      necessary: true,
      functional: false,
      analytics: false,
    });
  };

  const saveCustom = () => {
    savePreferences(preferences);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Overlay for settings modal */}
      {showSettings && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 100000,
          }}
          onClick={() => setShowSettings(false)}
        />
      )}

      {/* Cookie Settings Modal */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          borderRadius: '16px',
          padding: '30px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          zIndex: 100001,
          boxShadow: '0 10px 50px rgba(0,0,0,0.3)',
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: '#333' }}>
            Çerez Tercihleri
          </h3>

          {/* Zorunlu Çerezler */}
          <div style={{
            padding: '15px',
            background: '#f8f9ff',
            borderRadius: '10px',
            marginBottom: '15px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: '#333' }}>Zorunlu Çerezler</strong>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  Platform'un çalışması için gerekli. Devre dışı bırakılamaz.
                </p>
              </div>
              <input
                type="checkbox"
                checked={true}
                disabled
                style={{ width: '20px', height: '20px', accentColor: '#667eea' }}
              />
            </div>
          </div>

          {/* İşlevsel Çerezler */}
          <div style={{
            padding: '15px',
            background: '#fff',
            border: '1px solid #eee',
            borderRadius: '10px',
            marginBottom: '15px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: '#333' }}>İşlevsel Çerezler</strong>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  Dil tercihi, tema gibi ayarlarınızı hatırlar.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.functional}
                onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
                style={{ width: '20px', height: '20px', accentColor: '#667eea', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Analitik Çerezler */}
          <div style={{
            padding: '15px',
            background: '#fff',
            border: '1px solid #eee',
            borderRadius: '10px',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: '#333' }}>Analitik Çerezler</strong>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  Platform kullanımını anonim olarak analiz eder.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                style={{ width: '20px', height: '20px', accentColor: '#667eea', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowSettings(false)}
              style={{
                flex: 1,
                padding: '12px',
                background: '#f5f5f5',
                color: '#333',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              İptal
            </button>
            <button
              onClick={saveCustom}
              style={{
                flex: 1,
                padding: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Tercihleri Kaydet
            </button>
          </div>
        </div>
      )}

      {/* Main Cookie Banner */}
      <div style={{
        position: 'fixed',
        bottom: '80px', // BottomNavBar yüksekliği
        left: 0,
        right: 0,
        background: 'white',
        borderTop: '1px solid #eee',
        boxShadow: '0 -5px 30px rgba(0,0,0,0.1)',
        padding: '15px 20px',
        zIndex: 99999,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '15px',
        }}>
          {/* Text */}
          <div style={{ flex: '1 1 400px' }}>
            <p style={{ fontSize: '14px', color: '#333', marginBottom: '5px' }}>
              <strong>Bu web sitesi çerezler kullanmaktadır.</strong>
            </p>
            <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.5' }}>
              Size daha iyi bir deneyim sunmak için çerezler kullanıyoruz. Zorunlu çerezler platform'un
              çalışması için gereklidir.{' '}
              <Link href="/cerez-politikasi" style={{ color: '#667eea', textDecoration: 'underline' }}>
                Çerez Politikası
              </Link>
              {' '}ve{' '}
              <Link href="/kvkk" style={{ color: '#667eea', textDecoration: 'underline' }}>
                KVKK Aydınlatma Metni
              </Link>
              'ni inceleyebilirsiniz.
            </p>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={acceptNecessary}
              style={{
                padding: '12px 20px',
                background: '#f5f5f5',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Sadece Zorunlu
            </button>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                padding: '12px 20px',
                background: 'white',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Ayarlar
            </button>
            <button
              onClick={acceptAll}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Tümünü Kabul Et
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
