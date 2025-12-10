'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      const code = searchParams.get('code');
      const table = searchParams.get('table');
      const sessionId = searchParams.get('session');

      if (!token) {
        setStatus('error');
        setMessage('Geçersiz doğrulama linki');
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://apicanlimenu.online';
        const response = await fetch(
          `${apiUrl}/api/EndUser/verify-email?token=${encodeURIComponent(token)}`,
          { method: 'GET' }
        );

        const data = await response.json();

        if (data.success) {
          // Kullanıcı bilgilerini localStorage'a kaydet
          if (data.token && data.user) {
            localStorage.setItem('global_userToken', data.token);
            localStorage.setItem('global_userData', JSON.stringify(data.user));
            localStorage.setItem('lastLoginTime', Date.now().toString());
          }
          localStorage.setItem('menupark_emailVerified', 'true');

          setStatus('success');

          // Countdown başlat
          let count = 3;
          const interval = setInterval(() => {
            count--;
            setCountdown(count);
            if (count <= 0) {
              clearInterval(interval);

              const finalCode = data.customerCode || code;
              const finalTable = data.tableCode || table;

              if (sessionId) {
                let redirectUrl = `/?session=${sessionId}`;
                if (finalCode) redirectUrl += `&code=${finalCode}`;
                router.push(redirectUrl);
              } else if (finalCode) {
                let redirectUrl = `/?code=${finalCode}`;
                if (finalTable) redirectUrl += `&table=${finalTable}`;
                router.push(redirectUrl);
              } else {
                router.push('/');
              }
            }
          }, 1000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Doğrulama başarısız');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="verify-email-page">
      {/* Animated Background */}
      <div className="verify-bg">
        <div className="verify-bg-gradient"></div>
        <div className="verify-bg-circles">
          <div className="circle circle-1"></div>
          <div className="circle circle-2"></div>
          <div className="circle circle-3"></div>
        </div>
      </div>

      {/* Content Card */}
      <div className="verify-card">
        {status === 'loading' && (
          <div className="verify-content">
            <div className="verify-icon-wrapper loading">
              <div className="verify-spinner">
                <svg viewBox="0 0 50 50">
                  <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle>
                </svg>
              </div>
              <div className="verify-icon-bg"></div>
            </div>
            <h1 className="verify-title">Email Doğrulanıyor</h1>
            <p className="verify-subtitle">Hesabınız aktifleştiriliyor, lütfen bekleyin...</p>
            <div className="verify-progress">
              <div className="verify-progress-bar"></div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="verify-content success">
            <div className="verify-icon-wrapper success">
              <svg className="verify-checkmark" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
              <div className="verify-confetti">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className={`confetti-piece confetti-${i + 1}`}></div>
                ))}
              </div>
            </div>
            <h1 className="verify-title">Hesabınız Doğrulandı!</h1>
            <p className="verify-subtitle">Email adresiniz başarıyla onaylandı</p>

            <div className="verify-features">
              <div className="verify-feature">
                <span className="feature-icon">🍽️</span>
                <span>Sipariş verebilirsiniz</span>
              </div>
              <div className="verify-feature">
                <span className="feature-icon">🎮</span>
                <span>Oyunlara katılabilirsiniz</span>
              </div>
              <div className="verify-feature">
                <span className="feature-icon">🎁</span>
                <span>Puan kazanabilirsiniz</span>
              </div>
            </div>

            <div className="verify-redirect">
              <div className="redirect-text">
                <span className="redirect-countdown">{countdown}</span>
                <span>saniye içinde menüye yönlendiriliyorsunuz</span>
              </div>
              <div className="redirect-progress">
                <div className="redirect-progress-bar" style={{ width: `${((3 - countdown) / 3) * 100}%` }}></div>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="verify-content error">
            <div className="verify-icon-wrapper error">
              <svg className="verify-error-icon" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="25" fill="none"/>
                <path d="M16 16 L36 36 M36 16 L16 36" fill="none"/>
              </svg>
            </div>
            <h1 className="verify-title">Doğrulama Başarısız</h1>
            <p className="verify-subtitle">{message}</p>
            <button className="verify-btn" onClick={() => router.push('/')}>
              <span>Ana Sayfaya Dön</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .verify-email-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        .verify-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
        }

        .verify-bg-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        }

        .verify-bg-circles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .circle {
          position: absolute;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(255, 193, 7, 0.1));
          animation: float 20s infinite ease-in-out;
        }

        .circle-1 {
          width: 400px;
          height: 400px;
          top: -100px;
          right: -100px;
          animation-delay: 0s;
        }

        .circle-2 {
          width: 300px;
          height: 300px;
          bottom: -50px;
          left: -50px;
          animation-delay: -5s;
        }

        .circle-3 {
          width: 200px;
          height: 200px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: -10s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -20px) scale(1.05); }
          50% { transform: translate(-10px, 10px) scale(0.95); }
          75% { transform: translate(-20px, -10px) scale(1.02); }
        }

        .verify-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
          padding: 48px 36px;
          animation: cardAppear 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes cardAppear {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .verify-content {
          text-align: center;
        }

        .verify-icon-wrapper {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 0 auto 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .verify-icon-wrapper.loading .verify-icon-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(255, 193, 7, 0.2));
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }

        .verify-spinner {
          width: 80px;
          height: 80px;
          position: relative;
          z-index: 1;
        }

        .verify-spinner svg {
          width: 100%;
          height: 100%;
          animation: rotate 1.5s linear infinite;
        }

        .verify-spinner circle {
          stroke: url(#spinner-gradient);
          stroke-linecap: round;
          stroke-dasharray: 90, 150;
          stroke-dashoffset: 0;
          animation: dash 1.5s ease-in-out infinite;
        }

        @keyframes rotate {
          100% { transform: rotate(360deg); }
        }

        @keyframes dash {
          0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
          50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
          100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
        }

        .verify-checkmark {
          width: 100px;
          height: 100px;
        }

        .checkmark-circle {
          stroke: #22c55e;
          stroke-width: 2;
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
        }

        .checkmark-check {
          stroke: #22c55e;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.4s forwards;
        }

        @keyframes stroke {
          100% { stroke-dashoffset: 0; }
        }

        .verify-confetti {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #ff6b35;
          top: 50%;
          left: 50%;
          opacity: 0;
          animation: confetti 1s ease-out forwards;
        }

        .confetti-1 { animation-delay: 0.1s; background: #ff6b35; }
        .confetti-2 { animation-delay: 0.15s; background: #ffc107; }
        .confetti-3 { animation-delay: 0.2s; background: #22c55e; }
        .confetti-4 { animation-delay: 0.25s; background: #3b82f6; }
        .confetti-5 { animation-delay: 0.3s; background: #a855f7; }
        .confetti-6 { animation-delay: 0.35s; background: #ec4899; }
        .confetti-7 { animation-delay: 0.4s; background: #ff6b35; }
        .confetti-8 { animation-delay: 0.45s; background: #ffc107; }
        .confetti-9 { animation-delay: 0.5s; background: #22c55e; }
        .confetti-10 { animation-delay: 0.55s; background: #3b82f6; }
        .confetti-11 { animation-delay: 0.6s; background: #a855f7; }
        .confetti-12 { animation-delay: 0.65s; background: #ec4899; }

        @keyframes confetti {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translate(
              calc(-50% + var(--x, 0px)),
              calc(-50% + var(--y, 0px))
            ) rotate(720deg);
          }
        }

        .confetti-1 { --x: -80px; --y: -60px; border-radius: 50%; }
        .confetti-2 { --x: 70px; --y: -70px; border-radius: 2px; }
        .confetti-3 { --x: -60px; --y: 50px; border-radius: 50%; }
        .confetti-4 { --x: 80px; --y: 40px; border-radius: 2px; }
        .confetti-5 { --x: -40px; --y: -80px; border-radius: 50%; }
        .confetti-6 { --x: 50px; --y: -50px; border-radius: 2px; }
        .confetti-7 { --x: -70px; --y: 30px; border-radius: 50%; }
        .confetti-8 { --x: 60px; --y: 60px; border-radius: 2px; }
        .confetti-9 { --x: -30px; --y: 70px; border-radius: 50%; }
        .confetti-10 { --x: 40px; --y: -40px; border-radius: 2px; }
        .confetti-11 { --x: -50px; --y: -40px; border-radius: 50%; }
        .confetti-12 { --x: 30px; --y: 80px; border-radius: 2px; }

        .verify-error-icon {
          width: 100px;
          height: 100px;
        }

        .verify-error-icon circle {
          stroke: #ef4444;
          stroke-width: 2;
          fill: rgba(239, 68, 68, 0.1);
        }

        .verify-error-icon path {
          stroke: #ef4444;
          stroke-width: 3;
          stroke-linecap: round;
        }

        .verify-title {
          font-size: 28px;
          font-weight: 700;
          color: white;
          margin: 0 0 12px;
          letter-spacing: -0.5px;
        }

        .verify-subtitle {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.6);
          margin: 0 0 32px;
          line-height: 1.5;
        }

        .verify-progress {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .verify-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #ff6b35, #ffc107);
          border-radius: 2px;
          animation: progress 2s ease-in-out infinite;
        }

        @keyframes progress {
          0% { width: 0%; margin-left: 0; }
          50% { width: 70%; margin-left: 15%; }
          100% { width: 0%; margin-left: 100%; }
        }

        .verify-features {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 32px;
        }

        .verify-feature {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.9);
          font-size: 15px;
          animation: featureAppear 0.5s ease forwards;
          opacity: 0;
          transform: translateX(-20px);
        }

        .verify-feature:nth-child(1) { animation-delay: 0.3s; }
        .verify-feature:nth-child(2) { animation-delay: 0.4s; }
        .verify-feature:nth-child(3) { animation-delay: 0.5s; }

        @keyframes featureAppear {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .feature-icon {
          font-size: 20px;
        }

        .verify-redirect {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 14px;
          padding: 16px;
        }

        .redirect-text {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px;
          margin-bottom: 12px;
        }

        .redirect-countdown {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: #22c55e;
          color: white;
          font-weight: 700;
          border-radius: 50%;
          font-size: 14px;
        }

        .redirect-progress {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .redirect-progress-bar {
          height: 100%;
          background: #22c55e;
          border-radius: 2px;
          transition: width 1s linear;
        }

        .verify-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 16px 32px;
          background: linear-gradient(135deg, #ff6b35, #f7931e);
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .verify-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(255, 107, 53, 0.4);
        }
      `}</style>

      {/* SVG Gradient Definition */}
      <svg width="0" height="0">
        <defs>
          <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff6b35" />
            <stop offset="100%" stopColor="#ffc107" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        border: '3px solid rgba(255,255,255,0.1)',
        borderTopColor: '#ff6b35',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
