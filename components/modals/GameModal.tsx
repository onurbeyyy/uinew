'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMenu } from '@/contexts/MenuContext';
import { useAuth } from '@/contexts/UserContext';
import Game2048 from '@/components/games/Game2048';
import GameLobby from '@/components/games/GameLobby';

export default function GameModal() {
  const {
    isGameModalOpen,
    selectedGame,
    activeGame,
    setActiveGame,
    closeGameModal,
    customerCode,
    openProfile,
  } = useMenu();
  const { currentUser, isAuthenticated } = useAuth();
  const router = useRouter();

  // Giriş yapmış kullanıcının nickname'ini otomatik al
  const userNickname = useMemo(() => {
    return currentUser?.nickName || currentUser?.nickname || currentUser?.firstName || '';
  }, [currentUser?.nickName, currentUser?.nickname, currentUser?.firstName]);

  const [isClosing, setIsClosing] = useState(false);
  const [pendingJoinRoom, setPendingJoinRoom] = useState<{ roomId: string; gameType: string } | null>(null);

  useEffect(() => {
    if (isGameModalOpen) {
      setActiveGame(selectedGame);
      setIsClosing(false);

      // Arka plan scroll'unu engelle
      document.body.style.overflow = 'hidden';
    } else {
      // Modal kapandığında scroll'u geri aç
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isGameModalOpen, selectedGame]);

  // ESC tuşu ile kapatma
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isGameModalOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isGameModalOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      closeGameModal();
      setIsClosing(false);
    }, 300);
  };

  const handleGameSelect = (game: '2048' | 'rps' | 'quiz' | 'ludo' | 'alienattack' | 'backgammon') => {
    // 2048 ve Alien Attack giriş gerektirmez, diğer oyunlar için giriş gerekli
    if (game !== '2048' && game !== 'alienattack' && !isAuthenticated) {
      alert('Bu oyunu oynamak için giriş yapmanız gerekmektedir.');
      handleLoginClick();
      return;
    }

    // Ludo yeni sayfada açılsın
    if (game === 'ludo') {
      closeGameModal();
      const url = customerCode ? `/game/ludo?code=${customerCode}` : '/game/ludo';
      router.push(url);
      return;
    }

    // Quiz yeni sayfada açılsın
    if (game === 'quiz') {
      closeGameModal();
      const url = customerCode ? `/game/quiz?code=${customerCode}` : '/game/quiz';
      router.push(url);
      return;
    }

    // Alien Attack yeni sayfada açılsın
    if (game === 'alienattack') {
      closeGameModal();
      const url = customerCode ? `/game/alienattack?code=${customerCode}` : '/game/alienattack';
      router.push(url);
      return;
    }

    // RPS yeni sayfada açılsın
    if (game === 'rps') {
      closeGameModal();
      const url = customerCode ? `/game/rps?code=${customerCode}` : '/game/rps';
      router.push(url);
      return;
    }

    // Tavla yeni sayfada açılsın
    if (game === 'backgammon') {
      closeGameModal();
      const url = customerCode ? `/game/backgammon?code=${customerCode}` : '/game/backgammon';
      router.push(url);
      return;
    }

    setActiveGame(game);
  };

  const handleBackToSelection = () => {
    setActiveGame(null);
    setPendingJoinRoom(null);
  };

  // Lobby'den oyuna katılma (tüm lobby oyunları multiplayer, giriş gerekli)
  const handleJoinFromLobby = (roomId: string, gameType: string, hostName?: string) => {
    // Lobby'den katılım için giriş gerekli
    if (!isAuthenticated) {
      alert('Oyuna katılmak için giriş yapmanız gerekmektedir.');
      handleLoginClick();
      return;
    }

    // Ludo için yeni sayfaya yönlendir
    if (gameType === 'Ludo' || gameType === 'ludo') {
      closeGameModal();
      let url = `/game/ludo?room=${roomId}`;
      if (customerCode) url += `&code=${customerCode}`;
      router.push(url);
      return;
    }

    // Quiz için yeni sayfaya yönlendir
    if (gameType === 'Quiz' || gameType === 'quiz') {
      closeGameModal();
      let url = `/game/quiz?room=${roomId}`;
      if (customerCode) url += `&code=${customerCode}`;
      router.push(url);
      return;
    }

    // RPS için yeni sayfaya yönlendir
    if (gameType === 'RockPaperScissors' || gameType === 'rockpaperscissors' || gameType === 'rps') {
      closeGameModal();
      // Bot odası mı kontrol et
      if (roomId === 'bot-rps-room') {
        // Lobby'den bot ismini al (fake room'daki host ismi)
        let url = `/game/rps?bot=true`;
        if (hostName) url += `&botName=${encodeURIComponent(hostName)}`;
        if (customerCode) url += `&code=${customerCode}`;
        router.push(url);
      } else {
        let url = `/game/rps?room=${roomId}`;
        if (customerCode) url += `&code=${customerCode}`;
        router.push(url);
      }
      return;
    }

    // Tavla için yeni sayfaya yönlendir
    if (gameType === 'Backgammon' || gameType === 'backgammon') {
      closeGameModal();
      let url = `/game/backgammon?room=${roomId}`;
      if (customerCode) url += `&code=${customerCode}`;
      router.push(url);
      return;
    }

    setPendingJoinRoom({ roomId, gameType });
    const gameMap: Record<string, '2048' | 'rps' | 'quiz' | 'ludo'> = {
      'rockpaperscissors': 'rps',
      'RockPaperScissors': 'rps',
      'rps': 'rps',
      '2048': '2048'
    };
    const mappedGame = gameMap[gameType];
    if (mappedGame) setActiveGame(mappedGame);
  };

  // Giriş yapmamış kullanıcılar için giriş ekranı
  const handleLoginClick = () => {
    closeGameModal();
    openProfile();
  };

  return (
    <>
      {/* Modal Container */}
      <div
        className={`game-modal-container ${isGameModalOpen ? 'show' : ''} ${isClosing ? 'closing' : ''}`}
      >
        {/* Close Button */}
        <button className="game-modal-close-btn" onClick={handleClose}>
          ×
        </button>

        {/* Game Selection with Inline Lobby - Herkese açık */}
        {!activeGame && (
          <div style={{
            width: '100%',
            height: '100vh',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header & Games */}
            <div style={{ flexShrink: 0, padding: '4px 8px' }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '5px' }}>
                <h2 style={{ fontSize: '14px', color: '#fff', margin: 0 }}>🎮 Oyunlar</h2>
              </div>

              {/* 3'lü Oyun Grid - 2 Satır */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '5px',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <button
                  className="game-card-btn"
                  onClick={() => handleGameSelect('2048')}
                  style={{ minWidth: 0, width: '100%', minHeight: '50px', padding: '6px 4px' }}
                >
                  <i className="game-icon" style={{ fontSize: '20px' }}>🔢</i>
                  <h3 style={{ fontSize: '9px', margin: '3px 0 1px' }}>2048</h3>
                  <p className="player-count" style={{ fontSize: '7px', margin: 0 }}>(1 kişi)</p>
                </button>

                <button
                  className="game-card-btn alien-attack-card"
                  onClick={() => handleGameSelect('alienattack')}
                  style={{ minWidth: 0, width: '100%', minHeight: '50px', padding: '6px 4px' }}
                >
                  <i className="game-icon" style={{ fontSize: '20px' }}>👽</i>
                  <h3 style={{ fontSize: '9px', margin: '3px 0 1px' }}>Alien Attack</h3>
                  <p className="player-count" style={{ fontSize: '7px', margin: 0 }}>(1 kişi)</p>
                </button>

                <button
                  className="game-card-btn"
                  onClick={() => handleGameSelect('rps')}
                  style={{ minWidth: 0, width: '100%', minHeight: '50px', padding: '6px 4px', position: 'relative' }}
                >
                  {!isAuthenticated && <div style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', borderRadius: '50%', width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6 }}>🔒</div>}
                  <i className="game-icon" style={{ fontSize: '20px' }}>✊</i>
                  <h3 style={{ fontSize: '8px', margin: '3px 0 1px' }}>Taş Kağıt Makas</h3>
                  <p className="player-count" style={{ fontSize: '7px', margin: 0 }}>(2 kişi)</p>
                </button>

                <button
                  className="game-card-btn"
                  onClick={() => handleGameSelect('quiz')}
                  style={{ minWidth: 0, width: '100%', minHeight: '50px', padding: '6px 4px', position: 'relative' }}
                >
                  {!isAuthenticated && <div style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', borderRadius: '50%', width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6 }}>🔒</div>}
                  <i className="game-icon" style={{ fontSize: '20px' }}>📚</i>
                  <h3 style={{ fontSize: '8px', margin: '3px 0 1px' }}>Bilgi Yarışması</h3>
                  <p className="player-count" style={{ fontSize: '7px', margin: 0 }}>(2-8 kişi)</p>
                </button>

                <button
                  className="game-card-btn ludo-card"
                  onClick={() => handleGameSelect('ludo')}
                  style={{ minWidth: 0, width: '100%', minHeight: '50px', padding: '6px 4px', position: 'relative' }}
                >
                  {!isAuthenticated && <div style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', borderRadius: '50%', width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6 }}>🔒</div>}
                  <i className="game-icon" style={{ fontSize: '20px' }}>🎯</i>
                  <h3 style={{ fontSize: '9px', margin: '3px 0 1px' }}>Ludo</h3>
                  <p className="player-count" style={{ fontSize: '7px', margin: 0 }}>(2-4 kişi)</p>
                </button>

                <button
                  className="game-card-btn"
                  onClick={() => handleGameSelect('backgammon')}
                  style={{ minWidth: 0, width: '100%', minHeight: '50px', padding: '6px 4px', position: 'relative' }}
                >
                  {!isAuthenticated && <div style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', borderRadius: '50%', width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6 }}>🔒</div>}
                  <i className="game-icon" style={{ fontSize: '20px' }}>🎲</i>
                  <h3 style={{ fontSize: '9px', margin: '3px 0 1px' }}>Tavla</h3>
                  <p className="player-count" style={{ fontSize: '7px', margin: 0 }}>(2 kişi)</p>
                </button>
              </div>
            </div>

            {/* Inline Lobby - Her zaman görünür */}
            <div style={{ flex: 1, minHeight: '300px', background: 'rgba(0,0,0,0.3)' }}>
              <GameLobby
                onJoinGame={handleJoinFromLobby}
                onBack={() => {}}
                inline={true}
                customerCode={customerCode || undefined}
                currentUserId={currentUser?.id?.toString() || currentUser?.endUserId?.toString()}
              />
            </div>
          </div>
        )}

        {/* Active Game - 2048 herkese açık, diğerleri handleGameSelect'te kontrol ediliyor */}
        {activeGame && (
          <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Back to selection button - Sadece kendi geri butonu olmayan oyunlar için */}
            {activeGame && (
              <button
                onClick={handleBackToSelection}
                style={{
                  width: '100%',
                  padding: '15px 20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.3s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                }}
              >
                <span>←</span>
                <span>Oyun Seçimine Dön</span>
              </button>
            )}

            {/* Game Component */}
            {activeGame === '2048' && (
              <div style={{ width: '100%', flex: 1, overflow: 'auto', padding: '10px 20px' }}>
                <Game2048
                  onGameOver={() => {}}
                  onGameWon={() => {}}
                  playerNickname={userNickname}
                  customerCode={customerCode || undefined}
                />
              </div>
            )}
            {/* RPS, Quiz, Ludo ve Alien Attack artık ayrı sayfalarda açılıyor */}
          </div>
        )}
      </div>
    </>
  );
}
