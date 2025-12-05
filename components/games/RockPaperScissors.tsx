'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/contexts/UserContext';
import { submitScore } from '@/lib/gameApi';

// Types
interface Player {
  id: string;
  name: string;
  score: number;
  choice?: 'rock' | 'paper' | 'scissors';
}

type GamePhase = 'connecting' | 'waiting' | 'playing' | 'result' | 'finished';
type Choice = 'rock' | 'paper' | 'scissors';

interface RockPaperScissorsProps {
  onBack?: () => void;
  joinRoomId?: string;
  customerCode: string;
  playWithBot?: boolean;
  botName?: string;
}

// Constants
const MAX_ROUNDS = 5;
const CHOICE_ICONS: Record<Choice, string> = {
  rock: '✊',
  paper: '✋',
  scissors: '✌️'
};
const CHOICE_NAMES: Record<Choice, string> = {
  rock: 'Taş',
  paper: 'Kağıt',
  scissors: 'Makas'
};

// Helper functions
const generatePlayerId = () => 'rps_' + Math.random().toString(36).substr(2, 9);
const generateRoomId = () => Math.floor(1000 + Math.random() * 9000).toString();
const generateRandomNickname = () => `Oyuncu#${Math.floor(1000 + Math.random() * 9000)}`;

// Bot isimleri havuzu
const BOT_NAMES = [
  'Onur', 'Selin', 'Urass', 'Atahan', 'Nurr16', 'Esranurr',
  'Beste.16', 'Floyd', 'İremozkn', 'Suat', 'Ceren16', 'Özgeylmz',
  'Ramço', 'Didem', 'aksu88', 'Zeynep96', 'Elif00'
];

// Kazananı belirle
const determineWinner = (choice1: Choice, choice2: Choice): 'player1' | 'player2' | 'draw' => {
  if (choice1 === choice2) return 'draw';
  if (
    (choice1 === 'rock' && choice2 === 'scissors') ||
    (choice1 === 'paper' && choice2 === 'rock') ||
    (choice1 === 'scissors' && choice2 === 'paper')
  ) {
    return 'player1';
  }
  return 'player2';
};

