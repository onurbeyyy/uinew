'use client';

import { useEffect, useState, useCallback } from 'react';

// Mobil cihaz kontrolü
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window)
    || (navigator.maxTouchPoints > 0);
};

export default function DevToolsGuard() {
  const [isMobile, setIsMobile] = useState(false);

  // Mobil cihaz kontrolü
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Mobil ise engelleme
    if (isMobile) return;

    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      return;
    }

    // Ctrl+Shift+I (DevTools)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      return;
    }

    // Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      return;
    }

    // Ctrl+Shift+C (Element Inspector)
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      return;
    }

    // Ctrl+U (View Source)
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      return;
    }

    // Cmd+Option+I (Mac DevTools)
    if (e.metaKey && e.altKey && e.key === 'i') {
      e.preventDefault();
      return;
    }

    // Cmd+Option+J (Mac Console)
    if (e.metaKey && e.altKey && e.key === 'j') {
      e.preventDefault();
      return;
    }

    // Cmd+Option+U (Mac View Source)
    if (e.metaKey && e.altKey && e.key === 'u') {
      e.preventDefault();
      return;
    }
  }, [isMobile]);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    // Mobil ise engelleme
    if (isMobile) return;

    e.preventDefault();
  }, [isMobile]);

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

  // Hiçbir şey render etme
  return null;
}
