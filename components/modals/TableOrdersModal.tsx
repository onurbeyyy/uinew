'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface OrderState {
  stateName: string;
  state: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  portion?: string;
  state?: string;
  states?: OrderState[];  // Tüm state'ler (GStatus dahil)
}

interface TableOrderData {
  ticketId: number;
  ticketNumber: string;
  totalAmount: number;
  date?: string;
  tableName: string;
  orders: OrderItem[];
}

interface TableOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerCode: string;
  tableId: string;
  onRequestBill?: () => void;
}

export default function TableOrdersModal({
  isOpen,
  onClose,
  customerCode,
  tableId,
  onRequestBill,
}: TableOrdersModalProps) {
  // Display name: localStorage veya API'den gelen tableName
  const [displayTableName, setDisplayTableName] = useState<string>('');
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<TableOrderData[] | null>(null);
  const [showBillConfirm, setShowBillConfirm] = useState(false);
  const [billRequesting, setBillRequesting] = useState(false);
  const [billError, setBillError] = useState<string | null>(null);
  const [billSuccess, setBillSuccess] = useState(false);

  // tableId değiştiğinde localStorage'dan masa ismini oku
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('currentTableName');
      setDisplayTableName(savedName || '');
    }
  }, [tableId]);

  // Modal acildiginda siparisleri cek
  useEffect(() => {
    if (isOpen && customerCode && tableId) {
      fetchTableOrders();
    }
  }, [isOpen, customerCode, tableId]);

  const fetchTableOrders = async () => {
    setLoading(true);
    setError(null);
    setOrderData(null);

    try {
      // EndUserId'yi localStorage'dan al
      const userData = localStorage.getItem('userData');
      const endUserId = userData ? JSON.parse(userData).id : null;

      const response = await fetch('/api/table-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerCode,
          tableName: tableId,
          endUserId,
        }),
      });

      const result = await response.json();

      // API'den gelen masa ismini göster ve localStorage'a kaydet
      if (result.tableName) {
        setDisplayTableName(result.tableName);
        localStorage.setItem('currentTableName', result.tableName);
      } else if (result.data?.length > 0 && result.data[0].tableName) {
        setDisplayTableName(result.data[0].tableName);
        localStorage.setItem('currentTableName', result.data[0].tableName);
      }

      if (result.success && result.data) {
        setOrderData(result.data);
      } else if (result.timeout) {
        setError('Baglanti zaman asimina ugradi. Lutfen daha sonra tekrar deneyin.');
      } else {
        setError(result.error || 'Siparis bilgisi alinamadi');
      }
    } catch (err) {
      console.error('TableOrders fetch error:', err);
      setError('Baglanti hatasi. Lutfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestBill = async () => {
    setBillRequesting(true);
    setBillError(null);

    try {
      // EndUserId'yi localStorage'dan al
      const userData = localStorage.getItem('userData');
      const endUserId = userData ? JSON.parse(userData).id : null;

      const response = await fetch('/api/waiter-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          CustomerCode: customerCode,
          TableName: tableId,
          CallType: 'Bill',
          Message: 'Hesap isteniyor',
          EndUserId: endUserId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setBillSuccess(true);
        setShowBillConfirm(false);
        // 3 saniye sonra modal'i kapat
        setTimeout(() => {
          setBillSuccess(false);
          onClose();
        }, 3000);
        if (onRequestBill) {
          onRequestBill();
        }
      } else if (result.isRateLimited) {
        setBillError(result.error || 'Lutfen biraz bekleyin');
        setShowBillConfirm(false);
      } else {
        setBillError(result.error || 'Hesap istegi gonderilemedi');
        setShowBillConfirm(false);
      }
    } catch (err) {
      console.error('RequestBill error:', err);
      setBillError('Baglanti hatasi. Lutfen tekrar deneyin.');
      setShowBillConfirm(false);
    } finally {
      setBillRequesting(false);
    }
  };

  if (!isOpen) return null;

  // GStatus'tan özel durumu kontrol et (İade, İkram vb.)
  const getGStatus = (item: OrderItem): string | null => {
    const gStatus = item.states?.find(s => s.stateName === 'GStatus');
    return gStatus?.state || null;
  };

  // İade olanları filtrele, İkram'ları göster
  const getActiveOrders = (orders: OrderItem[]) => {
    return orders.filter(item => {
      const gStatus = getGStatus(item);
      // İade olanları gizle
      if (gStatus === 'İade') return false;
      // Eski kontroller de kalsın (void, cancelled vb.)
      const state = (item.state || '').toLowerCase();
      return state !== 'void' && state !== 'cancelled' && state !== 'refunded';
    });
  };

  // Ürünün İkram olup olmadığını kontrol et
  const isGift = (item: OrderItem): boolean => {
    const gStatus = getGStatus(item);
    return gStatus === 'İkram';
  };

  // Aktif siparişleri grupla (İkram olanları ayrı grupla)
  const getGroupedOrders = (orders: OrderItem[]) => {
    const activeOrders = getActiveOrders(orders);
    return Object.values(activeOrders.reduce((acc, item) => {
      // İkram olanları ayrı grupla (İkram|CAY|Normal vs Normal|CAY|Normal)
      const giftPrefix = isGift(item) ? 'gift' : 'normal';
      const key = `${giftPrefix}|${item.name}|${item.portion || ''}`;
      if (!acc[key]) {
        acc[key] = { ...item, quantity: 0, total: 0 };
      }
      acc[key].quantity += item.quantity;
      acc[key].total += item.total;
      return acc;
    }, {} as Record<string, OrderItem>));
  };

  // Toplam tutarı aktif siparişlerden hesapla (İkramlar hariç)
  const totalAmount = orderData?.reduce((sum, ticket) => {
    const activeOrders = getActiveOrders(ticket.orders);
    // İkram olan ürünleri toplama ekleme
    return sum + activeOrders.reduce((s, item) => {
      if (isGift(item)) return s;
      return s + item.total;
    }, 0);
  }, 0) || 0;

  // Toplam ürün sayısını aktif siparişlerden hesapla
  const totalItems = orderData?.reduce((sum, ticket) => {
    const activeOrders = getActiveOrders(ticket.orders);
    return sum + activeOrders.reduce((s, item) => s + item.quantity, 0);
  }, 0) || 0;

  return (
    <div className="table-orders-modal-overlay" onClick={onClose}>
      <div className="table-orders-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-info">
            <h2>Masada Ne Var?</h2>
            {/* Masa ismini göster (localStorage veya API'den) */}
            {displayTableName && (
              <span className="table-name">{displayTableName}</span>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Siparisler yukleniyor...</p>
            </div>
          )}

          {error && !loading && (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <p>{error}</p>
              <button className="retry-btn" onClick={fetchTableOrders}>
                Tekrar Dene
              </button>
            </div>
          )}

          {billSuccess && (
            <div className="success-state">
              <div className="success-icon">✅</div>
              <h3>Hesap Istegi Gonderildi!</h3>
              <p>Garsonunuz en kisa surede hesabinizi getirecektir.</p>
            </div>
          )}

          {billError && !billSuccess && (
            <div className="bill-error">
              <span>⏰</span> {billError}
            </div>
          )}

          {!loading && !error && !billSuccess && orderData && (
            <>
              {orderData.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🍽️</div>
                  <h3>Masada Siparis Yok</h3>
                  <p>Henuz acik bir adisyon bulunmuyor.</p>
                </div>
              ) : (
                <>
                  {/* Orders List */}
                  <div className="orders-list">
                    {orderData.map((ticket) => {
                      const groupedOrders = getGroupedOrders(ticket.orders);
                      // İkram olan ürünleri toplama ekleme
                      const ticketTotal = groupedOrders.reduce((sum, item) => {
                        if (isGift(item)) return sum;
                        return sum + item.total;
                      }, 0);

                      // Aktif sipariş yoksa bu ticket'ı gösterme
                      if (groupedOrders.length === 0) return null;

                      return (
                        <div key={ticket.ticketId} className="ticket-card">
                          <div className="ticket-header">
                            <span className="ticket-number">Adisyon #{ticket.ticketNumber}</span>
                            <span className="ticket-total">{ticketTotal.toFixed(2)} TL</span>
                          </div>
                          <div className="order-items">
                            {groupedOrders.map((item, itemIndex) => {
                              const itemIsGift = isGift(item);
                              return (
                                <div key={itemIndex} className={`order-item ${itemIsGift ? 'gift-item' : ''}`}>
                                  <div className="item-info">
                                    <span className="item-name">
                                      {itemIsGift && <span className="gift-icon">❤️</span>}
                                      {item.name}
                                      {item.portion && item.portion !== 'Normal' && <span className="item-portion">({item.portion})</span>}
                                    </span>
                                    <span className="item-qty">x{item.quantity}</span>
                                  </div>
                                  <span className={`item-price ${itemIsGift ? 'gift-price' : ''}`}>
                                    {itemIsGift ? 'İkram' : `${item.total.toFixed(2)} TL`}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary */}
                  <div className="summary-section">
                    <div className="summary-row">
                      <span>Toplam Urun</span>
                      <span>{totalItems} adet</span>
                    </div>
                    <div className="summary-row total">
                      <span>Genel Toplam</span>
                      <span>{totalAmount.toFixed(2)} TL</span>
                    </div>
                  </div>

                  {/* Hesap Iste Button */}
                  <button
                    className="request-bill-btn"
                    onClick={() => setShowBillConfirm(true)}
                    disabled={billRequesting}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    Hesap Iste
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* Hesap Iste Onay Modal */}
        {showBillConfirm && (
          <div className="confirm-overlay" onClick={() => setShowBillConfirm(false)}>
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-icon">💰</div>
              <h3>Hesap Istensin Mi?</h3>
              <p>Garsonunuz hesabinizi masaniza getirecektir.</p>
              <div className="confirm-buttons">
                <button className="cancel-btn" onClick={() => setShowBillConfirm(false)}>
                  Iptal
                </button>
                <button
                  className="confirm-btn"
                  onClick={handleRequestBill}
                  disabled={billRequesting}
                >
                  {billRequesting ? 'Gonderiliyor...' : 'Onayla'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .table-orders-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100000;
          animation: fadeIn 0.2s ease;
          padding: 20px;
        }

        .table-orders-modal {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 500px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: slideUp 0.3s ease;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .header-info h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .table-name {
          font-size: 14px;
          opacity: 0.9;
        }

        .close-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: white;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .loading-state, .error-state, .empty-state, .success-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .error-icon, .empty-icon, .success-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .error-state p, .empty-state p {
          color: #718096;
          margin: 8px 0 20px;
        }

        .retry-btn {
          padding: 10px 24px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .success-state h3 {
          color: #22c55e;
          margin-bottom: 8px;
        }

        .success-state p {
          color: #718096;
        }

        .bill-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 20px;
        }

        .ticket-card {
          background: #f8fafc;
          border-radius: 12px;
          overflow: hidden;
        }

        .ticket-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #e2e8f0;
        }

        .ticket-number {
          font-weight: 600;
          color: #4a5568;
        }

        .ticket-total {
          font-weight: 700;
          color: #667eea;
        }

        .order-items {
          padding: 12px 16px;
        }

        .order-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .order-item:last-child {
          border-bottom: none;
        }

        .item-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .item-name {
          color: #2d3748;
          font-weight: 500;
        }

        .item-portion {
          color: #718096;
          font-size: 12px;
        }

        .item-qty {
          background: #667eea;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .item-price {
          color: #4a5568;
          font-weight: 600;
        }

        /* İkram ürünleri için stiller */
        .gift-item {
          background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
          border-radius: 8px;
          padding: 8px !important;
          margin: 4px 0;
        }

        .gift-icon {
          margin-right: 6px;
        }

        .gift-price {
          color: #ec4899;
          font-weight: 700;
          background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .summary-section {
          background: #f8fafc;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          color: #4a5568;
        }

        .summary-row.total {
          border-top: 2px solid #e2e8f0;
          margin-top: 8px;
          padding-top: 16px;
          font-size: 18px;
          font-weight: 700;
          color: #2d3748;
        }

        .request-bill-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
        }

        .request-bill-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
        }

        .request-bill-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Confirm Modal */
        .confirm-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .confirm-modal {
          background: white;
          border-radius: 16px;
          padding: 30px;
          text-align: center;
          max-width: 320px;
          width: 100%;
          animation: slideUp 0.2s ease;
        }

        .confirm-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .confirm-modal h3 {
          margin: 0 0 8px;
          color: #2d3748;
          font-size: 20px;
        }

        .confirm-modal p {
          color: #718096;
          margin: 0 0 24px;
          font-size: 14px;
        }

        .confirm-buttons {
          display: flex;
          gap: 12px;
        }

        .cancel-btn, .confirm-btn {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-btn {
          background: #e2e8f0;
          color: #4a5568;
        }

        .confirm-btn {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: white;
        }

        .confirm-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
