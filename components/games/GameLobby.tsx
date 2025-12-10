'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

interface Player {
  id: string;
  name: string;
}

interface GameRoom {
  id: string;
  type: string;
  status: 'waiting' | 'active' | 'finished';
  players: Player[];
  maxPlayers: number;
  host: string;
  created: string;
  kickedPlayerIds?: string[];
}

interface GameLobbyProps {
  onJoinGame: (roomId: string, gameType: string, hostName?: string) => void;
  onBack: () => void;
  inline?: boolean;
  customerCode?: string;
  currentUserId?: string;
}

// Nickname havuzu - rastgele seçilecek
const NICKNAME_POOL = [
  'Onur', 'Selin', 'Urass', 'Atahan', 'Nurr16', 'Esranurr',
  'Beste.16', 'Floyd', 'İremozkn', 'Suat', 'Ceren16', 'Özgeylmz',
  'Ramço', 'Didem', 'aksu88', 'Zeynep96', 'Elif00',
  'Elifrn', 'Nilsr', 'Aslix', 'Melisy', 'Iremks', 'Zehraxn',
  'Selayl', 'Deryavn', 'Nazlae', 'Belinvr', 'Hazaln', 'Sudevx',
  'Ecriva', 'Yagmur'
];

// Seeded random number generator - aynı seed ile aynı sonuç
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Zaman bazlı seed - her 30 dakikada bir değişir, herkes aynı görür
const getTimeSeed = (): number => {
  const now = new Date();
  // Her 30 dakikada bir değişen seed (saat + 30dk bloğu: 0 veya 1)
  return now.getFullYear() * 10000000 +
         (now.getMonth() + 1) * 100000 +
         now.getDate() * 1000 +
         now.getHours() * 10 +
         Math.floor(now.getMinutes() / 30);
};

// Seeded nickname seç (tekrarsız) - herkes aynı isimleri görür
const getSeededNicknames = (count: number, usedNames: string[], seedOffset: number): string[] => {
  const seed = getTimeSeed() + seedOffset;
  const available = NICKNAME_POOL.filter(n => !usedNames.includes(n));
  const selected: string[] = [];

  for (let i = 0; i < count && available.length > 0; i++) {
    const randomIndex = Math.floor(seededRandom(seed + i) * available.length);
    selected.push(available[randomIndex]);
    available.splice(randomIndex, 1);
  }
  return selected;
};

// Tüm olası fake odalar - zaman bazlı bazıları gösterilecek
const generateFakeRooms = (): GameRoom[] => {
  // Gece 23:00 - sabah 10:00 arası fake oda gösterme
  const currentHour = new Date().getHours();
  if (currentHour >= 23 || currentHour < 10) {
    return []; // Gece boş döndür
  }

  const seed = getTimeSeed();
  const usedNames: string[] = [];

  // Seed'e göre kaç oda gösterileceğini belirle
  // Saat 18-20 arası yoğun: 7-8 oda, diğer saatler: 2-6 oda
  const isPeakHours = currentHour >= 18 && currentHour < 20;
  const roomCount = isPeakHours
    ? 7 + Math.floor(seededRandom(seed) * 2) // 7-8 oda (yoğun saatler)
    : 2 + Math.floor(seededRandom(seed) * 5); // 2-6 oda (normal saatler)

  // Olası tüm oda tipleri
  const allPossibleRooms: { type: string; id: string; maxPlayers: number; playerCount: number; seedOffset: number }[] = [
    { type: 'backgammon', id: 'fake-tavla-1', maxPlayers: 2, playerCount: 2, seedOffset: 100 },
    { type: 'backgammon', id: 'fake-tavla-2', maxPlayers: 2, playerCount: 2, seedOffset: 200 },
    { type: 'backgammon', id: 'fake-tavla-3', maxPlayers: 2, playerCount: 2, seedOffset: 250 },
    { type: 'ludo', id: 'fake-ludo-1', maxPlayers: 4, playerCount: 3, seedOffset: 300 },
    { type: 'ludo', id: 'fake-ludo-2', maxPlayers: 4, playerCount: 4, seedOffset: 350 },
    { type: 'quiz', id: 'fake-quiz-1', maxPlayers: 8, playerCount: 4, seedOffset: 400 },
    { type: 'quiz', id: 'fake-quiz-2', maxPlayers: 8, playerCount: 5, seedOffset: 450 },
    { type: 'rps', id: 'fake-rps-1', maxPlayers: 2, playerCount: 2, seedOffset: 500 },
  ];

  // Seed'e göre hangi odaların gösterileceğini seç
  const shuffledRooms = [...allPossibleRooms].sort((a, b) =>
    seededRandom(seed + a.seedOffset) - seededRandom(seed + b.seedOffset)
  );
  const selectedRooms = shuffledRooms.slice(0, roomCount);

  // Seçilen odaları oluştur
  const rooms: GameRoom[] = [];
  let playerIdCounter = 1;

  for (const roomConfig of selectedRooms) {
    const names = getSeededNicknames(roomConfig.playerCount, usedNames, roomConfig.seedOffset);
    usedNames.push(...names);

    const players = names.map((name, idx) => ({
      id: `fake-p${playerIdCounter + idx}`,
      name: name || `Oyuncu${playerIdCounter + idx}`
    }));
    playerIdCounter += names.length;

    // Oyun süresini seed'e göre belirle (5-25 dk arası)
    const minutesAgo = 5 + Math.floor(seededRandom(seed + roomConfig.seedOffset + 999) * 20);

    rooms.push({
      id: roomConfig.id,
      type: roomConfig.type as 'backgammon' | 'ludo' | 'quiz' | 'rps',
      status: 'active',
      players,
      maxPlayers: roomConfig.maxPlayers,
      host: players[0]?.name || 'Oyuncu',
      created: new Date(Date.now() - minutesAgo * 60000).toISOString(),
    });
  }

  return rooms;
};

