'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/contexts/UserContext';

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

export default function RockPaperScissors({ onBack, joinRoomId, customerCode }: RockPaperScissorsProps) {
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

  // Refs for cleanup
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const playerIdRef = useRef('');
  const roomIdRef = useRef(joinRoomId || '');
  const nicknameRef = useRef(initialNickname);
  const nextRoundTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onBackRef = useRef(onBack);

  // Get my player and opponent
  const me = players.find(p => p.id === playerId);
  const opponent = players.find(p => p.id !== playerId);

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

  // Handle game finished
  const handleGameFinished = useCallback((data: any) => {

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
  }, []);

  // Keep onBackRef updated
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  // SignalR Connection
  useEffect(() => {
    const setupConnection = async () => {
      const hubUrl = 'https://canlimenu.online/gamehub';

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

  // Make choice
  const handleMakeChoice = async (choice: Choice) => {
    if (myChoice || !connection || !roomId || !playerId) return;

    setMyChoice(choice);
    try {
      await connection.invoke('MakeChoice', roomId, playerId, choice);
    } catch (err) {
      console.error('[RPS] Make choice error:', err);
    }
  };

  // Play again
  const handlePlayAgain = async () => {
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
      <div style={styles.container}>
        <button onClick={handleBack} style={styles.topBackButton}>← Geri</button>

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
      <div style={styles.container}>
        <button onClick={handleBack} style={styles.topBackButton}>← Çık</button>

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
