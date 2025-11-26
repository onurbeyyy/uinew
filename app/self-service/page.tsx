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

  const hubConnectionRef = useRef<signalR.HubConnection | null>(null);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkCountRef = useRef<number>(0);

  const CONFIG = {
    signalRBaseUrl: process.env.NEXT_PUBLIC_SIGNALR_URL || 'https://canlimenu.online',
    uiBaseUrl: process.env.NEXT_PUBLIC_UI_URL || 'http://localhost:3000',
    expirySeconds: 90,
    qrSize: 240,
    maxChecks: 100
  };

  // URL'den code parametresini al
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      setError('Müşteri kodu belirtilmedi');
      setLoading(false);
      return;
    }

    setCustomerCode(code);
    fetchCustomerData(code);
  }, []);

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

        // QR URL oluştur - anasayfaya yönlendir
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
