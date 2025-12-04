'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/contexts/UserContext';

type ColorKey = 'red' | 'green' | 'yellow' | 'blue';

interface LudoPlayer {
  id: string;
  name: string;
  color: number | ColorKey;
  pieces: number[];
  isActive: boolean;
  hasFinished: boolean;
  finishedPieces: number;
  finishRank: number;  // 0 = henüz bitirmedi, 1 = 1., 2 = 2., vs.
}

interface LudoRanking {
  rank: number;
  playerId: string;
  playerName: string;
  color: number | ColorKey;
}

const getColorKey = (color: number | ColorKey): ColorKey => {
  if (typeof color === 'string') return color as ColorKey;
  const colorMap: ColorKey[] = ['red', 'green', 'yellow', 'blue'];
  return colorMap[color] || 'red';
};

interface LudoGameProps {
  onBack?: () => void;
  joinRoomId?: string;
  customerCode: string;
}

const COLORS = {
  red: { main: '#e74c3c', light: '#ffcdd2', dark: '#c0392b', glow: '#ff6b6b', gradient: ['#e74c3c', '#c0392b'] },
  green: { main: '#2ecc71', light: '#d5f4e3', dark: '#1e8449', glow: '#58d68d', gradient: ['#2ecc71', '#1e8449'] },
  yellow: { main: '#f39c12', light: '#fef3cd', dark: '#d68910', glow: '#f7dc6f', gradient: ['#f1c40f', '#d68910'] },
  blue: { main: '#3498db', light: '#d4edfc', dark: '#2471a3', glow: '#5dade2', gradient: ['#3498db', '#2471a3'] }
};

// Ana yol pozisyonları (52 kare) - 15x15 grid, SAAT YÖNÜNDE
// Mavi başlangıcından itibaren (position 0 = mavinin ilk adımı)
const MAIN_PATH: [number, number][] = [
  // MAVİ başlangıç - sol kol üst sırası, sağa git (pos 0-4)
  [1.5, 6.5], [2.5, 6.5], [3.5, 6.5], [4.5, 6.5], [5.5, 6.5],
  // Üst kola geçiş - üst kol sol sütunu, yukarı git (pos 5-10)
  [6.5, 5.5], [6.5, 4.5], [6.5, 3.5], [6.5, 2.5], [6.5, 1.5], [6.5, 0.5],
  // Üst köşe dönüşü - sağa git (pos 11-12)
  [7.5, 0.5], [8.5, 0.5],
  // YEŞİL başlangıç - üst kol sağ sütunu, aşağı git (pos 13-17)
  [8.5, 1.5], [8.5, 2.5], [8.5, 3.5], [8.5, 4.5], [8.5, 5.5],
  // Sağ kola geçiş - sağ kol üst sırası, sağa git (pos 18-23)
  [9.5, 6.5], [10.5, 6.5], [11.5, 6.5], [12.5, 6.5], [13.5, 6.5], [14.5, 6.5],
  // Sağ köşe dönüşü - aşağı git (pos 24-25)
  [14.5, 7.5], [14.5, 8.5],
  // SARI başlangıç - sağ kol alt sırası, sola git (pos 26-30)
  [13.5, 8.5], [12.5, 8.5], [11.5, 8.5], [10.5, 8.5], [9.5, 8.5],
  // Alt kola geçiş - alt kol sağ sütunu, aşağı git (pos 31-36)
  [8.5, 9.5], [8.5, 10.5], [8.5, 11.5], [8.5, 12.5], [8.5, 13.5], [8.5, 14.5],
  // Alt köşe dönüşü - sola git (pos 37-38)
  [7.5, 14.5], [6.5, 14.5],
  // KIRMIZI başlangıç - alt kol sol sütunu, yukarı git (pos 39-43)
  [6.5, 13.5], [6.5, 12.5], [6.5, 11.5], [6.5, 10.5], [6.5, 9.5],
  // Sol kola geçiş - sol kol alt sırası, sola git (pos 44-49)
  [5.5, 8.5], [4.5, 8.5], [3.5, 8.5], [2.5, 8.5], [1.5, 8.5], [0.5, 8.5],
  // Sol köşe dönüşü - yukarı git, mavi eve dönüş (pos 50-51)
  [0.5, 7.5], [0.5, 6.5],
];

// Her renk için başlangıç pozisyonu (ana yolda) - MAIN_PATH ve Backend ile eşleşmeli
// Mavi sol üst, Yeşil sağ üst, Kırmızı sol alt, Sarı sağ alt
const START_POSITIONS: Record<ColorKey, number> = {
  blue: 0,    // Mavi sol üst - [1.5, 6.5]
  green: 13,  // Yeşil sağ üst - [8.5, 1.5]
  yellow: 26, // Sarı sağ alt - [13.5, 8.5]
  red: 39     // Kırmızı sol alt - [6.5, 13.5]
};

// Her renk için ev yolu (6 kare) - merkeze doğru giden renkli kareler
// Resme göre: Mavi sol üst, Yeşil sağ üst, Kırmızı sol alt, Sarı sağ alt
const HOME_PATHS: Record<ColorKey, [number, number][]> = {
  blue: [[1.5, 7.5], [2.5, 7.5], [3.5, 7.5], [4.5, 7.5], [5.5, 7.5], [6.5, 7.5]],    // Sol üst - soldan merkeze yatay
  green: [[7.5, 1.5], [7.5, 2.5], [7.5, 3.5], [7.5, 4.5], [7.5, 5.5], [7.5, 6.5]],   // Sağ üst - üstten merkeze dikey
  red: [[7.5, 13.5], [7.5, 12.5], [7.5, 11.5], [7.5, 10.5], [7.5, 9.5], [7.5, 8.5]], // Sol alt - alttan merkeze dikey
  yellow: [[13.5, 7.5], [12.5, 7.5], [11.5, 7.5], [10.5, 7.5], [9.5, 7.5], [8.5, 7.5]] // Sağ alt - sağdan merkeze yatay
};

// Evdeki taş pozisyonları (köşelerdeki başlangıç evleri)
// Resme göre: Mavi sol üst, Yeşil sağ üst, Kırmızı sol alt, Sarı sağ alt
const HOME_POSITIONS: Record<ColorKey, [number, number][]> = {
  blue: [[1.5, 1.5], [4.5, 1.5], [1.5, 4.5], [4.5, 4.5]],         // Sol üst köşe
  green: [[10.5, 1.5], [13.5, 1.5], [10.5, 4.5], [13.5, 4.5]],    // Sağ üst köşe
  red: [[1.5, 10.5], [4.5, 10.5], [1.5, 13.5], [4.5, 13.5]],      // Sol alt köşe
  yellow: [[10.5, 10.5], [13.5, 10.5], [10.5, 13.5], [13.5, 13.5]] // Sağ alt köşe
};

// Taşın pozisyonunu hesapla
// Backend mutlak pozisyon saklar: -1=evde, 0-51=ana yol, 52-57=ev yolu, 57+=bitirdi
const getPiecePosition = (colorKey: ColorKey, piecePos: number): [number, number] | null => {
  if (piecePos === -1) return null; // Evde - ayrı render edilecek
  if (piecePos >= 57) return [7.5, 7.5]; // Merkez - oyunu bitirdi (FinishPosition=57)

  if (piecePos >= 52) {
    // Ev yolunda (52-56 arası = 5 adım, 57 = bitiş)
    const homeIndex = piecePos - 52;
    return HOME_PATHS[colorKey][homeIndex] || [7.5, 7.5];
  }

  // Ana yolda - backend zaten mutlak pozisyon gönderiyor, direkt kullan
  return MAIN_PATH[piecePos] || [7.5, 7.5];
};

