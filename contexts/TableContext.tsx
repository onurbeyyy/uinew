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
    const tableParam = params.get('table'); // Artık middleware redirect yaptığı için bu boş olacak
    const sessionParam = params.get('session');
    const pathname = window.location.pathname;

    // 🔒 Masa kodu artık cookie'den okunuyor (middleware tarafından set ediliyor)
    const tableFromCookie = getCookie('tableCode');

    // 🔐 Mevcut customer code'u URL'den al
    const pathParts = pathname.split('/').filter(Boolean);
    const currentCustomerCode = pathParts[0] || params.get('code') || '';

    const selfServiceCookie = getCookie('isSelfService');
    const savedSessionId = getCookie('selfServiceSessionId');
    const savedTableId = getCookie('tableCode') || getCookie('tableId'); // 🔧 Table ID'yi cookie'den al (middleware tableCode kullanıyor)
    const savedCustomerCode = getCookie('tableCustomerCode'); // 🔐 Masa hangi müşteriye ait?
    const tableCreatedAt = getCookie('tableCreatedAt'); // ⏰ Masa oturumu ne zaman başladı?

    // ⏰ 15 dakikadan eski oturum varsa temizle
    if (savedTableId && tableCreatedAt) {
      const createdTime = parseInt(tableCreatedAt, 10);
      const now = Date.now();
      const fifteenMinutes = 15 * 60 * 1000;
      if (now - createdTime > fifteenMinutes) {
        deleteCookie('tableId');
        deleteCookie('tableCode');
        deleteCookie('tableCustomerCode');
        deleteCookie('tableCreatedAt');
        setTableId(null);
        setTableName(null);
        setIsSelfService(false);
        setSessionId(null);
        return;
      }
    }

    // 🔐 Farklı müşteriye geçildiyse masa bilgisini temizle
    if (savedTableId && savedCustomerCode && currentCustomerCode && savedCustomerCode !== currentCustomerCode) {
      deleteCookie('tableId');
      deleteCookie('tableCode');
      deleteCookie('tableCustomerCode');
      deleteCookie('isSelfService');
      deleteCookie('selfServiceSessionId');
      setTableId(null);
      setTableName(null);
      setIsSelfService(false);
      setSessionId(null);
      return;
    }

    // 🔐 Masasız QR okutulduysa (code var ama table yok) → eski masa bilgisini temizle
    // Not: tableFromCookie middleware tarafından yeni set edilmiş olabilir
    const codeParam = params.get('code');
    if (codeParam && !tableFromCookie && !sessionParam && savedTableId) {
      deleteCookie('tableId');
      deleteCookie('tableCode');
      deleteCookie('tableCustomerCode');
      setTableId(null);
      setTableName(null);
      setIsSelfService(false);
      setSessionId(null);
      return;
    }

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
    } else if (savedTableId) {
      // 🔒 Cookie'de table var (middleware set etmiş veya önceden vardı) - state'e yükle
      // Not: tableCreatedAt yoksa yeni oluştur (eski cookie için geriye uyumluluk)
      if (!tableCreatedAt) {
        setCookie('tableCreatedAt', Date.now().toString(), 15 / 60);
      }
      if (!savedCustomerCode && currentCustomerCode) {
        setCookie('tableCustomerCode', currentCustomerCode, 15 / 60);
      }

      setTableId(savedTableId);
      setTableName(savedTableId); // 🔒 Masa kodu state'te kalır ama UI'da gösterilmez
      setIsSelfService(false);
      setSessionId(null);

      // Self-service cookie'lerini temizle
      if (selfServiceCookie) {
        deleteCookie('isSelfService');
        deleteCookie('selfServiceSessionId');
      }
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

  // ⏰ 15 dakika sonra otomatik temizle - cookie ile senkronize
  useEffect(() => {
    // tableId veya sessionId yoksa timer kurma
    if (!tableId && !sessionId) {
      return;
    }

    const timer = setTimeout(() => {
      // State'leri temizle
      setTableId(null);
      setTableName(null);
      setIsSelfService(false);
      setSessionId(null);
      // Cookie'leri temizle
      deleteCookie('isSelfService');
      deleteCookie('selfServiceSessionId');
      deleteCookie('tableId');
      deleteCookie('tableCode');
      deleteCookie('tableCustomerCode');
      deleteCookie('tableCreatedAt');
      // localStorage temizle
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentTableName');
      }
      // 🔔 Kullanıcıya bildir
      alert('Oturum süresi doldu. Lütfen QR kodu tekrar okutun.');
    }, 15 * 60 * 1000); // 15 dakika

    return () => {
      clearTimeout(timer);
    };
  }, [tableId, sessionId]);

  /**
   * Validate session from API
   */
  const validateSession = async (session: string) => {
    try {
      const response = await fetch(`/api/self-service/validate?sessionId=${session}`);
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
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('session');
          window.history.replaceState({}, '', url.toString());
        }
      }
    } catch (error) {
      // Session validation failed silently
    }
  };

  /**
   * Mark session as used (background API call)
   */
  const markSessionAsUsed = async (session: string) => {
    try {
      const userAgent = navigator.userAgent;

      await fetch('/api/self-service/use', {
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
      // UseSession failed silently
    }
  };

  /**
   * Set table info with cookie (normal table mode) - internal use
   */
  const setTableInfoWithCookie = (table: string, name: string, customerCode?: string) => {
    setTableId(table);
    setTableName(name);
    setIsSelfService(false);
    setSessionId(null);
    setCookie('tableId', table, 15 / 60); // 15 dakika (QR geçerlilik süresi)
    setCookie('tableCreatedAt', Date.now().toString(), 15 / 60); // ⏰ Oturum başlangıç zamanı
    if (customerCode) {
      setCookie('tableCustomerCode', customerCode, 15 / 60); // 🔐 Masa hangi müşteriye ait
    }
  };

  /**
   * Set table info (normal table mode) - for external use
   */
  const setTableInfo = useCallback((tableId: string, tableName: string) => {
    setTableId(tableId);
    setTableName(tableName);
    setIsSelfService(false);
    setSessionId(null);
    setCookie('tableId', tableId, 15 / 60); // 15 dakika
  }, []);

  /**
   * Set self-service mode
   */
  const setSelfServiceMode = useCallback((session: string) => {
    setIsSelfService(true);
    setSessionId(session);
    setTableName('Self-Servis');
    setTableId(null);
    setCookie('isSelfService', 'true', 15 / 60); // 15 dakika (QR geçerlilik süresi)
    setCookie('selfServiceSessionId', session, 15 / 60); // 15 dakika
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
    deleteCookie('tableCustomerCode'); // 🔐 Müşteri kodu cookie'sini de sil
    deleteCookie('tableCreatedAt'); // ⏰ Oturum zamanı cookie'sini de sil

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
