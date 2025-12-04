'use client';

import { Suspense, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/UserContext';
import QuizGame from '@/components/games/QuizGame';
import InstallPWA from '@/components/common/InstallPWA';

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, currentUser } = useAuth();
  const customerCode = searchParams.get('code') || 'global';
  const roomId = searchParams.get('room') || searchParams.get('roomId') || undefined;

  // Menüye geri dön - Her zaman push kullan (back() modal'ı tekrar açar)
  const goBackToMenu = useCallback(() => {
    if (customerCode && customerCode !== 'global') {
      router.push(`/${customerCode}`);
    } else {
      router.push('/');
    }
  }, [customerCode, router]);

  // Sayfa yüklendiğinde scroll'u engelle
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Loading durumunda bekle
  if (isLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#1a1a2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '24px',
        zIndex: 9999
      }}>
        Yükleniyor...
      </div>
    );
  }

  // Giriş yapmamış kullanıcılar için
  if (!isAuthenticated) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        textAlign: 'center',
        zIndex: 9999
      }}>
        <div style={{ fontSize: '80px', marginBottom: '20px' }}>📚</div>
        <h2 style={{ color: '#fff', fontSize: '24px', marginBottom: '12px', fontWeight: 600 }}>
          Quiz Oyunu
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', marginBottom: '30px', maxWidth: '300px', lineHeight: 1.5 }}>
          Bu oyunu oynamak için giriş yapmanız gerekmektedir.
        </p>
        <button
          onClick={goBackToMenu}
          style={{
            padding: '15px 40px',
            fontSize: '18px',
            fontWeight: 600,
            color: '#fff',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
          }}
        >
          Menüye Dön ve Giriş Yap
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#1a1a2e',
      zIndex: 9999
    }}>
      <QuizGame
        customerCode={customerCode}
        joinRoomId={roomId}
        onBack={goBackToMenu}
        currentUser={currentUser}
      />
      <InstallPWA />
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#1a1a2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '24px',
        zIndex: 9999
      }}>
        Yükleniyor...
      </div>
    }>
      <QuizContent />
    </Suspense>
  );
}
