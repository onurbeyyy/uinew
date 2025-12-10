'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/contexts/UserContext';
import { submitScore } from '@/lib/gameApi';
import type { UserData } from '@/contexts/UserContext';

interface QuizPlayer {
  id: string;
  name: string;
  score: number;
  answered?: boolean;
}

interface Question {
  id: string;
  text: string;
  answers: string[];
}

interface QuizGameProps {
  onBack?: () => void;
  joinRoomId?: string;
  customerCode: string;
  currentUser: UserData | null;
}

// Sabit değerler
const QUIZ_CATEGORY = 'Mixed';
const QUIZ_DIFFICULTY = 'Easy';
const QUESTION_COUNT = 10;
const TIME_LIMIT = 15;

// Oyuncu renkleri (8 kişi)
const PLAYER_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e91e63', '#00bcd4'
];

export default function QuizGame({ onBack, joinRoomId, customerCode, currentUser }: QuizGameProps) {
  // Connection
  const [isConnected, setIsConnected] = useState(false);

  // Game setup
  const [gamePhase, setGamePhase] = useState<'connecting' | 'waiting' | 'playing' | 'finished'>('connecting');
  const initialNickname = currentUser?.nickName || currentUser?.nickname || currentUser?.firstName || 'Oyuncu';

  // Game state
  const [roomId, setRoomId] = useState(joinRoomId || '');
  const [playerId, setPlayerId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<QuizPlayer[]>([]);
  const [showInLobby, setShowInLobby] = useState(true);
  const [error, setError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [kickTargetPlayer, setKickTargetPlayer] = useState<{id: string, name: string} | null>(null);

  // Question state
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(QUESTION_COUNT);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);

  // Game over
  const [finalScores, setFinalScores] = useState<QuizPlayer[]>([]);
  const [gameOverMessage, setGameOverMessage] = useState('');
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);
  const [resultSubmitted, setResultSubmitted] = useState(false);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Refs for closures
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerIdRef = useRef('');
  const roomIdRef = useRef(joinRoomId || '');
  const nicknameRef = useRef(initialNickname);
  const gameStartTimeRef = useRef<Date | null>(null);
  const resultSubmittedRef = useRef(false);
  const onBackRef = useRef(onBack);
  const gamePhaseRef = useRef(gamePhase);
  const autoJoinedRef = useRef(false);
  const initialShowInLobbyRef = useRef(true); // İlk render'da sunucuya çağrı yapma

  // Helpers
  const generatePlayerId = () => 'quiz_' + Math.random().toString(36).substr(2, 9);
  const generateRoomId = () => Math.floor(1000 + Math.random() * 9000).toString();

  const getShareUrl = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    let url = `${baseUrl}/game/quiz?room=${roomIdRef.current}`;
    if (customerCode && customerCode !== 'global') {
      url += `&code=${customerCode}`;
    }
    return url;
  };

  const copyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Link kopyalanamadı:', err);
    }
  };

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
        console.error('[Quiz] Exit fullscreen error:', err);
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
        console.error('[Quiz] Enter fullscreen error:', err);
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

  // Normalize player data
  const normalizePlayer = useCallback((p: any): QuizPlayer => ({
    id: p.id || p.Id || p.playerId || p.PlayerId || '',
    name: p.name || p.Name || p.playerName || p.PlayerName || 'Oyuncu',
    score: p.score || p.Score || 0,
    answered: p.answered || p.Answered || false
  }), []);

  // API'ye skor gönder
  const submitGameResult = useCallback(async (scores: QuizPlayer[], winner: any) => {
    if (resultSubmittedRef.current || !gameStartTimeRef.current) return;

    const me = scores.find(p => p.id === playerIdRef.current);
    if (!me) return;

    resultSubmittedRef.current = true;
    setResultSubmitted(true);

    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const rank = sorted.findIndex(p => p.id === playerIdRef.current) + 1;
    const scoreMap: Record<number, number> = { 1: 100, 2: 75, 3: 50, 4: 40, 5: 30, 6: 25, 7: 20, 8: 15 };
    const gameDuration = Math.round((Date.now() - gameStartTimeRef.current.getTime()) / 1000);

    try {
      await submitScore({
        GameType: 'Quiz',
        PlayerNickname: nicknameRef.current,
        Score: scoreMap[rank] || 10,
        VenueCode: customerCode || 'demo',
        DeviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
        Duration: gameDuration,
        GameData: JSON.stringify({
          rank,
          totalPlayers: scores.length,
          myScore: me.score,
          winner: winner?.name || winner?.Name || null
        })
      });
    } catch (e) {
      console.error('[Quiz] Score submit error:', e);
    }
  }, [customerCode]);

  // SignalR Connection
  useEffect(() => {
    const setupConnection = async () => {
      const hubUrl = `${process.env.NEXT_PUBLIC_GAME_HUB_URL || 'https://apicanlimenu.online'}/gamehub`;

      const conn = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
          withCredentials: false
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Error)
        .build();

      // === EVENT HANDLERS ===

      conn.on('QuizRoomCreated', (data: any) => {
        if (data.success || data.Success) {
          // roomId direkt veya room.id içinde olabilir
          const newRoomId = data.roomId || data.RoomId || data.room?.id || data.room?.Id;
          setRoomId(newRoomId);
          roomIdRef.current = newRoomId;
          setPlayers([{ id: playerIdRef.current, name: nicknameRef.current, score: 0 }]);
          setIsHost(true);
          setGamePhase('waiting');

          // Lobby'ye bildir
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('gameRoomCreated', {
              detail: {
                id: newRoomId,
                roomId: newRoomId,
                gameType: 'Quiz',
                status: 'Waiting',
                hostPlayerName: nicknameRef.current,
                players: [{ id: playerIdRef.current, name: nicknameRef.current }],
                maxPlayers: 8
              }
            }));
          }
        } else {
          setError(data.message || data.Message || 'Oda oluşturulamadı');
        }
      });

      conn.on('QuizJoined', (data: any) => {
        // Success kontrolü - farklı formatları destekle
        const isSuccess = data.success || data.Success || data.room || data.roomId || data.RoomId;
        if (isSuccess) {
          const newRoomId = data.roomId || data.RoomId || data.room?.id || data.room?.Id;
          if (newRoomId) {
            setRoomId(newRoomId);
            roomIdRef.current = newRoomId;
          }
          // Players dizisi room içinde olabilir
          const playersData = data.room?.players || data.room?.Players || data.players || data.Players || [];
          setPlayers(playersData.length > 0 ? playersData.map(normalizePlayer) : []);
          setIsHost(false);
          setGamePhase('waiting');
        } else if (data.error || data.Error || data.message || data.Message) {
          setError(data.error || data.Error || data.message || data.Message);
        }
      });

      conn.on('PlayerJoinedQuiz', (data: any) => {
        // Players dizisi room içinde olabilir
        const playersData = data.room?.players || data.room?.Players || data.players || data.Players || [];
        if (playersData.length > 0) {
          setPlayers(playersData.map(normalizePlayer));

          // Lobby'ye bildir
          if (typeof window !== 'undefined' && roomIdRef.current) {
            window.dispatchEvent(new CustomEvent('gameRoomUpdated', {
              detail: {
                id: roomIdRef.current,
                roomId: roomIdRef.current,
                gameType: 'Quiz',
                status: 'Waiting',
                players: playersData.map(normalizePlayer),
                maxPlayers: 8
              }
            }));
          }
        }
      });

      conn.on('PlayerLeft', (data: any) => {
        // Players dizisi room içinde olabilir
        const playersData = data.room?.players || data.room?.Players || data.players || data.Players || [];
        setPlayers(playersData.map(normalizePlayer));

        // Lobby'ye bildir
        if (typeof window !== 'undefined' && roomIdRef.current) {
          if (playersData.length === 0) {
            window.dispatchEvent(new CustomEvent('gameRoomDeleted', {
              detail: { roomId: roomIdRef.current }
            }));
          } else {
            window.dispatchEvent(new CustomEvent('gameRoomUpdated', {
              detail: {
                id: roomIdRef.current,
                roomId: roomIdRef.current,
                gameType: 'Quiz',
                status: 'Waiting',
                players: playersData.map(normalizePlayer),
                maxPlayers: 8
              }
            }));
          }
        }

        // Oyun başlamışsa ve 1 kişi kaldıysa, oyunu bitir ve lobby'ye dön
        if (gamePhaseRef.current === 'playing' && playersData.length <= 1) {
          setGameOverMessage('😢 Diğer oyuncular ayrıldı! Lobby\'ye dönülüyor...');
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
      conn.on('QuizPlayerKicked', (data: any) => {
        // Ben kovuldum mu?
        if (data.kickedPlayerId === playerIdRef.current) {
          alert('Oda sahibi sizi odadan çıkardı.');
          if (onBackRef.current) {
            onBackRef.current();
          }
        } else {
          // Başka biri kovuldu, oyuncu listesini güncelle
          const playersData = data.players || [];
          setPlayers(playersData.map(normalizePlayer));
        }
      });

      conn.on('QuizStarted', (data: any) => {
        setTotalQuestions(data.totalQuestions || QUESTION_COUNT);
        const startTime = new Date();
        setGameStartTime(startTime);
        gameStartTimeRef.current = startTime;
        resultSubmittedRef.current = false;
        setResultSubmitted(false);

        // İlk soruyu set et
        if (data.currentQuestion) {
          const q = data.currentQuestion;
          setCurrentQuestion({ id: q.id, text: q.text, answers: q.options || q.answers });
          setQuestionNumber(data.questionNumber || 1);
          setSelectedAnswer(null);
          setCorrectAnswer(null);
          setShowResult(false);
          setTimeLeft(data.timeLimit || TIME_LIMIT);
          setPlayers(prev => prev.map(p => ({ ...p, answered: false })));
        }

        setGamePhase('playing');

        // Lobby'ye bildir
        if (typeof window !== 'undefined' && roomIdRef.current) {
          window.dispatchEvent(new CustomEvent('gameStarted', {
            detail: { roomId: roomIdRef.current, gameType: 'Quiz' }
          }));
        }
      });

      conn.on('NextQuestion', (data: any) => {
        const q = data.currentQuestion || data.question;
        if (q) {
          setCurrentQuestion({ id: q.id, text: q.text, answers: q.options || q.answers });
          setQuestionNumber(data.questionNumber);
          setSelectedAnswer(null);
          setCorrectAnswer(null);
          setShowResult(false);
          setTimeLeft(data.timeLimit || TIME_LIMIT);
          setPlayers(prev => prev.map(p => ({ ...p, answered: false })));
        }
      });

      conn.on('AnswerSubmitted', (data: any) => {
        const pid = data.playerId || data.PlayerId;
        setPlayers(prev => prev.map(p => p.id === pid ? { ...p, answered: true } : p));
      });

      conn.on('QuestionResults', (data: any) => {
        setCorrectAnswer(data.correctAnswer ?? data.CorrectAnswer);
        setShowResult(true);

        // Leaderboard veya results'dan puan bilgilerini al
        const leaderboard = data.leaderboard || data.Leaderboard || [];
        const results = data.results || data.Results || [];

        if (leaderboard.length > 0) {
          // Leaderboard'dan puanları güncelle
          setPlayers(prev => prev.map(p => {
            const lb = leaderboard.find((l: any) => (l.playerId || l.PlayerId) === p.id);
            if (lb) {
              return { ...p, score: lb.score || lb.Score || 0 };
            }
            return p;
          }));
        } else if (results.length > 0) {
          // Results'dan puanları güncelle
          setPlayers(prev => prev.map(p => {
            const r = results.find((res: any) => (res.playerId || res.PlayerId) === p.id);
            if (r) {
              return { ...p, score: r.totalScore || r.TotalScore || r.score || r.Score || p.score };
            }
            return p;
          }));
        }
      });

      conn.on('QuizFinished', (data: any) => {
        const winner = data.winner || data.Winner;
        // Scores dizisi room içinde olabilir
        const scoresData = data.room?.players || data.room?.Players || data.finalScores || data.FinalScores || data.players || data.Players || [];
        const scores = scoresData.length > 0 ? scoresData.map(normalizePlayer) : [];

        setFinalScores(scores);
        setGamePhase('finished');

        if (winner) {
          const winnerId = winner.id || winner.Id || winner.playerId || winner.PlayerId;
          const winnerName = winner.name || winner.Name || winner.playerName || winner.PlayerName || 'Kazanan';
          if (winnerId === playerIdRef.current) {
            setGameOverMessage('🎊 Tebrikler! Quizi Kazandınız!');
          } else {
            setGameOverMessage(`🏆 ${winnerName} Quizi Kazandı!`);
          }
        } else {
          setGameOverMessage('Quiz Tamamlandı!');
        }

        // Lobby'ye bildir
        if (typeof window !== 'undefined' && roomIdRef.current) {
          window.dispatchEvent(new CustomEvent('gameFinished', {
            detail: { roomId: roomIdRef.current, gameType: 'Quiz' }
          }));
        }

        // API'ye skor gönder
        submitGameResult(scores, winner);
      });

      conn.on('QuizRestarted', (data: any) => {
        // State'leri sıfırla
        setGamePhase('playing');
        setCurrentQuestion(null);
        setQuestionNumber(0);
        setSelectedAnswer(null);
        setCorrectAnswer(null);
        setShowResult(false);
        setTimeLeft(TIME_LIMIT);
        setFinalScores([]);
        setGameOverMessage('');
        resultSubmittedRef.current = false;
        setResultSubmitted(false);
        setPlayers(prev => prev.map(p => ({ ...p, score: 0, answered: false })));

        // İlk soruyu set et
        if (data.currentQuestion) {
          const q = data.currentQuestion;
          setCurrentQuestion({ id: q.id, text: q.text, answers: q.options || q.answers });
          setQuestionNumber(data.questionNumber || 1);
          setTimeLeft(data.timeLimit || TIME_LIMIT);
        }

        const startTime = new Date();
        setGameStartTime(startTime);
        gameStartTimeRef.current = startTime;
      });

      conn.on('Error', (data: any) => {
        console.error('Quiz Error:', data);
        setError(data.message || data.Message || 'Bir hata oluştu');
      });

      // Reconnection handlers - telefon geldiğinde tekrar bağlanabilmek için
      conn.onreconnected(async () => {
        setIsConnected(true);

        // Oda varsa tekrar katıl
        if (roomIdRef.current && playerIdRef.current) {
          try {
            await conn.invoke('JoinQuiz', roomIdRef.current, playerIdRef.current, nicknameRef.current);
          } catch (err) {
            console.error('[Quiz] Failed to rejoin room:', err);
          }
        }
      });

      conn.onreconnecting(() => {
        setIsConnected(false);
      });

      conn.onclose(() => {
        setIsConnected(false);
      });

      // Host odadan çıktığında oda kapandı
      conn.on('QuizRoomClosed', (data: any) => {
        alert(data.reason || data.Reason || 'Oda kapatıldı');
        // Ana sayfaya dön
        if (onBackRef.current) {
          onBackRef.current();
        }
      });

      // Oyuncular ayrıldığında oyun sonlandı (1 kişi kaldı)
      conn.on('QuizEnded', (data: any) => {
        setGameOverMessage(data.message || '😢 Diğer oyuncular ayrıldı! Lobby\'ye dönülüyor...');
        setGamePhase('finished');

        // 3 saniye sonra otomatik çıkış
        setTimeout(() => {
          if (onBackRef.current) {
            onBackRef.current();
          }
        }, 3000);
      });

      // === CONNECT ===
      try {
        await conn.start();
        setIsConnected(true);
        connectionRef.current = conn;

        // Player ID ayarla
        const newPlayerId = generatePlayerId();
        setPlayerId(newPlayerId);
        playerIdRef.current = newPlayerId;
        nicknameRef.current = initialNickname;

        // Otomatik oda oluştur veya katıl
        setTimeout(async () => {
          if (autoJoinedRef.current) return;
          autoJoinedRef.current = true;

          try {
            if (joinRoomId) {
              await conn.invoke('JoinQuiz', joinRoomId, playerIdRef.current, nicknameRef.current);
            } else {
              const newRoomId = generateRoomId();
              await conn.invoke('CreateQuizRoom', newRoomId, 'global', playerIdRef.current, nicknameRef.current,
                QUIZ_CATEGORY, QUIZ_DIFFICULTY, QUESTION_COUNT, showInLobby);
            }
          } catch (err) {
            console.error('Auto-join/create error:', err);
            setError('Odaya bağlanılamadı');
          }
        }, 300);

      } catch (err) {
        console.error('Connection error:', err);
        setError('Sunucuya bağlanılamadı');
      }
    };

    setupConnection();

    return () => {
      // Cleanup: Odadan çık ve bağlantıyı kapat
      const conn = connectionRef.current;
      const currentRoomId = roomIdRef.current;
      const currentPlayerId = playerIdRef.current;

      if (conn && currentPlayerId) {
        // LeaveQuiz sadece playerId alıyor
        conn.invoke('LeaveQuiz', currentPlayerId).catch(err => {
          console.error('[Quiz] Error leaving room on unmount:', err);
        });
      }

      conn?.stop();
    };
  }, []);

  // Keep refs updated
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    gamePhaseRef.current = gamePhase;
  }, [gamePhase]);

  // ShowInLobby değiştiğinde server'a bildir
  useEffect(() => {
    // İlk render'da çağrı yapma (oda oluşturulurken zaten gönderiliyor)
    if (initialShowInLobbyRef.current) {
      initialShowInLobbyRef.current = false;
      return;
    }

    // Sadece host ve oda varsa güncelle
    if (isConnected && connectionRef.current && roomId && isHost && gamePhase === 'waiting') {
      connectionRef.current.invoke('SetQuizRoomVisibility', roomId, showInLobby)
        .catch(err => console.error('[Quiz] SetQuizRoomVisibility error:', err));
    }
  }, [showInLobby, isConnected, roomId, isHost, gamePhase]);

  // Timer
  useEffect(() => {
    if (gamePhase !== 'playing' || showResult || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Süre doldu - cevap vermediyse TimeUp çağır
          if (selectedAnswer === null && connectionRef.current && roomIdRef.current) {
            connectionRef.current.invoke('TimeUp', roomIdRef.current, playerIdRef.current)
              .catch(err => console.error('[Quiz] TimeUp error:', err));
            setSelectedAnswer(-1); // UI'da cevap verilemez duruma getir
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gamePhase, showResult, timeLeft, selectedAnswer]);

  // Actions
  const handleAnswer = async (index: number) => {
    if (selectedAnswer !== null || !connectionRef.current) return;
    setSelectedAnswer(index);
    try {
      // Backend cevap metnini bekliyor (index değil!)
      const answerText = index >= 0 && currentQuestion ? currentQuestion.answers[index] : '';
      await connectionRef.current.invoke('SubmitAnswer', roomIdRef.current, playerIdRef.current, answerText);
    } catch (e) {
      console.error('Answer error:', e);
    }
  };

  const handleStart = async () => {
    if (!connectionRef.current || !isHost) return;
    try {
      await connectionRef.current.invoke('StartQuiz', roomIdRef.current);
    } catch (e) {
      console.error('Start error:', e);
    }
  };

  // Oyuncu kovma onayı göster
  const showKickConfirm = (targetId: string, targetName: string) => {
    setKickTargetPlayer({ id: targetId, name: targetName });
  };

  // Kovmayı onayla
  const confirmKickPlayer = async () => {
    if (!connectionRef.current || !roomIdRef.current || !isHost || !kickTargetPlayer) return;
    try {
      await connectionRef.current.invoke('QuizKickPlayer', roomIdRef.current, playerIdRef.current, kickTargetPlayer.id);
      setKickTargetPlayer(null);
    } catch (err) {
      console.error('[Quiz] Kick player error:', err);
    }
  };

  // Kovmayı iptal et
  const cancelKickPlayer = () => {
    setKickTargetPlayer(null);
  };

  const handleBack = async () => {
    if (connectionRef.current && playerIdRef.current) {
      try {
        // LeaveQuiz sadece playerId alıyor
        await connectionRef.current.invoke('LeaveQuiz', playerIdRef.current);

        // Lobby'ye bildir - oda silindi/güncellendi
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gameRoomDeleted', {
            detail: { roomId: roomIdRef.current }
          }));
        }
      } catch (e) {
        console.error('[Quiz] Error leaving room:', e);
      }
    }
    onBack?.();
  };

  const handlePlayAgain = async () => {
    if (!connectionRef.current || !roomIdRef.current) return;

    try {
      // Mevcut odada restart yap (RPS gibi)
      await connectionRef.current.invoke('RestartQuiz', roomIdRef.current);
    } catch (e) {
      console.error('[Quiz] Restart error:', e);
    }
  };

  // === RENDER ===

  // Connecting
  if (gamePhase === 'connecting') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        {onBack && (
          <button onClick={onBack} style={{
            position: 'absolute', top: 10, left: 10, padding: '8px 16px',
            background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 15, cursor: 'pointer', fontSize: 13
          }}>← Geri</button>
        )}
        <div style={{ fontSize: 60, marginBottom: 20 }}>📚</div>
        <p style={{ color: 'white', fontSize: 18 }}>{error || 'Bağlanıyor...'}</p>
      </div>
    );
  }

  // WAITING (Lobby) - Dikey düzen: Üst Oyuncular | Alt QR
  if (gamePhase === 'waiting') {
    return (
      <div
        ref={containerRef}
        style={{
          minHeight: '100vh',
          display: 'flex', flexDirection: 'column',
          padding: 10,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          position: 'relative'
        }}>
        {onBack && (
          <button onClick={handleBack} style={{
            position: 'absolute', top: 8, left: 8, padding: '6px 12px',
            background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 11
          }}>← Geri</button>
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

        {/* Başlık */}
        <div style={{ textAlign: 'center', marginTop: 32, marginBottom: 8 }}>
          <h2 style={{ color: 'white', margin: 0, fontSize: 16 }}>📚 Bilgi Yarışması</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: '4px 0 0', fontSize: 11 }}>
            Oda: <strong>{roomId}</strong> • 🎯 {QUESTION_COUNT} Soru • ⏱️ {TIME_LIMIT}sn
          </p>
        </div>

        {/* Oyuncular */}
        <div style={{
          background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, marginBottom: 8
        }}>
          <h3 style={{ color: 'white', margin: '0 0 6px 0', fontSize: 12, textAlign: 'center' }}>
            👥 Oyuncular ({players.length}/8)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {players.map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                background: PLAYER_COLORS[i % 8], borderRadius: 8
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', fontSize: 11, color: 'white'
                }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ color: 'white', fontWeight: '600', fontSize: 12, flex: 1 }}>{p.name}</span>
                {i === 0 && <span style={{ fontSize: 12 }}>👑</span>}
                {/* Host için kick butonu (kendisi ve host hariç) */}
                {isHost && i !== 0 && p.id !== playerIdRef.current && (
                  <button
                    onClick={() => showKickConfirm(p.id, p.name)}
                    style={{
                      background: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: 20,
                      height: 20,
                      fontSize: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: 2
                    }}
                    title="Oyuncuyu Kov"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Başlat butonu */}
          <div style={{ marginTop: 10, textAlign: 'center' }}>
            {isHost && players.length >= 2 ? (
              <button onClick={handleStart} style={{
                padding: '10px 40px', background: '#27ae60', color: 'white',
                border: 'none', borderRadius: 20, fontSize: 13, fontWeight: 'bold', cursor: 'pointer', width: '100%'
              }}>
                🎮 Quiz'i Başlat
              </button>
            ) : isHost ? (
              <p style={{ color: '#ffd93d', fontSize: 11, margin: 0 }}>⏳ En az 2 oyuncu gerekli</p>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, margin: 0 }}>⏳ Host quiz'i başlatacak...</p>
            )}
          </div>
        </div>

        {/* QR ve Link */}
        <div style={{
          background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, flex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <h3 style={{ color: 'white', margin: '0 0 6px 0', fontSize: 12 }}>
            📱 Arkadaşlarını Davet Et
          </h3>
          <div style={{ padding: 8, background: 'white', borderRadius: 8, marginBottom: 8 }}>
            <QRCodeSVG value={getShareUrl()} size={90} level="H" />
          </div>
          <button onClick={copyRoomLink} style={{
            padding: '8px 20px', fontSize: 12, fontWeight: '600',
            border: 'none', borderRadius: 16, cursor: 'pointer',
            background: 'white', color: '#667eea'
          }}>
            {linkCopied ? '✅ Kopyalandı!' : '📋 Linki Kopyala'}
          </button>

          {/* Lobby'de Göster Toggle - Sadece Host */}
          {isHost && (
            <div style={{
              marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: 8, width: '100%', maxWidth: 240
            }}>
              <div>
                <div style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>🏛️ Lobby'de Göster</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9 }}>Diğerleri katılabilir</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22 }}>
                <input type="checkbox" checked={showInLobby} onChange={(e) => setShowInLobby(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                  background: showInLobby ? '#27ae60' : 'rgba(255,255,255,0.2)', borderRadius: 22, transition: '0.3s'
                }}>
                  <span style={{
                    position: 'absolute', height: 18, width: 18, left: showInLobby ? 20 : 2, bottom: 2,
                    background: 'white', borderRadius: '50%', transition: '0.3s'
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
      </div>
    );
  }

  // PLAYING
  if (gamePhase === 'playing' && currentQuestion) {
    return (
      <div
        ref={containerRef}
        style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: 16,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleBack} style={{
              padding: '6px 12px', background: 'rgba(255,255,255,0.1)', color: 'white',
              border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer'
            }}>← Çık</button>
            {!isIOS && (
              <button onClick={toggleFullscreen} style={{
                padding: '6px 12px',
                background: isFullscreen ? 'rgba(39, 174, 96, 0.9)' : 'rgba(255,255,255,0.1)',
                color: 'white', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer'
              }}>⛶</button>
            )}
          </div>
          <span style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
            Soru {questionNumber}/{totalQuestions}
          </span>
          <span style={{
            color: timeLeft <= 5 ? '#e74c3c' : '#ffd93d', fontSize: 24, fontWeight: 'bold',
            animation: timeLeft <= 5 ? 'pulse 0.5s infinite' : 'none'
          }}>
            ⏱️ {timeLeft}s
          </span>
        </div>

        {/* Soru */}
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <p style={{ color: 'white', fontSize: 18, margin: 0, textAlign: 'center', lineHeight: 1.4 }}>
            {currentQuestion.text}
          </p>
        </div>

        {/* Cevaplar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>
          {currentQuestion.answers.map((answer, i) => {
            let bg = 'rgba(255,255,255,0.1)';
            let border = '2px solid transparent';
            const isCorrect = answer === correctAnswer;
            if (showResult) {
              if (isCorrect) { bg = '#27ae60'; border = '2px solid #2ecc71'; }
              else if (i === selectedAnswer) { bg = '#e74c3c'; border = '2px solid #c0392b'; }
            } else if (i === selectedAnswer) {
              bg = '#3498db'; border = '2px solid #2980b9';
            }
            return (
              <button key={i} onClick={() => handleAnswer(i)} disabled={selectedAnswer !== null}
                style={{
                  background: bg, color: 'white', border, borderRadius: 12, padding: 16,
                  fontSize: 15, cursor: selectedAnswer !== null ? 'default' : 'pointer',
                  transition: 'all 0.2s', opacity: selectedAnswer !== null && i !== selectedAnswer && !isCorrect ? 0.5 : 1
                }}>
                {answer}
              </button>
            );
          })}
        </div>

        {/* Oyuncu durumları - 4 kişiye kadar tek satır, 5+ kişi 2 satır */}
        <div style={{
          marginTop: 16,
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(players.length, 4)}, 1fr)`,
          gap: 6,
          justifyContent: 'center',
          maxWidth: '100%'
        }}>
          {players.map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '5px 8px',
              background: PLAYER_COLORS[i % 8], borderRadius: 12,
              opacity: p.answered ? 1 : 0.5, transition: 'opacity 0.3s'
            }}>
              <span style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{p.name.slice(0, 12)}</span>
              {p.answered && <span style={{ fontSize: 9 }}>✓</span>}
              <span style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>{p.score}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // FINISHED
  if (gamePhase === 'finished') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: 24
      }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🎓</div>
        <h2 style={{ color: 'white', margin: '0 0 24px', fontSize: 22, textAlign: 'center' }}>{gameOverMessage}</h2>

        {/* Sıralama */}
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 20, width: '100%', maxWidth: 320 }}>
          <h3 style={{ color: 'white', margin: '0 0 16px', fontSize: 16, textAlign: 'center' }}>🏆 Final Sıralaması</h3>
          {finalScores.sort((a, b) => b.score - a.score).map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 10,
              background: p.id === playerIdRef.current ? 'rgba(102,126,234,0.3)' : 'transparent',
              borderRadius: 10, marginBottom: 6
            }}>
              <span style={{ fontSize: 24, width: 32 }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
              </span>
              <span style={{ flex: 1, color: 'white', fontSize: 14, fontWeight: p.id === playerIdRef.current ? 'bold' : 'normal' }}>
                {p.name}
              </span>
              <span style={{ color: '#ffd93d', fontWeight: 'bold', fontSize: 16 }}>{p.score}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button onClick={handlePlayAgain} style={{
            padding: '14px 28px', background: '#27ae60', color: 'white',
            border: 'none', borderRadius: 25, fontSize: 15, fontWeight: 'bold', cursor: 'pointer'
          }}>
            🔄 Tekrar Oyna
          </button>
          {onBack && (
            <button onClick={onBack} style={{
              padding: '14px 28px', background: 'rgba(255,255,255,0.2)', color: 'white',
              border: 'none', borderRadius: 25, fontSize: 15, cursor: 'pointer'
            }}>
              Çıkış
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
