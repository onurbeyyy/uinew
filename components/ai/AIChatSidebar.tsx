'use client';

import { useState, useEffect, useRef } from 'react';
import { useChatAI } from '@/hooks/useChatAI';

interface AIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  customerCode: string;
  menuData?: any;
}

export default function AIChatSidebar({ isOpen, onClose, customerCode, menuData }: AIChatSidebarProps) {
  const { messages, isLoading, isLoadingMenu, sendMessage, clearHistory } = useChatAI({
    customerCode,
    menuData,
  });

  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const msg = inputMessage.trim();
    setInputMessage('');

    await sendMessage(msg);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="ai-chat-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          transition: 'all 0.3s ease',
          zIndex: 99998,
        }}
      />

      {/* Sidebar */}
      <div
        className={`ai-chat-sidebar ${isOpen ? 'sidebar-open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: isOpen ? 0 : '-100%',
          width: '100%',
          height: '100vh',
          background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
          transition: 'left 0.3s ease',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Header */}
        <div
          className="chat-header"
          style={{
            background: 'rgba(0, 0, 0, 0.2)',
            color: 'white',
            padding: '15px 20px',
            flexShrink: 0,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-robot" style={{ fontSize: '20px' }}></i>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>AI Menü Asistanı</h3>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 'bold',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '15px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px 12px 12px 2px',
                padding: '12px 15px',
                color: '#333',
                fontSize: '14px',
                lineHeight: '1.5',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}
            >
              Merhaba! 👋 Menü ile ilgili her şeyi sorabilirsiniz. Size nasıl yardımcı olabilirim? 😊
            </div>
          )}

          {isLoadingMenu && messages.length === 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '12px 12px 12px 2px',
                  padding: '12px 15px',
                  color: '#666',
                  fontSize: '13px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                <i className="fas fa-spinner fa-spin"></i> Menü bilgileri yükleniyor...
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  background: msg.sender === 'user' ? '#fff' : 'rgba(255, 255, 255, 0.95)',
                  borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  padding: '12px 15px',
                  maxWidth: '85%',
                  color: '#333',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  wordWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.message}
              </div>
            </div>
          ))}

          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '12px 12px 12px 2px',
                  padding: '12px 15px',
                  color: '#666',
                  fontSize: '14px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                <i className="fas fa-spinner fa-spin"></i> Düşünüyorum...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          style={{
            padding: '15px',
            paddingBottom: '90px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isLoadingMenu ? "Menü yükleniyor..." : "Mesajınızı yazın..."}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px 15px',
                border: 'none',
                borderRadius: '25px',
                fontSize: '14px',
                background: 'white',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !inputMessage.trim()}
              style={{
                width: '48px',
                height: '48px',
                background: isLoading || !inputMessage.trim()
                  ? '#ccc'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                cursor: isLoading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              }}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>

          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              style={{
                width: '100%',
                marginTop: '8px',
                padding: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <i className="fas fa-trash"></i> Sohbeti Temizle
            </button>
          )}
        </div>
      </div>
    </>
  );
}
