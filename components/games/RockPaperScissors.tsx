'use client';

import { useState, useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

interface RockPaperScissorsProps {
  onClose?: () => void;
  playerNickname?: string;
  customerCode?: string;
}

interface Player {
  id: string;
  name: string;
  score: number;
  choice?: 'rock' | 'paper' | 'scissors';
}

interface GameSettings {
  maxRounds: number;
  maxPlayers: number;
  isTournament?: boolean;
}

type GameMode = 'normal' | 'tournament';
type GameState = 'setup' | 'waiting' | 'playing' | 'result' | 'finished';

export default function RockPaperScissors({ onClose, playerNickname, customerCode }: RockPaperScissorsProps) {
  // Connection state
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Game setup state
  const [gameState, setGameState] = useState<GameState>('setup');
  const [nickname, setNickname] = useState(playerNickname || '');
  const [gameMode, setGameMode] = useState<GameMode>('normal');
  const [maxRounds, setMaxRounds] = useState(5);
  const [showInLobby, setShowInLobby] = useState(true);

  // Game state
  const [roomId, setRoomId] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [myChoice, setMyChoice] = useState<'rock' | 'paper' | 'scissors' | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [waitingText, setWaitingText] = useState('Bekliyor...');

  // Result state
  const [showResult, setShowResult] = useState(false);
  const [resultText, setResultText] = useState('');
  const [resultClass, setResultClass] = useState('');
  const [playerChoices, setPlayerChoices] = useState<{[key: string]: 'rock' | 'paper' | 'scissors'}>({});

  // Game over state
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameOverMessage, setGameOverMessage] = useState('');
  const [finalScores, setFinalScores] = useState<Player[]>([]);

  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // SignalR Connection Setup
  useEffect(() => {
    const setupConnection = async () => {
      const hubUrl = 'https://game.canlimenu.com/gamehub';

      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          transport: signalR.HttpTransportType.WebSockets,
          skipNegotiation: true
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: () => {
            return Math.random() * 10000;
          }
        })
        .configureLogging(signalR.LogLevel.Error)
        .build();

      // Event handlers
      newConnection.on('RoomCreated', handleRoomCreated);
      newConnection.on('GameJoined', handleGameJoined);
      newConnection.on('JoinedRoom', handleJoinedRoom);
      newConnection.on('PlayerJoined', handlePlayerJoined);
      newConnection.on('PlayerLeft', handlePlayerLeft);
      newConnection.on('GameStarted', handleGameStarted);
      newConnection.on('RoundStarted', handleRoundStarted);
      newConnection.on('PlayerMadeChoice', handlePlayerMadeChoice);
      newConnection.on('RoundResult', handleRoundResult);
      newConnection.on('GameFinished', handleGameFinished);
      newConnection.on('Error', handleError);

      try {
        await newConnection.start();
        console.log('SignalR Connected');
        setIsConnected(true);
        setConnection(newConnection);
        connectionRef.current = newConnection;

        // Generate player ID
        const newPlayerId = generatePlayerId();
        setPlayerId(newPlayerId);

      } catch (err) {
        console.error('SignalR Connection Error:', err);
      }
    };

    setupConnection();

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, []);

  // Helper Functions
  const generatePlayerId = () => {
    return 'player_' + Math.random().toString(36).substr(2, 9);
  };

  const generateRoomId = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const getChoiceIcon = (choice: 'rock' | 'paper' | 'scissors') => {
    switch (choice) {
      case 'rock': return '✊';
      case 'paper': return '✋';
      case 'scissors': return '✌️';
    }
  };

  const getChoiceText = (choice: 'rock' | 'paper' | 'scissors') => {
    switch (choice) {
      case 'rock': return 'Taş';
      case 'paper': return 'Kağıt';
      case 'scissors': return 'Makas';
    }
  };

  // Event Handlers
  const handleRoomCreated = (data: any) => {
    console.log('Room created:', data);
    if (data.success) {
      setRoomId(data.roomId);
      setGameState('waiting');
      setIsHost(true);
      setWaitingText('Diğer oyuncuların katılması bekleniyor...');
    } else {
      alert(data.message || 'Oyun oluşturulamadı');
    }
  };

  const handleGameJoined = (data: any) => {
    console.log('Game joined:', data);
    if (data.success) {
      setRoomId(data.roomId);
      setGameState('waiting');
      setIsHost(false);
    }
  };

  const handleJoinedRoom = (data: any) => {
    console.log('Joined room:', data);
    if (data.players) {
      setPlayers(data.players);
    }
  };

  const handlePlayerJoined = (data: any) => {
    console.log('Player joined:', data);
    if (data.players) {
      setPlayers(data.players);
    }
  };

  const handlePlayerLeft = (data: any) => {
    console.log('Player left:', data);
    if (data.players) {
      setPlayers(data.players);
    }
  };

  const handleGameStarted = (data: any) => {
    console.log('Game started:', data);
    setGameState('playing');
    setCurrentRound(1);
  };

  const handleRoundStarted = (data: any) => {
    console.log('Round started:', data);
    setGameState('playing');
    setMyChoice(null);
    setShowResult(false);
    setPlayerChoices({});
  };

  const handlePlayerMadeChoice = (data: any) => {
    console.log('Player made choice:', data);
    // Don't show opponent's choice yet
  };

  const handleRoundResult = (data: any) => {
    console.log('Round result:', data);
    const { result, players: playerData } = data;

    setShowResult(true);

    let resultClass = 'draw';
    let resultText = result.resultText;

    if (!result.isDraw) {
      if (result.winnerId === playerId) {
        resultClass = 'win';
        resultText = '🎉 Kazandınız!';
      } else {
        resultClass = 'lose';
        resultText = '😢 Kaybettiniz!';
      }
    } else {
      resultText = '🤝 Berabere!';
    }

    setResultText(resultText);
    setResultClass(resultClass);

    // Update player choices
    if (result.choices) {
      setPlayerChoices(result.choices);
    }

    // Update scores
    if (playerData) {
      setPlayers(playerData);
    }

    setGameState('result');
  };

  const handleGameFinished = (data: any) => {
    console.log('Game finished:', data);
    const { winner, finalScores: scores } = data;

    setGameState('finished');
    setFinalScores(scores || players);

    if (winner) {
      if (winner.id === playerId) {
        setGameOverMessage('🎊 Tebrikler! Oyunu Kazandınız! 🎊');
      } else {
        setGameOverMessage(`🏆 ${winner.name} Oyunu Kazandı!`);
      }
    } else {
      setGameOverMessage('🤝 Oyun Berabere Bitti!');
    }

    setShowGameOver(true);
  };

  const handleError = (data: any) => {
    console.error('Game error:', data);
    alert(data.message || 'Bir hata oluştu');
  };

  // Action Handlers
  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nickname.trim()) {
      alert('Lütfen bir takma ad girin');
      return;
    }

    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      alert('Bağlantı kurulamadı. Lütfen sayfayı yenileyin.');
      return;
    }

    const newRoomId = generateRoomId();
    const venueCode = customerCode || 'demo';

    const settings: GameSettings = {
      maxRounds: maxRounds,
      maxPlayers: gameMode === 'tournament' ? 4 : 2,
      isTournament: gameMode === 'tournament'
    };

    try {
      if (gameMode === 'tournament') {
        await connection.invoke('CreateTournament', newRoomId, venueCode, playerId, nickname, 4, showInLobby);
      } else {
        await connection.invoke('CreateRoom', newRoomId, venueCode, playerId, nickname, settings, showInLobby);
      }
    } catch (error) {
      console.error('Create game error:', error);
      alert('Oyun oluşturulamadı');
    }
  };

  const handleStartGame = async () => {
    if (!connection || !isHost) return;

    try {
      await connection.invoke('StartGame', roomId);
    } catch (error) {
      console.error('Start game error:', error);
    }
  };

  const handleMakeChoice = async (choice: 'rock' | 'paper' | 'scissors') => {
    if (myChoice || !connection) return;

    setMyChoice(choice);

    try {
      await connection.invoke('MakeChoice', roomId, playerId, choice);
    } catch (error) {
      console.error('Make choice error:', error);
    }
  };

  const handleLeaveGame = async () => {
    if (!connection) return;

    try {
      await connection.invoke('LeaveRoom', roomId, playerId);
      setGameState('setup');
      setRoomId('');
      setPlayers([]);
    } catch (error) {
      console.error('Leave game error:', error);
    }
  };

  const handlePlayAgain = () => {
    setShowGameOver(false);
    setGameState('setup');
    setRoomId('');
    setPlayers([]);
    setMyChoice(null);
    setShowResult(false);
    setCurrentRound(1);
  };

  // Get current player and opponent
  const me = players.find(p => p.id === playerId);
  const opponent = players.find(p => p.id !== playerId);

  // Render Setup Modal
  if (gameState === 'setup') {
    return (
      <div className="rps-setup-modal">
        <h2>Taş Kağıt Makas</h2>
        <form onSubmit={handleCreateGame}>
          <div className="rps-form-group">
            <label htmlFor="nickname">Takma Ad</label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Takma adınızı girin"
              maxLength={20}
              required
            />
          </div>

          {/* Lobby Visibility Switch */}
          <div className="rps-lobby-switch-container">
            <div className="rps-lobby-switch-label">
              <div className="rps-lobby-switch-title">🏛️ Lobby'de Göster</div>
              <div className="rps-lobby-switch-desc">
                Diğer oyuncular oyununuza katılabilir
              </div>
            </div>
            <label className="rps-toggle-switch">
              <input
                type="checkbox"
                checked={showInLobby}
                onChange={(e) => setShowInLobby(e.target.checked)}
              />
              <span className="rps-toggle-slider"></span>
            </label>
          </div>

          {/* Game Mode */}
          <div className="rps-mode-container">
            <div className="rps-mode-title">Oyun Modu</div>
            <div className="rps-mode-buttons">
              <button
                type="button"
                className={`rps-mode-btn ${gameMode === 'normal' ? 'active' : ''}`}
                onClick={() => setGameMode('normal')}
              >
                Normal Oyun (2 Kişi)
              </button>
              <button
                type="button"
                className={`rps-mode-btn ${gameMode === 'tournament' ? 'active' : ''}`}
                onClick={() => setGameMode('tournament')}
              >
                Turnuva (4 Kişi)
              </button>
            </div>
          </div>

          {/* Rounds Selection (only for normal mode) */}
          {gameMode === 'normal' && (
            <div className="rps-rounds-container">
              <div className="rps-rounds-title">Kaç El Oynanacak?</div>
              <div className="rps-round-buttons">
                {[3, 5, 7, 10].map(rounds => (
                  <button
                    key={rounds}
                    type="button"
                    className={`rps-round-btn ${maxRounds === rounds ? 'active' : ''}`}
                    onClick={() => setMaxRounds(rounds)}
                  >
                    {rounds} El
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tournament Info */}
          {gameMode === 'tournament' && (
            <div className="rps-mode-container">
              <div className="rps-mode-title">Turnuva (4 Kişi)</div>
              <div style={{
                background: 'rgba(52, 152, 219, 0.1)',
                padding: '15px',
                borderRadius: '8px',
                borderLeft: '4px solid #3498db'
              }}>
                <p style={{ margin: '5px 0', fontSize: '14px', color: '#bdc3c7' }}>
                  • Her maç 5 el (best of 5)
                </p>
                <p style={{ margin: '5px 0', fontSize: '14px', color: '#bdc3c7' }}>
                  • Eşleşmeler sırayla oynanır
                </p>
                <p style={{ margin: '5px 0', fontSize: '14px', color: '#bdc3c7' }}>
                  • Diğer oyuncular izleyebilir
                </p>
                <p style={{ margin: '5px 0', fontSize: '14px', color: '#bdc3c7' }}>
                  • Final sıralaması gösterilir
                </p>
              </div>
            </div>
          )}

          <button type="submit" className="rps-create-game-btn" disabled={!isConnected}>
            {isConnected ? 'Oyun Oluştur' : 'Bağlanıyor...'}
          </button>
        </form>
      </div>
    );
  }

  // Render Game Board
  return (
    <div className="rps-game-container">
      {/* Room Info */}
      {roomId && (
        <div className="rps-room-info">
          <div className="rps-room-code">{roomId}</div>
          <div>Oyun Kodu ile arkadaşlarınızı davet edin!</div>
        </div>
      )}

      {/* Players Section */}
      <div className="rps-players-section">
        <div className={`rps-player-card ${gameState === 'playing' && me ? 'active' : ''}`}>
          <div className="rps-player-name">{me?.name || 'Bekliyor...'}</div>
          <div className="rps-player-score">{me?.score || 0}</div>
        </div>

        <div className="rps-vs-text">VS</div>

        <div className={`rps-player-card ${gameState === 'playing' && opponent ? 'active' : ''}`}>
          <div className="rps-player-name">{opponent?.name || 'Bekliyor...'}</div>
          <div className="rps-player-score">{opponent?.score || 0}</div>
        </div>
      </div>

      {/* Waiting Section */}
      {gameState === 'waiting' && (
        <div className="rps-waiting-section" style={{ display: 'block' }}>
          <div className="rps-waiting-text">{waitingText}</div>
          <div className="rps-spinner"></div>
        </div>
      )}

      {/* Choice Section */}
      {gameState === 'playing' && !showResult && (
        <div className="rps-choice-section">
          <div className="rps-round-info">Raund {currentRound} / {maxRounds}</div>
          <div className="rps-choices-container">
            <button
              className={`rps-choice-btn ${myChoice === 'rock' ? 'selected' : ''} ${myChoice ? 'disabled' : ''}`}
              onClick={() => handleMakeChoice('rock')}
              disabled={!!myChoice}
            >
              <div className="rps-choice-icon">✊</div>
              <div className="rps-choice-text">Taş</div>
            </button>
            <button
              className={`rps-choice-btn ${myChoice === 'paper' ? 'selected' : ''} ${myChoice ? 'disabled' : ''}`}
              onClick={() => handleMakeChoice('paper')}
              disabled={!!myChoice}
            >
              <div className="rps-choice-icon">✋</div>
              <div className="rps-choice-text">Kağıt</div>
            </button>
            <button
              className={`rps-choice-btn ${myChoice === 'scissors' ? 'selected' : ''} ${myChoice ? 'disabled' : ''}`}
              onClick={() => handleMakeChoice('scissors')}
              disabled={!!myChoice}
            >
              <div className="rps-choice-icon">✌️</div>
              <div className="rps-choice-text">Makas</div>
            </button>
          </div>
        </div>
      )}

      {/* Result Section */}
      {showResult && (
        <div className="rps-result-section" style={{ display: 'block' }}>
          <div className={`rps-result-text ${resultClass}`}>{resultText}</div>
          <div className="rps-player-choices">
            {players.map(player => (
              <div key={player.id} className="rps-player-choice">
                <div className="rps-player-choice-name">{player.name}</div>
                <div className="rps-player-choice-icon">
                  {playerChoices[player.id] ? getChoiceIcon(playerChoices[player.id]) : '?'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game Controls */}
      <div className="rps-game-controls">
        {gameState === 'waiting' && isHost && players.length >= 2 && (
          <button className="rps-control-btn start" onClick={handleStartGame}>
            Oyunu Başlat
          </button>
        )}
        <button className="rps-control-btn leave" onClick={handleLeaveGame}>
          Odadan Ayrıl
        </button>
        {onClose && (
          <button className="rps-control-btn back" onClick={onClose}>
            Geri
          </button>
        )}
      </div>

      {/* Game Over Modal */}
      {showGameOver && (
        <div className="rps-game-over-modal">
          <div className="rps-game-over-content">
            <div className="rps-game-over-title">🎮 Oyun Bitti!</div>
            <div className="rps-game-over-message">{gameOverMessage}</div>
            <div className="rps-game-over-scores">
              <h3 style={{ marginBottom: '15px', color: '#776e65' }}>Final Skorları:</h3>
              {finalScores.map((player, index) => (
                <div key={player.id} style={{
                  padding: '10px',
                  margin: '5px 0',
                  background: player.id === playerId ? 'rgba(52, 152, 219, 0.2)' : 'transparent',
                  borderRadius: '5px'
                }}>
                  {index + 1}. {player.name}: {player.score} puan
                </div>
              ))}
            </div>
            <div className="rps-game-over-controls">
              <button className="rps-play-again-btn" onClick={handlePlayAgain}>
                🔄 Tekrar Oyna
              </button>
              {onClose && (
                <button
                  className="rps-control-btn back"
                  onClick={onClose}
                  style={{ padding: '15px 30px', fontSize: '16px' }}
                >
                  Ana Menüye Dön
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
