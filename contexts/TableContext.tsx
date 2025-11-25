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

    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('table');
    const sessionParam = params.get('session');

    const selfServiceCookie = getCookie('isSelfService');
    const savedSessionId = getCookie('selfServiceSessionId'); // 🔧 Session ID'yi cookie'den al

    if (sessionParam) {
      // URL'de session var - validate et ve kaydet
      validateSession(sessionParam);
    } else if (savedSessionId && selfServiceCookie) {
      // 🔧 URL'de session yok ama cookie'de var - geri yükle (login sonrası)
      console.log('🔄 Session ID cookie\'den yüklendi:', savedSessionId);
      setSelfServiceMode(savedSessionId);
    } else if (tableParam) {
      setTableInfo(tableParam, tableParam);
      if (selfServiceCookie) {
        deleteCookie('isSelfService');
        deleteCookie('selfServiceSessionId');
      }
    } else {
      if (selfServiceCookie) {
        deleteCookie('isSelfService');
        deleteCookie('selfServiceSessionId');
      }
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
   * Set table info (normal table mode)
   */
  const setTableInfo = useCallback((tableId: string, tableName: string) => {
    setTableId(tableId);
    setTableName(tableName);
    setIsSelfService(false);
    setSessionId(null);
  }, []);

  /**
   * Set self-service mode
   */
  const setSelfServiceMode = useCallback((session: string) => {
    setIsSelfService(true);
    setSessionId(session);
    setTableName('Self-Servis');
    setTableId(null);
    setCookie('isSelfService', 'true', 24);
    setCookie('selfServiceSessionId', session, 24); // 🔧 Session ID'yi de cookie'ye kaydet
    console.log('✅ Self-service mode aktif, session kaydedildi:', session);
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
