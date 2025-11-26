'use client';

import { useEffect, useState } from 'react';
import { useMenu } from '@/contexts/MenuContext';
import { useAuth } from '@/contexts/UserContext';
import Game2048 from '@/components/games/Game2048';
import RockPaperScissors from '@/components/games/RockPaperScissors';
import Quiz from '@/components/games/Quiz';

export default function GameModal() {
  const {
    isGameModalOpen,
    selectedGame,
    activeGame,
    setActiveGame,
    closeGameModal,
    customerCode,
  } = useMenu();
  const { currentUser } = useAuth();

  const [playerNickname, setPlayerNickname] = useState('');
  const [isClosing, setIsClosing] = useState(false);

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

  const handleGameSelect = (game: '2048' | 'rps' | 'quiz') => {
    setActiveGame(game);
  };

  const handleBackToSelection = () => {
    setActiveGame(null);
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

        {/* Game Selection */}
        {!activeGame && (
          <div className="games-container">
            {/* Header */}
            <div className="games-header">
              <h2>🎮 Oyunlar</h2>
              <p>Bu mekandaki oyuncularla eşleş!</p>
              <small>Sadece bu mekan müşterilerine özel!</small>
            </div>

            {/* 3'lü Oyun Grid */}
            <div className="games-grid">
              <button className="game-card-btn" onClick={() => handleGameSelect('2048')}>
                <i className="game-icon">🔢</i>
                <h3>2048</h3>
                <p className="player-count">(Tek kişilik)</p>
              </button>

              <button className="game-card-btn" onClick={() => handleGameSelect('rps')}>
                <i className="game-icon">✊</i>
                <h3>Taş Kağıt Makas</h3>
                <p className="player-count">(2-4 kişilik)</p>
              </button>

              <button
                className="game-card-btn"
                onClick={() => {
                  // ========================================
                  // 🔧 TEST MODU: Giriş kontrolü devre dışı
                  // ========================================
                  // const userNickname = currentUser?.nickName || currentUser?.nickname;
                  // if (!userNickname) {
                  //   const onay = confirm('Quiz oluşturmak için giriş yapmalısınız. Profilim sayfasına gitmek ister misiniz?');
                  //   if (onay) {
                  //     closeGameModal();
                  //     openProfile();
                  //   }
                  //   return;
                  // }
                  // ========================================
                  handleGameSelect('quiz');
                }}
                style={{ position: 'relative' }}
              >
                <i className="game-icon">📚</i>
                <h3>Bilgi Yarışması</h3>
                <p className="player-count">(2-8 kişilik)</p>
                {/* TEST MODU: Lock icon gizli */}
                {/* {!(currentUser?.nickName || currentUser?.nickname) && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    fontSize: '16px'
                  }}>🔒</div>
                )} */}
              </button>
            </div>
          </div>
        )}

        {/* Active Game */}
        {activeGame && (
          <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Back to selection button */}
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

            {/* Game Component */}
            {activeGame === '2048' && (
              <div style={{ width: '100%', flex: 1, overflow: 'auto', padding: '10px 20px' }}>
                <Game2048
                  onGameOver={() => {}}
                  onGameWon={() => {}}
                  playerNickname={playerNickname}
                  customerCode={customerCode || undefined}
                />
              </div>
            )}
            {activeGame === 'rps' && (
              <div style={{ width: '100%', flex: 1, overflow: 'auto', padding: '10px 20px' }}>
                <RockPaperScissors
                  onClose={handleBackToSelection}
                  playerNickname={playerNickname}
                  customerCode={customerCode || undefined}
                />
              </div>
            )}
            {activeGame === 'quiz' && (
              <div style={{ width: '100%', flex: 1, overflow: 'auto', padding: '10px 20px' }}>
                <Quiz
                  onClose={handleBackToSelection}
                  currentUser={currentUser}
                  customerCode={customerCode || undefined}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
