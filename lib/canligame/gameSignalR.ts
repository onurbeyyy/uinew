import * as signalR from '@microsoft/signalr';

// Oyun tipi
export type GameType = 'backgammon' | 'chess' | 'checkers';

// Oyun ayarları
export interface GameSettings {
  gameType: GameType;
  maxPlayers: number;
  timeLimit?: number;
  isPrivate?: boolean;
}

// Oyuncu interface'i
export interface GamePlayer {
  id: string;
  name: string;
  connectionId?: string;
  score?: number;
  isReady?: boolean;
}

// Oyun odası interface'i
export interface GameRoom {
  id: string;
  venueCode: string;
  gameType: GameType;
  players: GamePlayer[];
  maxPlayers: number;
  status: 'Waiting' | 'Playing' | 'Finished';
  hostId: string;
  isPublic: boolean;
  createdAt?: string;
  settings?: GameSettings;
}

class GameSignalRService {
  private connection: signalR.HubConnection | null = null;
  private hubUrl: string;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(hubUrl: string = 'https://api.menupark.com/gamehub') {
    this.hubUrl = hubUrl;
  }

  // Bağlantıyı başlat
  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Reconnect event'leri
    this.connection.onreconnecting(() => {
    });

    this.connection.onreconnected(() => {
    });

    this.connection.onclose(() => {
    });

    await this.connection.start();
  }

  // Bağlantıyı kapat
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }

  // Venue lobby'ye katıl
  async joinVenueLobby(venueCode: string): Promise<void> {
    if (!this.connection) throw new Error('Bağlantı yok');
    await this.connection.invoke('JoinVenueLobby', venueCode);
  }

  // Venue lobby'den ayrıl
  async leaveVenueLobby(venueCode: string): Promise<void> {
    if (!this.connection) throw new Error('Bağlantı yok');
    await this.connection.invoke('LeaveVenueLobby', venueCode);
  }

  // Venue lobby'deki odaları getir - Event ile dönüyor
  async getVenueLobby(venueCode: string): Promise<any[]> {
    if (!this.connection) throw new Error('Bağlantı yok');

    return new Promise((resolve, reject) => {
      // VenueLobby event'ini dinle (tek seferlik)
      const handler = (data: any) => {
        this.connection?.off('venueLobby', handler);
        resolve(data.rooms || []);
      };

      this.connection!.on('venueLobby', handler);

      // GetVenueLobby çağır - event gönderecek
      this.connection!.invoke('GetVenueLobby', venueCode).catch((err) => {
        this.connection?.off('venueLobby', handler);
        reject(err);
      });

      // Timeout
      setTimeout(() => {
        this.connection?.off('venueLobby', handler);
        reject(new Error('GetVenueLobby timeout'));
      }, 10000);
    });
  }

  // Yeni oda oluştur - Backend void döndürür, RoomCreated event'i dinle
  async createRoom(
    roomId: string,
    venueCode: string,
    playerId: string,
    playerName: string,
    settings?: GameSettings,
    isPublic: boolean = true
  ): Promise<void> {
    if (!this.connection) throw new Error('Bağlantı yok');

    await this.connection.invoke(
      'CreateRoom',
      roomId,
      venueCode,
      playerId,
      playerName,
      settings || { gameType: 'backgammon', maxPlayers: 2 },
      isPublic
    );

  }

  // Odaya katıl
  async joinRoom(roomId: string, playerId: string, playerName: string): Promise<void> {
    if (!this.connection) throw new Error('Bağlantı yok');
    await this.connection.invoke('JoinRoom', roomId, playerId, playerName);
  }

  // Odadan ayrıl
  async leaveRoom(playerId: string): Promise<void> {
    if (!this.connection) throw new Error('Bağlantı yok');
    await this.connection.invoke('LeaveRoom', playerId);
  }

  // Oyunu başlat
  async startGame(roomId: string): Promise<void> {
    if (!this.connection) throw new Error('Bağlantı yok');
    await this.connection.invoke('StartGame', roomId);
  }

  // Oda bilgisini getir
  async getRoomInfo(roomId: string): Promise<GameRoom> {
    if (!this.connection) throw new Error('Bağlantı yok');
    const room = await this.connection.invoke('GetRoomInfo', roomId);
    return room;
  }

  // ====================================
  // EVENT LISTENERS
  // ====================================

  // Oda oluşturuldu event'i - Backend: { success, room, message }
  onRoomCreated(callback: (data: { success: boolean; room: GameRoom; message: string }) => void) {
    this.on('roomCreated', callback);
  }

  // Lobby güncellendi event'i - Backend: { action, room, lobby }
  onLobbyUpdated(callback: (data: { action: string; room?: GameRoom; lobby: any[] }) => void) {
    this.on('lobbyUpdated', callback);
  }

  // Oyuncu katıldı event'i
  onPlayerJoined(callback: (data: { roomId: string; player: GamePlayer; room: GameRoom }) => void) {
    this.on('playerJoined', callback);
  }

  // Odaya katıldım event'i (sadece katılan oyuncuya) - Backend: { success, room, isSpectator, message }
  onJoinedRoom(callback: (data: { success: boolean; room: GameRoom; isSpectator: boolean; message: string }) => void) {
    this.on('joinedRoom', callback);
  }

  // Oyuncu ayrıldı event'i
  onPlayerLeft(callback: (data: { roomId: string; playerId: string; playerName: string }) => void) {
    this.on('playerLeft', callback);
  }

  // Oyun başladı event'i - Backend: { room, message }
  onGameStarted(callback: (data: { room: GameRoom; message: string }) => void) {
    this.on('gameStarted', callback);
  }

  // Oyun bitti event'i
  onGameEnded(callback: (data: { roomId: string; winner?: GamePlayer; reason?: string }) => void) {
    this.on('gameEnded', callback);
  }

  // Hata event'i
  onError(callback: (error: string) => void) {
    this.on('error', callback);
  }

  // Generic event listener
  private on(eventName: string, callback: Function) {
    if (!this.connection) {
      console.warn(`⚠️ Bağlantı yok, event dinlenemedi: ${eventName}`);
      return;
    }

    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }

    this.eventHandlers.get(eventName)!.push(callback);
    this.connection.on(eventName, callback as any);
  }

  // Tüm event listener'ları kaldır
  offAll() {
    if (this.connection) {
      this.eventHandlers.forEach((callbacks, eventName) => {
        callbacks.forEach(callback => {
          this.connection!.off(eventName, callback as any);
        });
      });
      this.eventHandlers.clear();
    }
  }
}

// Singleton instance
let gameSignalRServiceInstance: GameSignalRService | null = null;

export function getGameSignalRService(): GameSignalRService {
  if (!gameSignalRServiceInstance) {
    const hubUrl = process.env.NEXT_PUBLIC_GAME_HUB_URL
      ? `${process.env.NEXT_PUBLIC_GAME_HUB_URL}/gamehub`
      : 'https://api.menupark.com/gamehub';

    gameSignalRServiceInstance = new GameSignalRService(hubUrl);
  }
  return gameSignalRServiceInstance;
}

export default GameSignalRService;
