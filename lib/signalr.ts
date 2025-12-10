import * as signalR from '@microsoft/signalr';

const HUB_URL = process.env.NEXT_PUBLIC_SIGNALR_URL
  ? `${process.env.NEXT_PUBLIC_SIGNALR_URL}/apimenuhub`
  : 'https://apicanlimenu.online/apimenuhub';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect() {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      console.log('SignalR: Already connected');
      return;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount >= this.maxReconnectAttempts) {
            return null; // Stop reconnecting
          }
          return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
        },
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Event handlers
    this.connection.onreconnecting((error) => {
      console.warn('SignalR: Reconnecting...', error);
      this.reconnectAttempts++;
    });

    this.connection.onreconnected((connectionId) => {
      console.log('SignalR: Reconnected', connectionId);
      this.reconnectAttempts = 0;
    });

    this.connection.onclose((error) => {
      console.error('SignalR: Connection closed', error);
      this.connection = null;
    });

    try {
      await this.connection.start();
      console.log('SignalR: Connected successfully');
    } catch (err) {
      console.error('SignalR: Connection failed', err);
      throw err;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
      console.log('SignalR: Disconnected');
    }
  }

  // Garson çağırma
  async callWaiter(customerCode: string, tableName: string, message: string) {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR: Not connected');
    }

    try {
      await this.connection.invoke('CallWaiter', customerCode, tableName, message);
      console.log('SignalR: Waiter called successfully');
    } catch (err) {
      console.error('SignalR: CallWaiter failed', err);
      throw err;
    }
  }

  // Sipariş gönderme
  async sendOrder(
    customerCode: string,
    tableName: string,
    items: {
      productId: number;
      portionId?: number;
      propertyIds: number[];
      quantity: number;
      note?: string;
    }[]
  ) {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR: Not connected');
    }

    try {
      await this.connection.invoke('CreateOrder', customerCode, tableName, items);
      console.log('SignalR: Order sent successfully');
    } catch (err) {
      console.error('SignalR: SendOrder failed', err);
      throw err;
    }
  }

  // Event listener
  on(eventName: string, callback: (...args: any[]) => void) {
    if (this.connection) {
      this.connection.on(eventName, callback);
    }
  }

  off(eventName: string, callback?: (...args: any[]) => void) {
    if (this.connection) {
      if (callback) {
        this.connection.off(eventName, callback);
      } else {
        this.connection.off(eventName);
      }
    }
  }
}

// Export singleton
export const signalRService = new SignalRService();