export default function RockPaperScissors({ onBack, joinRoomId, customerCode, playWithBot = false, botName: propBotName }: RockPaperScissorsProps) {
  const { currentUser } = useAuth();

  // Bot modu için isim - prop'tan geliyorsa onu kullan, yoksa rastgele seç
  const [randomBotName] = useState(() => BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]);
  const botName = propBotName || randomBotName;

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
  const [currentRound, setCurrentRound] = useState(1);
  const [myChoice, setMyChoice] = useState<Choice | null>(null);
  const [opponentChose, setOpponentChose] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [kickTargetPlayer, setKickTargetPlayer] = useState<{id: string, name: string} | null>(null);

  // Result
  const [roundResult, setRoundResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [playerChoices, setPlayerChoices] = useState<Record<string, Choice>>({});

  // Game over
  const [winner, setWinner] = useState<Player | null>(null);
  const [gameOverMessage, setGameOverMessage] = useState('');

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Refs for cleanup
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerIdRef = useRef('');
  const roomIdRef = useRef(joinRoomId || '');
  const nicknameRef = useRef(initialNickname);
  const nextRoundTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onBackRef = useRef(onBack);

  // Get my player and opponent - Bot modunda id yerine 'bot_' prefix'ine göre ayır
  const me = playWithBot
    ? players.find(p => !p.id.startsWith('bot_'))
    : players.find(p => p.id === playerId);
  const opponent = playWithBot
    ? players.find(p => p.id.startsWith('bot_'))
    : players.find(p => p.id !== playerId);

  // Handle back - leave room and go back
  const handleBack = useCallback(async () => {
    const currentPlayerId = playerIdRef.current;
    const currentRoomId = roomIdRef.current;
    const conn = connectionRef.current;

    if (conn && currentRoomId && currentPlayerId) {
      try {
        await conn.invoke('LeaveRoom', currentPlayerId);
      } catch (err) {
        console.error('[RPS] Error leaving room:', err);
      }
    }

    if (onBack) {
      onBack();
    }
  }, [onBack]);

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
        console.error('[RPS] Exit fullscreen error:', err);
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
        console.error('[RPS] Enter fullscreen error:', err);
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

  // Handle game finished
  const handleGameFinished = useCallback(async (data: any) => {

    // Önce bekleyen timeout'u temizle (RoundResult'tan gelen)
    if (nextRoundTimeoutRef.current) {
      clearTimeout(nextRoundTimeoutRef.current);
      nextRoundTimeoutRef.current = null;
    }

    const winnerData = data.winner || data.result?.winner;
    const finalScores = data.players || data.finalScores;

    if (finalScores) {
      setPlayers(finalScores);
    }

    if (winnerData) {
      setWinner(winnerData);
      if (winnerData.id === playerIdRef.current) {
        setGameOverMessage('🎊 Tebrikler! Oyunu Kazandınız! 🎊');
      } else {
        setGameOverMessage(`🏆 ${winnerData.name} Oyunu Kazandı!`);
      }
    } else {
      setGameOverMessage('🤝 Oyun Berabere Bitti!');
    }

    setGamePhase('finished');

    // Leaderboard'a kaydet - sadece kazanan veya en yüksek skorlu
    try {
      const myPlayer = finalScores?.find((p: any) => p.id === playerIdRef.current);
      if (myPlayer && myPlayer.score > 0) {
        await submitScore({
          GameType: 'RockPaperScissors',
          PlayerNickname: nicknameRef.current || 'Anonim',
          Score: myPlayer.score,
          GameData: JSON.stringify({
            totalRounds: MAX_ROUNDS,
            isWinner: winnerData?.id === playerIdRef.current
          }),
          VenueCode: customerCode || 'global'
        });
        console.log('✅ RPS skoru kaydedildi:', myPlayer.score);
      }
    } catch (err) {
      console.error('❌ RPS skor kayıt hatası:', err);
    }
  }, [customerCode]);

  // Keep onBackRef updated
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  // SignalR Connection
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

      // Event Handlers
      newConnection.on('RoomCreated', (data: any) => {
        if (data.success) {
          const newRoomId = data.room?.id || data.roomId;
          setRoomId(newRoomId);
          roomIdRef.current = newRoomId;
          setGamePhase('waiting');
          setIsHost(true);
          if (data.room?.players) {
            setPlayers(data.room.players);
          }
        } else {
          alert(data.message || 'Oda oluşturulamadı');
        }
      });

      newConnection.on('GameJoined', (data: any) => {
        if (data.success) {
          const newRoomId = data.room?.id || data.roomId;
          setRoomId(newRoomId);
          roomIdRef.current = newRoomId;
          setGamePhase('waiting');
          setIsHost(false);
        }
      });

      newConnection.on('JoinedRoom', (data: any) => {
        if (data.players) {
          setPlayers(data.players);
        }
      });

      newConnection.on('PlayerJoined', (data: any) => {
        const playerList = data.players || data.room?.players;
        if (playerList) {
          setPlayers(playerList);
        }
      });

      newConnection.on('PlayerLeft', (data: any) => {
        const playerList = data.players || data.room?.players;
        if (playerList) {
          setPlayers(playerList);
          // Rakip ayrıldıysa mesaj göster ve 3 saniye sonra çık
          if (playerList.length < 2) {
            setGameOverMessage('😢 Rakibiniz oyundan ayrıldı! Lobby\'ye dönülüyor...');
            setGamePhase('finished');

            // 3 saniye sonra otomatik çıkış
            setTimeout(() => {
              if (onBackRef.current) {
                onBackRef.current();
              }
            }, 3000);
          }
        }
      });

      // Oyuncu kovuldu
      newConnection.on('RPSPlayerKicked', (data: any) => {
        // Ben kovuldum mu?
        if (data.kickedPlayerId === playerIdRef.current) {
          alert('Oda sahibi sizi odadan çıkardı.');
          if (onBackRef.current) {
            onBackRef.current();
          }
        } else {
          // Başka biri kovuldu, oyuncu listesini güncelle
          const playerList = data.room?.players || [];
          setPlayers(playerList);
        }
      });

      newConnection.on('GameStarted', (data: any) => {
        setGamePhase('playing');
        setCurrentRound(data.room?.currentRound || 1);
        setMyChoice(null);
        setOpponentChose(false);
        setPlayerChoices({});
        setRoundResult(null);
        setWinner(null);
        setGameOverMessage('');
        // Backend'den gelen güncel player listesi (skorlar sıfırlanmış)
        if (data.room?.players) {
          setPlayers(data.room.players.map((p: any) => ({
            id: p.id,
            name: p.name,
            score: p.score || 0,
            choice: undefined
          })));
        } else {
          setPlayers(prev => prev.map(p => ({ ...p, score: 0, choice: undefined })));
        }
      });

      newConnection.on('RoundStarted', () => {
        setGamePhase('playing');
        setMyChoice(null);
        setOpponentChose(false);
        setPlayerChoices({});
        setRoundResult(null);
      });

      newConnection.on('PlayerMadeChoice', (data: any) => {
        if (data.playerId && data.playerId !== playerIdRef.current) {
          setOpponentChose(true);
        }
      });

      newConnection.on('RoundResult', (data: any) => {
        const result = data.result || data;
        const playerData = data.players;

        // Show choices
        if (result?.choices) {
          setPlayerChoices(result.choices);
        } else if (playerData) {
          const choices: Record<string, Choice> = {};
          playerData.forEach((p: any) => {
            if (p.choice) choices[p.id] = p.choice;
          });
          setPlayerChoices(choices);
        }

        // Determine result for me
        const currentPlayerId = playerIdRef.current;
        const winnerId = result?.winnerId || result?.winner?.id || result?.winnerPlayerId;

        if (result?.isDraw) {
          setRoundResult('draw');
        } else if (winnerId === currentPlayerId) {
          setRoundResult('win');
        } else {
          setRoundResult('lose');
        }

        // Update scores
        if (playerData) {
          setPlayers(playerData);
        }

        // Update round
        setCurrentRound(prev => prev + 1);
        setGamePhase('result');

        // Önceki timeout'u temizle
        if (nextRoundTimeoutRef.current) {
          clearTimeout(nextRoundTimeoutRef.current);
          nextRoundTimeoutRef.current = null;
        }

        // 5 el sabit - son el mi kontrol et
        const isLastRound = data.roundNumber >= 5 || data.isGameOver || data.gameFinished || result?.isGameOver;

        if (isLastRound) {
          // Son el - GameFinished event'i gelecek, setTimeout kullanma
          // Backend GameFinished gönderecek
        } else {
          // Sonraki el için timeout
          nextRoundTimeoutRef.current = setTimeout(() => {
            setGamePhase('playing');
            setMyChoice(null);
            setOpponentChose(false);
            setPlayerChoices({});
            setRoundResult(null);
          }, 2500);
        }
      });

      newConnection.on('GameFinished', handleGameFinished);
      newConnection.on('GameOver', handleGameFinished);
      newConnection.on('GameEnded', handleGameFinished);

      newConnection.on('GameRestarted', () => {
        setGamePhase('waiting');
        setCurrentRound(1);
        setMyChoice(null);
        setOpponentChose(false);
        setPlayerChoices({});
        setRoundResult(null);
        setWinner(null);
        setGameOverMessage('');
        setPlayers(prev => prev.map(p => ({ ...p, score: 0, choice: undefined })));
      });

      newConnection.on('Error', (data: any) => {
        console.error('[RPS] Error:', data);
        alert(data.message || 'Bir hata oluştu');
      });

      // Reconnection handlers - telefon geldiğinde tekrar bağlanabilmek için
      newConnection.onreconnected(async () => {
        console.log('[RPS] SignalR reconnected, rejoining room...');
        setIsConnected(true);

        // Oda varsa tekrar katıl
        if (roomIdRef.current && playerIdRef.current) {
          try {
            await newConnection.invoke('JoinRoom', roomIdRef.current, playerIdRef.current, nicknameRef.current);
            console.log('[RPS] Rejoined room after reconnect');
          } catch (err) {
            console.error('[RPS] Failed to rejoin room:', err);
          }
        }
      });

      newConnection.onreconnecting(() => {
        console.log('[RPS] SignalR reconnecting...');
        setIsConnected(false);
      });

      newConnection.onclose(() => {
        console.log('[RPS] SignalR connection closed');
        setIsConnected(false);
      });

      // Connect
      try {
        await newConnection.start();
        setIsConnected(true);
        setConnectionError(null);
        setConnection(newConnection);
        connectionRef.current = newConnection;

        const newPlayerId = generatePlayerId();
        setPlayerId(newPlayerId);
        playerIdRef.current = newPlayerId;
      } catch (err) {
        console.error('[RPS] Connection error:', err);
        setConnectionError('Oyun sunucusuna bağlanılamadı.');
      }
    };

    setupConnection();

    // Cleanup
    return () => {
      const currentPlayerId = playerIdRef.current;
      const currentRoomId = roomIdRef.current;
      const conn = connectionRef.current;

      if (conn && currentRoomId && currentPlayerId) {
        conn.invoke('LeaveRoom', currentPlayerId).catch(err => {
          console.error('[RPS] Error leaving room on unmount:', err);
        });
      }

      conn?.stop();
    };
  }, [handleGameFinished]);

  // Auto-create room (like Ludo) - if not joining
  useEffect(() => {
    if (!joinRoomId && isConnected && connection && !autoRoomCreated && playerId) {
      setAutoRoomCreated(true);
      const createNickname = nickname || generateRandomNickname();
      const newRoomId = generateRoomId();

      setNickname(createNickname);
      nicknameRef.current = createNickname;
      roomIdRef.current = newRoomId;
      setIsHost(true);

      const settings = { maxRounds: MAX_ROUNDS, maxPlayers: 2, gameType: 'RockPaperScissors' };

      connection.invoke('CreateRoom', newRoomId, 'global', playerId, createNickname, settings, true).catch(err => {
        console.error('[RPS] Create room error:', err);
      });
    }
  }, [joinRoomId, isConnected, connection, autoRoomCreated, playerId, nickname]);

  // Auto-join from lobby
  useEffect(() => {
    if (joinRoomId && isConnected && connection && !autoJoinAttempted && playerId) {
      setAutoJoinAttempted(true);
      const joinNickname = nickname || generateRandomNickname();
      setRoomId(joinRoomId);
      roomIdRef.current = joinRoomId;
      setNickname(joinNickname);
      nicknameRef.current = joinNickname;
      setIsHost(false);
      connection.invoke('JoinRoom', joinRoomId, playerId, joinNickname).catch(console.error);
    }
  }, [joinRoomId, isConnected, connection, autoJoinAttempted, playerId, nickname]);

  // 🤖 Bot modu - hemen oyunu başlat
  useEffect(() => {
    if (playWithBot && !autoRoomCreated) {
      setAutoRoomCreated(true);
      const playerNickname = nickname || currentUser?.nickName || currentUser?.nickname || generateRandomNickname();
      const botPlayerId = 'bot_' + Math.random().toString(36).substr(2, 9);
      const myId = generatePlayerId();

      setPlayerId(myId);
      playerIdRef.current = myId;
      botPlayerIdRef.current = botPlayerId; // Bot ID'sini ref'e kaydet
      setNickname(playerNickname);
      nicknameRef.current = playerNickname;
      setRoomId('bot-game');
      roomIdRef.current = 'bot-game';

      // Bot ve oyuncu ekle
      setPlayers([
        { id: myId, name: playerNickname, score: 0 },
        { id: botPlayerId, name: botName, score: 0 }
      ]);

      // Oyunu başlat
      setGamePhase('playing');
      setIsConnected(true);
      setCurrentRound(1);
    }
  }, [playWithBot, autoRoomCreated, nickname, currentUser, botName]);

  // Bot ismi değişince players'ı güncelle
  useEffect(() => {
    if (playWithBot && autoRoomCreated && botName) {
      setPlayers(prev => prev.map(p =>
        p.id.startsWith('bot_') ? { ...p, name: botName } : p
      ));
    }
  }, [playWithBot, autoRoomCreated, botName]);

  // Bot oyuncu ref'i
  const botPlayerIdRef = useRef<string>('');

  // Make choice
  const handleMakeChoice = async (choice: Choice) => {
    // 🤖 Bot modu
    if (playWithBot) {
      if (myChoice) return;

      const currentPlayerId = playerIdRef.current;
      const currentBotId = botPlayerIdRef.current || players.find(p => p.id !== currentPlayerId)?.id || '';

      setMyChoice(choice);
      setOpponentChose(true);

      // Bot 1-2 saniye sonra seçim yapsın
      setTimeout(() => {
        const choices: Choice[] = ['rock', 'paper', 'scissors'];
        const botChoice = choices[Math.floor(Math.random() * 3)];

        setPlayerChoices({
          [currentPlayerId]: choice,
          [currentBotId]: botChoice
        });

        // Kazananı belirle
        const result = determineWinner(choice, botChoice);

        if (result === 'draw') {
          setRoundResult('draw');
        } else if (result === 'player1') {
          setRoundResult('win');
          setPlayers(prev => prev.map(p =>
            p.id === currentPlayerId ? { ...p, score: p.score + 1 } : p
          ));
        } else {
          setRoundResult('lose');
          setPlayers(prev => prev.map(p =>
            p.id === currentBotId ? { ...p, score: p.score + 1 } : p
          ));
        }

        setGamePhase('result');

        // 2 saniye sonra sonraki round veya oyun sonu
        setTimeout(() => {
          setCurrentRound(prevRound => {
            const nextRound = prevRound + 1;

            if (nextRound > MAX_ROUNDS) {
              // Oyun bitti - güncel skorları al
              setPlayers(currentPlayers => {
                const myPlayer = currentPlayers.find(p => !p.id.startsWith('bot_'));
                const botPlayer = currentPlayers.find(p => p.id.startsWith('bot_'));

                if (myPlayer && botPlayer) {
                  if (myPlayer.score > botPlayer.score) {
                    setWinner(myPlayer);
                    setGameOverMessage('🎊 Tebrikler! Oyunu Kazandınız! 🎊');
                  } else if (botPlayer.score > myPlayer.score) {
                    setWinner(botPlayer);
                    setGameOverMessage(`😢 ${botPlayer.name} Oyunu Kazandı!`);
                  } else {
                    setGameOverMessage('🤝 Oyun Berabere Bitti!');
                  }
                }
                setGamePhase('finished');
                return currentPlayers;
              });
              return prevRound; // Oyun bitti, round'u artırma
            } else {
              // Sonraki round
              setGamePhase('playing');
              setMyChoice(null);
              setOpponentChose(false);
              setPlayerChoices({});
              setRoundResult(null);
              return nextRound; // Round'u artır
            }
          });
        }, 2000);
      }, 1000 + Math.random() * 1000); // 1-2 saniye

      return;
    }

    // Normal multiplayer mod
    if (!connection || !roomId || !playerId) return;

    setMyChoice(choice);
    try {
      await connection.invoke('MakeChoice', roomId, playerId, choice);
    } catch (err) {
      console.error('[RPS] Make choice error:', err);
    }
  };

  // Play again
  const handlePlayAgain = async () => {
    // 🤖 Bot modu
    if (playWithBot) {
      setCurrentRound(1);
      setMyChoice(null);
      setOpponentChose(false);
      setPlayerChoices({});
      setRoundResult(null);
      setWinner(null);
      setGameOverMessage('');
      setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));
      setGamePhase('playing');
      return;
    }

    if (!connection || !roomId) return;

    try {
      await connection.invoke('RestartGame', roomId);
    } catch (err) {
      console.error('[RPS] Restart error:', err);
    }
  };

  // Copy room link
  const copyRoomLink = async () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${baseUrl}/game/rps?roomId=${roomId}${customerCode && customerCode !== 'global' ? `&code=${customerCode}` : ''}`;
    await navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Toggle lobby visibility
  const toggleLobbyVisibility = async (visible: boolean) => {
    setShowInLobby(visible);
    if (connection && roomId) {
      try {
        await connection.invoke('SetRoomVisibility', roomId, visible);
      } catch (err) {
        console.error('[RPS] SetRoomVisibility error:', err);
      }
    }
  };

  // Oyuncu kovma onayı göster
  const showKickConfirm = (targetId: string, targetName: string) => {
    setKickTargetPlayer({ id: targetId, name: targetName });
  };

  // Kovmayı onayla
  const confirmKickPlayer = async () => {
    if (!connection || !roomId || !playerId || !isHost || !kickTargetPlayer) return;
    try {
      await connection.invoke('RPSKickPlayer', roomId, playerId, kickTargetPlayer.id);
      setKickTargetPlayer(null);
    } catch (err) {
      console.error('[RPS] Kick player error:', err);
    }
  };

  // Kovmayı iptal et
  const cancelKickPlayer = () => {
    setKickTargetPlayer(null);
  };

  // ==================== RENDER ====================

  // Connecting
  if (gamePhase === 'connecting' || !isConnected) {
    return (
      <div style={styles.container}>
        <button onClick={handleBack} style={styles.topBackButton}>← Geri</button>
        <div style={styles.centerContent}>
          <div style={styles.gameIcon}>✊✋✌️</div>
          <h1 style={styles.title}>Taş Kağıt Makas</h1>
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
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Waiting for opponent
  if (gamePhase === 'waiting') {
    return (
      <div ref={containerRef} style={{...styles.container, position: 'relative'}}>
        <button onClick={handleBack} style={styles.topBackButton}>← Geri</button>

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

        <div style={styles.centerContent}>
          <div style={styles.gameIcon}>✊✋✌️</div>
          <h1 style={styles.title}>Taş Kağıt Makas</h1>

          <div style={styles.waitingBox}>
            <div style={styles.spinner} />
            <p style={styles.waitingText}>Rakip bekleniyor...</p>

            {/* Players */}
            <div style={styles.playersList}>
              {players.map((p, i) => (
                <div key={p.id} style={{...styles.playerChip, display: 'flex', alignItems: 'center', gap: 8}}>
                  <span style={{flex: 1}}>{p.name} {p.id === playerId && '(Sen)'}</span>
                  {i === 0 && <span>👑</span>}
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
                        justifyContent: 'center'
                      }}
                      title="Oyuncuyu Kov"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {players.length < 2 && (
                <div style={{...styles.playerChip, opacity: 0.5}}>
                  Bekleniyor...
                </div>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div style={styles.qrBox}>
            <p style={styles.qrLabel}>QR Kod ile Katıl</p>
            <div style={styles.qrWrapper}>
              <QRCodeSVG
                value={typeof window !== 'undefined'
                  ? `${window.location.origin}/game/rps?roomId=${roomId}${customerCode && customerCode !== 'global' ? `&code=${customerCode}` : ''}`
                  : ''
                }
                size={150}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          </div>

          {/* Copy link */}
          <button onClick={copyRoomLink} style={styles.secondaryButton}>
            {linkCopied ? '✅ Kopyalandı!' : '📋 Linki Kopyala'}
          </button>

          {/* Lobby toggle for host */}
          {isHost && (
            <div style={{
              marginTop: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 12,
              width: '100%'
            }}>
              <div>
                <div style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>🏛️ Lobby'de Göster</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Diğerleri katılabilir</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 50, height: 26 }}>
                <input
                  type="checkbox"
                  checked={showInLobby}
                  onChange={(e) => toggleLobbyVisibility(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: showInLobby ? '#27ae60' : 'rgba(255,255,255,0.2)',
                  borderRadius: 26,
                  transition: '0.3s'
                }}>
                  <span style={{
                    position: 'absolute',
                    height: 20, width: 20,
                    left: showInLobby ? 26 : 3,
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

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Playing or Result
  if (gamePhase === 'playing' || gamePhase === 'result') {
    return (
      <div ref={containerRef} style={styles.container}>
        <button onClick={handleBack} style={styles.topBackButton}>← Çık</button>
        {!isIOS && (
          <button onClick={toggleFullscreen} style={{
            ...styles.topBackButton,
            left: 80,
            background: isFullscreen ? 'rgba(39, 174, 96, 0.9)' : 'rgba(255,255,255,0.2)'
          }}>⛶</button>
        )}

        {/* Round info */}
        <div style={styles.roundInfo}>
          Round {Math.min(currentRound, MAX_ROUNDS)} / {MAX_ROUNDS}
        </div>

        {/* Opponent */}
        <div style={styles.opponentSection}>
          <div style={styles.playerName}>{opponent?.name || 'Rakip'}</div>
          <div style={styles.playerScore}>{opponent?.score || 0}</div>
          {gamePhase === 'result' && playerChoices[opponent?.id || ''] && (
            <div style={styles.choiceDisplay}>
              {CHOICE_ICONS[playerChoices[opponent?.id || '']]}
            </div>
          )}
          {gamePhase === 'playing' && opponentChose && (
            <div style={styles.waitingChoice}>✓ Seçti</div>
          )}
        </div>

        {/* VS */}
        <div style={styles.vsSection}>
          {gamePhase === 'result' ? (
            <div style={{
              ...styles.resultBadge,
              background: roundResult === 'win' ? '#27ae60' : roundResult === 'lose' ? '#e74c3c' : '#f39c12'
            }}>
              {roundResult === 'win' ? '🎉 Kazandın!' : roundResult === 'lose' ? '😢 Kaybettin!' : '🤝 Berabere!'}
            </div>
          ) : (
            <div style={styles.vsText}>VS</div>
          )}
        </div>

        {/* Me */}
        <div style={styles.meSection}>
          <div style={styles.playerName}>{me?.name || 'Sen'}</div>
          <div style={styles.playerScore}>{me?.score || 0}</div>
          {gamePhase === 'result' && playerChoices[playerId] && (
            <div style={styles.choiceDisplay}>
              {CHOICE_ICONS[playerChoices[playerId]]}
            </div>
          )}
        </div>

        {/* Choices */}
        {gamePhase === 'playing' && (
          <div style={styles.choicesSection}>
            <p style={styles.chooseText}>Seçimini Yap</p>
            <div style={styles.choicesRow}>
              {(['rock', 'paper', 'scissors'] as Choice[]).map(choice => (
                <button
                  key={choice}
                  onClick={() => handleMakeChoice(choice)}
                  disabled={!!myChoice}
                  style={{
                    ...styles.choiceButton,
                    ...(myChoice === choice ? styles.choiceSelected : {}),
                    ...(myChoice && myChoice !== choice ? styles.choiceDisabled : {})
                  }}
                >
                  <span style={styles.choiceIcon}>{CHOICE_ICONS[choice]}</span>
                  <span style={styles.choiceName}>{CHOICE_NAMES[choice]}</span>
                </button>
              ))}
            </div>
            {myChoice && (
              <p style={styles.waitingOpponent}>Rakip bekleniyor...</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Finished
  if (gamePhase === 'finished') {
    return (
      <div style={styles.container}>
        <div style={styles.centerContent}>
          <div style={styles.gameOverIcon}>🎮</div>
          <h1 style={styles.gameOverTitle}>Oyun Bitti!</h1>
          <p style={styles.gameOverMessage}>{gameOverMessage}</p>

          {/* Final scores */}
          <div style={styles.finalScores}>
            {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
              <div
                key={p.id}
                style={{
                  ...styles.scoreRow,
                  background: p.id === playerId ? 'rgba(52, 152, 219, 0.3)' : 'transparent'
                }}
              >
                <span>{i + 1}. {p.name}</span>
                <span>{p.score} puan</span>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div style={styles.buttonGroup}>
            <button onClick={handlePlayAgain} style={styles.primaryButton}>
              🔄 Tekrar Oyna
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

// Styles
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
    justifyContent: 'center',
    textAlign: 'center',
    gap: 15,
    maxWidth: 350,
    width: '100%'
  },
  gameIcon: {
    fontSize: 48,
    marginBottom: 10
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 700,
    margin: 0
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16
  },
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
  waitingBox: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 25,
    width: '100%',
    marginBottom: 15,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  waitingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 15,
    marginBottom: 15
  },
  playersList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center'
  },
  playerChip: {
    background: 'rgba(102, 126, 234, 0.3)',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: 20,
    fontSize: 14
  },
  qrBox: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    marginBottom: 10,
    textAlign: 'center'
  },
  qrLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 15
  },
  qrWrapper: {
    background: '#fff',
    padding: 15,
    borderRadius: 10,
    display: 'inline-block'
  },
  lobbyToggleBox: {
    marginTop: 15,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    width: '100%'
  },
  lobbyToggleTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 600
  },
  lobbyToggleDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11
  },
  switch: {
    position: 'relative',
    width: 50,
    height: 26,
    display: 'inline-block'
  },
  switchSlider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(255,255,255,0.2)',
    borderRadius: 26,
    transition: '0.3s'
  },
  roundInfo: {
    position: 'absolute',
    top: 15,
    right: 15,
    background: 'rgba(102, 126, 234, 0.3)',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 600
  },
  opponentSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 60,
    gap: 5
  },
  playerName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 600
  },
  playerScore: {
    color: '#667eea',
    fontSize: 36,
    fontWeight: 700
  },
  choiceDisplay: {
    fontSize: 60,
    marginTop: 10
  },
  waitingChoice: {
    color: '#27ae60',
    fontSize: 14,
    marginTop: 10
  },
  vsSection: {
    marginTop: 30,
    marginBottom: 30
  },
  vsText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 24,
    fontWeight: 700
  },
  resultBadge: {
    padding: '12px 24px',
    borderRadius: 25,
    color: '#fff',
    fontSize: 18,
    fontWeight: 600
  },
  meSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5
  },
  choicesSection: {
    marginTop: 30,
    width: '100%',
    maxWidth: 350,
    textAlign: 'center'
  },
  chooseText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginBottom: 20
  },
  choicesRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 15
  },
  choiceButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
    height: 100,
    background: 'rgba(255,255,255,0.1)',
    border: '2px solid rgba(255,255,255,0.2)',
    borderRadius: 15,
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#fff'
  },
  choiceSelected: {
    background: 'rgba(102, 126, 234, 0.5)',
    borderColor: '#667eea',
    transform: 'scale(1.05)'
  },
  choiceDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed'
  },
  choiceIcon: {
    fontSize: 36
  },
  choiceName: {
    fontSize: 12,
    marginTop: 5
  },
  waitingOpponent: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 20
  },
  gameOverIcon: {
    fontSize: 64,
    marginBottom: 10
  },
  gameOverTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 700,
    margin: 0
  },
  gameOverMessage: {
    color: '#ffd93d',
    fontSize: 18,
    marginTop: 10,
    marginBottom: 20
  },
  finalScores: {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20
  },
  scoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 15px',
    color: '#fff',
    fontSize: 16,
    borderRadius: 8
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: '100%'
  }
};
