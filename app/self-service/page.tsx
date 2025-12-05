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

  const CONFIG = {
    signalRBaseUrl: process.env.NEXT_PUBLIC_SIGNALR_URL || 'https://canlimenu.online',
    uiBaseUrl: process.env.NEXT_PUBLIC_UI_URL || 'http://localhost:3001',
    expirySeconds: 300, // 5 dakika
    qrSize: 240,
    maxChecks: 200 // 5 dakika için yeterli kontrol
  };

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
          logoUrl = `https://canlimenu.online/Uploads/${logoPath}`;
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
          bgUrl = `https://canlimenu.online/Uploads/${bgPath}`;
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

        // QR URL oluştur - kısa URL (ana sayfa session ile yönlendirecek)
        const url = `${CONFIG.uiBaseUrl}/${code.toLowerCase()}?session=${sessionId}`;
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

        if (!response.ok) {
          const data = await response.json();
          const errorType = data.error || 'unknown';

          if (errorType === 'already_used' || errorType === 'expired') {
            clearInterval(sessionCheckIntervalRef.current!);
            createNewSession(code, custId);
          }
          return;
        }

        const data = await response.json();

        if (!data.success) {
          const errorType = data.error || 'unknown';

          if (errorType === 'already_used' || errorType === 'expired') {
            clearInterval(sessionCheckIntervalRef.current!);
            createNewSession(code, custId);
          }
        }
      } catch (error) {
        // Network hatası, devam et
      }
    }, 1500);
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
        console.log('📡 SignalR: Session kullanıldı, yeni QR oluşturuluyor...', data);
        if (data.sessionId === currentSessionId) {
          if (sessionCheckIntervalRef.current) {
            clearInterval(sessionCheckIntervalRef.current);
          }
          createNewSession(customerCode, custId);
        }
      });

      await connection.start();
      console.log('✅ SignalR bağlantısı kuruldu');

      // Customer grubuna katıl
      await connection.invoke('JoinCustomerGroup', custId);
      console.log('✅ Customer grubuna katıldı:', custId);

      hubConnectionRef.current = connection;
    } catch (error) {
      // SignalR hatası (CORS vs), sessizce devam et - polling zaten çalışıyor
      console.log('⚠️ SignalR bağlanamadı (polling aktif)');
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
        className="activation-wrapper"
        style={{
          fontFamily: "'Poppins', sans-serif",
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating orbs */}
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }}
          />
        </div>

        {/* Main Card */}
        <div
          className="relative z-10 animate-fadeIn"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            borderRadius: '32px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '50px 40px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255,255,255,0.1)'
          }}
        >
          {/* Lock Icon with Glow */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 animate-bounce-slow"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                boxShadow: '0 0 60px rgba(59, 130, 246, 0.5)'
              }}
            >
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <h1
              className="text-3xl font-bold mb-3"
              style={{
                background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Cihaz Aktivasyonu
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Self-servis ekranını kullanmak için<br />
              <span className="text-blue-400 font-medium">6 haneli aktivasyon kodunu</span> girin
            </p>
          </div>

          {/* PIN Input Boxes */}
          <div className="flex justify-center gap-3 mb-8">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                className="relative"
                style={{
                  width: '52px',
                  height: '68px'
                }}
              >
                <div
                  className={`w-full h-full rounded-xl flex items-center justify-center text-3xl font-bold transition-all duration-300 ${
                    activationCode[index]
                      ? 'bg-gradient-to-b from-blue-500/30 to-purple-500/30 border-blue-400/50 text-white scale-105'
                      : 'bg-white/5 border-white/10 text-gray-500'
                  }`}
                  style={{
                    border: '2px solid',
                    borderColor: activationCode[index] ? 'rgba(96, 165, 250, 0.5)' : 'rgba(255,255,255,0.1)',
                    boxShadow: activationCode[index] ? '0 0 20px rgba(59, 130, 246, 0.3)' : 'none'
                  }}
                >
                  {activationCode[index] || ''}
                </div>
                {!activationCode[index] && index === activationCode.length && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-0.5 h-8 bg-blue-400 animate-blink" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Hidden Input */}
          <input
            type="text"
            inputMode="numeric"
            value={activationCode}
            onChange={handleActivationCodeChange}
            onKeyDown={(e) => e.key === 'Enter' && handleActivateDevice()}
            className="absolute opacity-0 pointer-events-none"
            style={{ position: 'absolute', left: '-9999px' }}
            maxLength={6}
            disabled={isActivating}
            autoFocus
            id="activation-input"
          />

          {/* Clickable area to focus input */}
          <div
            className="absolute inset-0 cursor-text"
            onClick={() => document.getElementById('activation-input')?.focus()}
            style={{ zIndex: 5 }}
          />

          {/* Error Message */}
          {activationError && (
            <div
              className="mb-6 p-4 rounded-xl animate-shake relative z-10"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}
            >
              <p className="text-red-400 text-sm text-center flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {activationError}
              </p>
            </div>
          )}

          {/* Activate Button */}
          <button
            onClick={handleActivateDevice}
            disabled={isActivating || activationCode.length !== 6}
            className="relative z-10 w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300"
            style={{
              background: isActivating || activationCode.length !== 6
                ? 'rgba(255,255,255,0.1)'
                : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              boxShadow: isActivating || activationCode.length !== 6
                ? 'none'
                : '0 10px 40px rgba(59, 130, 246, 0.4)',
              cursor: isActivating || activationCode.length !== 6 ? 'not-allowed' : 'pointer',
              opacity: isActivating || activationCode.length !== 6 ? 0.5 : 1,
              transform: isActivating || activationCode.length !== 6 ? 'none' : 'translateY(0)'
            }}
            onMouseEnter={(e) => {
              if (activationCode.length === 6 && !isActivating) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 15px 50px rgba(59, 130, 246, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 40px rgba(59, 130, 246, 0.4)';
            }}
          >
            {isActivating ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Aktive Ediliyor...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                Cihazı Aktive Et
              </span>
            )}
          </button>

          {/* Info Text */}
          <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              Aktivasyon kodu <span className="text-blue-400">5 dakika</span> geçerlidir<br />
              Yeni kod için admin paneli kullanın
            </p>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }

          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }

          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
          }

          .animate-fadeIn {
            animation: fadeIn 0.6s ease-out;
          }

          .animate-bounce-slow {
            animation: bounce-slow 3s ease-in-out infinite;
          }

          .animate-blink {
            animation: blink 1s ease-in-out infinite;
          }

          .animate-shake {
            animation: shake 0.3s ease-in-out;
          }
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
          ? `url(${backgroundImage}) no-repeat center center`
          : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        backgroundSize: 'cover',
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
