'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface TableContextType {
  tableId: string | null;
  tableName: string | null;
  isSelfService: boolean;
  sessionId: string | null;
  setTableInfo: (tableId: string, tableName: string) => void;
  setSelfServiceMode: (sessionId: string) => void;
  clearTableInfo: () => void;
  isTableMode: boolean; // table veya session var mı? (sepet için)
  canCallWaiter: boolean; // Garson çağırabilir mi? (self-servis'te hayır)
}

const TableContext = createContext<TableContextType | undefined>(undefined);

export function TableProvider({ children }: { children: React.ReactNode }) {
  const [tableId, setTableId] = useState<string | null>(null);
  const [tableName, setTableName] = useState<string | null>(null);
  const [isSelfService, setIsSelfService] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Auto-detect table/session from URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // 🚚 Delivery sayfasında table/session yükleme - delivery bağımsız çalışır
    const isDeliveryPage = window.location.pathname.includes('/delivery');
    if (isDeliveryPage) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('table');
    const sessionParam = params.get('session');
    const pathname = window.location.pathname;

    const selfServiceCookie = getCookie('isSelfService');
    const savedSessionId = getCookie('selfServiceSessionId');
    const savedTableId = getCookie('tableCode') || getCookie('tableId'); // 🔧 Table ID'yi cookie'den al (middleware tableCode kullanıyor)

    // Self-service cookie'leri sadece /selfservice sayfasında geçerli
    const isSelfServicePage = pathname.includes('/selfservice');

    // Selfservice sayfası değilse, self-service cookie'lerini temizle
    if (!isSelfServicePage && selfServiceCookie) {
      deleteCookie('isSelfService');
      deleteCookie('selfServiceSessionId');
    }

    if (sessionParam) {
      // URL'de session var - validate et ve kaydet
      validateSession(sessionParam);
    } else if (savedSessionId && selfServiceCookie && isSelfServicePage) {
      // 🔧 URL'de session yok ama cookie'de var VE selfservice sayfasındayız - geri yükle (login sonrası)
      setSelfServiceMode(savedSessionId);
    } else if (tableParam) {
      // URL'de table var - kaydet ve URL'den gizle
      setTableInfoWithCookie(tableParam, tableParam);

      // Self-service cookie'lerini temizle
      if (selfServiceCookie) {
        deleteCookie('isSelfService');
        deleteCookie('selfServiceSessionId');
      }

      // ✅ Table ID'yi URL'den gizle (güvenlik için)
      // setTimeout ile hydration sonrası çalıştır
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          if (url.searchParams.has('table')) {
            url.searchParams.delete('table');
            window.history.replaceState({}, '', url.toString());
          }
        }
      }, 100);
    } else if (savedTableId) {
      // 🔧 URL'de table yok ama cookie'de var - geri yükle (login sonrası)
      setTableId(savedTableId);
      setTableName(savedTableId);
      setIsSelfService(false);
      setSessionId(null);
    } else {
      // Hiçbir şey yok - temizle
      if (selfServiceCookie) {
        deleteCookie('isSelfService');
        deleteCookie('selfServiceSessionId');
      }
      deleteCookie('tableId');
      deleteCookie('tableCode');
      setTableId(null);
      setTableName(null);
      setIsSelfService(false);
      setSessionId(null);
    }
  }, []);

  /**
   * Validate session from API
   */
  const validateSession = async (session: string) => {
    try {
      const response = await fetch(`/api/selfservice/validate?sessionId=${session}`);
      const data = await response.json();

      if (data.success) {
        setSelfServiceMode(session);
        markSessionAsUsed(session);

        // ✅ Session ID'yi URL'den gizle (güvenlik için)
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('session');
          window.history.replaceState({}, '', url.toString());
        }
      } else {
        console.error('❌ Self-servis session geçersiz:', data.message);
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('session');
          window.history.replaceState({}, '', url.toString());
        }
      }
    } catch (error) {
      console.error('❌ Session validation error:', error);
    }
  };

  /**
   * Mark session as used (background API call)
   */
  const markSessionAsUsed = async (session: string) => {
    try {
      const userAgent = navigator.userAgent;

      await fetch('/api/selfservice/use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session,
          endUserId: null,
          ipAddress: null,
          userAgent: userAgent,
        }),
      });
    } catch (error) {
      console.error('❌ UseSession error:', error);
    }
  };

  /**
   * Set table info with cookie (normal table mode) - internal use
   */
  const setTableInfoWithCookie = (table: string, name: string) => {
    setTableId(table);
    setTableName(name);
    setIsSelfService(false);
    setSessionId(null);
    setCookie('tableId', table, 15 / (24 * 60)); // 15 dakika (QR geçerlilik süresi)
  };

  /**
   * Set table info (normal table mode) - for external use
   */
  const setTableInfo = useCallback((tableId: string, tableName: string) => {
    setTableId(tableId);
    setTableName(tableName);
    setIsSelfService(false);
    setSessionId(null);
    setCookie('tableId', tableId, 15 / (24 * 60)); // 15 dakika
  }, []);

  /**
   * Set self-service mode
   */
  const setSelfServiceMode = useCallback((session: string) => {
    setIsSelfService(true);
    setSessionId(session);
    setTableName('Self-Servis');
    setTableId(null);
    setCookie('isSelfService', 'true', 15 / (24 * 60)); // 15 dakika (QR geçerlilik süresi)
    setCookie('selfServiceSessionId', session, 15 / (24 * 60)); // 15 dakika
  }, []);

  /**
   * Clear table/session info
   */
  const clearTableInfo = useCallback(() => {
    setTableId(null);
    setTableName(null);
    setIsSelfService(false);
    setSessionId(null);
    deleteCookie('isSelfService');
    deleteCookie('selfServiceSessionId');
    deleteCookie('tableId'); // Table cookie'sini de sil
    deleteCookie('tableCode'); // Middleware'in kullandığı cookie

    // ✅ localStorage'dan masa ismini de sil
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentTableName');
    }

    // ✅ URL'den de table/session parametrelerini sil
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const hadParams = url.searchParams.has('table') || url.searchParams.has('session');
      url.searchParams.delete('table');
      url.searchParams.delete('session');
      if (hadParams) {
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, []);

  const value: TableContextType = {
    tableId,
    tableName,
    isSelfService,
    sessionId,
    setTableInfo,
    setSelfServiceMode,
    clearTableInfo,
    isTableMode: !!tableId || isSelfService, // Sepet için: table VEYA session varsa true
    canCallWaiter: !!tableId && !isSelfService, // Garson için: table var VE self-servis DEĞİL
  };

  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
}

export function useTable() {
  const context = useContext(TableContext);
  if (context === undefined) {
    throw new Error('useTable must be used within a TableProvider');
  }
  return context;
}

// Cookie helper functions
function setCookie(name: string, value: string, hours: number) {
  const expires = new Date();
  expires.setTime(expires.getTime() + hours * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name: string): string | null {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}
