'use client';

/**
 * Tavla (Backgammon) Oyunu
 * GitHub: AsadpourMohammad/Backgammon-React projesinden adapte edilmiştir
 * Lobi ve SignalR entegrasyonu bizim yapımızdan alınmıştır
 */

import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/contexts/UserContext';
import { useMenu } from '@/contexts/MenuContext';
import { getGameSignalRService } from '@/lib/canligame/gameSignalR';

// GitHub projesinden import'lar
import Game from './backgammon/logic/models/game';
import ThisTurn from './backgammon/logic/models/this-turn';
import ThisMove from './backgammon/logic/models/this-move';
import { startingGame } from './backgammon/logic/events/start-game';
import { rollingDice } from './backgammon/logic/events/roll-dice';
import { selecting } from './backgammon/logic/events/select';
import { checkCantMove } from './backgammon/logic/calculations/calc-possible-moves';
import BoardTop from './backgammon/frontend/BoardTop';
import BoardBottom from './backgammon/frontend/BoardBottom';

// Styles
import './backgammon/App.css';

// ===============================
// TYPES
// ===============================

type GamePhase = 'lobby' | 'playing' | 'finished';

interface Player {
  id: string;
  name: string;
  color: 'white' | 'black';
  score: number;
  isReady: boolean;
}

interface BackgammonGameProps {
  customerCode: string;
  onBack?: () => void;
}

// ===============================
// MAIN COMPONENT
// ===============================

