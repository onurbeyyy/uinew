'use client';

import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

const HUB_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/apimenuhub`
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
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Error) // Sadece error'ları göster
      .build();

    connectionRef.current = connection;

    // Event handlers
    connection.onclose(() => {
      console.log('🔌 SignalR: Connection closed');
    });

    connection.onreconnecting((error) => {
      console.log('🔄 SignalR: Reconnecting...', error);
    });

    connection.onreconnected((connectionId) => {
      console.log('✅ SignalR: Reconnected', connectionId);

      // Customer grubuna yeniden katıl (customerCode veya customerId ile)
      if (customerCode) {
        connection.invoke('JoinCustomerGroup', customerCode)
          .catch(err => console.error('❌ SignalR: JoinCustomerGroup failed on reconnect', err));
      } else if (customerId && customerId > 0) {
        connection.invoke('JoinCustomerGroup', customerId)
          .catch(err => console.error('❌ SignalR: JoinCustomerGroup failed on reconnect', err));
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
        console.log('✅ SignalR: Connected successfully');

        // Customer grubuna katıl (customerCode veya customerId ile)
        if (customerCode) {
          return connection.invoke('JoinCustomerGroup', customerCode);
        } else if (customerId && customerId > 0) {
          return connection.invoke('JoinCustomerGroup', customerId);
        }
      })
      .then(() => {
        if (customerCode) {
          console.log(`✅ SignalR: Joined customer group ${customerCode}`);
        } else if (customerId && customerId > 0) {
          console.log(`✅ SignalR: Joined customer group ${customerId}`);
        }
      })
      .catch(err => {
        console.error('❌ SignalR: Connection failed', err);
      });

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (connectionRef.current) {
        connectionRef.current.stop()
          .then(() => console.log('🔌 SignalR: Disconnected'))
          .catch(err => console.error('❌ SignalR: Disconnect error', err));
      }
    };
  }, [customerId, customerCode, enabled, onTokenBalanceUpdated, onOrderCreated]);

  return connectionRef.current;
}
