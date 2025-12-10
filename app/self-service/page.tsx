'use client';

import { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import * as signalR from '@microsoft/signalr';

interface CustomerData {
  customer: {
    id: number;
    name: string;
    code: string;
    logo?: string;
    selfServiceBackground?: string;
  };
}

export default function SelfServicePage() {
  const [customerCode, setCustomerCode] = useState<string>('');
  const [customerId, setCustomerId] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerLogo, setCustomerLogo] = useState<string>('');
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Device Activation States
  const [isDeviceActivated, setIsDeviceActivated] = useState<boolean>(false);
  const [activationCode, setActivationCode] = useState<string>('');
  const [activationError, setActivationError] = useState<string>('');
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [checkingDevice, setCheckingDevice] = useState<boolean>(true);

  const hubConnectionRef = useRef<signalR.HubConnection | null>(null);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkCountRef = useRef<number>(0);
  const currentSessionIdRef = useRef<string | null>(null); // SignalR closure için
  const customerCodeRef = useRef<string>(''); // SignalR closure için
  const customerIdRef = useRef<number>(0); // SignalR closure için

  // QR URL için current origin kullan (localhost'ta localhost, production'da production URL)
  const [uiBaseUrl, setUiBaseUrl] = useState('https://www.canlimenu.com');

  useEffect(() => {
    // Client-side'da window.location.origin kullan
    if (typeof window !== 'undefined') {
      setUiBaseUrl(window.location.origin);
    }
  }, []);

  const CONFIG = {
    signalRBaseUrl: process.env.NEXT_PUBLIC_SIGNALR_URL || 'https://apicanlimenu.online',
    uiBaseUrl: uiBaseUrl,
    expirySeconds: 300, // 5 dakika
    qrSize: 240,
    maxChecks: 200 // 5 dakika için yeterli kontrol
  };

  // Body stillerini override et - telefon simülasyonunu kapat
  useEffect(() => {
    // Body ve HTML stillerini zorla override et
    document.documentElement.style.cssText = `
      background: #1a1a1a !important;
      width: 100% !important;
      height: 100% !important;
      overflow: hidden !important;
    `;
    document.body.style.cssText = `
      width: 100vw !important;
      max-width: 100vw !important;
      min-width: 100vw !important;
      height: 100vh !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      box-shadow: none !important;
      background: transparent !important;
    `;

    return () => {
      // Cleanup - sayfa değiştiğinde varsayılana dön
      document.documentElement.style.cssText = '';
      document.body.style.cssText = '';
    };
  }, []);

  // URL'den code parametresini al ve cihaz doğrulaması yap
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');


    if (!code) {
      setError('Müşteri kodu belirtilmedi');
      setLoading(false);
      setCheckingDevice(false);
      return;
    }

    setCustomerCode(code);
    customerCodeRef.current = code; // Ref'i de güncelle

    // Cihaz token kontrolü
    checkDeviceActivation(code);
  }, []);

  // Cihaz aktivasyon kontrolü
  const checkDeviceActivation = async (code: string) => {
    try {
      const deviceToken = localStorage.getItem(`selfServiceDevice_${code}`);

      if (!deviceToken) {
        // Cihaz aktive edilmemiş, aktivasyon ekranı göster
        setCheckingDevice(false);
        setIsDeviceActivated(false);
        setLoading(false);
        return;
      }

      // Cihaz token'ını doğrula
      const response = await fetch(`/api/self-service/device/validate?deviceToken=${deviceToken}`);
      const data = await response.json();

      if (data.success) {
        // Cihaz geçerli
        setIsDeviceActivated(true);
        setCheckingDevice(false);
        fetchCustomerData(code);
      } else {
        // Cihaz geçersiz veya iptal edilmiş, token'ı temizle
        localStorage.removeItem(`selfServiceDevice_${code}`);
        setIsDeviceActivated(false);
        setCheckingDevice(false);
        setLoading(false);
      }
    } catch (err) {
      console.error('Device validation error:', err);
      // Hata durumunda aktivasyon ekranı göster
      setIsDeviceActivated(false);
      setCheckingDevice(false);
      setLoading(false);
    }
  };

  // Cihazı aktive et
  const handleActivateDevice = async () => {
    if (!activationCode || activationCode.length !== 6) {
      setActivationError('Lütfen 6 haneli aktivasyon kodunu girin');
      return;
    }

    setIsActivating(true);
    setActivationError('');

    try {
      const response = await fetch('/api/self-service/device/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: activationCode,
          deviceName: 'Self-Service Kiosk',
          userAgent: navigator.userAgent
        })
      });

      const data = await response.json();

      if (data.success) {
        // Cihaz token'ını kaydet
        localStorage.setItem(`selfServiceDevice_${customerCode}`, data.deviceToken);

        // Başarılı aktivasyon
        setIsDeviceActivated(true);
        setActivationCode('');
        setLoading(true);
        fetchCustomerData(customerCode);
      } else {
        // Hata
        if (data.error === 'expired') {
          setActivationError('Aktivasyon kodunun süresi dolmuş. Lütfen yeni kod alın.');
        } else if (data.error === 'invalid_code') {
          setActivationError('Geçersiz aktivasyon kodu. Lütfen kontrol edin.');
        } else {
          setActivationError(data.message || 'Aktivasyon başarısız');
        }
      }
    } catch (err: any) {
      setActivationError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setIsActivating(false);
    }
  };

  // Aktivasyon kodu input handler
  const handleActivationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setActivationCode(value);
    setActivationError('');
  };

  // Müşteri bilgilerini getir
  const fetchCustomerData = async (code: string) => {
    try {
      const response = await fetch(
        `/api/self-service/customer?code=${code}`
      );

      if (!response.ok) {
        throw new Error('Müşteri bulunamadı');
      }

      const data: CustomerData = await response.json();
      const customer = data.customer;

      if (!customer) {
        throw new Error('Müşteri bilgisi alınamadı');
      }

      setCustomerId(customer.id);
      customerIdRef.current = customer.id; // Ref'i de güncelle
      setCustomerName(customer.name);

      // Logo URL
      if (customer.logo) {
        let logoUrl = customer.logo;
        if (logoUrl.startsWith('http')) {
          logoUrl = logoUrl.replace('http://', 'https://');
        } else {
          const logoPath = logoUrl.startsWith('Uploads/')
            ? logoUrl.substring('Uploads/'.length)
            : logoUrl;
          logoUrl = `https://apicanlimenu.online/Uploads/${logoPath}`;
        }
        setCustomerLogo(logoUrl);
      }

      // Background URL
      if (customer.selfServiceBackground) {
        let bgUrl = customer.selfServiceBackground;
        if (bgUrl.startsWith('http')) {
          bgUrl = bgUrl.replace('http://', 'https://');
        } else {
          const bgPath = bgUrl.startsWith('Uploads/')
            ? bgUrl.substring('Uploads/'.length)
            : bgUrl;
          bgUrl = `https://apicanlimenu.online/Uploads/${bgPath}`;
        }
        setBackgroundImage(bgUrl);
      }

      setLoading(false);

      // SignalR ve session başlat
      setupSignalR(customer.id);
      createNewSession(code, customer.id);
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
      setLoading(false);
    }
  };

  // Yeni session oluştur
  const createNewSession = async (code: string, custId: number) => {
    try {
      const response = await fetch('/api/self-service/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId: custId,
          expirySeconds: CONFIG.expirySeconds
        })
      });

      if (!response.ok) {
        throw new Error(`API hatası: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const sessionId = data.sessionId;
        setCurrentSessionId(sessionId);
        currentSessionIdRef.current = sessionId; // Ref'i de güncelle (SignalR için)

        // QR URL oluştur - self-service sayfasına yönlendir
        const url = `${CONFIG.uiBaseUrl}/${code.toLowerCase()}/self?session=${sessionId}`;
        setQrUrl(url);

        // Session kontrolünü başlat
        startSessionCheck(sessionId, code, custId);
      } else {
        console.error('❌ Session oluşturulamadı:', data.message);
      }
    } catch (error: any) {
      console.error('❌ API hatası:', error);
    }
  };

  // Session durumunu kontrol et
  const startSessionCheck = (sessionId: string, code: string, custId: number) => {
    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current);
    }

    checkCountRef.current = 0;

    sessionCheckIntervalRef.current = setInterval(async () => {
      try {
        if (!sessionId) return;

        checkCountRef.current++;
        if (checkCountRef.current > CONFIG.maxChecks) {
          clearInterval(sessionCheckIntervalRef.current!);
          createNewSession(code, custId);
          return;
        }

        const response = await fetch(
          `/api/self-service/validate-session?sessionId=${sessionId}`
        );

        const data = await response.json();

        // Session artık geçerli değilse yeni QR oluştur
        if (!response.ok || !data.success) {
          const errorType = data.error || 'unknown';

          if (errorType === 'already_used' || errorType === 'expired' || errorType === 'not_found') {
            clearInterval(sessionCheckIntervalRef.current!);
            createNewSession(code, custId);
          }
        }
      } catch (error) {
        // Network hatası, devam et
      }
    }, 1000); // 1 saniye (daha hızlı kontrol)
  };

  // SignalR bağlantısı (localhost'ta CORS hatası olabilir, production'da çalışır)
  const setupSignalR = async (custId: number) => {
    try {
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${CONFIG.signalRBaseUrl}/apimenuhub`)
        .withAutomaticReconnect()
        .build();

      // Session kullanıldı eventi
      connection.on('SelfServiceSessionUsed', (data: any) => {
        // Ref kullanıyoruz çünkü closure'da state eski kalıyor
        const activeSessionId = currentSessionIdRef.current;
        const activeCode = customerCodeRef.current;
        const activeCustId = customerIdRef.current;

        if (data.sessionId === activeSessionId) {
          if (sessionCheckIntervalRef.current) {
            clearInterval(sessionCheckIntervalRef.current);
          }
          createNewSession(activeCode, activeCustId);
        }
      });

      await connection.start();

      // Customer grubuna katıl
      await connection.invoke('JoinCustomerGroup', custId);

      hubConnectionRef.current = connection;
    } catch (error) {
      // SignalR hatası (CORS vs), sessizce devam et - polling zaten çalışıyor
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
      if (hubConnectionRef.current) {
        hubConnectionRef.current.stop();
      }
    };
  }, []);

  // Otomatik cleanup (5 dakikada bir)
  useEffect(() => {
    const cleanupInterval = setInterval(async () => {
      try {
        await fetch('/api/self-service/cleanup', {
          method: 'POST'
        });
      } catch (error) {
        // Sessizce devam et
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

  // QR koda tıklanınca yeni sekmede aç
  const handleQRClick = () => {
    if (qrUrl) {
      window.open(qrUrl, '_blank');
    }
  };

  // Cihaz kontrolü yapılırken göster
  if (checkingDevice) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-spin">🔐</div>
          <div className="text-base font-semibold text-gray-700">Cihaz doğrulanıyor...</div>
        </div>
      </div>
    );
  }

  // Cihaz aktive değilse aktivasyon ekranı göster
  if (!isDeviceActivated && !error) {
    return (
      <div
        className="self-service-wrapper"
        style={{
          fontFamily: "'Poppins', sans-serif",
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Animated Background Particles */}
        <Particles />

        {/* Main Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            maxWidth: '900px',
            width: '90%',
            zIndex: 1,
            position: 'relative'
          }}
        >
          {/* Lock Icon - Top */}
          <div className="text-center animate-fadeInDown">
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '30px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 20px 50px rgba(102, 126, 234, 0.4)',
                margin: '0 auto'
              }}
            >
              <svg style={{ width: '60px', height: '60px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          {/* Input Section - Center */}
          <div className="animate-zoomIn">
            <div
              style={{
                background: 'white',
                padding: '40px 50px',
                borderRadius: '30px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                position: 'relative',
                overflow: 'hidden',
                textAlign: 'center'
              }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent animate-shimmer pointer-events-none" />

              <h1
                style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: '#1a202c',
                  marginBottom: '10px',
                  position: 'relative',
                  zIndex: 1
                }}
              >
                Cihaz Aktivasyonu
              </h1>

              <p
                style={{
                  fontSize: '1rem',
                  color: '#718096',
                  marginBottom: '30px',
                  position: 'relative',
                  zIndex: 1
                }}
              >
                6 haneli aktivasyon kodunu girin
              </p>

              <input
                type="text"
                inputMode="numeric"
                placeholder="• • • • • •"
                value={activationCode}
                onChange={handleActivationCodeChange}
                onKeyDown={(e) => e.key === 'Enter' && handleActivateDevice()}
                maxLength={6}
                disabled={isActivating}
                autoFocus
                style={{
                  width: '300px',
                  textAlign: 'center',
                  fontSize: '3rem',
                  fontWeight: 700,
                  letterSpacing: '0.4em',
                  padding: '20px',
                  border: '3px solid #e2e8f0',
                  borderRadius: '20px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  zIndex: 1
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />

              {/* Error */}
              {activationError && (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '15px 20px',
                    background: '#FEE2E2',
                    borderRadius: '15px',
                    position: 'relative',
                    zIndex: 1
                  }}
                >
                  <p style={{ color: '#DC2626', fontSize: '1rem', margin: 0 }}>{activationError}</p>
                </div>
              )}

              <button
                onClick={handleActivateDevice}
                disabled={isActivating || activationCode.length !== 6}
                style={{
                  marginTop: '25px',
                  width: '100%',
                  padding: '18px 40px',
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  color: 'white',
                  background: isActivating || activationCode.length !== 6
                    ? '#CBD5E0'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '15px',
                  cursor: isActivating || activationCode.length !== 6 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: isActivating || activationCode.length !== 6 ? 'none' : '0 10px 30px rgba(102, 126, 234, 0.4)',
                  position: 'relative',
                  zIndex: 1
                }}
              >
                {isActivating ? 'Aktive Ediliyor...' : '🔓 Cihazı Aktive Et'}
              </button>
            </div>
          </div>

          {/* Info Section - Bottom */}
          <div
            className="text-center animate-fadeInUp"
            style={{
              background: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(20px)',
              padding: '20px 35px',
              borderRadius: '20px',
              border: '2px solid rgba(0,0,0,0.08)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.08)'
            }}
          >
            <p
              style={{
                fontSize: '1rem',
                lineHeight: 1.6,
                color: '#4a5568',
                fontWeight: 400,
                margin: 0
              }}
            >
              Aktivasyon kodu <strong>5 dakika</strong> geçerlidir. Yeni kod için admin paneli kullanın.
            </p>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes zoomIn {
            from { opacity: 0; transform: scale(0.8); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-fadeInDown { animation: fadeInDown 1s ease-out; }
          .animate-fadeInUp { animation: fadeInUp 1s ease-out; }
          .animate-zoomIn { animation: zoomIn 0.8s ease-out; }
          .animate-shimmer { animation: shimmer 3s infinite; }
        `}</style>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-spin">⏳</div>
          <div className="text-base font-semibold text-gray-700">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-center">
          <div className="text-4xl mb-3">❌</div>
          <div className="text-base font-semibold text-red-700">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="self-service-wrapper"
      style={{
        fontFamily: "'Poppins', sans-serif",
        background: backgroundImage
          ? 'transparent'
          : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      {/* High Quality Background Image */}
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt="Background"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center center',
            zIndex: 0,
            imageRendering: 'auto',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden'
          }}
        />
      )}

      {/* Animated Background Particles */}
      <Particles />

      {/* Centering Container */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          maxWidth: '900px',
          width: '90%',
          zIndex: 1
        }}
      >
        {/* Logo Section - Top */}
        <div className="text-center animate-fadeInDown">
          {customerLogo ? (
            <img
              src={customerLogo}
              alt={customerName}
              style={{
                maxWidth: '280px',
                maxHeight: '126px',
                filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.15))'
              }}
            />
          ) : (
            <h1
              style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: '#1a202c',
                margin: 0
              }}
            >
              {customerName}
            </h1>
          )}
        </div>

        {/* QR Code Section - Center */}
        <div className="animate-zoomIn">
          <div
            style={{
              background: 'white',
              padding: '30px',
              borderRadius: '30px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent animate-shimmer pointer-events-none" />

            {qrUrl ? (
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'inline-block',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
                onClick={handleQRClick}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              >
                <QRCodeSVG
                  value={qrUrl}
                  size={CONFIG.qrSize}
                  level="H"
                  style={{
                    borderRadius: '20px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                  }}
                />
              </div>
            ) : (
              <div style={{ width: '240px', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: '#cbd5e0', fontSize: '1rem' }}>QR Kod Oluşturuluyor...</div>
              </div>
            )}

            <div
              style={{
                marginTop: '15px',
                textAlign: 'center',
                color: '#4a5568',
                fontSize: '0.9rem',
                fontWeight: 500,
                position: 'relative',
                zIndex: 1
              }}
            >
              📱 Telefonunuzla Okutun
            </div>
          </div>
        </div>

        {/* Welcome Section - Bottom */}
        <div
          className="text-center animate-fadeInUp"
          style={{
            background: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(20px)',
            padding: '20px 35px',
            borderRadius: '20px',
            border: '2px solid rgba(0,0,0,0.08)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)'
          }}
        >
          <h2
            style={{
              fontSize: '1.6rem',
              marginBottom: '10px',
              fontWeight: 600,
              color: '#2d3748',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <span className="animate-wave" style={{ fontSize: '1.8rem' }}>
              👋
            </span>
            <span>Hoş Geldiniz</span>
          </h2>
          <p
            style={{
              fontSize: '1rem',
              lineHeight: 1.6,
              color: '#4a5568',
              fontWeight: 300,
              margin: 0
            }}
          >
            QR kodu telefonunuzla okutun, menüyü görüntüleyin ve sipariş verin.
          </p>
        </div>
      </div>

      <style jsx global>{`
        html {
          background: #1a1a1a !important;
          display: block !important;
          width: 100% !important;
          height: 100% !important;
        }
        body {
          width: 100vw !important;
          max-width: 100vw !important;
          min-width: 100vw !important;
          height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          box-shadow: none !important;
          position: relative !important;
        }
        @media (min-width: 1024px) {
          body {
            width: 100vw !important;
            max-width: 100vw !important;
            min-width: 100vw !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes zoomIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes wave {
          0%,
          100% {
            transform: rotate(0deg);
          }
          10%,
          30% {
            transform: rotate(14deg);
          }
          20% {
            transform: rotate(-8deg);
          }
          40%,
          100% {
            transform: rotate(0deg);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-fadeInDown {
          animation: fadeInDown 1s ease-out;
        }

        .animate-fadeInUp {
          animation: fadeInUp 1s ease-out;
        }

        .animate-zoomIn {
          animation: zoomIn 0.8s ease-out;
        }

        .animate-slideInRight {
          animation: slideInRight 0.5s ease-out;
        }

        .animate-wave {
          animation: wave 2s infinite;
        }

        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  );
}

// Particles Component
function Particles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: Math.random() * 50 + 50,
    delay: Math.random() * 15,
    duration: Math.random() * 10 + 10
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-black/5 animate-float"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`
          }}
        />
      ))}

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) translateX(50px);
            opacity: 0;
          }
        }

        .animate-float {
          animation: float 15s infinite;
        }
      `}</style>
    </div>
  );
}