export default function GameLobby({ onJoinGame, onBack, inline = false, customerCode, currentUserId }: GameLobbyProps) {
  const [games, setGames] = useState<GameRoom[]>([]);
  const [fakeRooms, setFakeRooms] = useState<GameRoom[]>(() => generateFakeRooms());
  const [activeTab, setActiveTab] = useState<'waiting' | 'active'>('waiting');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // Venue code - evrensel lobby için her zaman 'global' kullan
  const venueCode = 'global';

  // Fake odaları periyodik olarak güncelle (her 45-90 saniyede)
  useEffect(() => {
    const updateFakeRooms = () => {
      setFakeRooms(generateFakeRooms());
    };

    // Rastgele aralıklarla güncelle (45-90 saniye)
    const scheduleNextUpdate = () => {
      const delay = 45000 + Math.floor(Math.random() * 45000); // 45-90 saniye
      return setTimeout(() => {
        updateFakeRooms();
        scheduleNextUpdate();
      }, delay);
    };

    const timeoutId = scheduleNextUpdate();
    return () => clearTimeout(timeoutId);
  }, []);

  // Gerçek oyunlar + fake odalar
  const allGames = [...games, ...fakeRooms];

  // Format game data
  const formatGameData = useCallback((room: any): GameRoom => {
    // State mapping: 0 = Waiting, 1 = Playing, 2 = Finished
    let status: 'waiting' | 'active' | 'finished' = 'waiting';
    if (room.state === 1 || room.status === 'Playing') {
      status = 'active';
    } else if (room.state === 2 || room.status === 'Finished') {
      status = 'finished';
    }

    return {
      id: room.id || room.roomId || String(Date.now()),
      type: room.gameType || room.type || 'rps',
      status: status,
      players: room.players || [],
      maxPlayers: room.maxPlayers || 4,
      host: room.hostPlayerName || room.host || 'Anonim',
      created: room.createdAt || room.created || new Date().toISOString(),
      kickedPlayerIds: room.kickedPlayerIds || []
    };
  }, []);

  // Kovulan oyuncuların odalarını filtrele (allGames kullan - gerçek + fake)
  const filteredGames = allGames.filter(game => {
    if (!currentUserId) return true;
    return !(game.kickedPlayerIds || []).includes(currentUserId);
  });

  // SignalR bağlantısı
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;

    const setupConnection = async () => {
      const hubUrl = `${process.env.NEXT_PUBLIC_GAME_HUB_URL || 'https://apicanlimenu.online'}/gamehub`;

      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
          withCredentials: false // CORS için credentials kapalı
        })
        .withAutomaticReconnect([0, 1000, 2000, 5000, 10000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      // Event handlers

      // VenueLobby - JoinVenueLobby sonrası sunucu bu eventi gönderir
      newConnection.on('VenueLobby', (data: any) => {
        const rooms = data?.rooms || data?.activeGames || [];
        const formattedRooms = rooms.map(formatGameData);
        setGames(formattedRooms);
      });

      // VenueLobbyJoined - Lobby'ye katılım onayı
      newConnection.on('VenueLobbyJoined', (data: any) => {
        const rooms = data?.games || [];
        const formattedRooms = rooms.map(formatGameData);
        setGames(formattedRooms);
      });

      // LobbyUpdated - Oda listesi güncellendiğinde
      newConnection.on('LobbyUpdated', (data: any) => {
        const rooms = data?.lobby || data?.rooms || [];
        const formattedRooms = rooms.map(formatGameData);
        setGames(formattedRooms);
      });

      newConnection.on('RoomCreated', (data: any) => {
        if (data.room) {
          const room = formatGameData(data.room);
          setGames(prev => {
            const exists = prev.some(g => g.id === room.id);
            if (!exists) {
              return [...prev, room];
            }
            return prev;
          });
        }
      });

      newConnection.on('RoomUpdated', (data: any) => {
        const room = formatGameData(data);
        setGames(prev => prev.map(g => g.id === room.id ? room : g));
      });

      newConnection.on('RoomDeleted', (data: any) => {
        const roomId = data.roomId || data.id;
        setGames(prev => prev.filter(g => g.id !== roomId));
      });

      // RoomRemoved - Oyun bitince veya oda boşalınca (Ludo vs.)
      newConnection.on('RoomRemoved', (data: any) => {
        const roomId = data.roomId || data.id;
        setGames(prev => prev.filter(g => g.id !== roomId));
      });

      newConnection.on('GameStarted', (data: any) => {
        const roomId = data.roomId || data.id;
        setGames(prev => prev.map(g =>
          g.id === roomId ? { ...g, status: 'active' as const } : g
        ));
      });

      newConnection.on('GameFinished', (data: any) => {
        const roomId = data.roomId || data.id;
        setGames(prev => prev.map(g =>
          g.id === roomId ? { ...g, status: 'finished' as const } : g
        ));
      });

      newConnection.on('GameEnded', (data: any) => {
        const roomId = data.roomId || data.id;
        setGames(prev => prev.filter(g => g.id !== roomId));
      });

      // PlayerJoined - oda güncellemesi için
      newConnection.on('PlayerJoined', (data: any) => {
        if (data.roomId && data.players) {
          setGames(prev => prev.map(g =>
            g.id === data.roomId ? { ...g, players: data.players } : g
          ));
        }
      });

      // PlayerLeft - oda güncellemesi için
      newConnection.on('PlayerLeft', (data: any) => {
        if (data.roomId && data.players) {
          setGames(prev => prev.map(g =>
            g.id === data.roomId ? { ...g, players: data.players } : g
          ));
        }
      });

      try {
        await newConnection.start();
        setIsConnected(true);
        connectionRef.current = newConnection;
        retryCount = 0; // Başarılı bağlantıda sıfırla

        // Venue lobby'ye katıl - sunucu VenueLobby eventi gönderecek
        try {
          await newConnection.invoke('JoinVenueLobby', venueCode);
        } catch (err) {
        }

        setIsLoading(false);
      } catch (err) {
        retryCount++;
        if (retryCount < maxRetries) {
          // Retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          setTimeout(() => setupConnection(), delay);
        } else {
          setIsLoading(false);
        }
      }
    };

    setupConnection();

    return () => {
      retryCount = maxRetries; // Cleanup'ta retry'ı durdur
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, [formatGameData, venueCode]);

  // Ayrıca local events de dinle (aynı sayfa içindeki güncellemeler için)
  useEffect(() => {
    const handleRoomCreated = (event: CustomEvent) => {
      const room = formatGameData(event.detail);
      setGames(prev => {
        const exists = prev.some(g => g.id === room.id);
        if (!exists) {
          return [...prev, room];
        }
        return prev;
      });
    };

    const handleRoomDeleted = (event: CustomEvent) => {
      setGames(prev => prev.filter(g => g.id !== event.detail.roomId));
    };

    const handleGameStarted = (event: CustomEvent) => {
      const roomId = event.detail.roomId || event.detail.id;
      setGames(prev => prev.map(g =>
        g.id === roomId ? { ...g, status: 'active' as const } : g
      ));
    };

    const handleGameFinished = (event: CustomEvent) => {
      const roomId = event.detail.roomId || event.detail.id;
      setGames(prev => prev.map(g =>
        g.id === roomId ? { ...g, status: 'finished' as const } : g
      ));
    };

    // Oyuncu katıldığında veya ayrıldığında lobby güncelleme
    const handleRoomUpdated = (event: CustomEvent) => {
      const room = formatGameData(event.detail);
      setGames(prev => prev.map(g => g.id === room.id ? room : g));
    };

    window.addEventListener('gameRoomCreated', handleRoomCreated as EventListener);
    window.addEventListener('gameRoomDeleted', handleRoomDeleted as EventListener);
    window.addEventListener('gameRoomUpdated', handleRoomUpdated as EventListener);
    window.addEventListener('gameStarted', handleGameStarted as EventListener);
    window.addEventListener('gameFinished', handleGameFinished as EventListener);

    return () => {
      window.removeEventListener('gameRoomCreated', handleRoomCreated as EventListener);
      window.removeEventListener('gameRoomDeleted', handleRoomDeleted as EventListener);
      window.removeEventListener('gameRoomUpdated', handleRoomUpdated as EventListener);
      window.removeEventListener('gameStarted', handleGameStarted as EventListener);
      window.removeEventListener('gameFinished', handleGameFinished as EventListener);
    };
  }, [formatGameData]);

  // Game type info
  const getGameInfo = (type: string) => {
    const types: Record<string, { icon: string; name: string }> = {
      'rockpaperscissors': { icon: '✊', name: 'Taş Kağıt Makas' },
      'rps': { icon: '✊', name: 'Taş Kağıt Makas' },
      'RockPaperScissors': { icon: '✊', name: 'Taş Kağıt Makas' },
      'ludo': { icon: '🎯', name: 'Ludo' },
      'Ludo': { icon: '🎯', name: 'Ludo' },
      'quiz': { icon: '📚', name: 'Bilgi Yarışması' },
      'Quiz': { icon: '📚', name: 'Bilgi Yarışması' },
      '2048': { icon: '🔢', name: '2048' },
      'backgammon': { icon: '🎲', name: 'Tavla' },
      'Backgammon': { icon: '🎲', name: 'Tavla' },
      'alienattack': { icon: '👽', name: 'Uzaylı Saldırısı' },
      'AlienAttack': { icon: '👽', name: 'Uzaylı Saldırısı' },
    };
    return types[type] || { icon: '🎮', name: type };
  };

  // Time ago
  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes} dk önce`;
    return `${Math.floor(minutes / 60)} sa önce`;
  };

  // Filter games (allGames kullan - gerçek + fake)
  const waitingGames = allGames.filter(g => g.status === 'waiting');
  const activeGames = allGames.filter(g => g.status === 'active');

  const currentGames = activeTab === 'waiting' ? waitingGames : activeGames;

  const stats = {
    waiting: waitingGames.length,
    active: activeGames.length
  };

  return (
    <div style={{
      width: '100%',
      padding: inline ? '8px' : '15px',
      color: '#ecf0f1'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: '6px'
      }}>
        <h3 style={{ fontSize: '14px', margin: 0 }}>
          🏛️ Oyun Lobisi
          {!isConnected && <span style={{ fontSize: '10px', color: '#e74c3c', marginLeft: '8px' }}>(Bağlanıyor...)</span>}
        </h3>
        <div style={{ fontSize: '10px', color: '#95a5a6' }}>
          {allGames.length} Oda
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#95a5a6'
        }}>
          <div className="rps-spinner" style={{ margin: '0 auto 10px' }}></div>
          <p style={{ fontSize: '12px', margin: 0 }}>Odalar yükleniyor...</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '6px'
        }}>
          {filteredGames.map((game) => {
            const info = getGameInfo(game.type);
            const isFull = game.players.length >= game.maxPlayers;

            return (
              <div key={game.id} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
                padding: '6px',
                border: '1px solid rgba(255,255,255,0.1)',
                minWidth: 0
              }}>
                {/* Header: Icon + Name + Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '18px' }}>{info.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {info.name}
                    </div>
                  </div>
                  <span style={{ fontSize: '10px' }}>
                    {game.status === 'waiting' ? '⏳' : game.status === 'active' ? '🎮' : '✅'}
                  </span>
                </div>

                {/* Host & Players */}
                <div style={{ fontSize: '8px', color: '#95a5a6', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '55%' }}>Host: {game.host}</span>
                  <span>👥 {game.players.length}/{game.maxPlayers}</span>
                </div>

                {/* Action Button - Fake odalarda sadece durum göster, gerçek odalarda buton */}
                {game.id.startsWith('fake-') ? (
                  <div style={{
                    width: '100%',
                    padding: '5px 4px',
                    background: 'rgba(149, 165, 166, 0.3)',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}>
                    🎮 Oynanıyor
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (game.status === 'active') {
                        alert('Bu oyun zaten başlamış! Lütfen başka bir oda seçin veya yeni oyun oluşturun.');
                        return;
                      }
                      if (game.status === 'waiting' && !isFull) {
                        onJoinGame(game.id, game.type, game.host);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '5px 4px',
                      background: game.status === 'waiting' && !isFull
                        ? 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)'
                        : 'rgba(149, 165, 166, 0.3)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      cursor: game.status === 'waiting' && !isFull ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {game.status === 'waiting' && !isFull ? '🚀 Katıl' :
                     game.status === 'active' ? '🎮 Aktif' :
                     isFull ? '🔒 Dolu' : '✅ Bitti'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
