'use client';

import { useState, useCallback, useEffect } from 'react';
import type { AIOrderAction } from '@/types/api';

export interface ChatMessage {
  message: string;
  sender: 'user' | 'ai';
  timestamp: string;
  page?: string;
  action?: AIOrderAction;
}

interface UseChatAIOptions {
  customerCode: string;
  menuData?: any;
  tableId?: string;
  isTableMode?: boolean;
  userName?: string; // Login olan kullanıcının adı
}

interface MenuData {
  customerCode: string;
  customerTitle: string;
  categories: CategoryData[];
}

interface CategoryData {
  title: string;
  sambaId: string;
  products: ProductData[];
}

interface ProductData {
  title: string;
  price: number;
  detail?: string;
}

export function useChatAI({ customerCode, menuData: externalMenuData, tableId, isTableMode, userName }: UseChatAIOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [remainingMessages, setRemainingMessages] = useState(30);
  const [sessionId, setSessionId] = useState('');
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);

  // Initialize session ID
  useEffect(() => {
    let sid = localStorage.getItem('chatSessionId');
    if (!sid) {
      sid = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('chatSessionId', sid);
    }
    setSessionId(sid);
  }, []);

  // Load external menu data directly (no API calls in hook)
  useEffect(() => {
    if (externalMenuData && externalMenuData.categories) {
      setMenuData(externalMenuData);
      setIsLoadingMenu(false);
    } else {
      setIsLoadingMenu(true);
    }
  }, [externalMenuData]);

  // Load chat history from localStorage
  useEffect(() => {
    if (!customerCode) return;

    const storageKey = `global_chat_history_${customerCode}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const history = JSON.parse(saved);
        setMessages(history);
      } catch (error) {
        console.error('Failed to parse chat history:', error);
      }
    }
  }, [customerCode]);

  // Save chat history to localStorage
  const saveChatHistory = useCallback(
    (newMessages: ChatMessage[]) => {
      if (!customerCode) return;
      const storageKey = `global_chat_history_${customerCode}`;
      localStorage.setItem(storageKey, JSON.stringify(newMessages));
    },
    [customerCode]
  );

  // Add message to history
  const addMessage = useCallback(
    (message: string, sender: 'user' | 'ai', action?: AIOrderAction) => {
      const newMessage: ChatMessage = {
        message,
        sender,
        timestamp: new Date().toISOString(),
        page: window.location.pathname,
        action,
      };

      setMessages((prev) => {
        const updated = [...prev, newMessage];
        saveChatHistory(updated);
        return updated;
      });

      return newMessage;
    },
    [saveChatHistory]
  );

  // Send message to AI
  const sendMessage = useCallback(
    async (message: string): Promise<{ response: string; action?: AIOrderAction } | null> => {
      if (!message.trim() || !customerCode) return null;

      // Check remaining messages
      if (remainingMessages <= 0) {
        const errorMsg = 'Günlük 30 mesaj limitinize ulaştınız. Yarın tekrar deneyebilirsiniz. 😊';
        addMessage(errorMsg, 'ai');
        return { response: errorMsg };
      }

      // Add user message
      addMessage(message, 'user');
      setIsLoading(true);

      try {
        // Send menuData as JSON string (like old code)
        const menuDataStr = menuData ? JSON.stringify(menuData) : '';

        // Son 10 mesajı al (context için)
        const recentMessages = messages.slice(-10).map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.message
        }));

        // Send directly to backend
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            customerCode,
            sessionId,
            pageUrl: window.location.href,
            menuData: menuDataStr, // JSON string like old code
            tableId,
            isTableMode: isTableMode || false,
            userName: userName || '', // Login olan kullanıcının adı
            conversationHistory: recentMessages, // Sohbet geçmişi
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Update remaining messages
          if (typeof data.remainingMessages !== 'undefined') {
            setRemainingMessages(data.remainingMessages);
          }

          // Parse action from response
          const action: AIOrderAction | undefined = data.action;

          // Add AI response with action
          addMessage(data.response, 'ai', action);
          return { response: data.response, action };
        } else {
          const errorMsg = data.error || data.response || 'Bir hata oluştu. Lütfen tekrar deneyin.';
          addMessage(errorMsg, 'ai');
          return { response: errorMsg };
        }
      } catch (error) {
        console.error('Send message error:', error);
        const errorMsg = 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.';
        addMessage(errorMsg, 'ai');
        return { response: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [customerCode, sessionId, menuData, remainingMessages, addMessage, isLoadingMenu, tableId, isTableMode, userName, messages]
  );

  // Clear chat history
  const clearHistory = useCallback(() => {
    setMessages([]);
    if (customerCode) {
      const storageKey = `global_chat_history_${customerCode}`;
      localStorage.removeItem(storageKey);
    }
  }, [customerCode]);

  return {
    messages,
    isLoading,
    isLoadingMenu,
    remainingMessages,
    sendMessage,
    clearHistory,
    addMessage, // AI mesajları manuel eklemek için
  };
}
