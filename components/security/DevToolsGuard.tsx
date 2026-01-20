'use client';

import { useEffect, useState, useCallback } from 'react';

const CORRECT_PASSWORD = 'derasew';
const SESSION_KEY = 'devtools_authorized';

export default function DevToolsGuard() {
  const [showModal, setShowModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false); // Site tamamen engelli mi
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Session kontrolü
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authorized = sessionStorage.getItem(SESSION_KEY) === 'true';
      setIsAuthorized(authorized);
    }
  }, []);

  const handlePasswordSubmit = useCallback(() => {
    if (password === CORRECT_PASSWORD) {
      setIsAuthorized(true);
      setIsBlocked(false);
      sessionStorage.setItem(SESSION_KEY, 'true');
      setShowModal(false);
      setPassword('');
      setError('');
    } else {
      setError('Yanlış şifre!');
      setPassword('');
    }
  }, [password]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Zaten yetkili ise engelleme
    if (isAuthorized) return;

    const blockAndShowModal = () => {
      e.preventDefault();
      setIsBlocked(true);
      setShowModal(true);
    };

    // F12
    if (e.key === 'F12') {
      blockAndShowModal();
      return;
    }

    // Ctrl+Shift+I (DevTools)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      blockAndShowModal();
      return;
    }

    // Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      blockAndShowModal();
      return;
    }

    // Ctrl+Shift+C (Element Inspector)
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      blockAndShowModal();
      return;
    }

    // Ctrl+U (View Source)
    if (e.ctrlKey && e.key === 'u') {
      blockAndShowModal();
      return;
    }

    // Cmd+Option+I (Mac DevTools)
    if (e.metaKey && e.altKey && e.key === 'i') {
      blockAndShowModal();
      return;
    }

    // Cmd+Option+J (Mac Console)
    if (e.metaKey && e.altKey && e.key === 'j') {
      blockAndShowModal();
      return;
    }

    // Cmd+Option+U (Mac View Source)
    if (e.metaKey && e.altKey && e.key === 'u') {
      blockAndShowModal();
      return;
    }
  }, [isAuthorized]);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    // Zaten yetkili ise engelleme
    if (isAuthorized) return;

    e.preventDefault();
    setIsBlocked(true);
    setShowModal(true);
  }, [isAuthorized]);

  // Modal içinde Enter tuşu
  const handleModalKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePasswordSubmit();
    }
    if (e.key === 'Escape') {
      setShowModal(false);
      setPassword('');
      setError('');
    }
  }, [handlePasswordSubmit]);

  useEffect(() => {
    // Event listener'ları ekle
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [handleKeyDown, handleContextMenu]);

  // DevTools açık mı kontrolü - SAYFA AÇILIRKEN
  useEffect(() => {
    if (isAuthorized) return;

    let detected = false;

    // Yöntem 1: Boyut kontrolü
    const checkSize = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      return widthThreshold || heightThreshold;
    };

    // Yöntem 2: console.log getter tuzağı
    const checkConsole = (): Promise<boolean> => {
      return new Promise((resolve) => {
        const element = document.createElement('div');
        Object.defineProperty(element, 'id', {
          get: function() {
            resolve(true);
            return 'trap';
          }
        });
        console.log(element);
        console.clear();
        // 100ms içinde tetiklenmezse DevTools kapalı
        setTimeout(() => resolve(false), 100);
      });
    };

    // Yöntem 3: Debugger zamanlama testi
    const checkDebugger = (): boolean => {
      const start = performance.now();
      // Bu satır DevTools açıkken duraklayacak
      eval('debugger');
      const duration = performance.now() - start;
      // 50ms'den uzun sürdüyse DevTools açık
      return duration > 50;
    };

    const runDetection = async () => {
      if (detected) return;

      // Önce boyut kontrolü
      if (checkSize()) {
        detected = true;
        setIsBlocked(true);
        setShowModal(true);
        return;
      }

      // Sonra console tuzağı
      const consoleOpen = await checkConsole();
      if (consoleOpen && !detected) {
        detected = true;
        setIsBlocked(true);
        setShowModal(true);
        return;
      }

      // Son olarak debugger testi
      try {
        if (checkDebugger() && !detected) {
          detected = true;
          setIsBlocked(true);
          setShowModal(true);
        }
      } catch (e) {
        // eval engellenmişse atla
      }
    };

    // Sayfa yüklenince çalıştır
    runDetection();
  }, [isAuthorized]);

  // Engellenmiş ama modal kapalıysa - siyah ekran göster
  if (isBlocked && !showModal) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ fontSize: '64px' }}>🚫</div>
        <h2 style={{ color: '#fff', fontSize: '24px', textAlign: 'center' }}>
          Erişim Engellendi
        </h2>
        <p style={{ color: '#888', fontSize: '14px', textAlign: 'center' }}>
          Geliştirici araçları algılandı
        </p>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '14px 32px',
            fontSize: '16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#333',
            color: '#fff',
            cursor: 'pointer',
            marginTop: '20px',
          }}
        >
          Şifre Gir
        </button>
      </div>
    );
  }

  if (!showModal) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
      }}
    >
      <div
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '400px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          border: '1px solid #333',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{
          color: '#fff',
          marginBottom: '8px',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          Geliştirici Araçları
        </h2>
        <p style={{
          color: '#888',
          marginBottom: '24px',
          fontSize: '14px'
        }}>
          Bu özelliğe erişmek için şifre gereklidir
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleModalKeyDown}
          placeholder="Şifre"
          autoFocus
          style={{
            width: '100%',
            padding: '14px 16px',
            fontSize: '16px',
            borderRadius: '8px',
            border: error ? '2px solid #ff4444' : '2px solid #333',
            backgroundColor: '#0f0f1a',
            color: '#fff',
            outline: 'none',
            marginBottom: '12px',
            boxSizing: 'border-box',
          }}
        />

        {error && (
          <p style={{
            color: '#ff4444',
            fontSize: '14px',
            marginBottom: '12px'
          }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => {
              setShowModal(false);
              setPassword('');
              setError('');
            }}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid #333',
              backgroundColor: 'transparent',
              color: '#888',
              cursor: 'pointer',
            }}
          >
            İptal
          </button>
          <button
            onClick={handlePasswordSubmit}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#4CAF50',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Giriş
          </button>
        </div>
      </div>
    </div>
  );
}
