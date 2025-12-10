'use client';

import { useState, useEffect, useRef } from 'react';
import { submitScore } from '@/lib/gameApi';

interface AlienAttackGameProps {
  onBack?: () => void;
  playerNickname?: string;
  customerCode?: string;
}

export default function AlienAttackGame({ onBack, playerNickname, customerCode }: AlienAttackGameProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameStartTimeRef = useRef<number>(0);
  const scoreSubmittedRef = useRef(false);

  // iOS kontrolü
  useEffect(() => {
    const iOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIOS(iOS);
  }, []);

  // Oyun yüklendiğinde loading'i kapat ve başlangıç zamanını kaydet
  const handleIframeLoad = () => {
    setIsLoading(false);
    gameStartTimeRef.current = Date.now();
    scoreSubmittedRef.current = false;
  };

  // iframe'den gelen mesajları dinle (oyun bitişi için)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Güvenlik kontrolü - sadece kendi iframe'imizden gelen mesajları kabul et
      if (event.data && event.data.type === 'alienAttackGameOver' && !scoreSubmittedRef.current) {
        scoreSubmittedRef.current = true;

        const { score, level, aliensKilled } = event.data;
        const gameDuration = Math.round((Date.now() - gameStartTimeRef.current) / 1000);

        try {
          await submitScore({
            GameType: 'AlienAttack',
            PlayerNickname: playerNickname || 'Oyuncu',
            Score: score || 0,
            VenueCode: customerCode || 'demo',
            DeviceType: typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
            Duration: gameDuration,
            GameData: JSON.stringify({
              level: level || 1,
              aliensKilled: aliensKilled || 0
            })
          });
        } catch (error) {
          console.error('[AlienAttack] Failed to submit score:', error);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [playerNickname, customerCode]);

  // Tam ekran toggle - iOS için CSS tabanlı fallback
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isFullscreen) {
      // Tam ekrandan çık
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else if ((document as any).webkitFullscreenElement) {
          await (document as any).webkitExitFullscreen();
        }
      } catch (err) {
        // iOS'ta API çalışmaz, sadece state değiştir
      }
      setIsFullscreen(false);
    } else {
      // Tam ekrana geç
      try {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
          setIsFullscreen(true);
        } else {
          // iOS Safari - CSS ile simüle et
          setIsFullscreen(true);
        }
      } catch (err) {
        // Fullscreen API başarısız - CSS ile simüle et
        setIsFullscreen(true);
      }
    }
  };

  // Tam ekran değişikliğini dinle
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Yatay mod algılama - otomatik tam ekran
  useEffect(() => {
    const handleOrientationChange = async () => {
      if (!containerRef.current) return;

      // Yatay mod kontrolü
      const isLandscape = window.matchMedia("(orientation: landscape)").matches;
      const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

      if (isLandscape && isMobile && !document.fullscreenElement) {
        try {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);

          // Ekranı yatay modda kilitle (destekleniyorsa)
          if (screen.orientation && (screen.orientation as any).lock) {
            try {
              await (screen.orientation as any).lock('landscape');
            } catch (e) {
              // Bazı tarayıcılar desteklemiyor, devam et
            }
          }
        } catch (err) {
          // Kullanıcı etkileşimi olmadan fullscreen açılamayabilir
        }
      }
    };

    // Orientation change event
    window.addEventListener('orientationchange', handleOrientationChange);

    // Media query listener (daha güvenilir)
    const mediaQuery = window.matchMedia("(orientation: landscape)");
    mediaQuery.addEventListener('change', handleOrientationChange);

    // İlk yüklemede kontrol et
    handleOrientationChange();

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      mediaQuery.removeEventListener('change', handleOrientationChange);
    };
  }, []);

  // 5 saniye sonra kontrolleri gizle
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  return (
    <div
      ref={containerRef}
      className="alien-attack-container"
      onMouseMove={() => setShowControls(true)}
      onTouchStart={() => setShowControls(true)}
    >
      {/* Yükleme Ekranı */}
      {isLoading && (
        <div className="alien-attack-loading">
          <div className="alien-attack-loading-icon">
            <span style={{ fontSize: '64px' }}>👽</span>
          </div>
          <h2>Uzaylı Saldırısı</h2>
          <p>Oyun yükleniyor...</p>
          <div className="alien-attack-loading-bar">
            <div className="alien-attack-loading-progress"></div>
          </div>
        </div>
      )}

      {/* Oyun iframe */}
      <iframe
        ref={iframeRef}
        src="/games/alienattack/index.html"
        className="alien-attack-iframe"
        onLoad={handleIframeLoad}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
        allowFullScreen
      />

      {/* Kontroller */}
      <div className={`alien-attack-controls ${showControls ? 'visible' : ''}`}>
        {/* Üst Bar */}
        <div className="alien-attack-top-bar">
          <button
            onClick={onBack}
            className="alien-attack-btn back-btn"
          >
            <span>←</span>
            <span>Geri</span>
          </button>

          <div className="alien-attack-title">
            <span>👽</span>
            <span>Uzaylı Saldırısı</span>
          </div>

          {!isIOS && (
            <button
              onClick={toggleFullscreen}
              className="alien-attack-btn fullscreen-btn"
            >
              <span>{isFullscreen ? '⛶' : '⛶'}</span>
              <span>{isFullscreen ? 'Küçült' : 'Tam Ekran'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
