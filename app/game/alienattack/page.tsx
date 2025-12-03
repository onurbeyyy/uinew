'use client';

import { Suspense, useEffect, useCallback, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/UserContext';

function AlienAttackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, currentUser } = useAuth();
  const customerCode = searchParams.get('code') || '';
  const scoreSubmittedRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Müşteri menüsüne geri dön
  const goBackToMenu = useCallback(() => {
    if (customerCode) {
      router.push(`/${customerCode}`);
    } else {
      router.back();
    }
  }, [customerCode, router]);

  // Skoru API'ye gönder
  const submitScore = useCallback(async (score: number, aliensKilled: number) => {
    if (scoreSubmittedRef.current) return;
    if (score <= 0) return; // Geçersiz skor gönderme

    scoreSubmittedRef.current = true;

    try {
      // Giriş yapmış kullanıcı varsa adını al, yoksa "Misafir" kullan
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = currentUser as any;
      const nickname = isAuthenticated && user
        ? (user?.nickName || user?.nickname || user?.firstName || 'Player')
        : 'Misafir';

      console.log('[AlienAttack] Skor gönderiliyor - Nick:', nickname, 'Score:', score, 'Aliens:', aliensKilled);

      const response = await fetch('/api/game/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          GameType: 'AlienAttack',
          PlayerNickname: nickname,
          Score: score,
          GameData: JSON.stringify({ aliensKilled }),
          VenueCode: customerCode || undefined
        })
      });

      if (response.ok) {
        console.log('[AlienAttack] Skor başarıyla gönderildi:', score);
      } else {
        const errorText = await response.text();
        console.error('[AlienAttack] Skor gönderilemedi:', response.status, errorText);
      }
    } catch (error) {
      console.error('[AlienAttack] Skor gönderme hatası:', error);
    }
  }, [isAuthenticated, currentUser, customerCode]);

  // Leaderboard verisi getir
  const fetchLeaderboard = useCallback(async (playerScore: number) => {
    try {
      // Daha fazla veri çek, sonra filtrele
      const response = await fetch('/api/game/leaderboard/AlienAttack/50');
      if (response.ok) {
        const data = await response.json();

        // Her kullanıcının sadece en yüksek skorunu al
        const uniquePlayers = new Map<string, typeof data[0]>();
        for (const entry of data) {
          const nickname = entry.playerNickname || 'Misafir';
          const existing = uniquePlayers.get(nickname);
          if (!existing || entry.score > existing.score) {
            uniquePlayers.set(nickname, entry);
          }
        }

        // Map'ten array'e çevir, skora göre sırala, ilk 5'i al
        const filteredData = Array.from(uniquePlayers.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map((entry, index) => ({ ...entry, rank: index + 1 }));

        console.log('[AlienAttack] Leaderboard alındı (filtrelenmiş):', filteredData);

        // iframe'e gönder
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            type: 'alienAttackLeaderboardData',
            leaderboard: filteredData,
            playerScore: playerScore
          }, '*');
        }
      }
    } catch (error) {
      console.error('[AlienAttack] Leaderboard hatası:', error);
    }
  }, []);

  // Tam ekran fonksiyonu
  const requestFullscreen = useCallback(async () => {
    if (!containerRef.current || document.fullscreenElement) return;

    try {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);

      // Ekranı yatay modda kilitle
      if (screen.orientation && (screen.orientation as any).lock) {
        try {
          await (screen.orientation as any).lock('landscape');
        } catch (e) {
          // Desteklenmeyebilir
        }
      }
    } catch (err) {
      console.log('Tam ekran açılamadı');
    }
  }, []);

  // Sayfa açılınca otomatik tam ekran dene
  useEffect(() => {
    // Mobil cihazda otomatik tam ekran
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isMobile) {
      // Kullanıcı etkileşimi gerektiği için bir dokunuşta tam ekran aç
      const handleFirstTouch = () => {
        requestFullscreen();
        document.removeEventListener('touchstart', handleFirstTouch);
      };
      document.addEventListener('touchstart', handleFirstTouch, { once: true });

      return () => {
        document.removeEventListener('touchstart', handleFirstTouch);
      };
    }
  }, [requestFullscreen]);

  // Yatay mod algılama
  useEffect(() => {
    const handleOrientationChange = () => {
      const isLandscape = window.matchMedia("(orientation: landscape)").matches;
      const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

      if (isLandscape && isMobile && !document.fullscreenElement) {
        requestFullscreen();
      }
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    const mediaQuery = window.matchMedia("(orientation: landscape)");
    mediaQuery.addEventListener('change', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      mediaQuery.removeEventListener('change', handleOrientationChange);
    };
  }, [requestFullscreen]);

  // Fullscreen değişikliğini dinle
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // iframe'den gelen mesajları dinle
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Geri mesajı
      if (event.data === 'alienattack-back') {
        // Fullscreen'den çık
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        goBackToMenu();
        return;
      }

      // Game Over mesajı
      if (event.data && typeof event.data === 'object' && event.data.type === 'alienAttackGameOver') {
        console.log('[AlienAttack] Game Over mesajı alındı:', event.data);
        submitScore(event.data.score || 0, event.data.aliensKilled || 0);
      }

      // Leaderboard isteği
      if (event.data && typeof event.data === 'object' && event.data.type === 'alienAttackGetLeaderboard') {
        console.log('[AlienAttack] Leaderboard isteği alındı');
        fetchLeaderboard(event.data.score || 0);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [goBackToMenu, submitScore, fetchLeaderboard]);

  // Sayfa yüklendiğinde
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
        backgroundColor: '#000',
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

  return (
    <div
      ref={containerRef}
      onClick={requestFullscreen}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        zIndex: 9999
      }}
    >
      <iframe
        ref={iframeRef}
        src="/games/alienattack/index.html"
        style={{
          width: '100%',
          height: '100%',
          border: 'none'
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
        allowFullScreen
      />
      {/* Tam ekran butonu - sadece tam ekran değilse göster */}
      {!isFullscreen && (
        <button
          onClick={requestFullscreen}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '10px 15px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: '#fff',
            border: '2px solid #fff',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
            zIndex: 10000
          }}
        >
          ⛶ Tam Ekran
        </button>
      )}
    </div>
  );
}

export default function AlienAttackPage() {
  return (
    <Suspense fallback={
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
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
      <AlienAttackContent />
    </Suspense>
  );
}
