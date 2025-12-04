'use client';

/**
 * Tavla (Backgammon) Oyunu - Multiplayer Backend Entegrasyonlu
 * Ludo tarzında server-authoritative multiplayer
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/contexts/UserContext';
import { submitScore } from '@/lib/gameApi';

// Tavla frontend components
import BoardTop from './backgammon/frontend/BoardTop';
import BoardBottom from './backgammon/frontend/BoardBottom';

// Tavla logic models (sadece type tanımları için)
import Game from './backgammon/logic/models/game';
import ThisTurn from './backgammon/logic/models/this-turn';
import ThisMove from './backgammon/logic/models/this-move';

// Styles
import './backgammon/App.css';

// ===============================
// TYPES
// ===============================

type GamePhase = 'connecting' | 'waiting' | 'playing' | 'finished';

interface Player {
  id: string;
  name: string;
  color: 'White' | 'Black';
  outBar: string[];
  endBar: string[];
  inTheEnd?: boolean;
}

interface MoveOption {
  fromPosition: number;
  toPosition: number;
  diceValue: number;
  isFromOutBar: boolean;
  isBearOff: boolean;
}

interface BackgammonGameProps {
  customerCode: string;
  joinRoomId?: string;
  onBack?: () => void;
}

// ===============================
// HELPERS
// ===============================

const generatePlayerId = () => 'bg_' + Math.random().toString(36).substr(2, 9);
const generateRoomId = () => Math.floor(1000 + Math.random() * 9000).toString();
const generateRandomNickname = () => `Oyuncu#${Math.floor(1000 + Math.random() * 9000)}`;

// Oda bazlı playerId sakla/al
const getStoredPlayerId = (roomId: string): string | null => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(`backgammon_player_${roomId}`);
};

const storePlayerId = (roomId: string, playerId: string) => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(`backgammon_player_${roomId}`, playerId);
};

// ===============================
// MAIN COMPONENT
// ===============================

export default function BackgammonGame({ customerCode, joinRoomId, onBack }: BackgammonGameProps) {
  const { currentUser } = useAuth();

  // Nickname from user session or random
  const initialNickname = currentUser?.nickName || currentUser?.nickname || '';

  // Connection
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Game setup
  const [gamePhase, setGamePhase] = useState<GamePhase>('connecting');
  const [autoRoomCreated, setAutoRoomCreated] = useState(false);
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);
  const [showInLobby, setShowInLobby] = useState(true);

  // Game state
  const [roomId, setRoomId] = useState(joinRoomId || '');
  const [playerId, setPlayerId] = useState('');
  const [nickname, setNickname] = useState(initialNickname);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [myColor, setMyColor] = useState<'White' | 'Black'>('White');

  // Board state from backend
  const [board, setBoard] = useState<string[][]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [diceValues, setDiceValues] = useState<number[] | null>(null);
  const [diceRolled, setDiceRolled] = useState(false);
  const [availableDice, setAvailableDice] = useState<number[]>([]);
  const [validMoves, setValidMoves] = useState<MoveOption[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [isDiceRolling, setIsDiceRolling] = useState(false);  // Zar animasyonu

  // Açılış zarı
  const [isOpeningRoll, setIsOpeningRoll] = useState(false);
  const [whiteOpeningDice, setWhiteOpeningDice] = useState<number | null>(null);
  const [blackOpeningDice, setBlackOpeningDice] = useState<number | null>(null);
  const [myOpeningDiceRolled, setMyOpeningDiceRolled] = useState(false);

  // Maç skoru (5 puana ulaşan kazanır)
  const [whiteScore, setWhiteScore] = useState(0);
  const [blackScore, setBlackScore] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const targetScore = 5;

  // El sonu ekranı
  const [showRoundEndScreen, setShowRoundEndScreen] = useState(false);
  const [roundWinnerName, setRoundWinnerName] = useState<string | null>(null);
  const [roundWinnerColor, setRoundWinnerColor] = useState<string | null>(null);
  const [isRoundMars, setIsRoundMars] = useState(false);
  const [roundPoints, setRoundPoints] = useState(0);

  // Game over (maç sonu)
  const [winner, setWinner] = useState<string | null>(null);
  const [gameOverMessage, setGameOverMessage] = useState('');
  const [isMatchOver, setIsMatchOver] = useState(false);

  // Pes etme
  const [surrenderRequestedBy, setSurrenderRequestedBy] = useState<string | null>(null);
  const [surrenderRequestedByName, setSurrenderRequestedByName] = useState<string | null>(null);
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);
  const [isSurrender, setIsSurrender] = useState(false);

  // Oyuncu kovma onayı
  const [kickTargetPlayer, setKickTargetPlayer] = useState<{id: string, name: string} | null>(null);

  // Portrait mode
  const [isPortrait, setIsPortrait] = useState(false);

  // Fullscreen mode
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Refs
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerIdRef = useRef('');
  const roomIdRef = useRef(joinRoomId || '');
  const nicknameRef = useRef(initialNickname);
  const initialShowInLobbyRef = useRef(true);

  // Computed values
  const isMyTurn = useCallback(() => {
    if (players.length === 0) return false;
    const currentPlayer = players[currentPlayerIndex];
    return currentPlayer?.id === playerIdRef.current;
  }, [players, currentPlayerIndex]);

  const currentTurnPlayer = players[currentPlayerIndex];

  // Zar noktalarını render et
  const renderDiceDots = (value: number) => {
    const dotStyle: React.CSSProperties = {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: '#1a1a1a',
      position: 'absolute'
    };

    const positions: { [key: number]: React.CSSProperties[] } = {
      1: [{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }],
      2: [
        { top: '25%', right: '25%', transform: 'translate(50%, -50%)' },
        { bottom: '25%', left: '25%', transform: 'translate(-50%, 50%)' }
      ],
      3: [
        { top: '25%', right: '25%', transform: 'translate(50%, -50%)' },
        { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
        { bottom: '25%', left: '25%', transform: 'translate(-50%, 50%)' }
      ],
      4: [
        { top: '25%', left: '25%', transform: 'translate(-50%, -50%)' },
        { top: '25%', right: '25%', transform: 'translate(50%, -50%)' },
        { bottom: '25%', left: '25%', transform: 'translate(-50%, 50%)' },
        { bottom: '25%', right: '25%', transform: 'translate(50%, 50%)' }
      ],
      5: [
        { top: '25%', left: '25%', transform: 'translate(-50%, -50%)' },
        { top: '25%', right: '25%', transform: 'translate(50%, -50%)' },
        { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
        { bottom: '25%', left: '25%', transform: 'translate(-50%, 50%)' },
        { bottom: '25%', right: '25%', transform: 'translate(50%, 50%)' }
      ],
      6: [
        { top: '25%', left: '25%', transform: 'translate(-50%, -50%)' },
        { top: '25%', right: '25%', transform: 'translate(50%, -50%)' },
        { top: '50%', left: '25%', transform: 'translate(-50%, -50%)' },
        { top: '50%', right: '25%', transform: 'translate(50%, -50%)' },
        { bottom: '25%', left: '25%', transform: 'translate(-50%, 50%)' },
        { bottom: '25%', right: '25%', transform: 'translate(50%, 50%)' }
      ]
    };

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {positions[value]?.map((pos, idx) => (
          <div key={idx} style={{ ...dotStyle, ...pos }} />
        ))}
      </div>
    );
  };

  // ===============================
  // HANDLE BACK
  // ===============================

  const handleBack = useCallback(async () => {
    const currentPlayerId = playerIdRef.current;
    const currentRoomId = roomIdRef.current;
    const conn = connectionRef.current;

    if (conn && currentRoomId && currentPlayerId) {
      try {
        await conn.invoke('LeaveBackgammonRoom', currentRoomId, currentPlayerId);
      } catch (err) {
        console.error('[Backgammon] Error leaving room:', err);
      }
    }

    if (onBack) {
      onBack();
    }
  }, [onBack]);

  // ===============================
  // SIGNALR CONNECTION
  // ===============================

  useEffect(() => {
    const setupConnection = async () => {
      const hubUrl = 'https://api.menupark.com/gamehub';

      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Error)
        .build();

      // =====================================
      // BACKGAMMON SPECIFIC EVENT HANDLERS
      // =====================================

      newConnection.on('BackgammonRoomCreated', (data: any) => {
        if (data.success) {
          const newRoomId = data.room?.id;
          setRoomId(newRoomId);
          roomIdRef.current = newRoomId;
          setIsHost(true);
          setGamePhase('waiting');
          setMyColor('White');

          if (data.room?.players) {
            setPlayers(data.room.players.map((p: any) => ({
              id: p.id,
              name: p.name,
              color: p.color,
              outBar: p.outBar || [],
              endBar: p.endBar || []
            })));
          }
        } else {
          setConnectionError(data.error || 'Oda oluşturulamadı');
        }
      });

      newConnection.on('BackgammonRoomJoined', (data: any) => {
        if (data.success && data.room) {
          setRoomId(data.room.id);
          roomIdRef.current = data.room.id;
          setIsHost(data.isHost);
          setMyColor(data.myColor || 'Black');

          if (data.room.state === 'Playing') {
            setGamePhase('playing');
            setBoard(data.room.board || []);
            setCurrentPlayerIndex(data.room.currentPlayerIndex || 0);
            setDiceValues(data.room.diceValues);
            setDiceRolled(data.room.diceRolled);
            setAvailableDice(data.room.availableDice || []);

            // Ek state bilgileri (reconnect için önemli)
            if (data.room.validMoves) setValidMoves(data.room.validMoves);
            if (data.room.isOpeningRoll !== undefined) setIsOpeningRoll(data.room.isOpeningRoll);
            if (data.room.whiteOpeningDice !== undefined) setWhiteOpeningDice(data.room.whiteOpeningDice);
            if (data.room.blackOpeningDice !== undefined) setBlackOpeningDice(data.room.blackOpeningDice);
            if (data.room.whiteScore !== undefined) setWhiteScore(data.room.whiteScore);
            if (data.room.blackScore !== undefined) setBlackScore(data.room.blackScore);
            if (data.room.currentRound !== undefined) setCurrentRound(data.room.currentRound);
          } else {
            setGamePhase('waiting');
          }

          if (data.room.players) {
            setPlayers(data.room.players.map((p: any) => ({
              id: p.id,
              name: p.name,
              color: p.color,
              outBar: p.outBar || [],
              endBar: p.endBar || [],
              inTheEnd: p.inTheEnd
            })));
          }
        } else {
          setConnectionError(data.error || 'Odaya katılamadı');
        }
      });

      newConnection.on('BackgammonJoinFailed', (data: any) => {
        setConnectionError(data.error || 'Odaya katılınamadı');
      });

      newConnection.on('BackgammonPlayerJoined', (data: any) => {
        if (data.players) {
          setPlayers(data.players.map((p: any) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            outBar: p.outBar || [],
            endBar: p.endBar || []
          })));
        }
      });

      newConnection.on('BackgammonPlayerLeft', (data: any) => {
        if (gamePhase === 'playing') {
          setGameOverMessage('Rakibiniz oyundan ayrıldı!');
          setGamePhase('finished');
        }
      });

      // Oyuncu kovuldu
      newConnection.on('BackgammonPlayerKicked', (data: any) => {
        // Ben kovuldum mu?
        if (data.kickedPlayerId === playerIdRef.current) {
          alert('Oda sahibi sizi odadan çıkardı.');
          handleBack();
        } else {
          // Başka biri kovuldu, oyuncu listesini güncelle
          if (data.players) {
            setPlayers(data.players.map((p: any) => ({
              id: p.id,
              name: p.name,
              color: p.color,
              outBar: p.outBar || [],
              endBar: p.endBar || []
            })));
          }
        }
      });

      newConnection.on('BackgammonGameStarted', (data: any) => {
        setGamePhase('playing');
        setBoard(data.board || []);
        setCurrentPlayerIndex(data.currentPlayerIndex || 0);
        setDiceRolled(false);
        setDiceValues(null);
        setAvailableDice([]);
        setValidMoves([]);

        // Açılış zarı state'leri
        setIsOpeningRoll(data.isOpeningRoll || false);
        setWhiteOpeningDice(data.whiteOpeningDice || null);
        setBlackOpeningDice(data.blackOpeningDice || null);
        setMyOpeningDiceRolled(false);

        // Skor bilgileri
        setWhiteScore(data.whiteScore || 0);
        setBlackScore(data.blackScore || 0);
        setCurrentRound(data.currentRound || 1);
        setShowRoundEndScreen(false);
        setIsMatchOver(false);

        if (data.players) {
          setPlayers(data.players.map((p: any) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            outBar: p.outBar || [],
            endBar: p.endBar || []
          })));
        }
      });

      // Açılış zarı atıldı
      newConnection.on('BackgammonOpeningRoll', (data: any) => {
        setWhiteOpeningDice(data.whiteOpeningDice);
        setBlackOpeningDice(data.blackOpeningDice);
        setIsOpeningRoll(data.isOpeningRoll);

        // Ben attıysam işaretle
        if (data.playerId === playerIdRef.current) {
          setMyOpeningDiceRolled(true);
        }

        // Berabere geldiyse sıfırla
        if (data.isTie) {
          setMyOpeningDiceRolled(false);
        }
      });

      // Açılış zarı tamamlandı, oyun başlıyor
      newConnection.on('BackgammonOpeningRollComplete', (data: any) => {
        setIsOpeningRoll(false);
        setCurrentPlayerIndex(data.currentPlayerIndex);
        setDiceValues(data.diceValues);
        setDiceRolled(true);
        setAvailableDice(data.availableDice || []);
        if (data.validMoves) {
          setValidMoves(data.validMoves);
        }
      });

      newConnection.on('BackgammonDiceRolled', (data: any) => {
        setDiceValues(data.diceValues);
        setDiceRolled(true);
        setAvailableDice(data.availableDice || []);
        // validMoves'u da al (backend'den geliyor)
        if (data.validMoves) {
          setValidMoves(data.validMoves);
        }
      });

      newConnection.on('BackgammonValidMoves', (data: any) => {
        setValidMoves(data.validMoves || []);
      });

      newConnection.on('BackgammonPieceMoved', (data: any) => {
        setBoard(data.board || []);
        setAvailableDice(data.availableDice || []);
        setSelectedPosition(null);

        if (data.players) {
          setPlayers(data.players.map((p: any) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            outBar: p.outBar || [],
            endBar: p.endBar || [],
            inTheEnd: p.inTheEnd
          })));
        }

        // Yeni validMoves'u al (kalan hamleler için)
        if (data.validMoves && data.validMoves.length > 0) {
          setValidMoves(data.validMoves);
        } else if (data.turnEnded || !data.availableDice || data.availableDice.length === 0) {
          // Sıra bittiyse veya zar kalmadıysa validMoves'u temizle
          setValidMoves([]);
        }

        // Skor bilgilerini güncelle
        if (data.whiteScore !== undefined) setWhiteScore(data.whiteScore);
        if (data.blackScore !== undefined) setBlackScore(data.blackScore);
        if (data.currentRound !== undefined) setCurrentRound(data.currentRound);
      });

      newConnection.on('BackgammonTurnChanged', (data: any) => {
        setCurrentPlayerIndex(data.currentPlayerIndex);
        setDiceRolled(false);
        setDiceValues(null);
        setAvailableDice([]);
        setValidMoves([]);
        setSelectedPosition(null);

        if (data.players) {
          setPlayers(data.players.map((p: any) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            outBar: p.outBar || [],
            endBar: p.endBar || []
          })));
        }
      });

      newConnection.on('BackgammonGameFinished', (data: any) => {
        setWinner(data.winnerName);

        if (data.winnerId === playerIdRef.current) {
          setGameOverMessage('Tebrikler! Oyunu Kazandınız! 🏆');
        } else if (data.reason) {
          setGameOverMessage(data.reason);
        } else {
          setGameOverMessage(`${data.winnerName} Oyunu Kazandı!`);
        }

        setGamePhase('finished');
      });

      // El sonu (birisi 15 taş topladı)
      newConnection.on('BackgammonRoundEnded', (data: any) => {
        setWhiteScore(data.whiteScore);
        setBlackScore(data.blackScore);
        setCurrentRound(data.currentRound);
        setRoundWinnerName(data.roundWinnerName);
        setRoundWinnerColor(data.roundWinnerColor);
        setIsRoundMars(data.isMars || false);
        setRoundPoints(data.roundPoints || 1);

        // Maç bitmedi ise el sonu ekranını göster
        if (!data.isMatchOver) {
          setShowRoundEndScreen(true);
        }
      });

      // Maç sonu (3 el kazanan)
      newConnection.on('BackgammonMatchFinished', async (data: any) => {
        setWhiteScore(data.whiteScore);
        setBlackScore(data.blackScore);
        setIsMatchOver(true);
        setWinner(data.matchWinnerName);

        if (data.matchWinnerId === playerIdRef.current) {
          setGameOverMessage(`Tebrikler! Maçı ${data.whiteScore}-${data.blackScore} Kazandınız! 🏆`);
        } else {
          setGameOverMessage(`${data.matchWinnerName} Maçı ${data.whiteScore}-${data.blackScore} Kazandı!`);
        }

        setGamePhase('finished');

        // Leaderboard'a kaydet (kazanan için)
        if (data.matchWinnerId === playerIdRef.current) {
          try {
            await submitScore({
              GameType: 'Backgammon',
              PlayerNickname: nicknameRef.current || 'Anonim',
              Score: Math.max(data.whiteScore, data.blackScore),
              GameData: JSON.stringify({
                whiteScore: data.whiteScore,
                blackScore: data.blackScore,
                isWinner: true
              }),
              VenueCode: customerCode || 'global'
            });
          } catch (err) {
            console.error('❌ Backgammon skor kayıt hatası:', err);
          }
        }
      });

      // Yeni el başladı
      newConnection.on('BackgammonNewRoundStarted', (data: any) => {
        setBoard(data.board || []);
        setWhiteScore(data.whiteScore);
        setBlackScore(data.blackScore);
        setCurrentRound(data.currentRound);
        setIsOpeningRoll(data.isOpeningRoll ?? false);
        setCurrentPlayerIndex(data.currentPlayerIndex ?? 0);
        setWhiteOpeningDice(null);
        setBlackOpeningDice(null);
        setMyOpeningDiceRolled(false);
        setDiceRolled(false);
        setDiceValues(null);
        setAvailableDice([]);
        setValidMoves([]);
        setSelectedPosition(null);
        setShowRoundEndScreen(false);
        setIsRoundMars(false);
        setRoundPoints(0);
        setSurrenderRequestedBy(null);
        setSurrenderRequestedByName(null);
        setShowSurrenderModal(false);
        setIsSurrender(false);

        if (data.players) {
          setPlayers(data.players.map((p: any) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            outBar: p.outBar || [],
            endBar: p.endBar || [],
            inTheEnd: p.inTheEnd
          })));
        }

        // Açılış zarı yoksa (kazanan başlıyor), log göster
        if (!data.isOpeningRoll) {
        }
      });

      // Pes etme isteği geldi
      newConnection.on('BackgammonSurrenderRequested', (data: any) => {
        setSurrenderRequestedBy(data.requestedBy);
        setSurrenderRequestedByName(data.requestedByName);
        // Rakip pes isteği gönderdi, bana modal göster
        if (data.requestedBy !== playerIdRef.current) {
          setShowSurrenderModal(true);
        }
      });

      // Pes isteği kabul edildi
      newConnection.on('BackgammonSurrenderAccepted', (data: any) => {
        setSurrenderRequestedBy(null);
        setSurrenderRequestedByName(null);
        setShowSurrenderModal(false);
        setIsSurrender(true);
        setWhiteScore(data.whiteScore);
        setBlackScore(data.blackScore);
      });

      // Pes isteği reddedildi
      newConnection.on('BackgammonSurrenderRejected', (data: any) => {
        setSurrenderRequestedBy(null);
        setSurrenderRequestedByName(null);
        setShowSurrenderModal(false);
      });

      // Pes isteği iptal edildi
      newConnection.on('BackgammonSurrenderCancelled', (data: any) => {
        setSurrenderRequestedBy(null);
        setSurrenderRequestedByName(null);
        setShowSurrenderModal(false);
      });

      newConnection.on('BackgammonGameRestarted', (data: any) => {
        setGamePhase('waiting');
        setBoard([]);
        setDiceRolled(false);
        setDiceValues(null);
        setValidMoves([]);
        setWinner(null);
        setGameOverMessage('');

        if (data.players) {
          setPlayers(data.players.map((p: any) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            outBar: [],
            endBar: []
          })));
        }
      });

      newConnection.on('BackgammonVisibilityChanged', (data: any) => {
        setShowInLobby(data.isPublic);
      });

      // Reconnect sonrası oyun durumunu almak için
      newConnection.on('BackgammonGameState', (data: any) => {
        console.log('[Backgammon] Game state received:', data);
        const room = data.room || data.Room || data;

        // Board
        if (room.board) setBoard(room.board);

        // Sıra bilgisi
        if (room.currentPlayerIndex !== undefined) setCurrentPlayerIndex(room.currentPlayerIndex);

        // Zar bilgileri
        if (room.diceValues) setDiceValues(room.diceValues);
        if (room.diceRolled !== undefined) setDiceRolled(room.diceRolled);
        if (room.availableDice) setAvailableDice(room.availableDice);

        // Valid moves
        if (room.validMoves) setValidMoves(room.validMoves);

        // Skor bilgileri
        if (room.whiteScore !== undefined) setWhiteScore(room.whiteScore);
        if (room.blackScore !== undefined) setBlackScore(room.blackScore);
        if (room.currentRound !== undefined) setCurrentRound(room.currentRound);

        // Açılış zarı
        if (room.isOpeningRoll !== undefined) setIsOpeningRoll(room.isOpeningRoll);
        if (room.whiteOpeningDice !== undefined) setWhiteOpeningDice(room.whiteOpeningDice);
        if (room.blackOpeningDice !== undefined) setBlackOpeningDice(room.blackOpeningDice);

        // Oyuncular
        if (room.players) {
          setPlayers(room.players.map((p: any) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            outBar: p.outBar || [],
            endBar: p.endBar || [],
            inTheEnd: p.inTheEnd
          })));
        }
      });

      newConnection.on('Error', (error: string) => {
        console.error('[Backgammon] Server error:', error);
        setConnectionError(error);
      });

      // Reconnection handlers - telefon geldiğinde tekrar bağlanabilmek için
      newConnection.onreconnected(async () => {
        console.log('[Backgammon] SignalR reconnected, rejoining room...');
        setIsConnected(true);

        // Oda varsa tekrar katıl
        if (roomIdRef.current && playerIdRef.current) {
          try {
            const endUserId = currentUser?.id || currentUser?.userId || null;
            await newConnection.invoke('JoinBackgammonRoom', roomIdRef.current, playerIdRef.current, nicknameRef.current, endUserId);
            console.log('[Backgammon] Rejoined room after reconnect');

            // Sıra bizdeyse ve zar atılmışsa valid moves iste
            // (BackgammonRoomJoined event'i ile state güncellenecek, sonra validMoves alınacak)
            setTimeout(async () => {
              try {
                await newConnection.invoke('GetBackgammonValidMoves', roomIdRef.current, playerIdRef.current);
              } catch (e) {
                // Backend bu metodu desteklemeyebilir, sessizce geç
                console.log('[Backgammon] GetBackgammonValidMoves not supported or failed');
              }
            }, 500);
          } catch (err) {
            console.error('[Backgammon] Failed to rejoin room:', err);
          }
        }
      });

      newConnection.onreconnecting(() => {
        console.log('[Backgammon] SignalR reconnecting...');
        setIsConnected(false);
      });

      newConnection.onclose(() => {
        console.log('[Backgammon] SignalR connection closed');
        setIsConnected(false);
      });

      // Start connection
      try {
        await newConnection.start();
        setIsConnected(true);
        setConnection(newConnection);
        connectionRef.current = newConnection;

        // Player ID = endUserId (kullanıcı giriş yapmış olmalı)
        const endUserId = currentUser?.id || currentUser?.userId;
        if (!endUserId) {
          console.error('[Backgammon] No endUserId found - user must be logged in');
          setConnectionError('Giriş yapmalısınız');
          return;
        }
        const newPlayerId = endUserId.toString();
        setPlayerId(newPlayerId);
        playerIdRef.current = newPlayerId;

        // Set nickname
        const finalNickname = initialNickname || generateRandomNickname();
        setNickname(finalNickname);
        nicknameRef.current = finalNickname;

        // Join venue lobby
        await newConnection.invoke('JoinVenueLobby', 'global');

      } catch (err) {
        console.error('[Backgammon] Connection error:', err);
        setConnectionError('Bağlantı hatası');
      }
    };

    setupConnection();

    // Cleanup on unmount
    return () => {
      const conn = connectionRef.current;
      const currentRoomId = roomIdRef.current;
      const currentPlayerId = playerIdRef.current;

      if (conn && currentRoomId && currentPlayerId) {
        conn.invoke('LeaveBackgammonRoom', currentRoomId, currentPlayerId).catch(console.error);
      }
      conn?.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNickname]);

  // ===============================
  // AUTO CREATE/JOIN ROOM
  // ===============================

  useEffect(() => {
    if (!joinRoomId && isConnected && connection && !autoRoomCreated && playerId) {
      setAutoRoomCreated(true);
      const createNickname = nickname || generateRandomNickname();
      const newRoomId = generateRoomId();
      const endUserId = currentUser?.id || currentUser?.userId || null;

      connection.invoke('CreateBackgammonRoom', newRoomId, playerId, createNickname, 'global', endUserId, true)
        .catch(err => {
          console.error('[Backgammon] Create room error:', err);
          setConnectionError('Oda oluşturulamadı');
        });
    }
  }, [joinRoomId, isConnected, connection, autoRoomCreated, playerId, nickname, currentUser]);

  useEffect(() => {
    if (joinRoomId && isConnected && connection && !autoJoinAttempted && playerId) {
      setAutoJoinAttempted(true);
      const joinNickname = nickname || generateRandomNickname();
      const endUserId = currentUser?.id || currentUser?.userId || null;

      connection.invoke('JoinBackgammonRoom', joinRoomId, playerId, joinNickname, endUserId)
        .catch(err => {
          console.error('[Backgammon] Join room error:', err);
          setConnectionError('Odaya katılınamadı');
        });
    }
  }, [joinRoomId, isConnected, connection, autoJoinAttempted, playerId, nickname, currentUser]);

  // ===============================
  // PORTRAIT CHECK
  // ===============================

  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth < 1024;
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(isMobile && portrait);
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
  // LOBBY VISIBILITY
  // ===============================

  useEffect(() => {
    if (initialShowInLobbyRef.current) {
      initialShowInLobbyRef.current = false;
      return;
    }

    if (connection && roomId && isHost && gamePhase === 'waiting') {
      connection.invoke('SetBackgammonRoomVisibility', roomId, showInLobby)
        .catch(console.error);
    }
  }, [showInLobby, connection, roomId, isHost, gamePhase]);

  // ===============================
  // GAME FUNCTIONS
  // ===============================

  const copyRoomLink = async () => {
    const link = typeof window !== 'undefined'
      ? `${window.location.origin}/game/backgammon?room=${roomId}${customerCode && customerCode !== 'global' ? `&code=${customerCode}` : ''}`
      : '';
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('[Backgammon] Copy error:', err);
    }
  };

  const handleStartGame = async () => {
    if (!connection || !roomId) return;
    try {
      await connection.invoke('StartBackgammonGame', roomId);
    } catch (err) {
      console.error('[Backgammon] Start game error:', err);
    }
  };

  // Oyuncuyu kovma onayı göster
  const showKickConfirm = (targetId: string, targetName: string) => {
    setKickTargetPlayer({ id: targetId, name: targetName });
  };

  // Kovmayı onayla
  const confirmKickPlayer = async () => {
    if (!connection || !roomId || !playerId || !isHost || !kickTargetPlayer) return;
    try {
      await connection.invoke('BackgammonKickPlayer', roomId, playerId, kickTargetPlayer.id);
      setKickTargetPlayer(null);
    } catch (err) {
      console.error('[Backgammon] Kick player error:', err);
    }
  };

  // Kovmayı iptal et
  const cancelKickPlayer = () => {
    setKickTargetPlayer(null);
  };

  const handleRollDice = async () => {
    if (!connection || !roomId) {
      return;
    }

    // Zar animasyonunu başlat
    setIsDiceRolling(true);

    // Açılış zarı aşamasında
    if (isOpeningRoll) {
      if (myOpeningDiceRolled) {
        setIsDiceRolling(false);
        return;
      }
      try {
        await connection.invoke('BackgammonRollOpeningDice', roomId, playerId);
      } catch (err) {
        console.error('[Backgammon] Opening roll error:', err);
      }
      // Animasyon biraz sonra bitsin
      setTimeout(() => setIsDiceRolling(false), 800);
      return;
    }

    // Normal zar atma
    if (!isMyTurn() || diceRolled) {
      setIsDiceRolling(false);
      return;
    }
    try {
      await connection.invoke('BackgammonRollDice', roomId, playerId);
      // Animasyon biraz sonra bitsin
      setTimeout(() => setIsDiceRolling(false), 800);
    } catch (err) {
      console.error('[Backgammon] Roll dice error:', err);
      setIsDiceRolling(false);
    }
  };

  const handleSelectPosition = async (position: number | string) => {
    if (!connection || !roomId || !isMyTurn() || !diceRolled) {
      return;
    }

    // OutBar string'lerini -1'e çevir (backend OutBar için -1 kullanıyor)
    let posNum: number;
    if (typeof position === 'string') {
      if (position === 'WhiteOutBar' || position === 'BlackOutBar') {
        posNum = -1;  // OutBar seçimi
      } else {
        posNum = parseInt(position);
      }
    } else {
      posNum = position;
    }

    // Pozisyon seçilmişse
    if (selectedPosition === null) {
      // Geçerli bir başlangıç pozisyonu mu?
      const canMoveFrom = validMoves.some(m => m.fromPosition === posNum);
      if (canMoveFrom) {
        setSelectedPosition(posNum);
      }
    } else {
      // Hedef pozisyon seçildi - hamle yap
      const move = validMoves.find(m =>
        m.fromPosition === selectedPosition && m.toPosition === posNum
      );

      if (move) {
        try {
          await connection.invoke('BackgammonMovePiece', roomId, playerId,
            move.fromPosition, move.toPosition, move.diceValue);
          setSelectedPosition(null);
        } catch (err) {
          console.error('[Backgammon] Move error:', err);
        }
      } else {
        // Geçersiz hedef - yeni kaynak seç
        const canMoveFrom = validMoves.some(m => m.fromPosition === posNum);
        if (canMoveFrom) {
          setSelectedPosition(posNum);
        } else {
          setSelectedPosition(null);
        }
      }
    }
  };

  // Yeni el başlat (el sonu ekranından)
  const handleStartNewRound = async () => {
    if (!connection || !roomId) return;
    try {
      await connection.invoke('BackgammonStartNewRound', roomId);
    } catch (err) {
      console.error('[Backgammon] Start new round error:', err);
    }
  };

  const handlePlayAgain = async () => {
    if (!connection || !roomId) return;
    try {
      await connection.invoke('RestartBackgammonGame', roomId);
    } catch (err) {
      console.error('[Backgammon] Restart error:', err);
    }
  };

  // Pes et isteği gönder
  const handleRequestSurrender = async () => {
    if (!connection || !roomId) return;
    try {
      await connection.invoke('BackgammonRequestSurrender', roomId, playerId);
    } catch (err) {
      console.error('[Backgammon] Request surrender error:', err);
    }
  };

  // Pes isteğini kabul et
  const handleAcceptSurrender = async () => {
    if (!connection || !roomId) return;
    try {
      await connection.invoke('BackgammonAcceptSurrender', roomId, playerId);
    } catch (err) {
      console.error('[Backgammon] Accept surrender error:', err);
    }
  };

  // Pes isteğini reddet
  const handleRejectSurrender = async () => {
    if (!connection || !roomId) return;
    try {
      await connection.invoke('BackgammonRejectSurrender', roomId, playerId);
    } catch (err) {
      console.error('[Backgammon] Reject surrender error:', err);
    }
  };

  // Pes isteğini iptal et
  const handleCancelSurrender = async () => {
    if (!connection || !roomId) return;
    try {
      await connection.invoke('BackgammonCancelSurrender', roomId, playerId);
    } catch (err) {
      console.error('[Backgammon] Cancel surrender error:', err);
    }
  };

  // ===============================
  // CONVERT BACKEND DATA TO FRONTEND FORMAT
  // ===============================

  const convertToFrontendGame = useCallback((): Game => {
    const game = Game.new();
    game.gameOn = gamePhase === 'playing';

    // Backend board'u frontend formatına dönüştür
    if (board && board.length === 24) {
      game.board = board.map(pos => [...pos]);
    }

    // Oyuncu bilgilerini güncelle
    const whitePlayer = players.find(p => p.color === 'White');
    const blackPlayer = players.find(p => p.color === 'Black');

    if (whitePlayer) {
      game.whitePlayer.outBar = [...(whitePlayer.outBar || [])];
      game.whitePlayer.endBar = [...(whitePlayer.endBar || [])];
      game.whitePlayer.inTheEnd = whitePlayer.inTheEnd || false;
    }

    if (blackPlayer) {
      game.blackPlayer.outBar = [...(blackPlayer.outBar || [])];
      game.blackPlayer.endBar = [...(blackPlayer.endBar || [])];
      game.blackPlayer.inTheEnd = blackPlayer.inTheEnd || false;
    }

    return game;
  }, [board, players, gamePhase]);

  const convertToFrontendThisTurn = useCallback((): ThisTurn => {
    const game = convertToFrontendGame();
    const currentPlayer = players[currentPlayerIndex];

    // Doğru player'ları belirle
    let turnPlayer = game.whitePlayer;
    let opponentPlayer = game.blackPlayer;

    if (currentPlayer && currentPlayer.color === 'Black') {
      turnPlayer = game.blackPlayer;
      opponentPlayer = game.whitePlayer;
    }

    // ThisTurn constructor: (turnPlayer, opponentPlayer, dices, beginning)
    const dices = diceValues ? [...diceValues] : [];
    const thisTurn = new ThisTurn(turnPlayer, opponentPlayer, dices, diceRolled);

    // rolledDice'ı manuel set et (constructor farklı çalışabilir)
    thisTurn.rolledDice = diceRolled;

    return thisTurn;
  }, [diceRolled, diceValues, players, currentPlayerIndex, convertToFrontendGame]);

  const convertToFrontendThisMove = useCallback((): ThisMove => {
    const thisMove = ThisMove.new();

    if (selectedPosition !== null) {
      thisMove.fromBarIdx = selectedPosition;
    }

    // Gidilebilecek pozisyonları hesapla
    if (selectedPosition !== null) {
      thisMove.canGoTo = validMoves
        .filter(m => m.fromPosition === selectedPosition)
        .map(m => m.toPosition);
    } else {
      // Seçim yapılmadıysa tüm başlangıç pozisyonlarını highlight et
      // OutBar'dan hareket varsa (-1), kendi renginin OutBar'ını highlight et
      const fromPositions = validMoves.map(m => m.fromPosition);
      thisMove.canGoTo = fromPositions;

      // OutBar seçilebilir mi kontrol et (validMoves'da fromPosition=-1 varsa)
      thisMove.canSelectOutBar = fromPositions.includes(-1);
    }

    return thisMove;
  }, [selectedPosition, validMoves]);

  // ===============================
  // FULLSCREEN TOGGLE
  // ===============================

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      // Fullscreen'den çık
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else if ((document as any).webkitFullscreenElement) {
          await (document as any).webkitExitFullscreen();
        }
      } catch (err) {
        console.error('[Backgammon] Exit fullscreen error:', err);
      }
      setIsFullscreen(false);
    } else {
      // Fullscreen'e gir
      try {
        if (containerRef.current) {
          if (containerRef.current.requestFullscreen) {
            await containerRef.current.requestFullscreen();
            setIsFullscreen(true);
          } else if ((containerRef.current as any).webkitRequestFullscreen) {
            await (containerRef.current as any).webkitRequestFullscreen();
            setIsFullscreen(true);
          }
        }
      } catch (err) {
        console.error('[Backgammon] Enter fullscreen error:', err);
      }
    }
  };

  // iOS kontrolü ve Fullscreen değişikliğini dinle
  useEffect(() => {
    // iOS kontrolü
    const iOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIOS(iOS);

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // ===============================
  // RENDER - PORTRAIT WARNING
  // ===============================

  if (isPortrait) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        zIndex: 9999,
        padding: 20,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 80, marginBottom: 20, animation: 'rotatePhone 1.5s ease-in-out infinite' }}>
          📱
        </div>
        <h2 style={{ margin: '0 0 15px 0', fontSize: 24 }}>
          Lütfen cihazınızı yatay çevirin
        </h2>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
          Tavla oyunu yatay modda oynanır
        </p>
        <div style={{ marginTop: 20, color: '#f39c12', fontSize: 18 }}>
          🎲 Tavla
        </div>
        {onBack && (
          <button onClick={handleBack} style={{
            marginTop: 30,
            padding: '12px 30px',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: 25,
            fontSize: 16,
            cursor: 'pointer'
          }}>
            ← Geri Dön
          </button>
        )}
        <style>{`
          @keyframes rotatePhone {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(90deg); }
          }
        `}</style>
      </div>
    );
  }

  // ===============================
  // RENDER - CONNECTING
  // ===============================

  if (gamePhase === 'connecting' || !isConnected) {
    return (
      <div style={styles.container}>
        <button onClick={handleBack} style={styles.topBackButton}>← Geri</button>
        <div style={styles.centerContent}>
          <div style={styles.gameIcon}>🎲</div>
          <h1 style={styles.title}>Tavla</h1>
          {connectionError ? (
            <>
              <p style={styles.errorText}>{connectionError}</p>
              <button onClick={handleBack} style={styles.primaryButton}>← Geri Dön</button>
            </>
          ) : (
            <>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>Bağlanıyor...</p>
            </>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ===============================
  // RENDER - WAITING
  // ===============================

  if (gamePhase === 'waiting') {
    const getShareUrl = () => {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      let url = `${baseUrl}/game/backgammon?room=${roomId}`;
      if (customerCode && customerCode !== 'global') {
        url += `&code=${customerCode}`;
      }
      return url;
    };

    return (
      <div
        ref={containerRef}
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 10,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
        }}>
        <button onClick={handleBack} style={{
          position: 'absolute', top: 10, left: 10,
          padding: '8px 16px',
          background: 'rgba(255,255,255,0.2)',
          color: 'white', border: 'none', borderRadius: 15,
          cursor: 'pointer', fontSize: 13
        }}>
          ← Geri
        </button>

        {/* Fullscreen Button - Lobby - sadece tam ekran değilken göster */}
        {!isIOS && !isFullscreen && (
          <button onClick={toggleFullscreen} style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '10px 15px',
            fontSize: '14px',
            fontWeight: '600',
            border: '2px solid #fff',
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: '#fff',
            zIndex: 10000
          }}>
            ⛶ Tam Ekran
          </button>
        )}

        <div style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 20,
          alignItems: 'stretch',
          maxWidth: 700,
          width: '100%'
        }}>
          {/* Sol - QR */}
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 15,
            padding: 15,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <h3 style={{ color: 'white', margin: '0 0 10px 0', fontSize: 14 }}>
              📱 Arkadaşını Davet Et
            </h3>
            <div style={{ padding: 10, background: 'white', borderRadius: 10, marginBottom: 10 }}>
              <QRCodeSVG value={getShareUrl()} size={100} level="H" />
            </div>
            <button onClick={copyRoomLink} style={{
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: '600',
              border: 'none',
              borderRadius: 20,
              cursor: 'pointer',
              background: 'white',
              color: '#1a1a2e'
            }}>
              {linkCopied ? '✅ Kopyalandı!' : '📋 Linki Kopyala'}
            </button>

            {isHost && (
              <div style={{
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 10
              }}>
                <div>
                  <div style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>🏛️ Lobby'de Göster</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>Diğerleri katılabilir</div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                  <input
                    type="checkbox"
                    checked={showInLobby}
                    onChange={(e) => setShowInLobby(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: showInLobby ? '#27ae60' : 'rgba(255,255,255,0.2)',
                    borderRadius: 24,
                    transition: '0.3s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      height: 18, width: 18,
                      left: showInLobby ? 22 : 3,
                      bottom: 3,
                      background: 'white',
                      borderRadius: '50%',
                      transition: '0.3s'
                    }} />
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Sağ - Oyuncular */}
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 15,
            padding: 15,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ color: 'white', margin: '0 0 3px 0', fontSize: 14, textAlign: 'center' }}>
              🎲 Tavla - Oyuncular ({players.length}/2)
            </h3>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              {players.map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  background: p.color === 'White' ? '#e0e0e0' : '#3a3a3a',
                  borderRadius: 8
                }}>
                  <div style={{
                    width: 28, height: 28,
                    borderRadius: '50%',
                    background: p.color === 'White' ? '#fff' : '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: 13,
                    color: p.color === 'White' ? '#333' : '#fff',
                    border: '2px solid ' + (p.color === 'White' ? '#bbb' : '#555')
                  }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ color: p.color === 'White' ? '#333' : '#fff', fontWeight: '600', fontSize: 13, flex: 1 }}>
                    {p.name} {p.id === playerId && '(Sen)'}
                  </span>
                  {i === 0 && <span style={{ fontSize: 14 }}>👑</span>}
                  {/* Host için kick butonu (kendisi ve host hariç) */}
                  {isHost && i !== 0 && p.id !== playerId && (
                    <button
                      onClick={() => showKickConfirm(p.id, p.name)}
                      style={{
                        background: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: 22,
                        height: 22,
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: 4
                      }}
                      title="Oyuncuyu Kov"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {players.length < 2 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  border: '1px dashed rgba(255,255,255,0.2)'
                }}>
                  <div style={{
                    width: 28, height: 28,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: 12
                  }}>
                    ?
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                    Bekleniyor...
                  </span>
                </div>
              )}
            </div>

            {isHost && players.length >= 2 && (
              <button onClick={handleStartGame} style={{
                marginTop: 12,
                padding: '12px',
                fontSize: 14,
                fontWeight: '600',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                color: 'white'
              }}>
                🎮 Oyunu Başlat
              </button>
            )}

            {players.length < 2 && (
              <div style={{ marginTop: 12, textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                <div style={{
                  width: 20, height: 20,
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 8px'
                }} />
                Rakip bekleniyor...
              </div>
            )}
          </div>
        </div>

        {/* Kovma Onay Modalı */}
        {kickTargetPlayer && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: 15,
              padding: 20,
              maxWidth: 300,
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <h3 style={{ color: 'white', margin: '0 0 15px 0', fontSize: 16 }}>
                Oyuncuyu Kov
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 20px 0', fontSize: 14 }}>
                <strong>{kickTargetPlayer.name}</strong> adlı oyuncuyu odadan çıkarmak istediğinize emin misiniz?
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  onClick={cancelKickPlayer}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  İptal
                </button>
                <button
                  onClick={confirmKickPlayer}
                  style={{
                    padding: '10px 20px',
                    background: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 'bold'
                  }}
                >
                  Kov
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ===============================
  // RENDER - PLAYING
  // ===============================

  if (gamePhase === 'playing') {
    const frontendGame = convertToFrontendGame();
    const frontendThisTurn = convertToFrontendThisTurn();
    const frontendThisMove = convertToFrontendThisMove();

    // Kırılan taşları al (OutBar)
    const whitePlayer = players.find(p => p.color === 'White');
    const blackPlayer = players.find(p => p.color === 'Black');
    const whiteOutBar = whitePlayer?.outBar || [];
    const blackOutBar = blackPlayer?.outBar || [];
    const whiteEndBar = whitePlayer?.endBar || [];
    const blackEndBar = blackPlayer?.endBar || [];

    // OutBar seçilebilir mi?
    const canSelectWhiteOutBar = frontendThisMove.canSelectOutBar && myColor === 'White' && whiteOutBar.length > 0;
    const canSelectBlackOutBar = frontendThisMove.canSelectOutBar && myColor === 'Black' && blackOutBar.length > 0;

    return (
      <div
        ref={containerRef}
        style={{
          width: '100vw',
          height: '100vh',
          background: '#5d4e37',
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
          position: 'fixed',
          top: 0,
          left: 0
        }}
      >
        <button onClick={handleBack} style={{
          position: 'absolute',
          top: '5px',
          left: '5px',
          padding: '5px 10px',
          fontSize: '10px',
          fontWeight: '600',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          background: 'rgba(255, 255, 255, 0.9)',
          color: '#333',
          zIndex: 1000
        }}>
          ← Geri
        </button>

        {/* Fullscreen Toggle Button - sadece tam ekran değilken göster */}
        {!isIOS && !isFullscreen && (
          <button onClick={toggleFullscreen} style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '10px 15px',
            fontSize: '14px',
            fontWeight: '600',
            border: '2px solid #fff',
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: '#fff',
            zIndex: 10000
          }}>
            ⛶ Tam Ekran
          </button>
        )}

        {/* Sol - Kırılan Taşlar (OutBar) + Sıra/Nickname */}
        <div style={{
          width: '85px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '5px',
          padding: '28px 3px 6px 3px',
          background: 'rgba(0,0,0,0.2)'
        }}>
          {/* Sıra bilgisi */}
          <div style={{
            padding: '5px',
            fontSize: '9px',
            fontWeight: '600',
            background: isMyTurn() ? 'rgba(39, 174, 96, 0.3)' : 'rgba(255,255,255,0.1)',
            color: '#fff',
            borderRadius: '5px',
            textAlign: 'center',
            width: '100%',
            border: isMyTurn() ? '2px solid #27ae60' : 'none'
          }}>
            <div>Sıra</div>
            <div style={{ fontSize: '11px', marginTop: '2px' }}>
              {currentTurnPlayer?.color === 'White' ? '⚪' : '⚫'}
            </div>
            {isMyTurn() && <div style={{ fontSize: '8px', color: '#27ae60' }}>(Sen)</div>}
          </div>

          <div style={{ fontSize: '8px', color: '#fff', textAlign: 'center', marginTop: '3px' }}>
            Kırılan
          </div>

          {/* Rakibin Kırılan Taşları - Üstte */}
          <div
            onClick={() => (myColor === 'White' ? canSelectBlackOutBar : canSelectWhiteOutBar) && handleSelectPosition(myColor === 'White' ? 'BlackOutBar' : 'WhiteOutBar')}
            style={{
              width: '100%',
              minHeight: '70px',
              background: (myColor === 'White' ? canSelectBlackOutBar : canSelectWhiteOutBar) ? '#FFD700' : (myColor === 'White' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.1)'),
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: '4px',
              cursor: (myColor === 'White' ? canSelectBlackOutBar : canSelectWhiteOutBar) ? 'pointer' : 'default',
              border: (myColor === 'White' ? canSelectBlackOutBar : canSelectWhiteOutBar) ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.2)'
            }}
          >
            {(myColor === 'White' ? blackOutBar : whiteOutBar).slice(0, 5).map((_, idx) => (
              <div key={`opponent-out-${idx}`} style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: myColor === 'White' ? 'linear-gradient(145deg, #2a2a2a, #1a1a1a)' : 'linear-gradient(145deg, #ffffff, #e0e0e0)',
                border: myColor === 'White' ? '2px solid #444' : '2px solid #ccc',
                marginTop: idx === 0 ? 0 : '-14px',
                boxShadow: myColor === 'White' ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            ))}
            {(myColor === 'White' ? blackOutBar : whiteOutBar).length > 5 && (
              <div style={{ color: myColor === 'White' ? '#fff' : '#333', fontSize: '9px', marginTop: '2px' }}>+{(myColor === 'White' ? blackOutBar : whiteOutBar).length - 5}</div>
            )}
            {(myColor === 'White' ? blackOutBar : whiteOutBar).length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '8px' }}>{myColor === 'White' ? '⚫' : '⚪'}</div>
            )}
          </div>

          {/* Benim Kırılan Taşlarım - Altta */}
          <div
            onClick={() => (myColor === 'White' ? canSelectWhiteOutBar : canSelectBlackOutBar) && handleSelectPosition(myColor === 'White' ? 'WhiteOutBar' : 'BlackOutBar')}
            style={{
              width: '100%',
              minHeight: '70px',
              background: (myColor === 'White' ? canSelectWhiteOutBar : canSelectBlackOutBar) ? '#FFD700' : (myColor === 'White' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.4)'),
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: '4px',
              cursor: (myColor === 'White' ? canSelectWhiteOutBar : canSelectBlackOutBar) ? 'pointer' : 'default',
              border: (myColor === 'White' ? canSelectWhiteOutBar : canSelectBlackOutBar) ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.2)'
            }}
          >
            {(myColor === 'White' ? whiteOutBar : blackOutBar).slice(0, 5).map((_, idx) => (
              <div key={`my-out-${idx}`} style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: myColor === 'White' ? 'linear-gradient(145deg, #ffffff, #e0e0e0)' : 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
                border: myColor === 'White' ? '2px solid #ccc' : '2px solid #444',
                marginTop: idx === 0 ? 0 : '-14px',
                boxShadow: myColor === 'White' ? '0 2px 4px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.3)'
              }} />
            ))}
            {(myColor === 'White' ? whiteOutBar : blackOutBar).length > 5 && (
              <div style={{ color: myColor === 'White' ? '#333' : '#fff', fontSize: '9px', marginTop: '2px' }}>+{(myColor === 'White' ? whiteOutBar : blackOutBar).length - 5}</div>
            )}
            {(myColor === 'White' ? whiteOutBar : blackOutBar).length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '8px' }}>{myColor === 'White' ? '⚪' : '⚫'}</div>
            )}
          </div>

          {/* Scoreboard - Oyuncu bilgileri ve skor */}
          <div style={{
            width: '100%',
            marginTop: 'auto',
            background: 'linear-gradient(145deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))',
            borderRadius: '10px',
            padding: '8px 5px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              fontSize: '8px',
              color: '#f39c12',
              textAlign: 'center',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              🏆 El {currentRound} / {targetScore} El
            </div>
            {players.map((p) => (
              <div key={p.id} style={{
                padding: '6px 5px',
                background: p.color === 'White'
                  ? 'linear-gradient(145deg, #f5f5f5, #e0e0e0)'
                  : 'linear-gradient(145deg, #3a3a3a, #2a2a2a)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                border: p.id === playerId ? '2px solid #f39c12' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}>
                {/* Nick üstte */}
                <span style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  color: p.color === 'White' ? '#333' : '#fff',
                  width: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textAlign: 'center'
                }}>
                  {p.name.substring(0, 10)}
                </span>
                {/* Skor altta */}
                <span style={{
                  fontWeight: 'bold',
                  fontSize: '20px',
                  color: p.color === 'White' ? '#333' : '#fff',
                  textShadow: p.color === 'White' ? 'none' : '0 1px 2px rgba(0,0,0,0.5)',
                  lineHeight: '1'
                }}>
                  {p.color === 'White' ? whiteScore : blackScore}
                </span>
              </div>
            ))}

            {/* Pes Et Butonu */}
            {surrenderRequestedBy === playerId ? (
              // Ben pes isteği gönderdim, iptal butonu göster
              <button
                onClick={handleCancelSurrender}
                style={{
                  marginTop: '8px',
                  padding: '6px 8px',
                  fontSize: '9px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: 'linear-gradient(145deg, #7f8c8d, #95a5a6)',
                  color: '#fff',
                  width: '100%'
                }}
              >
                ⏳ İptal Et
              </button>
            ) : !surrenderRequestedBy ? (
              // Bekleyen istek yok, pes et butonu göster
              <button
                onClick={handleRequestSurrender}
                style={{
                  marginTop: '8px',
                  padding: '6px 8px',
                  fontSize: '9px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: 'linear-gradient(145deg, #c0392b, #e74c3c)',
                  color: '#fff',
                  width: '100%'
                }}
              >
                🏳️ Pes Et
              </button>
            ) : null}
          </div>
        </div>

        {/* Orta - Tahta */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          overflow: 'hidden',
          paddingTop: '3px'
        }}>
          <div style={{ width: 'fit-content', height: 'fit-content' }}>
            <BoardTop game={frontendGame} thisMove={frontendThisMove} select={handleSelectPosition} perspective={myColor} />
            <BoardBottom
              game={frontendGame}
              thisMove={frontendThisMove}
              rollDice={handleRollDice}
              startGame={() => {}}
              select={handleSelectPosition}
            />
          </div>
        </div>

        {/* Sağ - Toplanan Taşlar (EndBar) + Zar */}
        <div style={{
          width: '85px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '5px',
          padding: '10px 3px',
          background: 'rgba(0,0,0,0.2)'
        }}>
          {/* Rakibin Toplanan Taşları - Üstte */}
          <div
            style={{
              width: '100%',
              minHeight: '90px',
              background: myColor === 'White' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: '6px 4px',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            {(myColor === 'White' ? blackEndBar : whiteEndBar).slice(0, 5).map((_, idx) => (
              <div key={`opponent-end-${idx}`} style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: myColor === 'White' ? 'linear-gradient(145deg, #2a2a2a, #1a1a1a)' : 'linear-gradient(145deg, #ffffff, #e0e0e0)',
                border: myColor === 'White' ? '2px solid #444' : '2px solid #ccc',
                marginTop: idx === 0 ? 0 : '-14px',
                boxShadow: myColor === 'White' ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            ))}
            {(myColor === 'White' ? blackEndBar : whiteEndBar).length > 5 && (
              <div style={{ color: myColor === 'White' ? '#fff' : '#333', fontSize: '9px', marginTop: '2px' }}>+{(myColor === 'White' ? blackEndBar : whiteEndBar).length - 5}</div>
            )}
            {(myColor === 'White' ? blackEndBar : whiteEndBar).length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{myColor === 'White' ? '⚫' : '⚪'}</div>
            )}
            <div style={{ color: myColor === 'White' ? '#fff' : '#333', fontSize: '10px', fontWeight: 'bold', marginTop: '4px' }}>{(myColor === 'White' ? blackEndBar : whiteEndBar).length}/15</div>
          </div>

          {/* Zar Alanı - Ortada */}
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 0'
          }}>
            {/* Açılış zarı aşaması */}
            {isOpeningRoll && (
              <div style={{
                padding: '6px',
                background: 'linear-gradient(145deg, rgba(243,156,18,0.3), rgba(230,126,34,0.3))',
                color: '#fff',
                borderRadius: '8px',
                textAlign: 'center',
                width: '100%',
                border: '1px solid rgba(243,156,18,0.5)'
              }}>
                <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '4px' }}>🎲 Kim Başlayacak?</div>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '4px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '8px' }}>⚪</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      {whiteOpeningDice !== null ? whiteOpeningDice : '?'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '8px' }}>⚫</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      {blackOpeningDice !== null ? blackOpeningDice : '?'}
                    </div>
                  </div>
                </div>
                {myOpeningDiceRolled ? (
                  <div style={{ fontSize: '8px', color: '#2ecc71' }}>Rakip bekleniyor...</div>
                ) : (
                  <div style={{ fontSize: '8px', color: '#f39c12' }}>Zar at!</div>
                )}
              </div>
            )}

            {/* Normal zar sonucu */}
            {!isOpeningRoll && diceValues && diceValues.length > 0 && (
              <div style={{
                padding: '6px',
                background: 'linear-gradient(145deg, rgba(139,69,19,0.9), rgba(101,67,33,0.9))',
                borderRadius: '10px',
                textAlign: 'center',
                width: '100%',
                boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '6px',
                  marginBottom: '4px'
                }}>
                  {diceValues.map((value, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: '32px',
                        height: '32px',
                        background: 'linear-gradient(145deg, #ffffff, #e8e8e8)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#1a1a1a',
                        boxShadow: '0 3px 6px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.1)',
                        animation: isDiceRolling ? 'diceRoll 0.5s ease-out' : 'none',
                        opacity: availableDice.includes(value) ? 1 : 0.4,
                        transform: availableDice.includes(value) ? 'none' : 'scale(0.9)'
                      }}
                    >
                      {renderDiceDots(value)}
                    </div>
                  ))}
                </div>
                {availableDice.length > 0 && availableDice.length < diceValues.length && (
                  <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.7)' }}>
                    Kalan: {availableDice.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Zar at butonu */}
            <button
              onClick={handleRollDice}
              disabled={isOpeningRoll ? myOpeningDiceRolled : (!isMyTurn() || diceRolled)}
              style={{
                padding: '8px',
                fontSize: '11px',
                fontWeight: '700',
                border: 'none',
                borderRadius: '8px',
                cursor: (isOpeningRoll ? !myOpeningDiceRolled : (isMyTurn() && !diceRolled)) ? 'pointer' : 'not-allowed',
                background: (isOpeningRoll ? !myOpeningDiceRolled : (isMyTurn() && !diceRolled))
                  ? 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)'
                  : 'linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%)',
                color: '#fff',
                width: '100%',
                opacity: (isOpeningRoll ? !myOpeningDiceRolled : (isMyTurn() && !diceRolled)) ? 1 : 0.6
              }}
            >
              🎲 {isOpeningRoll ? 'Başlangıç Zarı' : 'Zar At'}
            </button>
          </div>

          {/* Benim Toplanan Taşlarım - Altta */}
          <div
            onClick={() => {
              const canBearOff = validMoves.some(m => m.isBearOff);
              if (canBearOff) {
                handleSelectPosition(-2);
              }
            }}
            style={{
              width: '100%',
              minHeight: '90px',
              background: (() => {
                const canBearOff = validMoves.some(m => m.isBearOff);
                return canBearOff ? '#FFD700' : (myColor === 'White' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.4)');
              })(),
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: '6px 4px',
              cursor: (() => {
                const canBearOff = validMoves.some(m => m.isBearOff);
                return canBearOff ? 'pointer' : 'default';
              })(),
              border: (() => {
                const canBearOff = validMoves.some(m => m.isBearOff);
                return canBearOff ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.2)';
              })()
            }}
          >
            {(myColor === 'White' ? whiteEndBar : blackEndBar).slice(0, 5).map((_, idx) => (
              <div key={`my-end-${idx}`} style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: myColor === 'White' ? 'linear-gradient(145deg, #ffffff, #e0e0e0)' : 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
                border: myColor === 'White' ? '2px solid #ccc' : '2px solid #444',
                marginTop: idx === 0 ? 0 : '-14px',
                boxShadow: myColor === 'White' ? '0 2px 4px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.3)'
              }} />
            ))}
            {(myColor === 'White' ? whiteEndBar : blackEndBar).length > 5 && (
              <div style={{ color: myColor === 'White' ? '#333' : '#fff', fontSize: '9px', marginTop: '2px' }}>+{(myColor === 'White' ? whiteEndBar : blackEndBar).length - 5}</div>
            )}
            {(myColor === 'White' ? whiteEndBar : blackEndBar).length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '8px' }}>{myColor === 'White' ? '⚪' : '⚫'}</div>
            )}
            <div style={{ color: myColor === 'White' ? '#333' : '#fff', fontSize: '10px', fontWeight: 'bold', marginTop: '3px' }}>{(myColor === 'White' ? whiteEndBar : blackEndBar).length}/15</div>
          </div>
        </div>

        {/* Pes İsteği Modal - Rakip pes etmek istiyor */}
        {showSurrenderModal && surrenderRequestedBy && surrenderRequestedBy !== playerId && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 150,
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{
              background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
              borderRadius: '20px',
              padding: '30px 40px',
              textAlign: 'center',
              border: '2px solid #e74c3c',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>🏳️</div>
              <h2 style={{
                color: '#e74c3c',
                fontSize: '24px',
                margin: '0 0 10px 0',
                fontWeight: 'bold'
              }}>
                Pes İsteği
              </h2>
              <p style={{
                color: '#fff',
                fontSize: '18px',
                margin: '0 0 25px 0'
              }}>
                <strong>{surrenderRequestedByName}</strong> pes etmek istiyor.
              </p>
              <p style={{
                color: '#aaa',
                fontSize: '14px',
                margin: '0 0 25px 0'
              }}>
                Kabul ederseniz bu eli kazanırsınız (+1 puan)
              </p>
              <div style={{
                display: 'flex',
                gap: '15px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={handleAcceptSurrender}
                  style={{
                    background: 'linear-gradient(145deg, #27ae60, #1e8449)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 30px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(39, 174, 96, 0.4)'
                  }}
                >
                  ✅ Kabul Et
                </button>
                <button
                  onClick={handleRejectSurrender}
                  style={{
                    background: 'linear-gradient(145deg, #7f8c8d, #95a5a6)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 30px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(127, 140, 141, 0.4)'
                  }}
                >
                  ❌ Reddet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* El Sonu Overlay */}
        {showRoundEndScreen && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100,
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{
              background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
              borderRadius: '20px',
              padding: '30px 40px',
              textAlign: 'center',
              border: '2px solid #f39c12',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>
                {roundWinnerColor === 'White' ? '⚪' : '⚫'}
              </div>
              {isRoundMars && (
                <div style={{
                  background: 'linear-gradient(145deg, #e74c3c, #c0392b)',
                  color: '#fff',
                  padding: '8px 20px',
                  borderRadius: '20px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  marginBottom: '15px',
                  animation: 'pulse 1s infinite'
                }}>
                  🔥 MARS! (+2 Puan)
                </div>
              )}
              {isSurrender && !isRoundMars && (
                <div style={{
                  background: 'linear-gradient(145deg, #7f8c8d, #95a5a6)',
                  color: '#fff',
                  padding: '8px 20px',
                  borderRadius: '20px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  marginBottom: '15px'
                }}>
                  🏳️ Pes Edildi
                </div>
              )}
              <h2 style={{
                color: '#f39c12',
                fontSize: '24px',
                margin: '0 0 10px 0',
                fontWeight: 'bold'
              }}>
                El {currentRound - 1} Kazananı
              </h2>
              <p style={{
                color: '#fff',
                fontSize: '20px',
                margin: '0 0 5px 0'
              }}>
                {roundWinnerName}
              </p>
              {!isRoundMars && (
                <p style={{
                  color: '#aaa',
                  fontSize: '14px',
                  margin: '0 0 15px 0'
                }}>
                  +1 Puan
                </p>
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '30px',
                marginBottom: '25px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: '#aaa' }}>Beyaz</div>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff' }}>{whiteScore}</div>
                </div>
                <div style={{
                  fontSize: '24px',
                  color: '#f39c12',
                  alignSelf: 'center'
                }}>-</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: '#aaa' }}>Siyah</div>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff' }}>{blackScore}</div>
                </div>
              </div>
              <p style={{
                color: '#aaa',
                fontSize: '14px',
                marginBottom: '20px'
              }}>
                5 puana ulaşan maçı kazanır
              </p>
              <button
                onClick={handleStartNewRound}
                style={{
                  background: 'linear-gradient(145deg, #27ae60, #1e8449)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '15px 40px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(39, 174, 96, 0.4)'
                }}
              >
                Sonraki El →
              </button>
            </div>
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
              }
              @keyframes diceRoll {
                0% { transform: rotate(0deg) scale(0.5); opacity: 0; }
                25% { transform: rotate(180deg) scale(1.2); opacity: 1; }
                50% { transform: rotate(360deg) scale(0.9); }
                75% { transform: rotate(540deg) scale(1.1); }
                100% { transform: rotate(720deg) scale(1); }
              }
              @keyframes diceBounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
              }
            `}</style>
          </div>
        )}
      </div>
    );
  }

  // ===============================
  // RENDER - FINISHED
  // ===============================

  if (gamePhase === 'finished') {
    return (
      <div style={styles.container}>
        <div style={styles.centerContent}>
          <div style={styles.gameOverIcon}>🏆</div>
          <h1 style={styles.gameOverTitle}>{isMatchOver ? 'Maç Bitti!' : 'Oyun Bitti!'}</h1>
          <p style={styles.gameOverMessage}>{gameOverMessage}</p>

          {/* Maç Skoru */}
          {isMatchOver && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '30px',
              marginBottom: '20px',
              padding: '20px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '15px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '5px' }}>⚪ Beyaz</div>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#fff' }}>{whiteScore}</div>
              </div>
              <div style={{ fontSize: '36px', color: '#f39c12' }}>-</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '5px' }}>⚫ Siyah</div>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#fff' }}>{blackScore}</div>
              </div>
            </div>
          )}

          <div style={styles.finalScores}>
            {players.map((p) => (
              <div
                key={p.id}
                style={{
                  ...styles.scoreRow,
                  background: winner === p.name ? 'rgba(39, 174, 96, 0.3)' :
                             (p.id === playerId ? 'rgba(52, 152, 219, 0.3)' : 'transparent')
                }}
              >
                <span>{p.color === 'White' ? '⚪' : '⚫'} {p.name}</span>
                <span style={{ fontWeight: 'bold' }}>
                  {p.color === 'White' ? whiteScore : blackScore} El
                  {winner === p.name && ' 🏆'}
                </span>
              </div>
            ))}
          </div>

          <div style={styles.buttonGroup}>
            <button onClick={handlePlayAgain} style={styles.primaryButton}>
              🔄 Yeni Maç
            </button>
            <button onClick={handleBack} style={styles.secondaryButton}>
              ← Ana Menü
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ===============================
// STYLES
// ===============================

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    position: 'relative',
    overflow: 'auto'
  },
  centerContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    width: '100%',
    maxWidth: 400
  },
  gameIcon: { fontSize: 64 },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#fff',
    margin: 0,
    textAlign: 'center'
  },
  loadingText: { color: 'rgba(255,255,255,0.7)', fontSize: 16 },
  errorText: { color: '#e74c3c', fontSize: 16 },
  spinner: {
    width: 40,
    height: 40,
    border: '4px solid rgba(255,255,255,0.2)',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  topBackButton: {
    position: 'absolute',
    top: 15,
    left: 15,
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    zIndex: 10
  },
  primaryButton: {
    width: '100%',
    padding: '16px',
    fontSize: 18,
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer'
  },
  secondaryButton: {
    width: '100%',
    padding: '14px',
    fontSize: 16,
    color: '#fff',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 10,
    cursor: 'pointer'
  },
  gameOverIcon: { fontSize: 80 },
  gameOverTitle: { fontSize: 32, fontWeight: 700, color: '#fff', margin: 0 },
  gameOverMessage: { fontSize: 20, color: 'rgba(255,255,255,0.8)', textAlign: 'center', margin: 0 },
  finalScores: { width: '100%', display: 'flex', flexDirection: 'column', gap: 8 },
  scoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 16
  },
  buttonGroup: { display: 'flex', flexDirection: 'column', gap: 12, width: '100%', marginTop: 12 }
};
