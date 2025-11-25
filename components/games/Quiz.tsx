'use client';

import { useState, useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import type { UserData } from '@/contexts/UserContext';

interface QuizProps {
  onClose?: () => void;
  currentUser: UserData | null;
  customerCode?: string;
}

interface Player {
  id: string;
  name: string;
  score: number;
  answered?: boolean;
}

interface Question {
  id: string;
  text: string;
  answers: string[];
  correctAnswerIndex?: number;
}

interface QuizSettings {
  questionCount: number;
  maxPlayers: number;
}

type GameState = 'setup' | 'waiting' | 'playing' | 'results' | 'finished';

export default function Quiz({ onClose, currentUser, customerCode }: QuizProps) {
  // Connection state
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Game setup state
  const [gameState, setGameState] = useState<GameState>('setup');
  const [questionCount, setQuestionCount] = useState(10);
  const [showInLobby, setShowInLobby] = useState(true);

  const timeLimit = 20; // Sabit süre: 20 saniye
  const nickname = currentUser?.nickName || currentUser?.nickname || currentUser?.firstName || 'Oyuncu'; // EndUser nickname'i

  // Game state
  const [roomId, setRoomId] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);

  // Question state
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(questionCount);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(null);
  const [showQuestionResult, setShowQuestionResult] = useState(false);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

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
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Error)
        .build();

      // Event handlers
      newConnection.on('QuizRoomCreated', handleQuizRoomCreated);
      newConnection.on('QuizJoined', handleQuizJoined);
      newConnection.on('PlayerJoinedQuiz', handlePlayerJoined);
      newConnection.on('QuizStarted', handleQuizStarted);
      newConnection.on('NextQuestion', handleNextQuestion);
      newConnection.on('AnswerSubmitted', handleAnswerSubmitted);
      newConnection.on('QuestionResults', handleQuestionResults);
      newConnection.on('QuizFinished', handleQuizFinished);
      newConnection.on('PlayerLeft', handlePlayerLeft);
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
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, []);

  // Timer Effect
  useEffect(() => {
    if (gameState === 'playing' && !showQuestionResult && timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            // Auto-submit if time runs out
            if (selectedAnswer === null && connection) {
              handleSubmitAnswer(-1); // -1 indicates timeout
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerInterval(interval);

      return () => clearInterval(interval);
    }
  }, [gameState, showQuestionResult, timeRemaining]);

  // Helper Functions
  const generatePlayerId = () => {
    return 'player_' + Math.random().toString(36).substr(2, 9);
  };

  const generateRoomId = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // Event Handlers
  const handleQuizRoomCreated = (data: any) => {
    console.log('Quiz room created:', data);
    if (data.success) {
      setRoomId(data.roomId);
      setGameState('waiting');
      setIsHost(true);
    } else {
      alert(data.message || 'Quiz oluşturulamadı');
    }
  };

  const handleQuizJoined = (data: any) => {
    console.log('Quiz joined:', data);
    if (data.success) {
      setRoomId(data.roomId);
      setGameState('waiting');
      setIsHost(false);
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

  const handleQuizStarted = (data: any) => {
    console.log('Quiz started:', data);
    setGameState('playing');
    setTotalQuestions(data.totalQuestions || questionCount);
  };

  const handleNextQuestion = (data: any) => {
    console.log('Next question:', data);
    const { question, questionNumber } = data;

    setCurrentQuestion({
      id: question.id,
      text: question.text,
      answers: question.answers
    });
    setCurrentQuestionNumber(questionNumber);
    setSelectedAnswer(null);
    setCorrectAnswerIndex(null);
    setShowQuestionResult(false);
    setTimeRemaining(timeLimit);

    // Reset player answered status
    setPlayers(prev => prev.map(p => ({ ...p, answered: false })));
  };

  const handleAnswerSubmitted = (data: any) => {
    console.log('Answer submitted:', data);
    // Update player answered status
    setPlayers(prev => prev.map(p =>
      p.id === data.playerId ? { ...p, answered: true } : p
    ));
  };

  const handleQuestionResults = (data: any) => {
    console.log('Question results:', data);
    const { correctAnswer, players: updatedPlayers } = data;

    setCorrectAnswerIndex(correctAnswer);
    setShowQuestionResult(true);
    setPlayers(updatedPlayers);

    // Clear timer
    if (timerInterval) {
      clearInterval(timerInterval);
    }
  };

  const handleQuizFinished = (data: any) => {
    console.log('Quiz finished:', data);
    const { winner, finalScores: scores } = data;

    setGameState('finished');
    setFinalScores(scores || players);

    if (winner) {
      if (winner.id === playerId) {
        setGameOverMessage('🎊 Tebrikler! Quizi Kazandınız! 🎊');
      } else {
        setGameOverMessage(`🏆 ${winner.name} Quizi Kazandı!`);
      }
    } else {
      setGameOverMessage('Quiz Tamamlandı!');
    }

    setShowGameOver(true);
  };

  const handleError = (data: any) => {
    console.error('Quiz error:', data);
    alert(data.message || 'Bir hata oluştu');
  };

  // Action Handlers
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      alert('Bağlantı kurulamadı. Lütfen sayfayı yenileyin.');
      return;
    }

    const newRoomId = generateRoomId();
    const venueCode = customerCode || 'demo';

    const settings: QuizSettings = {
      questionCount,
      maxPlayers: 8
    };

    try {
      await connection.invoke('CreateQuizRoom', newRoomId, venueCode, playerId, nickname, settings, showInLobby);
    } catch (error) {
      console.error('Create quiz error:', error);
      alert('Quiz oluşturulamadı');
    }
  };

  const handleStartQuiz = async () => {
    if (!connection || !isHost) return;

    try {
      await connection.invoke('StartQuiz', roomId);
    } catch (error) {
      console.error('Start quiz error:', error);
    }
  };

  const handleSubmitAnswer = async (answerIndex: number) => {
    if (selectedAnswer !== null || !connection) return;

    setSelectedAnswer(answerIndex);

    try {
      await connection.invoke('SubmitAnswer', roomId, playerId, answerIndex);
    } catch (error) {
      console.error('Submit answer error:', error);
    }
  };

  const handleLeaveQuiz = async () => {
    if (!connection) return;

    try {
      await connection.invoke('LeaveRoom', roomId, playerId);
      setGameState('setup');
      setRoomId('');
      setPlayers([]);
    } catch (error) {
      console.error('Leave quiz error:', error);
    }
  };

  const handlePlayAgain = () => {
    setShowGameOver(false);
    setGameState('setup');
    setRoomId('');
    setPlayers([]);
    setCurrentQuestion(null);
    setCurrentQuestionNumber(0);
    setSelectedAnswer(null);
    setCorrectAnswerIndex(null);
  };

  // Get current player
  const me = players.find(p => p.id === playerId);

  // Render Setup Modal
  if (gameState === 'setup') {
    // Giriş kontrolü - Üye olmayan oynayamasın
    if (!nickname || !(currentUser?.nickName || currentUser?.nickname)) {
      return (
        <div className="quiz-setup-modal">
          <h2>📚 Bilgi Yarışması</h2>
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#ecf0f1'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
            <p style={{ fontSize: '18px', marginBottom: '10px' }}>
              Quiz oynamak için giriş yapmalısınız
            </p>
            <p style={{ fontSize: '14px', color: '#95a5a6' }}>
              Lütfen önce hesabınıza giriş yapın
            </p>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  marginTop: '20px',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Geri Dön
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="quiz-setup-modal">
        <h2>📚 Bilgi Yarışması</h2>
        <form onSubmit={handleCreateQuiz}>
          {/* Kullanıcı bilgisi */}
          <div style={{
            marginBottom: '20px',
            padding: '15px',
            background: 'rgba(102, 126, 234, 0.1)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '14px', color: '#bdc3c7', marginBottom: '5px' }}>
              Oyuncu
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#667eea' }}>
              {nickname}
            </div>
          </div>

          {/* Lobby Visibility */}
          <div className="rps-lobby-switch-container">
            <div className="rps-lobby-switch-label">
              <div className="rps-lobby-switch-title">🏛️ Lobby'de Göster</div>
              <div className="rps-lobby-switch-desc">
                Diğer oyuncular quiz'inize katılabilir
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

          {/* Quiz Options */}
          <div className="quiz-options">
            <div className="quiz-option-row">
              <div className="quiz-option-group">
                <label>Soru Sayısı</label>
                <select value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))}>
                  <option value="5">5 Soru</option>
                  <option value="10">10 Soru</option>
                  <option value="15">15 Soru</option>
                  <option value="20">20 Soru</option>
                </select>
              </div>
            </div>
          </div>

          <button type="submit" className="quiz-create-game-btn" disabled={!isConnected}>
            {isConnected ? 'Quiz Oluştur' : 'Bağlanıyor...'}
          </button>
        </form>
      </div>
    );
  }

  // Render Game Board
  return (
    <div className="quiz-game-container">
      {/* Header */}
      {roomId && (
        <div className="quiz-header">
          <div className="quiz-room-code">Oda: {roomId}</div>
          <div className="quiz-question-counter">
            Soru {currentQuestionNumber} / {totalQuestions}
          </div>
        </div>
      )}

      {/* Waiting Section */}
      {gameState === 'waiting' && (
        <div className="quiz-waiting-section">
          <div className="quiz-waiting-text">
            {isHost ? 'Diğer oyuncuların katılması bekleniyor...' : 'Host tarafından quiz\'in başlatılması bekleniyor...'}
          </div>
          <div className="quiz-spinner"></div>

          {/* QR Code Section */}
          {roomId && (
            <div style={{
              marginTop: '30px',
              padding: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{
                marginBottom: '15px',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#ecf0f1'
              }}>
                QR Kodu taratarak quiz'e katılın
              </div>

              {/* QR Code Image */}
              <div style={{
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                display: 'inline-block',
                marginBottom: '15px'
              }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/quiz?roomId=${roomId}`
                      : ''
                  )}`}
                  alt="QR Kod"
                  style={{ display: 'block', width: '200px', height: '200px' }}
                />
              </div>

              {/* Share Link */}
              <div style={{ marginTop: '15px' }}>
                <div style={{
                  fontSize: '14px',
                  color: '#bdc3c7',
                  marginBottom: '8px'
                }}>
                  Quiz linkini paylaş:
                </div>
                <div
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      const link = `${window.location.origin}/quiz?roomId=${roomId}`;
                      navigator.clipboard.writeText(link);
                      alert('Link kopyalandı!');
                    }
                  }}
                  style={{
                    background: '#2c3e50',
                    padding: '8px',
                    borderRadius: '5px',
                    fontSize: '12px',
                    wordBreak: 'break-all',
                    color: '#3498db',
                    cursor: 'pointer'
                  }}
                >
                  {typeof window !== 'undefined' ? `${window.location.origin}/quiz?roomId=${roomId}` : ''}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#95a5a6',
                  marginTop: '5px'
                }}>
                  Linke tıklayarak kopyalayın
                </div>
              </div>
            </div>
          )}

          {/* Players List */}
          {players.length > 0 && (
            <div className="quiz-players-section" style={{ marginTop: '30px' }}>
              <div className="quiz-players-title">
                Katılımcılar ({players.length}/8)
              </div>
              <div className="quiz-players-list">
                {players.map(player => (
                  <div key={player.id} className={`quiz-player-card ${player.id === playerId ? 'me' : ''}`}>
                    <div className="quiz-player-name">{player.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Question Section */}
      {gameState === 'playing' && currentQuestion && (
        <>
          <div className="quiz-question-section">
            <div className="quiz-question-header">
              <div className={timeRemaining <= 5 ? 'quiz-timer warning' : 'quiz-timer'}>
                ⏱️ {timeRemaining}s
              </div>
            </div>

            <div className="quiz-question-text">{currentQuestion.text}</div>

            <div className="quiz-answers-grid">
              {currentQuestion.answers.map((answer, index) => {
                let buttonClass = 'quiz-answer-btn';

                if (showQuestionResult) {
                  if (index === correctAnswerIndex) {
                    buttonClass += ' correct';
                  } else if (index === selectedAnswer && index !== correctAnswerIndex) {
                    buttonClass += ' incorrect';
                  }
                  buttonClass += ' disabled';
                } else {
                  if (index === selectedAnswer) {
                    buttonClass += ' selected';
                  }
                  if (selectedAnswer !== null) {
                    buttonClass += ' disabled';
                  }
                }

                return (
                  <button
                    key={index}
                    className={buttonClass}
                    onClick={() => handleSubmitAnswer(index)}
                    disabled={selectedAnswer !== null}
                  >
                    {answer}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Players Who Answered */}
          <div className="quiz-players-section">
            <div className="quiz-players-title">
              Katılımcılar ({players.filter(p => p.answered).length}/{players.length} cevapladı)
            </div>
            <div className="quiz-players-list">
              {players.map(player => (
                <div
                  key={player.id}
                  className={`quiz-player-card ${player.id === playerId ? 'me' : ''} ${player.answered ? 'answered' : ''}`}
                >
                  <div className="quiz-player-name">
                    {player.name} {player.answered && '✓'}
                  </div>
                  <div className="quiz-player-score">{player.score}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Scoreboard */}
      {gameState === 'results' && (
        <div className="quiz-scoreboard">
          <div className="quiz-scoreboard-title">🏆 Skor Tablosu</div>
          <ul className="quiz-scoreboard-list">
            {players
              .sort((a, b) => b.score - a.score)
              .map((player, index) => (
                <li
                  key={player.id}
                  className={`quiz-scoreboard-item rank-${index + 1 <= 3 ? index + 1 : ''}`}
                >
                  <span className="quiz-rank">{index + 1}.</span>
                  <span className="quiz-player-info">{player.name}</span>
                  <span className="quiz-score">{player.score}</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Controls */}
      <div className="quiz-controls">
        {gameState === 'waiting' && isHost && players.length >= 2 && (
          <button className="quiz-control-btn start" onClick={handleStartQuiz}>
            Quiz'i Başlat
          </button>
        )}
        <button className="quiz-control-btn leave" onClick={handleLeaveQuiz}>
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
        <div className="quiz-game-over-modal">
          <div className="quiz-game-over-content">
            <div className="quiz-game-over-title">🎓 Quiz Tamamlandı!</div>
            <div className="quiz-game-over-message">{gameOverMessage}</div>

            {/* Final Scoreboard */}
            <div className="quiz-scoreboard" style={{ marginBottom: '20px' }}>
              <div className="quiz-scoreboard-title">Final Sıralaması</div>
              <ul className="quiz-scoreboard-list">
                {finalScores
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <li
                      key={player.id}
                      className={`quiz-scoreboard-item rank-${index + 1 <= 3 ? index + 1 : ''}`}
                      style={{
                        background: player.id === playerId ? 'rgba(102, 126, 234, 0.3)' : undefined
                      }}
                    >
                      <span className="quiz-rank">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                      </span>
                      <span className="quiz-player-info">{player.name}</span>
                      <span className="quiz-score">{player.score}</span>
                    </li>
                  ))}
              </ul>
            </div>

            <div className="quiz-game-over-controls">
              <button className="quiz-play-again-btn" onClick={handlePlayAgain}>
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
