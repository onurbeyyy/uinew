'use client';

import { useState, useEffect, useRef } from 'react';
import { useChatAI } from '@/hooks/useChatAI';
import { saveCart, loadCart } from '@/utils/cartUtils';
import { useToast } from '@/components/ui/Toast';
import type { AIOrderAction, AIOrderProduct } from '@/types/api';

interface AIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  customerCode: string;
  menuData?: any;
  tableId?: string;
  isTableMode?: boolean;
}

export default function AIChatSidebar({ isOpen, onClose, customerCode, menuData, tableId, isTableMode }: AIChatSidebarProps) {
  const { messages, isLoading, isLoadingMenu, sendMessage, clearHistory, addMessage } = useChatAI({
    customerCode,
    menuData,
    tableId,
    isTableMode,
  });

  const { showCartToast } = useToast();

  // Porsiyon seçimi state
  const [pendingOrder, setPendingOrder] = useState<{
    product: AIOrderProduct;
    quantity: number;
    orderNote?: string;
  } | null>(null);

  // Onay bekleme state
  const [pendingConfirm, setPendingConfirm] = useState<{
    product: AIOrderProduct;
    quantity: number;
    orderNote?: string; // Not zaten verilmişse
  } | null>(null);

  // Not bekleme state (kullanıcının yazacağı cevabı bekliyor)
  const [awaitingNote, setAwaitingNote] = useState<{
    product: AIOrderProduct;
    quantity: number;
  } | null>(null);

  // Çoklu ürün kuyruğu
  const [productQueue, setProductQueue] = useState<{
    product: AIOrderProduct;
    quantity: number;
    orderNote?: string;
  }[]>([]);

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

  // Sepete ekleme fonksiyonu
  const handleAddToCart = (product: AIOrderProduct, quantity: number, portionName?: string, orderNote?: string) => {
    if (!isTableMode || !tableId || !customerCode) return;

    const cartKey = tableId;
    let cartItems = loadCart(cartKey, customerCode);

    // Porsiyon bilgisini al
    let selectedPortion = null;
    if (portionName && product.portions) {
      selectedPortion = product.portions.find(p => p.name === portionName);
    } else if (product.portions && product.portions.length === 1) {
      selectedPortion = product.portions[0];
    }

    const productId = selectedPortion?.id ?? product.id;
    const itemPrice = selectedPortion?.price ?? product.price ?? 0;
    const portionNameStr = selectedPortion?.name || '';

    // Aynı ürün + aynı porsiyon + aynı not kombinasyonunu bul
    const existingItemIndex = cartItems.findIndex(
      (item: any) => item.productId === productId && item.portionName === portionNameStr && item.note === (orderNote || '') && !item.features?.length
    );

    if (existingItemIndex >= 0) {
      cartItems[existingItemIndex].quantity += quantity;
    } else {
      const displayName = portionNameStr ? `${product.title} (${portionNameStr})` : product.title;

      cartItems.push({
        id: Date.now(),
        productId: productId,
        sambaId: product.sambaId,
        sambaPortionId: selectedPortion?.sambaPortionId,
        portionName: portionNameStr,
        name: displayName,
        price: itemPrice,
        quantity: quantity,
        note: orderNote || '', // Ürün notu (sepette note field'ı kullanılıyor)
      });
    }

    saveCart(cartKey, cartItems, customerCode);
    window.dispatchEvent(new Event('cartUpdated'));

    const displayName = portionNameStr ? `${product.title} (${portionNameStr})` : product.title;
    const noteText = orderNote ? ` (${orderNote})` : '';
    showCartToast(displayName + noteText, '', () => {
      window.dispatchEvent(new CustomEvent('openCart'));
    });

    // Tüm pending state'leri temizle
    setPendingOrder(null);
    setPendingConfirm(null);
    setAwaitingNote(null);

    // Kuyrukta başka ürün varsa, sonrakini işle
    setTimeout(() => {
      processNextFromQueue();
    }, 500);
  };

  // Kuyruktan sonraki ürünü işle
  const processNextFromQueue = () => {
    if (productQueue.length === 0) return;

    const [nextItem, ...remaining] = productQueue;
    setProductQueue(remaining);

    const qtyText = nextItem.quantity > 1 ? `${nextItem.quantity} adet ` : '';
    addMessage(`Şimdi ${qtyText}${nextItem.product.title} için onay alıyorum...`, 'ai');

    setPendingConfirm({
      product: nextItem.product,
      quantity: nextItem.quantity,
      orderNote: nextItem.orderNote
    });
  };

  // Porsiyon seçimi handler
  const handlePortionSelect = (portionName: string) => {
    if (pendingOrder) {
      handleAddToCart(pendingOrder.product, pendingOrder.quantity, portionName, pendingOrder.orderNote);
    }
  };

  // Onay handler - Onay sonrası "nasıl olsun?" mesajı gönder veya direkt ekle
  const handleConfirmOrder = (confirmed: boolean) => {
    if (!confirmed) {
      setPendingConfirm(null);
      return;
    }

    if (pendingConfirm) {
      const qtyText = pendingConfirm.quantity > 1 ? `${pendingConfirm.quantity} adet ` : '';

      // Eğer not zaten verilmişse, direkt sepete ekle
      if (pendingConfirm.orderNote) {
        handleAddToCart(pendingConfirm.product, pendingConfirm.quantity, undefined, pendingConfirm.orderNote);
        addMessage(`${qtyText}${pendingConfirm.product.title} (${pendingConfirm.orderNote}) sepetinize eklendi! 🛒`, 'ai');
        setPendingConfirm(null);
        return;
      }

      // Not verilmemişse "nasıl olsun?" sor
      addMessage(`${qtyText}${pendingConfirm.product.title} nasıl olsun? (örn: açık, sade, acısız vb.)`, 'ai');

      // Not bekleme state'ine al
      setAwaitingNote({
        product: pendingConfirm.product,
        quantity: pendingConfirm.quantity
      });
      setPendingConfirm(null);
    }
  };

  // Sepeti göster
  const handleViewCart = () => {
    if (!isTableMode || !tableId || !customerCode) {
      addMessage('Sepeti görmek için masa modunda olmalısınız.', 'ai');
      return;
    }

    const cartItems = loadCart(tableId, customerCode);

    if (!cartItems || cartItems.length === 0) {
      addMessage('Sepetiniz boş. 🛒', 'ai');
      return;
    }

    let cartMessage = '🛒 Sepetinizdeki ürünler:\n\n';
    let totalAmount = 0;

    cartItems.forEach((item: any, index: number) => {
      const itemTotal = item.price * item.quantity;
      totalAmount += itemTotal;
      cartMessage += `${index + 1}. ${item.name}`;
      if (item.quantity > 1) {
        cartMessage += ` x${item.quantity}`;
      }
      cartMessage += ` - ${itemTotal.toFixed(2)}₺`;
      if (item.note) {
        cartMessage += ` (${item.note})`;
      }
      cartMessage += '\n';
    });

    cartMessage += `\n💰 Toplam: ${totalAmount.toFixed(2)}₺`;
    cartMessage += '\n\n"Siparişi gönder" diyerek siparişinizi onaylayabilirsiniz.';

    addMessage(cartMessage, 'ai');
  };

  // Sepeti temizle
  const handleClearCart = () => {
    if (!isTableMode || !tableId || !customerCode) {
      addMessage('Sepeti temizlemek için masa modunda olmalısınız.', 'ai');
      return;
    }

    const cartItems = loadCart(tableId, customerCode);

    if (!cartItems || cartItems.length === 0) {
      addMessage('Sepetiniz zaten boş. 🛒', 'ai');
      return;
    }

    // Sepeti temizle
    saveCart(tableId, [], customerCode);
    window.dispatchEvent(new Event('cartUpdated'));

    addMessage('Sepetiniz temizlendi. ✓', 'ai');
  };

  // Sipariş onay bekleme state
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [submitCartItems, setSubmitCartItems] = useState<any[]>([]);

  // Siparişi gönder
  const handleSubmitOrder = () => {
    if (!isTableMode || !tableId || !customerCode) {
      addMessage('Sipariş vermek için masa modunda olmalısınız.', 'ai');
      return;
    }

    const cartItems = loadCart(tableId, customerCode);

    if (!cartItems || cartItems.length === 0) {
      addMessage('Sepetiniz boş. Önce ürün ekleyin. 🛒', 'ai');
      return;
    }

    // Sipariş özetini göster ve onay bekle
    setSubmitCartItems(cartItems);
    setPendingSubmit(true);

    let totalAmount = 0;
    let summaryMsg = '📋 Sipariş Özeti:\n\n';
    cartItems.forEach((item: any, idx: number) => {
      const itemTotal = item.price * item.quantity;
      totalAmount += itemTotal;
      summaryMsg += `${idx + 1}. ${item.name}`;
      if (item.quantity > 1) summaryMsg += ` x${item.quantity}`;
      summaryMsg += ` - ${itemTotal.toFixed(0)}₺`;
      if (item.note) summaryMsg += ` (${item.note})`;
      summaryMsg += '\n';
    });
    summaryMsg += `\n💰 Toplam: ${totalAmount.toFixed(0)}₺`;

    addMessage(summaryMsg, 'ai');
  };

  // Siparişi onayla ve gönder
  const confirmAndSendOrder = async () => {
    if (!tableId || !customerCode || submitCartItems.length === 0) return;

    addMessage('Siparişiniz gönderiliyor...', 'ai');

    try {
      const orderData = {
        customerCode,
        tableName: tableId,
        endUserId: 0,
        Source: 'UI',
        items: submitCartItems.map((item: any) => ({
          productId: item.sambaId || item.productId,
          actualProductId: item.productId,
          productName: item.name,
          portionId: item.sambaPortionId,
          quantity: item.quantity,
          price: item.price,
          orderTag: item.note || '',
        })),
      };

      const response = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Sepeti temizle
        saveCart(tableId, [], customerCode);
        window.dispatchEvent(new Event('cartUpdated'));

        addMessage('✅ Siparişiniz alındı! Afiyet olsun! 🍽️', 'ai');
      } else {
        addMessage('❌ Sipariş gönderilemedi: ' + (result.error || 'Bir hata oluştu'), 'ai');
      }
    } catch (error) {
      addMessage('❌ Bağlantı hatası. Lütfen tekrar deneyin.', 'ai');
    }

    setPendingSubmit(false);
    setSubmitCartItems([]);
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const msg = inputMessage.trim();
    const msgLower = msg.toLowerCase();
    setInputMessage('');

    // Eğer onay bekliyorsak, kullanıcının cevabını kontrol et
    if (pendingConfirm) {
      addMessage(msg, 'user');

      // "Evet", "ekle", "tamam", "olur" gibi onay kelimeleri
      const confirmWords = ['evet', 'ekle', 'tamam', 'olur', 'yes', 'ok', 'okay', 'eklenir', 'istiyorum'];
      const cancelWords = ['hayır', 'iptal', 'vazgeç', 'no', 'cancel', 'istemiyorum'];

      if (confirmWords.some(w => msgLower.includes(w))) {
        handleConfirmOrder(true);
      } else if (cancelWords.some(w => msgLower.includes(w))) {
        addMessage('Tamam, iptal edildi.', 'ai');
        setPendingConfirm(null);
      } else {
        // Anlaşılamadı, tekrar sor
        addMessage(`Anlamadım. ${pendingConfirm.product.title} sepete eklensin mi? (Evet/Hayır)`, 'ai');
      }
      return;
    }

    // Eğer not bekliyorsak, kullanıcının mesajını not olarak al
    if (awaitingNote) {
      // Kullanıcı mesajını göster
      addMessage(msg, 'user');

      // Sepete ekle (not ile)
      handleAddToCart(awaitingNote.product, awaitingNote.quantity, undefined, msg);

      // AI onay mesajı
      addMessage(`${awaitingNote.quantity > 1 ? awaitingNote.quantity + ' adet ' : ''}${awaitingNote.product.title} (${msg}) sepetinize eklendi! 🛒`, 'ai');

      setAwaitingNote(null);
      return;
    }

    const result = await sendMessage(msg);

    // Action varsa işle
    if (result?.action) {
      const action = result.action;

      if (action.type === 'ADD_TO_CART' && action.product) {
        handleAddToCart(action.product, action.quantity || 1, action.portionName, action.orderNote);
      } else if (action.type === 'ASK_PORTION' && action.product) {
        setPendingOrder({
          product: action.product,
          quantity: action.quantity || 1,
          orderNote: action.orderNote
        });
      } else if (action.type === 'CONFIRM_ORDER' && action.product) {
        setPendingConfirm({
          product: action.product,
          quantity: action.quantity || 1,
          orderNote: action.orderNote // Not zaten verilmişse
        });
      } else if (action.type === 'ASK_NOTE' && action.product) {
        // ASK_NOTE artık buton göstermiyor, awaitingNote'a al
        setAwaitingNote({
          product: action.product,
          quantity: action.quantity || 1
        });
      } else if (action.type === 'VIEW_CART') {
        // Sepeti göster
        handleViewCart();
      } else if (action.type === 'CLEAR_CART') {
        // Sepeti temizle
        handleClearCart();
      } else if (action.type === 'SUBMIT_ORDER') {
        // Siparişi gönder
        handleSubmitOrder();
      } else if (action.type === 'MULTI_CONFIRM' && action.products && action.products.length > 0) {
        // Çoklu ürün - ilkini işle, gerisini kuyruğa al
        const [first, ...rest] = action.products;

        // Geri kalanları kuyruğa ekle
        if (rest.length > 0) {
          setProductQueue(rest);
        }

        // İlk ürün için onay iste
        setPendingConfirm({
          product: first.product,
          quantity: first.quantity || 1,
          orderNote: first.orderNote
        });
      }
    }
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
          zIndex: 99990,
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
          background: 'rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          transition: 'left 0.3s ease',
          zIndex: 99991,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          className="chat-header"
          style={{
            background: 'transparent',
            color: 'white',
            padding: '15px 20px',
            flexShrink: 0,
            borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
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

        {/* AI Warning Banner */}
        <div
          style={{
            background: 'transparent',
            padding: '8px 15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '14px' }}>⚠️</span>
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', lineHeight: '1.3' }}>
            Yapay zeka modeli bazen hatalı bilgi verebilir. Önemli konularda personelden destek alın.
          </span>
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

          {/* Onay Bekleme UI */}
          {pendingConfirm && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '12px 12px 12px 2px',
                  padding: '15px',
                  maxWidth: '85%',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div style={{ color: '#333', fontSize: '14px', marginBottom: '12px', fontWeight: 500 }}>
                  {pendingConfirm.quantity > 1 ? `${pendingConfirm.quantity} adet ` : ''}{pendingConfirm.product.title}{pendingConfirm.orderNote ? ` (${pendingConfirm.orderNote})` : ''} sepete eklensin mi?
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleConfirmOrder(true)}
                    style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                    }}
                  >
                    ✓ Evet
                  </button>
                  <button
                    onClick={() => handleConfirmOrder(false)}
                    style={{
                      padding: '10px 20px',
                      background: 'rgba(0, 0, 0, 0.1)',
                      color: '#666',
                      border: 'none',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    Hayır
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Porsiyon Seçimi UI */}
          {pendingOrder && pendingOrder.product.portions && pendingOrder.product.portions.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '12px 12px 12px 2px',
                  padding: '15px',
                  maxWidth: '85%',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div style={{ color: '#333', fontSize: '14px', marginBottom: '12px', fontWeight: 500 }}>
                  {pendingOrder.product.title} için porsiyon seçin:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {pendingOrder.product.portions.map((portion) => (
                    <button
                      key={portion.id}
                      onClick={() => handlePortionSelect(portion.name)}
                      style={{
                        padding: '10px 16px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                      }}
                    >
                      {portion.name} - {portion.price.toFixed(2)}₺
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPendingOrder(null)}
                  style={{
                    marginTop: '10px',
                    padding: '6px 12px',
                    background: 'transparent',
                    color: '#888',
                    border: '1px solid #ddd',
                    borderRadius: '15px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  İptal
                </button>
              </div>
            </div>
          )}

          {/* Not Bekleme UI - Normal butonu */}
          {awaitingNote && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '12px 12px 12px 2px',
                  padding: '15px',
                  maxWidth: '85%',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>
                  Hızlı seçim veya özel tercih yazın:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    onClick={() => {
                      addMessage('Normal', 'user');
                      handleAddToCart(awaitingNote.product, awaitingNote.quantity, undefined, 'Normal');
                      addMessage(`${awaitingNote.quantity > 1 ? awaitingNote.quantity + ' adet ' : ''}${awaitingNote.product.title} (Normal) sepetinize eklendi! 🛒`, 'ai');
                      setAwaitingNote(null);
                    }}
                    style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                    }}
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => {
                      setAwaitingNote(null);
                      setPendingConfirm(null);
                      addMessage('İptal edildi.', 'ai');
                    }}
                    style={{
                      padding: '10px 20px',
                      background: 'rgba(0, 0, 0, 0.1)',
                      color: '#666',
                      border: 'none',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    İptal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sipariş Onay UI */}
          {pendingSubmit && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '12px 12px 12px 2px',
                  padding: '15px',
                  maxWidth: '85%',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div style={{ color: '#333', fontSize: '14px', marginBottom: '12px', fontWeight: 500 }}>
                  Siparişi onaylıyor musunuz?
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={confirmAndSendOrder}
                    style={{
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                    }}
                  >
                    ✓ Onayla ve Gönder
                  </button>
                  <button
                    onClick={() => {
                      setPendingSubmit(false);
                      setSubmitCartItems([]);
                      addMessage('Sipariş iptal edildi.', 'ai');
                    }}
                    style={{
                      padding: '12px 24px',
                      background: 'rgba(0, 0, 0, 0.1)',
                      color: '#666',
                      border: 'none',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    İptal
                  </button>
                </div>
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
            background: 'transparent',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
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