export default function LudoGame({ onBack, joinRoomId, customerCode }: LudoGameProps) {
  const { currentUser } = useAuth();

  // EndUser ID - giriş yapmış kullanıcının benzersiz ID'si (reconnect için)
  const endUserId = currentUser?.id || currentUser?.userId || currentUser?.Id || null;

  // Connection
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Game setup - RPS pattern
  const [gamePhase, setGamePhase] = useState<'connecting' | 'waiting' | 'playing' | 'finished'>('connecting');
  const [autoRoomCreated, setAutoRoomCreated] = useState(false);
  const initialNickname = currentUser?.nickName || currentUser?.nickname || '';
  const [nickname, setNickname] = useState(initialNickname);
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);

  // Game state
  const [roomId, setRoomId] = useState(joinRoomId || '');
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<LudoPlayer[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [validMoves, setValidMoves] = useState<number[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [rankings, setRankings] = useState<LudoRanking[]>([]);
  const [gameMessage, setGameMessage] = useState('');
  const [error, setError] = useState('');
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);
  const [resultSubmitted, setResultSubmitted] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showInLobby, setShowInLobby] = useState(true); // Lobby'de göster
  const [kickTargetPlayer, setKickTargetPlayer] = useState<{id: string, name: string} | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const initialShowInLobbyRef = useRef(true); // İlk render'da sunucuya çağrı yapma

  // Refs for closures
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerIdRef = useRef('');
  const roomIdRef = useRef(joinRoomId || '');
  const gameStartTimeRef = useRef<Date | null>(null);
  const resultSubmittedRef = useRef(false);
  const nicknameRef = useRef(initialNickname);
  const onBackRef = useRef(onBack);
  const gamePhaseRef = useRef(gamePhase);

  const generatePlayerId = () => 'ludo_' + Math.random().toString(36).substr(2, 9);
  const generateRoomId = () => Math.floor(1000 + Math.random() * 9000).toString();

  const isMyTurn = useCallback(() => {
    if (players.length === 0) return false;
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer) return false;
    // Bitirmiş oyuncu oynamaz
    if (currentPlayer.hasFinished || currentPlayer.finishRank > 0) return false;
    return currentPlayer.id === playerIdRef.current;
  }, [players, currentPlayerIndex]);

  const generateRandomNickname = () => `Oyuncu#${Math.floor(1000 + Math.random() * 9000)}`;

  // API'ye oyun sonucu gönder (ref'leri kullanır - closure safe)
  const submitGameResultToApi = async (gameRankings: LudoRanking[], winnerName: string, gameDuration: number) => {
    if (resultSubmittedRef.current) return;

    try {
      // Sadece bu oyuncunun sonucunu gönder
      const myRanking = gameRankings.find(r => r.playerId === playerIdRef.current);
      if (!myRanking) return;

      const apiUrl = 'https://canlimenu.online/api/gameleaderboard/submit';

      // Skor hesapla: 1. = 100 puan, 2. = 75 puan, 3. = 50 puan, 4. = 25 puan
      const scoreByRank: Record<number, number> = { 1: 100, 2: 75, 3: 50, 4: 25 };
      const score = scoreByRank[myRanking.rank] || 0;

      const scoreData = {
        GameType: "Ludo",
        PlayerNickname: nicknameRef.current || myRanking.playerName,
        Score: score,
        VenueCode: customerCode || 'demo',
        DeviceType: /Mobi|Android/i.test(navigator.userAgent) ? "Mobile" : "Desktop",
        Duration: Math.round(gameDuration),
        GameData: JSON.stringify({
          rank: myRanking.rank,
          totalPlayers: gameRankings.length,
          winner: winnerName,
          rankings: gameRankings.map(r => ({
            rank: r.rank,
            playerName: r.playerName
          }))
        })
      };


      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scoreData)
      });

      if (response.ok) {
        resultSubmittedRef.current = true;
        setResultSubmitted(true);
      } else {
        console.error('Failed to submit game result:', response.status);
      }
    } catch (err) {
      console.error('Error submitting game result:', err);
    }
  };

  // SignalR Connection - RPS pattern (empty dependency array)
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

      // Helper function to normalize player data
      const normalizePlayersData = (playersData: any[]) => {
        if (!playersData) return [];
        return playersData.map((p: any) => ({
          ...p,
          id: p.id || p.Id,
          name: p.name || p.Name,
          color: p.color ?? p.Color,
          pieces: p.pieces || p.Pieces || [-1, -1, -1, -1],
          isActive: p.isActive ?? p.IsActive,
          hasFinished: p.hasFinished ?? p.HasFinished,
          finishedPieces: p.finishedPieces ?? p.FinishedPieces ?? 0,
          finishRank: p.finishRank ?? p.FinishRank ?? 0
        }));
      };

      // Helper function to normalize rankings data
      const normalizeRankings = (rankingsData: any[]) => {
        if (!rankingsData) return [];
        return rankingsData.map((r: any) => ({
          rank: r.rank ?? r.Rank,
          playerId: r.playerId || r.PlayerId,
          playerName: r.playerName || r.PlayerName,
          color: r.color ?? r.Color
        }));
      };

      newConnection.on('LudoRoomCreated', (data: any) => {
        if (data.success) {
          const room = data.room || data.Room;
          const newRoomId = room?.id || room?.Id || data.roomId;
          setRoomId(newRoomId);
          roomIdRef.current = newRoomId;
          setGamePhase('waiting');
          setIsHost(true);
          setPlayers(normalizePlayersData(room?.players || room?.Players));
          setGameMessage('Arkadaşlarını davet et!');

          // Global event dispatch - Lobby'nin görmesi için
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('gameRoomCreated', {
              detail: {
                id: newRoomId,
                roomId: newRoomId,
                gameType: 'Ludo',
                type: 'ludo',
                status: 'Waiting',
                hostPlayerName: nicknameRef.current,
                players: normalizePlayersData(room?.players || room?.Players),
                maxPlayers: 4,
                created: new Date().toISOString()
              }
            }));
          }
        }
      });

      newConnection.on('LudoGameJoined', (data: any) => {
        if (data.success) {
          const room = data.room || data.Room;
          const newRoomId = room?.id || room?.Id || data.roomId;
          const isReconnect = data.isReconnect || data.IsReconnect;
          const gameState = data.gameState || data.GameState || room?.state || room?.State;

          setRoomId(newRoomId);
          roomIdRef.current = newRoomId;
          setPlayers(normalizePlayersData(room?.players || room?.Players));
          setIsHost(false);

          if (isReconnect) {
            // Reconnect - oyun state'ini restore et
            const stateStr = typeof gameState === 'string' ? gameState : 'Waiting';
            if (stateStr === 'Playing' || gameState === 1) {
              setGamePhase('playing');
              setCurrentPlayerIndex(data.currentPlayerIndex ?? data.CurrentPlayerIndex ?? 0);
              if (data.lastDiceValue || data.LastDiceValue) {
                setDiceValue(data.lastDiceValue || data.LastDiceValue);
              }
              setGameMessage('Oyuna geri döndün!');
              // Oyun başlangıç zamanını şimdi olarak ayarla (reconnect için)
              if (!gameStartTimeRef.current) {
                const startTime = new Date();
                setGameStartTime(startTime);
                gameStartTimeRef.current = startTime;
              }
            } else if (stateStr === 'Finished' || gameState === 2) {
              setGamePhase('finished');
              setGameMessage('Oyun bitti');
            } else {
              setGamePhase('waiting');
              setGameMessage('Oyuna geri döndün!');
            }
          } else {
            // Yeni katılım
            setGamePhase('waiting');
            setGameMessage('Odaya katıldın!');
          }
        }
      });

      newConnection.on('LudoPlayerReconnected', (data: any) => {
        const normalizedPlayers = normalizePlayersData(data.players || data.Players);
        setPlayers(normalizedPlayers);
        setGameMessage(`${data.playerName || data.PlayerName} geri döndü!`);
      });

      newConnection.on('LudoPlayerDisconnected', (data: any) => {
        const normalizedPlayers = normalizePlayersData(data.players || data.Players);
        setPlayers(normalizedPlayers);
        setGameMessage(`${data.playerName || data.PlayerName} bağlantısı koptu, bekleniyor...`);
      });

      newConnection.on('LudoPlayerJoined', (data: any) => {
        const playersData = data.players || data.Players || [];
        const normalizedPlayers = normalizePlayersData(playersData);
        setPlayers(normalizedPlayers);
        setGameMessage(`${data.playerName || data.PlayerName} katıldı!`);

        // Global event dispatch - Lobby güncellemesi için
        if (typeof window !== 'undefined' && roomIdRef.current) {
          window.dispatchEvent(new CustomEvent('gameRoomUpdated', {
            detail: {
              id: roomIdRef.current,
              roomId: roomIdRef.current,
              gameType: 'Ludo',
              type: 'ludo',
              status: 'Waiting',
              players: normalizedPlayers,
              maxPlayers: 4
            }
          }));
        }
      });

      newConnection.on('LudoPlayerLeft', (data: any) => {
        const normalizedPlayers = normalizePlayersData(data.players || data.Players);
        setPlayers(normalizedPlayers);

        // Oda boşaldıysa lobby'den kaldır
        if (normalizedPlayers.length === 0 && typeof window !== 'undefined' && roomIdRef.current) {
          window.dispatchEvent(new CustomEvent('gameRoomDeleted', {
            detail: { roomId: roomIdRef.current }
          }));
        } else if (typeof window !== 'undefined' && roomIdRef.current) {
          // Oyuncu ayrıldı, lobby'yi güncelle
          window.dispatchEvent(new CustomEvent('gameRoomUpdated', {
            detail: {
              id: roomIdRef.current,
              roomId: roomIdRef.current,
              gameType: 'Ludo',
              type: 'ludo',
              status: 'Waiting',
              players: normalizedPlayers,
              maxPlayers: 4
            }
          }));
        }

        // Oyun başlamışsa ve 1 kişi kaldıysa, oyunu bitir ve lobby'ye dön
        if (gamePhaseRef.current === 'playing' && normalizedPlayers.length <= 1) {
          setGameMessage('😢 Diğer oyuncular ayrıldı! Lobby\'ye dönülüyor...');
          setGamePhase('finished');

          // 3 saniye sonra otomatik çıkış
          setTimeout(() => {
            if (onBackRef.current) {
              onBackRef.current();
            }
          }, 3000);
        }
      });

      // Oyuncu kovuldu
      newConnection.on('LudoPlayerKicked', (data: any) => {
        // Ben kovuldum mu?
        if (data.kickedPlayerId === playerIdRef.current) {
          alert('Oda sahibi sizi odadan çıkardı.');
          if (onBackRef.current) {
            onBackRef.current();
          }
        } else {
          // Başka biri kovuldu, oyuncu listesini güncelle
          const normalizedPlayers = normalizePlayersData(data.players || data.Players);
          setPlayers(normalizedPlayers);
        }
      });

      newConnection.on('LudoGameStarted', (data: any) => {
        setPlayers(normalizePlayersData(data.players || data.Players));
        setCurrentPlayerIndex(0);
        setGamePhase('playing');
        setDiceValue(null);
        setGameMessage('Oyun başladı!');
        const startTime = new Date();
        setGameStartTime(startTime);
        gameStartTimeRef.current = startTime;
        setResultSubmitted(false);
        resultSubmittedRef.current = false;

        // Global event dispatch - Lobby'de oyun başladı olarak göster
        if (typeof window !== 'undefined' && roomIdRef.current) {
          window.dispatchEvent(new CustomEvent('gameStarted', {
            detail: { roomId: roomIdRef.current, id: roomIdRef.current, gameType: 'Ludo' }
          }));
        }
      });

      newConnection.on('LudoDiceRolled', (data: any) => {
        setDiceValue(data.value);
        setIsRolling(false);

        // Sadece zar atan oyuncu için validMoves'u set et
        // Diğer oyuncular için boş bırak (onların taşları highlight olmasın)
        if (data.playerId === playerIdRef.current) {
          setValidMoves(data.validMoves || []);
          if (data.validMoves?.length === 0) {
            setGameMessage(`${data.value} geldi - hareket yok`);
          } else {
            setGameMessage(`${data.value} geldi - taş seç`);
          }
        } else {
          setValidMoves([]); // Diğer oyuncuların taşları seçilebilir görünmesin
        }
      });

      newConnection.on('LudoPieceMoved', (data: any) => {
        const captured = data.captured || data.Captured;
        const reachedHome = data.reachedHome || data.ReachedHome;

        const normalizedPlayers = normalizePlayersData(data.players || data.Players);
        const normalizedRankings = normalizeRankings(data.rankings || data.Rankings);

        // Debug: Log all piece positions
        normalizedPlayers.forEach((p: any) => {
        });

        setPlayers(normalizedPlayers);
        setRankings(normalizedRankings);
        setValidMoves([]);
        setDiceValue(null);

        if (captured) {
          setGameMessage('🎯 Rakip yendi! Tekrar at!');
        } else if (reachedHome) {
          setGameMessage('🏠 Eve ulaştı!');
        }
      });

      newConnection.on('LudoPlayerFinished', (data: any) => {
        const rank = data.rank || data.Rank;
        const playerName = data.playerName || data.PlayerName;
        const remainingPlayers = data.remainingPlayers || data.RemainingPlayers;
        const normalizedRankings = normalizeRankings(data.rankings || data.Rankings);

        setRankings(normalizedRankings);
        setGameMessage(`🏆 ${playerName} ${rank}. oldu! ${remainingPlayers} oyuncu kaldı`);
      });

      newConnection.on('LudoTurnChanged', (data: any) => {
        const playersData = data.players || data.Players;
        if (playersData) {
          setPlayers(normalizePlayersData(playersData));
        }
        const normalizedRankings = normalizeRankings(data.rankings || data.Rankings);
        if (normalizedRankings.length > 0) {
          setRankings(normalizedRankings);
        }
        const playerIndex = data.currentPlayerIndex ?? data.CurrentPlayerIndex ?? 0;
        setCurrentPlayerIndex(playerIndex);
        setDiceValue(null);
        setValidMoves([]);
        const current = playersData?.[playerIndex];
        if (current) setGameMessage(`${current.name || current.Name} oynuyor`);
      });

      // Reconnect sonrası oyun durumunu almak için
      newConnection.on('LudoGameState', (data: any) => {
        console.log('[Ludo] Game state received:', data);
        const room = data.room || data.Room || data;

        // Oyuncu listesi
        const playersData = room.players || room.Players;
        if (playersData) {
          setPlayers(normalizePlayersData(playersData));
        }

        // Sıra bilgisi
        const playerIndex = room.currentPlayerIndex ?? room.CurrentPlayerIndex;
        if (playerIndex !== undefined) {
          setCurrentPlayerIndex(playerIndex);
        }

        // Zar bilgisi
        const lastDice = room.lastDiceValue ?? room.LastDiceValue ?? room.diceValue ?? room.DiceValue;
        if (lastDice) {
          setDiceValue(lastDice);
        }

        // Valid moves
        const moves = room.validMoves || room.ValidMoves;
        if (moves) {
          setValidMoves(moves);
        }

        // Rankings
        const rankings = room.rankings || room.Rankings;
        if (rankings) {
          setRankings(normalizeRankings(rankings));
        }

        // Game phase
        const stateStr = room.state || room.State;
        if (stateStr === 'Playing' || stateStr === 1) {
          setGamePhase('playing');
        } else if (stateStr === 'Finished' || stateStr === 2) {
          setGamePhase('finished');
        }
      });

      newConnection.on('LudoGameFinished', (data: any) => {
        const normalizedRankings = normalizeRankings(data.rankings || data.Rankings);
        const winnerName = data.winnerName || data.WinnerName;
        setRankings(normalizedRankings);
        setWinner(winnerName);
        setGamePhase('finished');
        setGameMessage(`${winnerName} kazandı!`);

        // Global event dispatch - Oyun bitti, lobby'den kaldır
        if (typeof window !== 'undefined' && roomIdRef.current) {
          window.dispatchEvent(new CustomEvent('gameRoomDeleted', {
            detail: { roomId: roomIdRef.current }
          }));
        }

        // API'ye sonuç gönder
        const gameEndTime = new Date();
        const startTime = gameStartTimeRef.current;
        const duration = startTime ? (gameEndTime.getTime() - startTime.getTime()) / 1000 : 0;

        // API submit - ref'leri kullan
        submitGameResultToApi(normalizedRankings, winnerName, duration);
      });

      newConnection.on('LudoError', (data: any) => {
        setError(data.message);
      });

      // Host odadan çıktığında oda kapandı
      newConnection.on('LudoRoomClosed', (data: any) => {
        alert(data.reason || 'Oda kapatıldı');
        // Ana sayfaya dön
        if (onBack) {
          onBack();
        }
      });

      // Reconnect olduğunda odaya tekrar katıl
      newConnection.onreconnected(async () => {
        console.log('[Ludo] SignalR reconnected, rejoining room...');
        setIsConnected(true);

        // Oda varsa tekrar katıl
        if (roomIdRef.current && playerIdRef.current) {
          try {
            await newConnection.invoke('JoinLudoRoom', roomIdRef.current, playerIdRef.current, nicknameRef.current, endUserId);
            console.log('[Ludo] Rejoined room after reconnect');

            // Oyun state'ini yeniden al (sıra, zar vs.)
            setTimeout(async () => {
              try {
                await newConnection.invoke('GetLudoGameState', roomIdRef.current, playerIdRef.current);
              } catch (e) {
                // Backend bu metodu desteklemeyebilir, sessizce geç
                console.log('[Ludo] GetLudoGameState not supported or failed');
              }
            }, 500);
          } catch (err) {
            console.error('[Ludo] Failed to rejoin room:', err);
          }
        }
      });

      newConnection.onreconnecting(() => {
        console.log('[Ludo] SignalR reconnecting...');
        setIsConnected(false);
        setGameMessage('Bağlantı koptu, yeniden bağlanılıyor...');
      });

      newConnection.onclose(() => {
        console.log('[Ludo] SignalR connection closed');
        setIsConnected(false);
      });

      try {
        await newConnection.start();
        setIsConnected(true);
        setConnection(newConnection);
        connectionRef.current = newConnection;

        // Generate playerId on connection - RPS pattern
        const newPlayerId = generatePlayerId();
        setPlayerId(newPlayerId);
        playerIdRef.current = newPlayerId;
      } catch (err) {
        console.error('Connection error:', err);
        setError('Bağlantı hatası');
      }
    };

    setupConnection();
    return () => {
      // Component unmount olduğunda odadan çık
      const currentPlayerId = playerIdRef.current;
      const currentRoomId = roomIdRef.current;
      const conn = connectionRef.current;

      if (conn && currentRoomId && currentPlayerId) {
        conn.invoke('LeaveLudoRoom', currentRoomId, currentPlayerId).catch(err => {
          console.error('[Ludo] Error leaving room on unmount:', err);
        });
      }

      conn?.stop();
    };
  }, []); // Empty dependency array - RPS pattern

  // Auto-join from lobby - separate useEffect like RPS
  useEffect(() => {
    if (joinRoomId && isConnected && connection && !autoJoinAttempted && playerId) {
      setAutoJoinAttempted(true);
      const joinNickname = nickname || generateRandomNickname();
      setRoomId(joinRoomId);
      roomIdRef.current = joinRoomId;
      setNickname(joinNickname);
      nicknameRef.current = joinNickname;
      setGamePhase('waiting');
      setIsHost(false);
      connection.invoke('JoinLudoRoom', joinRoomId, playerId, joinNickname, endUserId).catch(console.error);
    }
  }, [joinRoomId, isConnected, connection, autoJoinAttempted, playerId, nickname]);

  // Otomatik oda oluştur - joinRoomId yoksa
  useEffect(() => {
    if (!joinRoomId && isConnected && connection && !autoRoomCreated && playerId) {
      setAutoRoomCreated(true);
      const createNickname = nickname || generateRandomNickname();
      const rid = generateRoomId();
      setRoomId(rid);
      roomIdRef.current = rid;
      setNickname(createNickname);
      nicknameRef.current = createNickname;
      setIsHost(true);
      connection.invoke('CreateLudoRoom', rid, playerId, createNickname, 'global', endUserId, true).catch(console.error); // Evrensel lobby
    }
  }, [joinRoomId, isConnected, connection, autoRoomCreated, playerId, nickname, customerCode]);

  // Oryantasyon kontrolü - dikey modda uyarı göster
  useEffect(() => {
    const checkOrientation = () => {
      // Sadece mobil cihazlarda kontrol et (genişlik < 1024px)
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

  // Keep refs updated
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    gamePhaseRef.current = gamePhase;
  }, [gamePhase]);

  // Lobby görünürlüğü değiştiğinde sunucuya bildir
  useEffect(() => {
    // İlk render'da çağırma
    if (initialShowInLobbyRef.current) {
      initialShowInLobbyRef.current = false;
      return;
    }

    // Sadece host ve oda varsa güncelle
    if (connection && roomId && isHost && gamePhase === 'waiting') {
      connection.invoke('SetLudoRoomVisibility', roomId, showInLobby).catch(console.error);
    }
  }, [showInLobby, connection, roomId, isHost, gamePhase]);

  const createRoom = async () => {
    if (!connection || !playerId) return;
    const rid = generateRoomId();
    const createNickname = nickname || generateRandomNickname();
    setNickname(createNickname);
    nicknameRef.current = createNickname;
    roomIdRef.current = rid;
    await connection.invoke('CreateLudoRoom', rid, playerId, createNickname, 'global', endUserId, showInLobby); // Evrensel lobby
  };

  const joinRoom = async (roomToJoin?: string) => {
    const targetRoom = roomToJoin || joinRoomInput.trim();
    if (!connection || !targetRoom || !playerId) return;
    const joinNickname = nickname || generateRandomNickname();
    setNickname(joinNickname);
    nicknameRef.current = joinNickname;
    setRoomId(targetRoom);
    roomIdRef.current = targetRoom;
    await connection.invoke('JoinLudoRoom', targetRoom, playerId, joinNickname, endUserId);
  };

  // Odadan çık ve geri dön
  const handleBack = useCallback(async () => {
    // Eğer odadaysak, önce odadan çık
    if (connection && roomId && playerId) {
      try {
        await connection.invoke('LeaveLudoRoom', roomId, playerId);
      } catch (err) {
        console.error('Error leaving room:', err);
      }
    }
    // Sonra geri dön
    if (onBack) {
      onBack();
    }
  }, [connection, roomId, playerId, onBack]);

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    if (isFullscreen) {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else if ((document as any).webkitFullscreenElement) {
          await (document as any).webkitExitFullscreen();
        }
      } catch (err) {
        console.error('[Ludo] Exit fullscreen error:', err);
      }
      setIsFullscreen(false);
    } else {
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
        console.error('[Ludo] Enter fullscreen error:', err);
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

  const copyRoomLink = async () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    // /game/ludo sayfasına yönlendir
    let link = `${baseUrl}/game/ludo?room=${roomId}`;
    if (customerCode) {
      link += `&code=${customerCode}`;
    }

    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Link kopyalanamadı:', err);
    }
  };

  const getShareUrl = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    let url = `${baseUrl}/game/ludo?room=${roomId}`;
    if (customerCode) {
      url += `&code=${customerCode}`;
    }
    return url;
  };

  const startGame = async () => {
    if (!connection || !isHost || players.length < 2) return;
    await connection.invoke('StartLudoGame', roomId);
  };

  // Oyuncuyu kovma onayı göster
  const showKickConfirm = (targetId: string, targetName: string) => {
    setKickTargetPlayer({ id: targetId, name: targetName });
  };

  // Kovmayı onayla
  const confirmKickPlayer = async () => {
    if (!connection || !roomId || !isHost || !kickTargetPlayer) return;
    try {
      await connection.invoke('LudoKickPlayer', roomId, playerIdRef.current, kickTargetPlayer.id);
      setKickTargetPlayer(null);
    } catch (err) {
      console.error('[Ludo] Kick player error:', err);
    }
  };

  // Kovmayı iptal et
  const cancelKickPlayer = () => {
    setKickTargetPlayer(null);
  };

  const rollDice = async () => {
    if (!connection || !isMyTurn() || isRolling || diceValue) return;
    setIsRolling(true);
    await connection.invoke('LudoRollDice', roomId, playerIdRef.current);
  };

  const movePiece = async (pieceIndex: number) => {
    if (!connection || !validMoves.includes(pieceIndex)) return;
    await connection.invoke('LudoMovePiece', roomId, playerIdRef.current, pieceIndex);
  };

  const endTurn = async () => {
    if (!connection) return;
    await connection.invoke('LudoEndTurn', roomId, playerIdRef.current);
  };

  // Zar çizimi - Mobil uyumlu
  const renderDice = () => {
    const dots: Record<number, number[][]> = {
      1: [[1, 1]],
      2: [[0, 0], [2, 2]],
      3: [[0, 0], [1, 1], [2, 2]],
      4: [[0, 0], [0, 2], [2, 0], [2, 2]],
      5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
      6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]]
    };
    const currentDots = diceValue ? dots[diceValue] : [];
    const canRoll = isMyTurn() && !diceValue && !isRolling;

    return (
      <div
        onClick={canRoll ? rollDice : undefined}
        style={{
          width: 60, height: 60,
          background: canRoll ? '#fff' : '#ddd',
          borderRadius: 10,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          padding: 8, gap: 2,
          cursor: canRoll ? 'pointer' : 'default',
          boxShadow: canRoll ? '0 4px 15px rgba(255,215,0,0.5)' : '0 2px 8px rgba(0,0,0,0.2)',
          transform: canRoll ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          animation: isRolling ? 'shake 0.1s infinite' : 'none',
          border: canRoll ? '2px solid #ffd93d' : '2px solid transparent'
        }}
      >
        {Array.from({ length: 9 }).map((_, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const hasDot = currentDots.some(([r, c]) => r === row && c === col);
          return (
            <div key={i} style={{
              width: '100%', height: '100%',
              borderRadius: '50%',
              background: hasDot ? '#2c3e50' : 'transparent'
            }} />
          );
        })}
      </div>
    );
  };

  // Tahta çizimi
  const renderBoard = () => {
    return (
      <svg viewBox="0 0 15 15" style={{ width: '100%', maxWidth: 700, height: 'auto', borderRadius: 16, overflow: 'hidden' }}>
        {/* SVG Definitions - Gradients, Filters, Shadows */}
        <defs>
          {/* Tahta arka plan gradient */}
          <linearGradient id="boardBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="100%" stopColor="#16213e" />
          </linearGradient>

          {/* Renk gradientleri */}
          <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5dade2" />
            <stop offset="100%" stopColor="#2471a3" />
          </linearGradient>
          <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#58d68d" />
            <stop offset="100%" stopColor="#1e8449" />
          </linearGradient>
          <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff6b6b" />
            <stop offset="100%" stopColor="#c0392b" />
          </linearGradient>
          <linearGradient id="yellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f7dc6f" />
            <stop offset="100%" stopColor="#d68910" />
          </linearGradient>

          {/* Yol gradient */}
          <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fafafa" />
            <stop offset="100%" stopColor="#e0e0e0" />
          </linearGradient>

          {/* Taş 3D efekti için gradient */}
          <radialGradient id="pieceShine" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          {/* Gölge filtresi */}
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0.05" dy="0.1" stdDeviation="0.15" floodColor="#000" floodOpacity="0.4" />
          </filter>

          {/* Parlama filtresi */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.15" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Yıldız parlama */}
          <filter id="starGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="0.1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Arka plan */}
        <rect x="0" y="0" width="15" height="15" fill="url(#boardBg)" />

        {/* Ev bölgeleri - Gradient ile */}
        <rect x="0.1" y="0.1" width="5.8" height="5.8" rx="0.3" fill="url(#blueGrad)" opacity="0.9" />
        <rect x="9.1" y="0.1" width="5.8" height="5.8" rx="0.3" fill="url(#greenGrad)" opacity="0.9" />
        <rect x="0.1" y="9.1" width="5.8" height="5.8" rx="0.3" fill="url(#redGrad)" opacity="0.9" />
        <rect x="9.1" y="9.1" width="5.8" height="5.8" rx="0.3" fill="url(#yellowGrad)" opacity="0.9" />

        {/* İç ev alanları (taşların beklediği yer) - beyaz çerçeveli */}
        <rect x="1" y="1" width="4" height="4" rx="0.4" fill="rgba(255,255,255,0.95)" stroke={COLORS.blue.dark} strokeWidth="0.1" />
        <rect x="10" y="1" width="4" height="4" rx="0.4" fill="rgba(255,255,255,0.95)" stroke={COLORS.green.dark} strokeWidth="0.1" />
        <rect x="1" y="10" width="4" height="4" rx="0.4" fill="rgba(255,255,255,0.95)" stroke={COLORS.red.dark} strokeWidth="0.1" />
        <rect x="10" y="10" width="4" height="4" rx="0.4" fill="rgba(255,255,255,0.95)" stroke={COLORS.yellow.dark} strokeWidth="0.1" />

        {/* Ana yol arka planı */}
        <rect x="6" y="0" width="3" height="6" fill="url(#pathGrad)" />
        <rect x="6" y="9" width="3" height="6" fill="url(#pathGrad)" />
        <rect x="0" y="6" width="6" height="3" fill="url(#pathGrad)" />
        <rect x="9" y="6" width="6" height="3" fill="url(#pathGrad)" />

        {/* Yol hücreleri - Üst kol */}
        {[0, 1, 2, 3, 4, 5].map(row => (
          <g key={`top-${row}`}>
            <rect x="6.05" y={row + 0.05} width="0.9" height="0.9" rx="0.1" fill="#fff" stroke="#ccc" strokeWidth="0.03" />
            <rect x="8.05" y={row + 0.05} width="0.9" height="0.9" rx="0.1" fill="#fff" stroke="#ccc" strokeWidth="0.03" />
          </g>
        ))}
        {/* Yol hücreleri - Alt kol */}
        {[9, 10, 11, 12, 13, 14].map(row => (
          <g key={`bottom-${row}`}>
            <rect x="6.05" y={row + 0.05} width="0.9" height="0.9" rx="0.1" fill="#fff" stroke="#ccc" strokeWidth="0.03" />
            <rect x="8.05" y={row + 0.05} width="0.9" height="0.9" rx="0.1" fill="#fff" stroke="#ccc" strokeWidth="0.03" />
          </g>
        ))}
        {/* Yol hücreleri - Sol kol */}
        {[0, 1, 2, 3, 4, 5].map(col => (
          <g key={`left-${col}`}>
            <rect x={col + 0.05} y="6.05" width="0.9" height="0.9" rx="0.1" fill="#fff" stroke="#ccc" strokeWidth="0.03" />
            <rect x={col + 0.05} y="8.05" width="0.9" height="0.9" rx="0.1" fill="#fff" stroke="#ccc" strokeWidth="0.03" />
          </g>
        ))}
        {/* Yol hücreleri - Sağ kol */}
        {[9, 10, 11, 12, 13, 14].map(col => (
          <g key={`right-${col}`}>
            <rect x={col + 0.05} y="6.05" width="0.9" height="0.9" rx="0.1" fill="#fff" stroke="#ccc" strokeWidth="0.03" />
            <rect x={col + 0.05} y="8.05" width="0.9" height="0.9" rx="0.1" fill="#fff" stroke="#ccc" strokeWidth="0.03" />
          </g>
        ))}

        {/* Ev yolları - Gradient ile */}
        {[1, 2, 3, 4, 5].map(i => <rect key={`green-home-${i}`} x="7.05" y={i + 0.05} width="0.9" height="0.9" rx="0.1" fill={COLORS.green.light} stroke={COLORS.green.main} strokeWidth="0.05" />)}
        {[1, 2, 3, 4, 5].map(i => <rect key={`blue-home-${i}`} x={i + 0.05} y="7.05" width="0.9" height="0.9" rx="0.1" fill={COLORS.blue.light} stroke={COLORS.blue.main} strokeWidth="0.05" />)}
        {[9, 10, 11, 12, 13].map(i => <rect key={`red-home-${i}`} x="7.05" y={i + 0.05} width="0.9" height="0.9" rx="0.1" fill={COLORS.red.light} stroke={COLORS.red.main} strokeWidth="0.05" />)}
        {[9, 10, 11, 12, 13].map(i => <rect key={`yellow-home-${i}`} x={i + 0.05} y="7.05" width="0.9" height="0.9" rx="0.1" fill={COLORS.yellow.light} stroke={COLORS.yellow.main} strokeWidth="0.05" />)}

        {/* Merkez üçgenler - Gradient ile */}
        <polygon points="6,6 7.5,7.5 6,9" fill="url(#blueGrad)" stroke="#fff" strokeWidth="0.05" />
        <polygon points="6,6 7.5,7.5 9,6" fill="url(#greenGrad)" stroke="#fff" strokeWidth="0.05" />
        <polygon points="9,6 7.5,7.5 9,9" fill="url(#yellowGrad)" stroke="#fff" strokeWidth="0.05" />
        <polygon points="6,9 7.5,7.5 9,9" fill="url(#redGrad)" stroke="#fff" strokeWidth="0.05" />

        {/* Merkez yıldız */}
        <circle cx="7.5" cy="7.5" r="0.4" fill="#fff" filter="url(#glow)" />
        <text x="7.5" y="7.65" textAnchor="middle" fontSize="0.5" fill="#333">★</text>

        {/* Güvenli kareler (Safe Squares): 0, 8, 13, 21, 26, 34, 39, 47 */}
        {/* Başlangıç kareleri - Parlayan yıldızlar */}
        <g filter="url(#starGlow)">
          {/* Pozisyon 0 - Mavi başlangıç */}
          <circle cx="1.5" cy="6.5" r="0.4" fill={COLORS.blue.main} />
          {/* Pozisyon 13 - Yeşil başlangıç */}
          <circle cx="8.5" cy="1.5" r="0.4" fill={COLORS.green.main} />
          {/* Pozisyon 39 - Kırmızı başlangıç */}
          <circle cx="6.5" cy="13.5" r="0.4" fill={COLORS.red.main} />
          {/* Pozisyon 26 - Sarı başlangıç */}
          <circle cx="13.5" cy="8.5" r="0.4" fill={COLORS.yellow.main} />
        </g>
        <text x="1.5" y="6.65" textAnchor="middle" fontSize="0.45" fill="#fff" style={{ fontWeight: 'bold' }}>★</text>
        <text x="8.5" y="1.65" textAnchor="middle" fontSize="0.45" fill="#fff" style={{ fontWeight: 'bold' }}>★</text>
        <text x="6.5" y="13.65" textAnchor="middle" fontSize="0.45" fill="#fff" style={{ fontWeight: 'bold' }}>★</text>
        <text x="13.5" y="8.65" textAnchor="middle" fontSize="0.45" fill="#fff" style={{ fontWeight: 'bold' }}>★</text>

        {/* Orta güvenli kareler - Pozisyon 8, 21, 34, 47 */}
        {/* Pozisyon 8 = MAIN_PATH[8] = [6.5, 2.5] */}
        <circle cx="6.5" cy="2.5" r="0.35" fill="rgba(255,255,255,0.3)" stroke="#ffd93d" strokeWidth="0.05" />
        <text x="6.5" y="2.65" textAnchor="middle" fontSize="0.35" fill="#ffd93d">★</text>
        {/* Pozisyon 21 = MAIN_PATH[21] = [12.5, 6.5] */}
        <circle cx="12.5" cy="6.5" r="0.35" fill="rgba(255,255,255,0.3)" stroke="#ffd93d" strokeWidth="0.05" />
        <text x="12.5" y="6.65" textAnchor="middle" fontSize="0.35" fill="#ffd93d">★</text>
        {/* Pozisyon 34 = MAIN_PATH[34] = [8.5, 12.5] */}
        <circle cx="8.5" cy="12.5" r="0.35" fill="rgba(255,255,255,0.3)" stroke="#ffd93d" strokeWidth="0.05" />
        <text x="8.5" y="12.65" textAnchor="middle" fontSize="0.35" fill="#ffd93d">★</text>
        {/* Pozisyon 47 = MAIN_PATH[47] = [2.5, 8.5] */}
        <circle cx="2.5" cy="8.5" r="0.35" fill="rgba(255,255,255,0.3)" stroke="#ffd93d" strokeWidth="0.05" />
        <text x="2.5" y="8.65" textAnchor="middle" fontSize="0.35" fill="#ffd93d">★</text>

        {/* Evdeki taşlar - 3D efektli */}
        {players.map((player) => {
          const colorKey = getColorKey(player.color);
          const color = COLORS[colorKey];
          const isMyPiece = player.id === playerIdRef.current;
          const shouldHighlightMyPieces = isMyPiece && validMoves.length > 0;
          return player.pieces.map((pos, idx) => {
            if (pos !== -1) return null;
            const [x, y] = HOME_POSITIONS[colorKey][idx];
            const isValid = validMoves.includes(idx) && isMyPiece;
            return (
              <g key={`home-${player.id}-${idx}`} filter="url(#shadow)" style={{ cursor: isValid ? 'pointer' : 'default' }} onClick={() => isValid && movePiece(idx)}>
                {/* Seçilebilir taş - parlayan halka arka plan */}
                {isValid && (
                  <circle cx={x} cy={y} r="0.75" fill="rgba(255,215,0,0.4)" className="pulse-glow" />
                )}
                {/* Taş gövdesi */}
                <circle cx={x} cy={y} r={isValid ? 0.55 : 0.45} fill={color.main} />
                {/* Parlama efekti */}
                <circle cx={x} cy={y} r={isValid ? 0.55 : 0.45} fill="url(#pieceShine)" />
                {/* Üst halka */}
                <circle cx={x} cy={y - 0.05} r={isValid ? 0.35 : 0.28} fill={color.glow} opacity="0.6" />
                {/* Seçilebilir göstergesi - altın ve beyaz animasyonlu halka */}
                {isValid && (
                  <>
                    <circle cx={x} cy={y} r="0.65" fill="none" stroke="#ffd93d" strokeWidth="0.1" className="pulse-ring" />
                    <circle cx={x} cy={y} r="0.72" fill="none" stroke="#fff" strokeWidth="0.05" strokeDasharray="0.15 0.1" className="spin-ring" />
                  </>
                )}
                {/* Kendi taşım ama seçilemez - hafif işaret */}
                {shouldHighlightMyPieces && !isValid && (
                  <circle cx={x} cy={y} r="0.55" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.04" />
                )}
              </g>
            );
          });
        })}

        {/* Yoldaki taşlar - 3D efektli */}
        {/* Önce tüm taşları topla ve aynı pozisyondakileri grupla */}
        {(() => {
          // Tüm yoldaki taşları topla
          const allPieces: Array<{
            player: LudoPlayer;
            pieceIdx: number;
            pos: number;
            colorKey: ColorKey;
            isMyPiece: boolean;
            isValid: boolean;
          }> = [];

          players.forEach((player) => {
            const colorKey = getColorKey(player.color);
            const isMyPiece = player.id === playerIdRef.current;
            player.pieces.forEach((pos, idx) => {
              if (pos !== -1) {
                allPieces.push({
                  player,
                  pieceIdx: idx,
                  pos,
                  colorKey,
                  isMyPiece,
                  isValid: validMoves.includes(idx) && isMyPiece
                });
              }
            });
          });

          // Aynı pozisyondaki taşları grupla
          const positionGroups: Record<number, typeof allPieces> = {};
          allPieces.forEach(piece => {
            if (!positionGroups[piece.pos]) {
              positionGroups[piece.pos] = [];
            }
            positionGroups[piece.pos].push(piece);
          });

          // Offset hesapla - aynı karede birden fazla taş varsa
          const getOffset = (groupIndex: number, totalInGroup: number): [number, number] => {
            if (totalInGroup === 1) return [0, 0];
            // 2 taş için yan yana, 3-4 taş için kare şeklinde
            const offsets: [number, number][] = [
              [-0.2, -0.15], [0.2, -0.15], [-0.2, 0.15], [0.2, 0.15]
            ];
            return offsets[groupIndex] || [0, 0];
          };

          // Sıralama: önce seçilemeyen taşlar, sonra seçilebilir taşlar (üstte olsun)
          const sortedPieces = [...allPieces].sort((a, b) => {
            // Seçilebilir taşlar en sona (üste)
            if (a.isValid && !b.isValid) return 1;
            if (!a.isValid && b.isValid) return -1;
            // Kendi taşlarım diğerlerinin üstünde
            if (a.isMyPiece && !b.isMyPiece) return 1;
            if (!a.isMyPiece && b.isMyPiece) return -1;
            return 0;
          });

          return sortedPieces.map((piece) => {
            const { player, pieceIdx, pos, colorKey, isMyPiece, isValid } = piece;
            const color = COLORS[colorKey];
            const shouldHighlightMyPieces = isMyPiece && validMoves.length > 0;
            const position = getPiecePosition(colorKey, pos);
            if (!position) return null;

            // Aynı pozisyondaki taşlar için offset hesapla
            const group = positionGroups[pos];
            const groupIndex = group.findIndex(p => p.player.id === player.id && p.pieceIdx === pieceIdx);
            const [offsetX, offsetY] = getOffset(groupIndex, group.length);

            const x = position[0] + offsetX;
            const y = position[1] + offsetY;

            // Aynı karede birden fazla taş varsa küçült
            const sizeMultiplier = group.length > 1 ? 0.75 : 1;
            const baseRadius = isValid ? 0.45 : 0.38;
            const radius = baseRadius * sizeMultiplier;

            return (
              <g key={`path-${player.id}-${pieceIdx}`} filter="url(#shadow)" style={{ cursor: isValid ? 'pointer' : 'default' }} onClick={() => isValid && movePiece(pieceIdx)}>
                {/* Seçilebilir taş - parlayan halka arka plan */}
                {isValid && (
                  <circle cx={x} cy={y} r={0.65 * sizeMultiplier} fill="rgba(255,215,0,0.3)" className="pulse-glow" />
                )}
                {/* Taş gövdesi */}
                <circle cx={x} cy={y} r={radius} fill={color.main} />
                {/* Parlama efekti */}
                <circle cx={x} cy={y} r={radius} fill="url(#pieceShine)" />
                {/* Üst halka */}
                <circle cx={x} cy={y - 0.04 * sizeMultiplier} r={radius * 0.65} fill={color.glow} opacity="0.6" />
                {/* Seçilebilir göstergesi - beyaz animasyonlu halka */}
                {isValid && (
                  <>
                    <circle cx={x} cy={y} r={0.55 * sizeMultiplier} fill="none" stroke="#ffd93d" strokeWidth="0.08" className="pulse-ring" />
                    <circle cx={x} cy={y} r={0.6 * sizeMultiplier} fill="none" stroke="#fff" strokeWidth="0.04" strokeDasharray="0.1 0.1" className="spin-ring" />
                  </>
                )}
                {/* Kendi taşım ama seçilemez - hafif işaret */}
                {shouldHighlightMyPieces && !isValid && (
                  <circle cx={x} cy={y} r={0.5 * sizeMultiplier} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.03" />
                )}
              </g>
            );
          });
        })()}
      </svg>
    );
  };

  // Dikey mod uyarısı
  if (isPortrait) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
        <div style={{
          fontSize: 80,
          marginBottom: 20,
          animation: 'rotatePhone 1.5s ease-in-out infinite'
        }}>
          📱
        </div>
        <h2 style={{ margin: '0 0 15px 0', fontSize: 24 }}>
          Lütfen cihazınızı yatay çevirin
        </h2>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
          Ludo oyunu yatay modda oynanır
        </p>
        <div style={{
          marginTop: 20,
          color: '#ffd93d',
          fontSize: 18
        }}>
          🎯 Ludo
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

  // Bağlanıyor ekranı
  if (gamePhase === 'connecting') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 20, gap: 20,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        {onBack && (
          <button onClick={handleBack} style={{
            position: 'absolute', top: 15, left: 15,
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.2)',
            color: 'white', border: 'none', borderRadius: 20,
            cursor: 'pointer', fontSize: 14
          }}>
            ← Geri
          </button>
        )}

        <h1 style={{ color: 'white', fontSize: 32, margin: 0 }}>🎯 Ludo</h1>
        <div style={{
          width: 50, height: 50,
          border: '4px solid rgba(255,255,255,0.3)',
          borderTopColor: 'white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>
          {error ? error : 'Bağlanıyor...'}
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Bekleme odası - Yatay düzen: Sol QR | Sağ Oyuncular
  if (gamePhase === 'waiting') {
    return (
      <div
        ref={containerRef}
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          padding: 10,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          position: 'relative'
        }}>
        {onBack && (
          <button onClick={handleBack} style={{
            position: 'absolute', top: 10, left: 10,
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.2)',
            color: 'white', border: 'none', borderRadius: 15,
            cursor: 'pointer', fontSize: 13
          }}>
            ← Geri
          </button>
        )}

        {/* Fullscreen Button - Lobby */}
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
          {/* Sol Taraf - QR Kod ve Link */}
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
              📱 Arkadaşlarını Davet Et
            </h3>
            <div style={{
              padding: 10,
              background: 'white',
              borderRadius: 10,
              marginBottom: 10
            }}>
              <QRCodeSVG
                value={getShareUrl()}
                size={100}
                level="H"
              />
            </div>
            <button onClick={copyRoomLink} style={{
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: '600',
              border: 'none',
              borderRadius: 20,
              cursor: 'pointer',
              background: 'white',
              color: '#667eea'
            }}>
              {linkCopied ? '✅ Kopyalandı!' : '📋 Linki Kopyala'}
            </button>

            {/* Lobby'de Göster Toggle */}
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

          {/* Sağ Taraf - Oyuncular ve Başlat */}
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 15,
            padding: 15,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ color: 'white', margin: '0 0 3px 0', fontSize: 14, textAlign: 'center' }}>
              🎯 Ludo - Oyuncular ({players.length}/4)
            </h3>

            {/* Oyuncu Listesi */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              {players.map((p, i) => {
                const colorKey = getColorKey(p.color);
                return (
                  <div key={p.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    background: COLORS[colorKey].main,
                    borderRadius: 8
                  }}>
                    <div style={{
                      width: 28, height: 28,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: 13,
                      color: 'white'
                    }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ color: 'white', fontWeight: '600', fontSize: 13, flex: 1 }}>
                      {p.name}
                    </span>
                    {i === 0 && <span style={{ fontSize: 14 }}>👑</span>}
                    {/* Host için kick butonu (kendisi ve host hariç) */}
                    {isHost && i !== 0 && p.id !== playerIdRef.current && (
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
                );
              })}
              {Array.from({ length: 4 - players.length }).map((_, i) => (
                <div key={`empty-${i}`} style={{
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
              ))}
            </div>

            {/* Başlat Butonu */}
            <div style={{ marginTop: 10, textAlign: 'center' }}>
              {isHost && players.length >= 2 ? (
                <button onClick={startGame} style={{
                  padding: '10px 30px',
                  background: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: 20,
                  fontSize: 14,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%'
                }}>
                  🎮 Oyunu Başlat
                </button>
              ) : isHost ? (
                <p style={{ color: '#ffd93d', margin: 0, fontSize: 12 }}>
                  ⏳ En az 2 oyuncu gerekli
                </p>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: 12 }}>
                  ⏳ Host oyunu başlatacak...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Kick Onay Modalı */}
        {kickTargetPlayer && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
              borderRadius: 16,
              padding: 24,
              maxWidth: 320,
              textAlign: 'center',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <h3 style={{ color: 'white', margin: '0 0 12px 0', fontSize: 18 }}>
                Oyuncuyu Kov
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 20px 0', fontSize: 14 }}>
                <strong>{kickTargetPlayer.name}</strong> oyuncusunu odadan çıkarmak istediğinize emin misiniz?
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  onClick={cancelKickPlayer}
                  style={{
                    padding: '10px 24px',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 20,
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  İptal
                </button>
                <button
                  onClick={confirmKickPlayer}
                  style={{
                    padding: '10px 24px',
                    background: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: 20,
                    fontSize: 14,
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Kov
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Oyun bitti - Yatay layout
  if (gamePhase === 'finished') {
    const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣'];
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center',
        padding: 20, gap: 40,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        {/* Sol - Kazanan */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 15
        }}>
          <h1 style={{ color: '#ffd93d', fontSize: 64, margin: 0 }}>🏆</h1>
          <h2 style={{ color: 'white', fontSize: 24, margin: 0, textAlign: 'center' }}>
            {winner} Kazandı!
          </h2>
          <button onClick={handleBack} style={{
            padding: '12px 30px',
            background: '#3498db', color: 'white',
            border: 'none', borderRadius: 25,
            fontSize: 16, cursor: 'pointer',
            marginTop: 10
          }}>
            Ana Menü
          </button>
        </div>

        {/* Sağ - Sıralama Tablosu */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: 20,
          minWidth: 220
        }}>
          <h3 style={{ color: 'white', textAlign: 'center', margin: '0 0 12px 0', fontSize: 16 }}>Sıralama</h3>
          {rankings.map((r, idx) => {
            const colorKey = getColorKey(r.color);
            return (
              <div key={r.playerId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                background: idx === 0 ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)',
                borderRadius: 8,
                marginBottom: 6
              }}>
                <span style={{ fontSize: 20 }}>{rankEmojis[idx] || `${idx + 1}.`}</span>
                <div style={{
                  width: 18, height: 18,
                  borderRadius: '50%',
                  background: COLORS[colorKey].main,
                  border: '2px solid white'
                }} />
                <span style={{
                  color: 'white',
                  fontWeight: idx === 0 ? 'bold' : 'normal',
                  fontSize: idx === 0 ? 16 : 14
                }}>
                  {r.playerName}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Oyun ekranı - Mobil uyumlu layout
  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        padding: 5,
        overflow: 'hidden'
      }}
    >
      {/* Geri butonu - Sol üst köşe */}
      {onBack && (
        <button onClick={handleBack} style={{
          position: 'absolute', top: 10, left: 10,
          padding: '6px 12px',
          background: 'rgba(255,255,255,0.2)',
          color: 'white', border: 'none', borderRadius: 12,
          cursor: 'pointer', fontSize: 11, zIndex: 10
        }}>
          ← Çık
        </button>
      )}

      {/* Fullscreen butonu - iOS'ta gösterme */}
      {!isIOS && (
        <button onClick={toggleFullscreen} style={{
          position: 'absolute', top: 10, left: 55,
          padding: '6px 12px',
          background: isFullscreen ? 'rgba(39, 174, 96, 0.9)' : 'rgba(255,255,255,0.2)',
          color: 'white', border: 'none', borderRadius: 12,
          cursor: 'pointer', fontSize: 11, zIndex: 10
        }}>
          ⛶
        </button>
      )}

      {/* Ana içerik - Yatay layout */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center',
        gap: 10, padding: '10px 5px', minHeight: 0
      }}>
        {/* Sol panel - Oyuncular */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: 8, minWidth: 80, maxWidth: 100
        }}>
          {players.map((p, i) => {
            const colorKey = getColorKey(p.color);
            const isCurrentTurn = i === currentPlayerIndex && !p.hasFinished;
            const isMe = p.id === playerIdRef.current;
            const hasFinished = p.hasFinished || p.finishRank > 0;
            const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣'];
            return (
              <div key={p.id} style={{
                padding: '6px 8px',
                background: hasFinished
                  ? 'rgba(255,215,0,0.3)'
                  : isCurrentTurn
                    ? COLORS[colorKey].main
                    : 'rgba(255,255,255,0.1)',
                color: 'white', borderRadius: 8,
                border: isCurrentTurn ? '2px solid #fff' : hasFinished ? '2px solid #ffd93d' : '2px solid transparent',
                fontSize: 10,
                textAlign: 'center',
                animation: isCurrentTurn ? 'pulse 1s infinite' : 'none',
                opacity: hasFinished ? 0.8 : 1
              }}>
                {hasFinished && (
                  <div style={{ fontSize: 14, marginBottom: 2 }}>
                    {rankEmojis[p.finishRank - 1] || `${p.finishRank}.`}
                  </div>
                )}
                <div style={{
                  width: 12, height: 12,
                  borderRadius: '50%',
                  background: COLORS[colorKey].main,
                  margin: '0 auto 3px',
                  border: '1px solid rgba(255,255,255,0.5)'
                }} />
                <div style={{
                  fontSize: 9,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 70,
                  textDecoration: hasFinished ? 'line-through' : 'none'
                }}>
                  {p.name}
                </div>
                {isMe && <div style={{ fontSize: 8, opacity: 0.7 }}>(Sen)</div>}
                {hasFinished && <div style={{ fontSize: 7, color: '#ffd93d' }}>Bitirdi!</div>}
              </div>
            );
          })}
        </div>

        {/* Merkez - Tahta */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          maxWidth: 'min(90vw, 95vh)', maxHeight: '95vh'
        }}>
          {renderBoard()}
        </div>

        {/* Sağ panel - Zar ve kontroller */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 12, minWidth: 80, maxWidth: 100
        }}>
          {renderDice()}

          {isMyTurn() && !diceValue && !isRolling && (
            <span style={{
              color: '#ffd93d', fontSize: 10, textAlign: 'center',
              animation: 'bounce 0.5s infinite alternate'
            }}>
              Zara tıkla!
            </span>
          )}

          {diceValue && (
            <div style={{
              color: 'white', fontSize: 11, textAlign: 'center',
              background: 'rgba(255,255,255,0.1)',
              padding: '4px 8px', borderRadius: 8
            }}>
              {validMoves.length > 0 ? 'Taş seç' : 'Hamle yok'}
            </div>
          )}

          {isMyTurn() && diceValue && validMoves.length === 0 && (
            <button onClick={endTurn} style={{
              padding: '8px 12px',
              background: '#e74c3c', color: 'white',
              border: 'none', borderRadius: 12,
              cursor: 'pointer', fontSize: 10
            }}>
              Sırayı Geç
            </button>
          )}
        </div>
      </div>

      {/* DEBUG PANEL */}
      <div style={{
        background: 'rgba(0,0,0,0.8)',
        color: '#0f0',
        fontSize: 9,
        padding: 5,
        fontFamily: 'monospace',
        maxHeight: 80,
        overflow: 'auto'
      }}>
        <div>Güvenli kareler: 0, 8, 13, 21, 26, 34, 39, 47 (yeme yok!)</div>
        {players.map(p => (
          <div key={p.id}>
            {p.name} ({getColorKey(p.color)}): [{p.pieces?.join(', ') || 'N/A'}]
          </div>
        ))}
        <div style={{ color: '#ff0' }}>{gameMessage}</div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 5px rgba(255,255,255,0.5); }
          50% { transform: scale(1.05); box-shadow: 0 0 15px rgba(255,255,255,0.8); }
        }
        @keyframes bounce {
          0% { transform: translateY(0); }
          100% { transform: translateY(-3px); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.15); }
        }
        @keyframes pulseRing {
          0%, 100% { stroke-width: 0.08; opacity: 0.8; }
          50% { stroke-width: 0.12; opacity: 1; }
        }
        @keyframes spinRing {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 1; }
        }
        .pulse-glow {
          animation: pulseGlow 1s ease-in-out infinite;
          transform-origin: center;
        }
        .pulse-ring {
          animation: pulseRing 0.8s ease-in-out infinite;
        }
        .spin-ring {
          animation: spinRing 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
