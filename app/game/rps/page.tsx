'use client';

import { Suspense, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RockPaperScissors from '@/components/games/RockPaperScissors';
import InstallPWA from '@/components/common/InstallPWA';

function RPSContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerCode = searchParams.get('code') || 'global';
  const roomId = searchParams.get('roomId') || searchParams.get('room') || undefined;
  const playWithBot = searchParams.get('bot') === 'true';
  const botName = searchParams.get('botName') || undefined;

  // Menüye geri dön
  const goBackToMenu = useCallback(() => {
    if (customerCode && customerCode !== 'global') {
      router.push(`/${customerCode}`);
    } else {
      router.back();
    }
  }, [customerCode, router]);

  // Sayfa yüklendiğinde scroll'u engelle
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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
      <RockPaperScissors
        customerCode={customerCode}
        joinRoomId={roomId}
        onBack={goBackToMenu}
        playWithBot={playWithBot}
        botName={botName}
      />
      <InstallPWA />
    </div>
  );
}

export default function RPSPage() {
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
      <RPSContent />
    </Suspense>
  );
}
