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

interface OrderApprovedData {
  orderId: number;
  orderNumber: string;
  endUserId: number;
  tableName?: string;
  totalAmount?: number;
  earnedTokens?: number;
  newBalance?: number;
  message?: string;
  timestamp: string;
}

interface UseSignalROptions {
  customerId?: number;
  customerCode?: string;
  endUserId?: number;
  onTokenBalanceUpdated?: (data: { userId: number; currentTokens: number; message: string }) => void;
  onOrderCreated?: (data: OrderCreatedData) => void;
  onOrderApproved?: (data: OrderApprovedData) => void;
  enabled?: boolean;
}

export function useSignalR({ customerId, customerCode, endUserId, onTokenBalanceUpdated, onOrderCreated, onOrderApproved, enabled = true }: UseSignalROptions) {
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

    // ✅ Sipariş durumu değişti (onaylandı, iptal, vb.)
    connection.on('OrderStatusChanged', (data: any) => {
      console.log('📋 SignalR: OrderStatusChanged', data);
      if (onOrderApproved && data) {
        // Status "Approved" veya "Confirmed" ise bildirim göster
        const status = (data.status || data.Status || '').toLowerCase();
        if (status === 'approved' || status === 'confirmed' || status === 'completed') {
          // endUserId kontrolü
          const eventEndUserId = data.endUserId || data.EndUserId;
          if (!endUserId || eventEndUserId === endUserId) {
            onOrderApproved({
              orderId: data.orderId || data.OrderId || data.id,
              orderNumber: data.orderNumber || data.OrderNumber || '',
              endUserId: eventEndUserId,
              tableName: data.tableName || data.TableName,
              totalAmount: data.totalAmount || data.TotalAmount,
              earnedTokens: data.earnedTokens || data.EarnedTokens,
              newBalance: data.newBalance || data.NewBalance,
              message: data.message || data.Message,
              timestamp: data.timestamp || new Date().toISOString(),
            });
          }
        }
      }
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

    // ✅ Sipariş onaylandı event'i (endUserId bazlı)
    if (onOrderApproved) {
      connection.on('OrderApproved', (data: OrderApprovedData) => {
        console.log('✅ SignalR: OrderApproved', data);
        // Sadece bu kullanıcının siparişi ise callback'i çağır
        if (!endUserId || data.endUserId === endUserId) {
          onOrderApproved(data);
        }
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
  }, [customerId, customerCode, endUserId, enabled, onTokenBalanceUpdated, onOrderCreated, onOrderApproved]);

  return connectionRef.current;
}