export default function BackgammonGame({ customerCode, onBack }: BackgammonGameProps) {
  const { currentUser } = useAuth();
  const { pendingJoinRoomId, setPendingJoinRoomId } = useMenu();
  const userNickname = currentUser?.nickName || currentUser?.nickname || `Oyuncu${Math.floor(Math.random() * 1000)}`;

  // Lobby State
  const [gamePhase, setGamePhase] = useState<GamePhase>('lobby');
  const [roomId, setRoomId] = useState<string>('');
  const [playerId] = useState(`player-${Date.now()}`);
  const [playerName] = useState(userNickname);
  const [players, setPlayers] = useState<Player[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);

  // Game State (GitHub projesinden)
  const [game, setGame] = useState(Game.new);
  const [thisTurn, setThisTurn] = useState(ThisTurn.new);
  const [thisMove, setThisMove] = useState(ThisMove.new);

  // Landscape mode kontrolü
  const [isLandscape, setIsLandscape] = useState(false);

  // ===============================
  // LOBBY FUNCTIONS
  // ===============================

  const handleCreateRoom = async () => {
    try {
      const newRoomId = `backgammon-${Date.now()}`;
      const gameSignalRService = getGameSignalRService();

      await gameSignalRService.connect();

      gameSignalRService.onRoomCreated((data) => {
        console.log('✅ RoomCreated event:', data);
        if (data.success && data.room) {
          setRoomId(data.room.id);
          setGamePhase('lobby');
          setPlayers(data.room.players.map((p: any, index: number) => ({
            id: p.id,
            name: p.name,
            color: index === 0 ? 'white' : 'black',
            score: 0,
            isReady: false
          })));
        }
      });

      await gameSignalRService.createRoom(
        newRoomId,
        customerCode,
        playerId,
        playerName,
        {
          GameType: 'backgammon',
          MaxPlayers: 2,
          TotalRounds: 1,
          RoundTimeoutSeconds: 0
        } as any,
        true
      );
    } catch (error) {
      console.error('❌ Oda oluşturma hatası:', error);
      alert('Oda oluşturulamadı. Lütfen tekrar deneyin.');
    }
  };

  const handleJoinRoom = async (roomIdToJoin: string) => {
    try {
      const gameSignalRService = getGameSignalRService();
      await gameSignalRService.connect();
      await gameSignalRService.joinRoom(roomIdToJoin, playerId, playerName);
    } catch (error) {
      console.error('❌ Odaya katılma hatası:', error);
      alert('Odaya katılamadınız. Lütfen tekrar deneyin.');
    }
  };

  const copyRoomLink = async () => {
    const link = `${window.location.origin}?joinBackgammonRoom=${roomId}`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Kopyalama hatası:', err);
    }
  };

  // ===============================
  // GAME FUNCTIONS (GitHub)
  // ===============================

  function startGamePlay() {
    const tempGame = Game.new();
    tempGame.gameOn = true;
    setGame(tempGame);

    const tempThisTurn = startingGame(tempGame.clone());
    setThisTurn(tempThisTurn);

    const tempThisMove = ThisMove.new();
    setThisMove(tempThisMove);

    setGamePhase('playing');
  }

  function rollDice() {
    if (thisTurn.rolledDice) {
      alert(`Önce hamlenizi yapın! ${thisTurn.turnPlayer.icon} 🎲 ${thisTurn.dices} 🎲`);
      return;
    }

    let returnedThisTurn = rollingDice(thisTurn.clone());

    if (returnedThisTurn.rolledDice) {
      returnedThisTurn = checkCantMove(game, returnedThisTurn.clone());
    }

    setThisTurn(returnedThisTurn);
  }

  function select(index: number | string) {
    const [returnedGame, returnedThisTurn, returnedThisMove] = selecting(
      index,
      game.clone(),
      thisTurn.clone(),
      thisMove.clone()
    );

    setGame(returnedGame);
    setThisTurn(returnedThisTurn);
    setThisMove(returnedThisMove);
  }

  // ===============================
  // SIGNALR EVENT HANDLERS
  // ===============================

  useEffect(() => {
    const gameSignalRService = getGameSignalRService();

    gameSignalRService.onPlayerJoined((data) => {
      console.log('👤 Oyuncu katıldı:', data);
      if (data.room && data.room.players) {
        setPlayers(data.room.players.map((p: any, index: number) => ({
          id: p.id,
          name: p.name,
          color: index === 0 ? 'white' : 'black',
          score: 0,
          isReady: false
        })));
      }
    });

    gameSignalRService.onJoinedRoom((data) => {
      console.log('✅ Odaya katıldım:', data);
      if (data.success && data.room) {
        setRoomId(data.room.id);
        setGamePhase('lobby');
        setPlayers(data.room.players.map((p: any, index: number) => ({
          id: p.id,
          name: p.name,
          color: index === 0 ? 'white' : 'black',
          score: 0,
          isReady: false
        })));
      }
    });

    gameSignalRService.onGameStarted((data) => {
      console.log('🎯 GameStarted event:', data);
      startGamePlay();
    });

    gameSignalRService.onError((error) => {
      console.error('❌ SignalR Hatası:', error);
      alert(`Hata: ${error}`);
    });
  }, []);

  useEffect(() => {
    if (pendingJoinRoomId && !roomId) {
      handleJoinRoom(pendingJoinRoomId);
      setPendingJoinRoomId?.(null);
    }
  }, [pendingJoinRoomId, roomId]);

  // Landscape oryantasyon kontrolü
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // ===============================
  // RENDER - LOBBY
  // ===============================

  if (gamePhase === 'lobby') {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: '700', marginBottom: '10px' }}>
            🎲 Tavla Oyunu
          </h1>
          {onBack && (
            <button onClick={onBack} style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              background: 'white',
              color: '#667eea',
              marginTop: '10px'
            }}>
              ← Geri
            </button>
          )}
        </div>

        {!roomId ? (
          <button onClick={handleCreateRoom} style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            background: 'white',
            color: '#667eea'
          }}>
            🎮 Oda Oluştur
          </button>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '600px',
            width: '100%'
          }}>
            <h2 style={{ marginBottom: '20px' }}>Oda: {roomId}</h2>

            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <div style={{
                padding: '15px',
                background: 'white',
                borderRadius: '12px',
                display: 'inline-block',
                marginBottom: '15px'
              }}>
                <QRCodeSVG
                  value={`${window.location.origin}?joinBackgammonRoom=${roomId}`}
                  size={150}
                  level="H"
                />
              </div>
              <button onClick={copyRoomLink} style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                background: 'white',
                color: '#667eea'
              }}>
                {linkCopied ? '✅ Kopyalandı!' : '📋 Linki Kopyala'}
              </button>
            </div>

            <div style={{ margin: '20px 0' }}>
              <h3>Oyuncular ({players.length}/2)</h3>
              {players.map((player) => (
                <div key={player.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  marginBottom: '8px'
                }}>
                  <span style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '18px',
                    background: player.color === 'white' ? 'white' : '#333',
                    color: player.color === 'white' ? '#333' : 'white'
                  }}>
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                  <span>{player.name}</span>
                  <span>({player.color === 'white' ? 'Beyaz' : 'Siyah'})</span>
                </div>
              ))}
            </div>

            {players.length === 2 && (
              <div style={{ textAlign: 'center', color: '#ffd700', fontWeight: '600' }}>
                ⏳ Oyun otomatik olarak başlatılacak...
              </div>
            )}

            {players.length === 1 && (
              <div style={{ textAlign: 'center', fontWeight: '600' }}>
                👥 Arkadaşınızı davet edin!
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ===============================
  // RENDER - GAME BOARD
  // ===============================

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      {/* Ana Container - Oryantasyona göre döner */}
      <div style={{
        width: isLandscape ? '100vw' : '100vh',
        height: isLandscape ? '100vh' : '100vw',
        transform: isLandscape ? 'none' : 'rotate(90deg)',
        transformOrigin: 'center center',
        background: '#0f0f23',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: isLandscape ? '-50vh' : '-50vw',
        marginLeft: isLandscape ? '-50vw' : '-50vh'
      }}>
        {onBack && (
          <button onClick={onBack} style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            padding: '8px 15px',
            fontSize: '12px',
            fontWeight: '600',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#333',
            zIndex: 1000,
            transition: 'all 0.3s'
          }}>
            ← Geri
          </button>
        )}

        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px'
        }}>
          <BoardTop game={game} thisMove={thisMove} select={select} />

          <BoardBottom
            game={game}
            thisMove={thisMove}
            rollDice={rollDice}
            startGame={startGamePlay}
            select={select}
          />
        </div>
      </div>
    </div>
  );
}
