import * as signalR from '@microsoft/signalr';

export interface OkeyTasi {
  id: string;
  renk: 'kirmizi' | 'siyah' | 'mavi' | 'sari' | 'joker';
  sayi: number;
  sahteJoker: boolean;
}

export interface OkeyOyuncu {
  id: string;
  ad: string;
  baglantiId: string;
  istaka: OkeyTasi[];
}

export interface OkeyOda {
  id: string;
  venueCode: string;
  oyuncular: OkeyOyuncu[];
  ortaYigin: OkeyTasi[];
  atilanTaslar: OkeyTasi[];
  gostergeTasi: OkeyTasi | null;
  jokerSayisi: number;
  jokerRengi: string;
  durum: 'Bekliyor' | 'Oynuyor' | 'Bitti';
  sirasiGelen: number;
}

class OkeySignalRService {
  private connection: signalR.HubConnection | null = null;
  private hubUrl: string;

  constructor(hubUrl: string = 'https://api.menupark.com/okeyhub') {
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
      .withServerTimeout(120000)
      .withKeepAliveInterval(30000)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.None)
      .build();

    await this.connection.start();
  }

  // Bağlantıyı kapat
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }

  // Lobby'ye katıl
  async lobbyeKatil(venueCode: string): Promise<void> {
    if (!this.connection) throw new Error('Bağlantı yok');
    await this.connection.invoke('JoinLobby', venueCode);
  }

  // Lobby'deki tüm aktif odaları getir
  async lobbyOdalariniGetir(): Promise<OkeyOda[]> {
    if (!this.connection) throw new Error('Bağlantı yok');
    return await this.connection.invoke('GetLobbyRooms');
  }

  // Oda bilgisini getir
  async getOdaBilgisi(odaId: string): Promise<OkeyOda | null> {
    if (!this.connection) throw new Error('Bağlantı yok');
    return await this.connection.invoke('GetOdaBilgisi', odaId);
  }

  // Oda oluştur
  async odaOlustur(oyuncuId: string, oyuncuAdi: string, venueCode: string): Promise<OkeyOda> {
    if (!this.connection) throw new Error('Bağlantı yok');
    return await this.connection.invoke('OdaOlustur', oyuncuId, oyuncuAdi, venueCode);
  }

  // Odaya katıl
  async odayaKatil(odaId: string, oyuncuId: string, oyuncuAdi: string): Promise<void> {
    if (!this.connection) throw new Error('Bağlantı yok');
    await this.connection.invoke('OdayaKatil', odaId, oyuncuId, oyuncuAdi);
  }

  // Desteden taş çek
  async tasCek(odaId: string, oyuncuId: string): Promise<void> {
    if (!this.connection) throw new Error('Bağlantı yok');
    await this.connection.invoke('TasCek', odaId, oyuncuId);
  }

  // Atılan son taşı al
  async sonTasiAl(odaId: string, oyuncuId: string): Promise<void> {
    if (!this.connection) throw new Error('Bağlantı yok');
    await this.connection.invoke('SonTasiAl', odaId, oyuncuId);
  }

  // Taş at
  async tasAt(odaId: string, oyuncuId: string, tasId: string): Promise<void> {
    if (!this.connection) throw new Error('Bağlantı yok');
    await this.connection.invoke('TasAt', odaId, oyuncuId, tasId);
  }

  // Eli bitir - kazanma kontrolü
  async eliBitir(odaId: string, oyuncuId: string): Promise<void> {
    if (!this.connection) throw new Error('Bağlantı yok');
    await this.connection.invoke('EliBitir', odaId, oyuncuId);
  }

  // Test modu - tek oyuncu için taş dağıt
  async testTaslarDagit(oyuncuId: string): Promise<OkeyTasi[]> {
    if (!this.connection) throw new Error('Bağlantı yok');
    return await this.connection.invoke('TestTaslarDagit', oyuncuId);
  }

  // Test modu - ortadan taş çek
  async testTasCek(oyuncuId: string): Promise<OkeyTasi | null> {
    if (!this.connection) throw new Error('Bağlantı yok');
    return await this.connection.invoke('TestTasCek', oyuncuId);
  }

  // Test modu - kalan taş sayısı
  async testKalanTasSayisi(oyuncuId: string): Promise<number> {
    if (!this.connection) throw new Error('Bağlantı yok');
    return await this.connection.invoke('TestKalanTasSayisi', oyuncuId);
  }

  // Test modu - taş at
  async testTasAt(oyuncuId: string, tasId: string): Promise<boolean> {
    if (!this.connection) throw new Error('Bağlantı yok');
    return await this.connection.invoke('TestTasAt', oyuncuId, tasId);
  }

  // Test modu - atılan taşları al
  async testAtilanTaslariAl(oyuncuId: string): Promise<OkeyTasi[]> {
    if (!this.connection) throw new Error('Bağlantı yok');
    return await this.connection.invoke('TestAtilanTaslariAl', oyuncuId);
  }

  // Event dinleyicileri (camelCase - SignalR C# to JS conversion)
  onOdaOlusturuldu(callback: (oda: OkeyOda) => void): void {
    this.connection?.on('odaOlusturuldu', callback);
  }

  onOyuncuKatildi(callback: (oda: OkeyOda) => void): void {
    this.connection?.on('oyuncuKatildi', callback);
  }

  onOyunBasladi(callback: (oda: OkeyOda) => void): void {
    this.connection?.on('oyunBasladi', callback);
  }

  onTasCekildi(callback: (tas: OkeyTasi) => void): void {
    this.connection?.on('tasCekildi', callback);
  }

  onOyuncuTasCekti(callback: (oyuncuId: string, kalanSayi: number) => void): void {
    this.connection?.on('oyuncuTasCekti', callback);
  }

  onTasAtildi(callback: (oyuncuId: string, tas: OkeyTasi, yeniSira: number) => void): void {
    this.connection?.on('tasAtildi', callback);
  }

  onOyuncuAyrildi(callback: (oyuncuId: string) => void): void {
    this.connection?.on('oyuncuAyrildi', callback);
  }

  onSonTasAlindi(callback: (oyuncuId: string, tas: OkeyTasi) => void): void {
    this.connection?.on('sonTasAlindi', callback);
  }

  onOyunBitti(callback: (data: { kazananId: string; kazananAd: string; message: string }) => void): void {
    this.connection?.on('oyunBitti', callback);
  }

  onHata(callback: (hata: string) => void): void {
    this.connection?.on('hata', callback);
  }

  // Tüm dinleyicileri temizle
  offAll(): void {
    this.connection?.off('odaOlusturuldu');
    this.connection?.off('oyuncuKatildi');
    this.connection?.off('oyunBasladi');
    this.connection?.off('tasCekildi');
    this.connection?.off('oyuncuTasCekti');
    this.connection?.off('tasAtildi');
    this.connection?.off('oyuncuAyrildi');
    this.connection?.off('sonTasAlindi');
    this.connection?.off('oyunBitti');
    this.connection?.off('hata');
  }
}

// Singleton instance
let okeyServiceInstance: OkeySignalRService | null = null;

export function getOkeySignalRService(): OkeySignalRService {
  if (!okeyServiceInstance) {
    const hubUrl = process.env.NEXT_PUBLIC_GAME_HUB_URL
      ? `${process.env.NEXT_PUBLIC_GAME_HUB_URL}/okeyhub`
      : 'https://api.menupark.com/okeyhub';

    okeyServiceInstance = new OkeySignalRService(hubUrl);
  }
  return okeyServiceInstance;
}
