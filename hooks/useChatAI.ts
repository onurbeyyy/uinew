'use client';

import { useState, useCallback, useEffect } from 'react';

export interface ChatMessage {
  message: string;
  sender: 'user' | 'ai';
  timestamp: string;
  page?: string;
}

interface UseChatAIOptions {
  customerCode: string;
  menuData?: any;
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

export function useChatAI({ customerCode, menuData: externalMenuData }: UseChatAIOptions) {
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
      console.log('✅ Using external menu data from page:', {
        categoriesCount: externalMenuData.categories.length
      });
      setMenuData(externalMenuData);
      setIsLoadingMenu(false);
    } else {
      console.log('⚠️ No external menu data yet');
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
    (message: string, sender: 'user' | 'ai') => {
      const newMessage: ChatMessage = {
        message,
        sender,
        timestamp: new Date().toISOString(),
        page: window.location.pathname,
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
    async (message: string) => {
      if (!message.trim() || !customerCode) return null;

      // Check remaining messages
      if (remainingMessages <= 0) {
        const errorMsg = 'Günlük 30 mesaj limitinize ulaştınız. Yarın tekrar deneyebilirsiniz. 😊';
        addMessage(errorMsg, 'ai');
        return errorMsg;
      }

      // Add user message
      addMessage(message, 'user');
      setIsLoading(true);

      try {
        // Send menuData as JSON string (like old code)
        const menuDataStr = menuData ? JSON.stringify(menuData) : '';

        console.log('📤 Sending message to AI:', {
          message: message.substring(0, 50),
          customerCode,
          hasMenuData: !!menuData,
          menuDataLength: menuDataStr.length,
          categoriesCount: menuData?.categories?.length || 0
        });

        // Send directly to backend - NO WAITING!
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
          }),
        });

        const data = await response.json();
        console.log('📥 Received AI response:', {
          success: data.success,
          hasResponse: !!data.response,
          source: data.source
        });

        if (data.success) {
          // Update remaining messages
          if (typeof data.remainingMessages !== 'undefined') {
            setRemainingMessages(data.remainingMessages);
          }

          // Add AI response
          addMessage(data.response, 'ai');
          return data.response;
        } else {
          const errorMsg = data.error || data.response || 'Bir hata oluştu. Lütfen tekrar deneyin.';
          addMessage(errorMsg, 'ai');
          return errorMsg;
        }
      } catch (error) {
        console.error('Send message error:', error);
        const errorMsg = 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.';
        addMessage(errorMsg, 'ai');
        return errorMsg;
      } finally {
        setIsLoading(false);
      }
    },
    [customerCode, sessionId, menuData, remainingMessages, addMessage, isLoadingMenu]
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
  };
}
