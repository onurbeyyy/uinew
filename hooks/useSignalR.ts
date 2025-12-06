'use client';

import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

const HUB_URL = process.env.NEXT_PUBLIC_SIGNALR_URL
  ? `${process.env.NEXT_PUBLIC_SIGNALR_URL}/apimenuhub`
  : 'https://canlimenu.online/apimenuhub';

interface OrderCreatedData {
  orderId: number;
  orderNumber: string;
  tableName: string;
  totalAmount: number;
  customerCode: string;
  items: any[];
  timestamp: string;
}

interface UseSignalROptions {
  customerId?: number;
  customerCode?: string;
  onTokenBalanceUpdated?: (data: { userId: number; currentTokens: number; message: string }) => void;
  onOrderCreated?: (data: OrderCreatedData) => void;
  enabled?: boolean;
}

export function useSignalR({ customerId, customerCode, onTokenBalanceUpdated, onOrderCreated, enabled = true }: UseSignalROptions) {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Bağlantı zaten varsa ve bağlıysa, tekrar oluşturma
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      console.log('🔗 SignalR: Already connected');
      return;
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // İlk 4 deneme: 0, 2s, 10s, 30s
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 2000;
          if (retryContext.previousRetryCount === 2) return 10000;
          if (retryContext.previousRetryCount === 3) return 30000;
          // 4. denemeden sonra: 5 dakikada bir sınırsız dene
          return 300000; // 5 dakika
        }
      })
      .configureLogging(signalR.LogLevel.None) // Production'da log kapalı
      .build();

    connectionRef.current = connection;

    // Event handlers
    connection.onclose(() => {
      // Silent close
    });

    connection.onreconnecting(() => {
      // Silent reconnecting
    });

    connection.onreconnected(() => {

      // Customer grubuna yeniden katıl - sadece customerId ile
      if (customerId && customerId > 0) {
        connection.invoke('JoinCustomerGroup', customerId).catch(() => {});
      }
    });

    // Boş event handler'lar (warning'leri önlemek için)
    connection.on('AdminApproveOrder', () => {
      // Service ve APK için - Web UI kullanmıyor
    });

    connection.on('OrderStatusUpdate', () => {
      // APK için - Web UI kullanmıyor
    });

    connection.on('OrderStatusChanged', () => {
      // APK için - Web UI kullanmıyor
    });

    connection.on('OrderProcessResult', () => {
      // Service için - Web UI kullanmıyor
    });

    connection.on('NewOrder', () => {
      // Admin Panel için - Web UI kullanmıyor
    });

    // 🪙 Token balance güncelleme event'i
    if (onTokenBalanceUpdated) {
      connection.on('TokenBalanceUpdated', (data: { userId: number; currentTokens: number; message: string }) => {
        console.log('🪙 SignalR: TokenBalanceUpdated', data);
        onTokenBalanceUpdated(data);
      });
    }

    // 📦 Sipariş oluşturuldu event'i
    if (onOrderCreated) {
      connection.on('OrderCreated', (data: OrderCreatedData) => {
        console.log('📦 SignalR: OrderCreated', data);
        onOrderCreated(data);
      });
    }

    // Bağlantıyı başlat
    connection.start()
      .then(() => {
        // Customer grubuna katıl - sadece customerId ile
        if (customerId && customerId > 0) {
          return connection.invoke('JoinCustomerGroup', customerId);
        }
      })
      .catch(() => {
        // Silent error
      });

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (connectionRef.current) {
        connectionRef.current.stop().catch(() => {});
      }
    };
  }, [customerId, customerCode, enabled, onTokenBalanceUpdated, onOrderCreated]);

  return connectionRef.current;
}
