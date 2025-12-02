'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from '@/contexts/UserContext';

interface DrawGuessProps {
  onClose?: () => void;
  playerNickname?: string;
  customerCode?: string;
  joinRoomId?: string;
}

interface Player {
  id: string;
  name: string;
  score: number;
  isConnected: boolean;
  hasGuessedCorrectly?: boolean;
}

interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  isCorrectGuess?: boolean;
  isCloseGuess?: boolean;
  isSystemMessage?: boolean;
  timestamp: string;
}

interface DrawAction {
  type: 'draw' | 'clear' | 'fill' | 'undo';
  points?: { x: number; y: number }[];
  color: string;
  brushSize: number;
  fillColor?: string;
  timestamp: number;
}

type GameState = 'setup' | 'waiting' | 'starting' | 'selectingWord' | 'drawing' | 'roundEnd' | 'gameEnd';

export default function DrawGuess({ onClose, playerNickname, customerCode, joinRoomId }: DrawGuessProps) {
  // Kullanıcı bilgisi
  const { currentUser } = useAuth();

  // Connection
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Game state
  const [gameState, setGameState] = useState<GameState>('setup');
  const [roomId, setRoomId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);

  // Otomatik nickname al (giriş yapmış kullanıcıdan)
  const initialNickname = playerNickname || currentUser?.nickName || currentUser?.nickname || currentUser?.firstName || '';

  // Setup
  const [nickname, setNickname] = useState(initialNickname);
  const [totalRounds, setTotalRounds] = useState(3);
  const [drawTime, setDrawTime] = useState(80);

  // Round state
  const [currentRound, setCurrentRound] = useState(0);
  const [maxRounds, setMaxRounds] = useState(3);
  const [currentDrawerId, setCurrentDrawerId] = useState('');
  const [currentDrawerName, setCurrentDrawerName] = useState('');
  const [currentWord, setCurrentWord] = useState('');
  const [wordHint, setWordHint] = useState('');
  const [wordOptions, setWordOptions] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [guessInput, setGuessInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Results
  const [roundWord, setRoundWord] = useState('');
  const [finalRankings, setFinalRankings] = useState<Player[]>([]);

  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // Renk paleti
  const colors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#A52A2A', '#808080', '#FFC0CB', '#90EE90', '#ADD8E6'
  ];

  // Nickname ref (bağlantı işlemlerinde güncel değeri kullanmak için)
  const nicknameRef = useRef(initialNickname);

  // Rastgele nickname oluştur
  const generateRandomNickname = () => {
    const adjectives = ['Hızlı', 'Şanslı', 'Neşeli', 'Cesur', 'Akıllı', 'Güçlü', 'Çevik', 'Komik'];
    const nouns = ['Ressam', 'Sanatçı', 'Çizer', 'Usta', 'Dahi', 'Yıldız', 'Kalem', 'Fırça'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}${noun}${num}`;
  };

  // currentUser değiştiğinde nickname'i güncelle
  useEffect(() => {
    if (currentUser && !nickname) {
      const newNickname = currentUser.nickName || currentUser.nickname || currentUser.firstName || '';
      if (newNickname) {
        setNickname(newNickname);
        nicknameRef.current = newNickname;
      }
    }
  }, [currentUser, nickname]);

  // SignalR bağlantısı
  useEffect(() => {
    const setupConnection = async () => {
      const hubUrl = 'https://game.canlimenu.com/drawguesshub';

      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Error)
        .build();

      // Event handlers
      newConnection.on('RoomCreated', handleRoomCreated);
      newConnection.on('RoomJoined', handleRoomJoined);
      newConnection.on('PlayerJoined', handlePlayerJoined);
      newConnection.on('PlayerLeft', handlePlayerLeft);
      newConnection.on('PlayerDisconnected', handlePlayerDisconnected);
      newConnection.on('GameStarting', handleGameStarting);
      newConnection.on('NewRound', handleNewRound);
      newConnection.on('SelectWord', handleSelectWord);
      newConnection.on('DrawingStarted', handleDrawingStarted);
      newConnection.on('DrawAction', handleDrawAction);
      newConnection.on('ChatMessage', handleChatMessage);
      newConnection.on('CorrectGuess', handleCorrectGuess);
      newConnection.on('CloseGuess', handleCloseGuess);
      newConnection.on('HintUpdated', handleHintUpdated);
      newConnection.on('RoundEnded', handleRoundEnded);
      newConnection.on('GameEnded', handleGameEnded);
      newConnection.on('Error', handleError);

      newConnection.onreconnecting(() => setConnectionError('Yeniden bağlanılıyor...'));
      newConnection.onreconnected(() => {
        setConnectionError(null);
        setIsConnected(true);
      });
      newConnection.onclose(() => {
        setIsConnected(false);
        setConnectionError('Bağlantı kesildi');
      });

      try {
        await newConnection.start();
        setConnection(newConnection);
        connectionRef.current = newConnection;
        setIsConnected(true);
        setConnectionError(null);

        // joinRoomId varsa otomatik katıl
        if (joinRoomId) {
          const playerName = nickname || initialNickname || generateRandomNickname();
          if (!nickname) {
            setNickname(playerName);
          }
          nicknameRef.current = playerName;

          const pid = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          setPlayerId(pid);
          setRoomId(joinRoomId);
          await newConnection.invoke('JoinRoom', joinRoomId, pid, playerName);
        }
      } catch (err) {
        console.error('SignalR bağlantı hatası:', err);
        setConnectionError('Sunucuya bağlanılamadı');
      }
    };

    setupConnection();

    return () => {
      connectionRef.current?.stop();
    };
  }, []);

  // Timer
  useEffect(() => {
    if (timeRemaining > 0 && (gameState === 'drawing' || gameState === 'selectingWord')) {
      const timer = setTimeout(() => setTimeRemaining(t => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining, gameState]);

  // Chat auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Event handlers
  const handleRoomCreated = (room: any) => {
    setRoomId(room.id);
    setPlayers(room.players || []);
    setIsHost(true);
    setGameState('waiting');
    addSystemMessage('Oda oluşturuldu! Kodu paylaş: ' + room.id);
  };

  const handleRoomJoined = (room: any) => {
    setRoomId(room.id);
    setPlayers(room.players || []);
    setGameState('waiting');
    addSystemMessage('Odaya katıldın!');
  };

  const handlePlayerJoined = (pid: string, pname: string, count: number) => {
    setPlayers(prev => {
      if (prev.find(p => p.id === pid)) return prev;
      return [...prev, { id: pid, name: pname, score: 0, isConnected: true }];
    });
    addSystemMessage(`${pname} odaya katıldı`);
  };

  const handlePlayerLeft = (pid: string, pname: string) => {
    setPlayers(prev => prev.filter(p => p.id !== pid));
    addSystemMessage(`${pname} odadan ayrıldı`);
  };

  const handlePlayerDisconnected = (pid: string, pname: string) => {
    setPlayers(prev => prev.map(p => p.id === pid ? { ...p, isConnected: false } : p));
    addSystemMessage(`${pname} bağlantısı kesildi`);
  };

  const handleGameStarting = (countdown: number) => {
    setGameState('starting');
    addSystemMessage(`Oyun ${countdown} saniye içinde başlıyor!`);
  };

  const handleNewRound = (data: any) => {
    setCurrentRound(data.round);
    setMaxRounds(data.totalRounds);
    setCurrentDrawerId(data.drawerId);
    setCurrentDrawerName(data.drawerName);
    setGameState('selectingWord');
    setCurrentWord('');
    setWordHint('');
    clearCanvas();

    // Doğru tahmin durumlarını sıfırla
    setPlayers(prev => prev.map(p => ({ ...p, hasGuessedCorrectly: false })));

    if (data.drawerId === playerId) {
      addSystemMessage('Senin sıran! Bir kelime seç.');
    } else {
      addSystemMessage(`${data.drawerName} kelime seçiyor...`);
    }
  };

  const handleSelectWord = (words: string[], timeSeconds: number) => {
    setWordOptions(words);
    setTimeRemaining(timeSeconds);
  };

  const handleDrawingStarted = (data: any) => {
    setGameState('drawing');
    setTimeRemaining(data.timeSeconds);

    if (data.word) {
      // Ben çiziyorum
      setCurrentWord(data.word);
      addSystemMessage(`Kelimen: ${data.word}`);
    } else {
      // Ben tahmin ediyorum
      setWordHint(data.hint);
      addSystemMessage(`${currentDrawerName} çiziyor! (${data.wordLength} harf)`);
    }
  };

  const handleDrawAction = (action: DrawAction) => {
    if (action.type === 'clear') {
      clearCanvas();
    } else if (action.type === 'draw' && action.points) {
      drawOnCanvas(action.points, action.color, action.brushSize);
    }
  };

  const handleChatMessage = (msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
  };

  const handleCorrectGuess = (data: any) => {
    setPlayers(prev => prev.map(p =>
      p.id === data.playerId
        ? { ...p, score: data.totalScore, hasGuessedCorrectly: true }
        : p
    ));
    addSystemMessage(`🎉 ${data.playerName} doğru bildi! (+${data.score} puan)`);
  };

  const handleCloseGuess = (guess: string) => {
    addSystemMessage(`"${guess}" çok yakın!`, true);
  };

  const handleHintUpdated = (hint: string) => {
    setWordHint(hint);
  };

  const handleRoundEnded = (data: any) => {
    setGameState('roundEnd');
    setRoundWord(data.word);
    setPlayers(data.scores.map((s: any) => ({
      id: s.playerId,
      name: s.playerName,
      score: s.score,
      isConnected: true,
      hasGuessedCorrectly: s.guessedCorrectly
    })));
    addSystemMessage(`Tur bitti! Kelime: ${data.word}`);
  };

  const handleGameEnded = (data: any) => {
    setGameState('gameEnd');
    setFinalRankings(data.rankings);
    if (data.winner) {
      addSystemMessage(`🏆 Kazanan: ${data.winner.playerName}!`);
    }
  };

  const handleError = (message: string) => {
    addSystemMessage(`Hata: ${message}`, true);
  };

  const addSystemMessage = (text: string, isPrivate = false) => {
    setMessages(prev => [...prev, {
      playerId: 'system',
      playerName: 'Sistem',
      message: text,
      isSystemMessage: true,
      timestamp: new Date().toISOString()
    }]);
  };

  // Actions
  const createRoom = async () => {
    if (!connection) return;

    // Nickname yoksa rastgele oluştur
    const playerName = nickname.trim() || generateRandomNickname();
    if (!nickname.trim()) {
      setNickname(playerName);
    }
    nicknameRef.current = playerName;

    const rid = `ciz_${Date.now().toString(36)}`;
    const pid = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setRoomId(rid);
    setPlayerId(pid);

    const settings = {
      maxPlayers: 8,
      totalRounds: totalRounds,
      drawTimeSeconds: drawTime,
      wordSelectTimeSeconds: 15,
      difficulty: 'normal',
      language: 'tr'
    };

    await connection.invoke('CreateRoom', rid, 'global', pid, playerName, settings); // Evrensel lobby
  };

  const joinRoom = async (rid: string) => {
    if (!connection || !rid.trim()) return;

    // Nickname yoksa rastgele oluştur
    const playerName = nickname.trim() || generateRandomNickname();
    if (!nickname.trim()) {
      setNickname(playerName);
    }
    nicknameRef.current = playerName;

    const pid = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setPlayerId(pid);
    await connection.invoke('JoinRoom', rid, pid, playerName);
  };

  const startGame = async () => {
    if (!connection || !roomId) return;
    await connection.invoke('StartGame', roomId);
  };

  const selectWord = async (word: string) => {
    if (!connection || !roomId) return;
    setWordOptions([]);
    await connection.invoke('SelectWord', roomId, word);
  };

  const sendGuess = async () => {
    if (!connection || !roomId || !guessInput.trim()) return;
    await connection.invoke('SendGuess', roomId, playerId, guessInput.trim());
    setGuessInput('');
  };

  // Canvas functions
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const drawOnCanvas = (points: { x: number; y: number }[], color: string, size: number) => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  };

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (currentDrawerId !== playerId || gameState !== 'drawing') return;
    e.preventDefault();

    const point = getCanvasPoint(e);
    if (!point) return;

    setIsDrawing(true);
    lastPointRef.current = point;
  };

  const handleDrawMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || currentDrawerId !== playerId || gameState !== 'drawing') return;
    e.preventDefault();

    const point = getCanvasPoint(e);
    if (!point || !lastPointRef.current) return;

    const points = [lastPointRef.current, point];
    drawOnCanvas(points, brushColor, brushSize);

    // Send to server
    connection?.invoke('SendDrawAction', roomId, {
      type: 'draw',
      points: points,
      color: brushColor,
      brushSize: brushSize,
      timestamp: Date.now()
    });

    lastPointRef.current = point;
  };

  const handleDrawEnd = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const handleClearCanvas = () => {
    if (currentDrawerId !== playerId) return;
    clearCanvas();
    connection?.invoke('SendDrawAction', roomId, {
      type: 'clear',
      color: brushColor,
      brushSize: brushSize,
      timestamp: Date.now()
    });
  };

  // Render
  const isMyTurnToDraw = currentDrawerId === playerId;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 15px',
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>🎨 Çiz Bul</h2>
        {gameState !== 'setup' && (
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {timeRemaining > 0 && (
              <span style={{
                background: timeRemaining <= 10 ? '#e74c3c' : '#3498db',
                padding: '5px 12px',
                borderRadius: '15px',
                fontWeight: 'bold'
              }}>
                ⏱️ {timeRemaining}s
              </span>
            )}
            <span>Tur {currentRound}/{maxRounds}</span>
          </div>
        )}
      </div>

      {/* Setup Screen */}
      {gameState === 'setup' && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          gap: '20px'
        }}>
          <h3>🎨 Çiz Bul Oyunu</h3>

          <input
            type="text"
            placeholder="Takma adın"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            style={{
              padding: '12px 20px',
              fontSize: '16px',
              borderRadius: '25px',
              border: 'none',
              width: '250px',
              textAlign: 'center'
            }}
          />

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label>Tur Sayısı:</label>
            <select
              value={totalRounds}
              onChange={(e) => setTotalRounds(Number(e.target.value))}
              style={{ padding: '8px', borderRadius: '8px' }}
            >
              <option value={2}>2 Tur</option>
              <option value={3}>3 Tur</option>
              <option value={4}>4 Tur</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label>Çizim Süresi:</label>
            <select
              value={drawTime}
              onChange={(e) => setDrawTime(Number(e.target.value))}
              style={{ padding: '8px', borderRadius: '8px' }}
            >
              <option value={60}>60 saniye</option>
              <option value={80}>80 saniye</option>
              <option value={100}>100 saniye</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
            <button
              onClick={createRoom}
              disabled={!nickname.trim() || !isConnected}
              style={{
                padding: '15px 30px',
                fontSize: '16px',
                fontWeight: 'bold',
                borderRadius: '25px',
                border: 'none',
                background: '#27ae60',
                color: 'white',
                cursor: 'pointer',
                opacity: (!nickname.trim() || !isConnected) ? 0.5 : 1
              }}
            >
              Oda Oluştur
            </button>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Oda kodu"
              onChange={(e) => setRoomId(e.target.value)}
              style={{
                padding: '10px 15px',
                borderRadius: '20px',
                border: 'none',
                width: '150px'
              }}
            />
            <button
              onClick={() => joinRoom(roomId)}
              disabled={!nickname.trim() || !roomId.trim() || !isConnected}
              style={{
                padding: '10px 20px',
                borderRadius: '20px',
                border: 'none',
                background: '#3498db',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Katıl
            </button>
          </div>

          {connectionError && (
            <p style={{ color: '#e74c3c' }}>{connectionError}</p>
          )}
        </div>
      )}

      {/* Game Screen */}
      {gameState !== 'setup' && gameState !== 'gameEnd' && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Word display / hint */}
          <div style={{
            padding: '10px',
            textAlign: 'center',
            background: 'rgba(0,0,0,0.2)'
          }}>
            {isMyTurnToDraw && currentWord ? (
              <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
                Kelimen: {currentWord}
              </span>
            ) : wordHint ? (
              <span style={{ fontSize: '24px', letterSpacing: '8px', fontFamily: 'monospace' }}>
                {wordHint}
              </span>
            ) : (
              <span>{currentDrawerName ? `${currentDrawerName} çiziyor...` : 'Bekleniyor...'}</span>
            )}
          </div>

          {/* Word selection for drawer */}
          {gameState === 'selectingWord' && isMyTurnToDraw && wordOptions.length > 0 && (
            <div style={{
              padding: '20px',
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              background: 'rgba(0,0,0,0.3)'
            }}>
              <p style={{ width: '100%', textAlign: 'center', margin: 0 }}>Bir kelime seç:</p>
              {wordOptions.map((word, i) => (
                <button
                  key={i}
                  onClick={() => selectWord(word)}
                  style={{
                    padding: '15px 25px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#27ae60',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  {word}
                </button>
              ))}
            </div>
          )}

          {/* Main game area */}
          <div style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            flexDirection: window.innerWidth < 768 ? 'column' : 'row'
          }}>
            {/* Canvas area */}
            <div style={{
              flex: 2,
              display: 'flex',
              flexDirection: 'column',
              padding: '10px'
            }}>
              <canvas
                ref={canvasRef}
                width={600}
                height={400}
                onMouseDown={handleDrawStart}
                onMouseMove={handleDrawMove}
                onMouseUp={handleDrawEnd}
                onMouseLeave={handleDrawEnd}
                onTouchStart={handleDrawStart}
                onTouchMove={handleDrawMove}
                onTouchEnd={handleDrawEnd}
                style={{
                  width: '100%',
                  maxHeight: '60vh',
                  background: 'white',
                  borderRadius: '10px',
                  cursor: isMyTurnToDraw && gameState === 'drawing' ? 'crosshair' : 'default',
                  touchAction: 'none'
                }}
              />

              {/* Drawing tools */}
              {isMyTurnToDraw && gameState === 'drawing' && (
                <div style={{
                  display: 'flex',
                  gap: '5px',
                  padding: '10px',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setBrushColor(color)}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: color,
                        border: brushColor === color ? '3px solid #fff' : '2px solid #ccc',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                  <select
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    style={{ padding: '5px', marginLeft: '10px' }}
                  >
                    <option value={2}>İnce</option>
                    <option value={5}>Orta</option>
                    <option value={10}>Kalın</option>
                    <option value={20}>Çok Kalın</option>
                  </select>
                  <button
                    onClick={handleClearCanvas}
                    style={{
                      padding: '8px 15px',
                      background: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      marginLeft: '10px'
                    }}
                  >
                    🗑️ Temizle
                  </button>
                </div>
              )}
            </div>

            {/* Right panel: Players + Chat */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minWidth: '250px',
              maxWidth: '300px',
              borderLeft: '1px solid rgba(255,255,255,0.2)'
            }}>
              {/* Players */}
              <div style={{
                padding: '10px',
                borderBottom: '1px solid rgba(255,255,255,0.2)',
                maxHeight: '150px',
                overflowY: 'auto'
              }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Oyuncular ({players.length})</h4>
                {players.sort((a, b) => b.score - a.score).map((p, i) => (
                  <div key={p.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '5px',
                    background: p.id === currentDrawerId ? 'rgba(39,174,96,0.3)' : 'transparent',
                    borderRadius: '5px',
                    marginBottom: '3px'
                  }}>
                    <span>
                      {i === 0 && '👑 '}
                      {p.id === currentDrawerId && '🖌️ '}
                      {p.hasGuessedCorrectly && '✅ '}
                      {p.name}
                    </span>
                    <span style={{ fontWeight: 'bold' }}>{p.score}</span>
                  </div>
                ))}
              </div>

              {/* Chat */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '10px'
                }}>
                  {messages.slice(-50).map((msg, i) => (
                    <div key={i} style={{
                      marginBottom: '5px',
                      padding: '5px',
                      background: msg.isSystemMessage
                        ? 'rgba(52,152,219,0.3)'
                        : msg.isCorrectGuess
                          ? 'rgba(39,174,96,0.3)'
                          : 'rgba(255,255,255,0.1)',
                      borderRadius: '5px',
                      fontSize: '13px'
                    }}>
                      {!msg.isSystemMessage && (
                        <strong>{msg.playerName}: </strong>
                      )}
                      {msg.message}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Guess input */}
                {gameState === 'drawing' && !isMyTurnToDraw && (
                  <div style={{ padding: '10px', display: 'flex', gap: '5px' }}>
                    <input
                      type="text"
                      value={guessInput}
                      onChange={(e) => setGuessInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendGuess()}
                      placeholder="Tahminini yaz..."
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '20px',
                        border: 'none'
                      }}
                    />
                    <button
                      onClick={sendGuess}
                      style={{
                        padding: '10px 15px',
                        borderRadius: '20px',
                        border: 'none',
                        background: '#27ae60',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      Gönder
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Waiting room */}
          {gameState === 'waiting' && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0,0,0,0.9)',
              padding: '30px',
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <h3>Oda Kodu: {roomId}</h3>
              <p>Oyuncu sayısı: {players.length}</p>
              {isHost && players.length >= 2 && (
                <button
                  onClick={startGame}
                  style={{
                    padding: '15px 30px',
                    fontSize: '18px',
                    background: '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    marginTop: '15px'
                  }}
                >
                  Oyunu Başlat
                </button>
              )}
              {isHost && players.length < 2 && (
                <p style={{ color: '#f39c12' }}>En az 2 oyuncu gerekli</p>
              )}
              {!isHost && (
                <p>Host oyunu başlatmasını bekliyor...</p>
              )}
            </div>
          )}

          {/* Round end screen */}
          {gameState === 'roundEnd' && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0,0,0,0.9)',
              padding: '30px',
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <h3>Tur Bitti!</h3>
              <p style={{ fontSize: '24px' }}>Kelime: <strong>{roundWord}</strong></p>
              <p>Sonraki tur başlıyor...</p>
            </div>
          )}
        </div>
      )}

      {/* Game End Screen */}
      {gameState === 'gameEnd' && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <h2>🏆 Oyun Bitti!</h2>
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '20px',
            borderRadius: '15px',
            marginTop: '20px',
            minWidth: '300px'
          }}>
            {finalRankings.map((p: any, i) => (
              <div key={p.playerId} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '15px',
                background: i === 0 ? 'rgba(241,196,15,0.3)' : 'transparent',
                borderRadius: '10px',
                marginBottom: '10px',
                fontSize: i === 0 ? '20px' : '16px'
              }}>
                <span>
                  {i === 0 && '🥇 '}
                  {i === 1 && '🥈 '}
                  {i === 2 && '🥉 '}
                  {p.playerName}
                </span>
                <span style={{ fontWeight: 'bold' }}>{p.score} puan</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              setGameState('setup');
              setPlayers([]);
              setMessages([]);
              setRoomId('');
            }}
            style={{
              marginTop: '30px',
              padding: '15px 30px',
              fontSize: '18px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              cursor: 'pointer'
            }}
          >
            Yeni Oyun
          </button>
        </div>
      )}
    </div>
  );
}
