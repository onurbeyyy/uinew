'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SuggestionContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';

  const [customerName, setCustomerName] = useState<string>(code);
  const [customerLogo, setCustomerLogo] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    content: ''
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Müşteri bilgilerini yükle
  useEffect(() => {
    if (!code) return;

    const fetchCustomerInfo = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://canlimenu.online';
        const response = await fetch(`${apiUrl}/api/Customer/CustomerInfo?code=${code}`);
        if (response.ok) {
          const data = await response.json();
          if (data.customer?.name) {
            setCustomerName(data.customer.name);
          }
          if (data.customerLogo) {
            const logo = data.customerLogo.startsWith('http')
              ? data.customerLogo.replace('http://', 'https://')
              : `https://canlimenu.online/Uploads/${data.customerLogo.replace('Uploads/', '')}`;
            setCustomerLogo(logo);
          }
        }
      } catch (error) {
        console.error('Customer info fetch error:', error);
      }
    };

    fetchCustomerInfo();
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.type || !formData.content) {
      setStatus('error');
      setMessage('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    setLoading(true);
    setStatus('idle');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://canlimenu.online';
      const response = await fetch(`${apiUrl}/api/CustomerSuggestion/Create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerName: formData.name || 'Anonim',
          venueCode: code,
          suggestionType: formData.type,
          suggestionContent: formData.content,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
        })
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Öneriniz başarıyla kaydedildi!');
        setFormData({ name: '', type: '', content: '' });
      } else {
        throw new Error(data.message || 'Bir hata oluştu');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Öneri gönderilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (!code) {
    return (
      <div className="suggestion-page">
        <div className="suggestion-container">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h2>Müşteri kodu bulunamadı</h2>
            <p>Lütfen geçerli bir link kullanın</p>
          </div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="suggestion-page">
      <div className="suggestion-container">
        {/* Header */}
        <div className="header">
          {customerLogo ? (
            <img
              src={customerLogo}
              alt={customerName}
              className="header-logo"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="header-icon">💬</div>
          )}
          <div className="customer-badge">
            🏪 {customerName}
          </div>
          <h1>İstek, Dilek & Şikayet</h1>
          <p>Görüşleriniz bizim için çok değerli!</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">
              👤 Adınız
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Adınız (İsteğe bağlı)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">
              🏷️ Tür <span className="required">*</span>
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              required
            >
              <option value="">Seçiniz...</option>
              <option value="İstek">💡 İstek</option>
              <option value="Öneri">✨ Öneri</option>
              <option value="Şikayet">⚠️ Şikayet</option>
              <option value="Teşekkür">❤️ Teşekkür</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="content">
              💬 Mesajınız <span className="required">*</span>
            </label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Lütfen detaylı yazınız..."
              required
            />
          </div>

          <button
            type="submit"
            className={`submit-btn ${status}`}
            disabled={loading || status === 'success'}
          >
            {loading ? (
              <>⏳ Gönderiliyor...</>
            ) : status === 'success' ? (
              <>✅ Gönderildi!</>
            ) : status === 'error' ? (
              <>❌ Hata!</>
            ) : (
              <>📤 Gönder</>
            )}
          </button>
        </form>

        {/* Notification */}
        {message && (
          <div className={`notification ${status}`}>
            {message}
          </div>
        )}
      </div>
      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .suggestion-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 8px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }

  .suggestion-container {
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 500px;
    width: 100%;
    padding: 20px 18px;
    animation: slideUp 0.5s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .header {
    text-align: center;
    margin-bottom: 16px;
  }

  .header-logo {
    width: 60px;
    height: 60px;
    object-fit: contain;
    margin: 0 auto 10px;
    display: block;
    border-radius: 10px;
  }

  .header-icon {
    font-size: 40px;
    margin-bottom: 8px;
  }

  .customer-badge {
    background: linear-gradient(135deg, #6c757d, #495057);
    color: white;
    padding: 6px 14px;
    border-radius: 18px;
    display: inline-block;
    margin-bottom: 10px;
    font-weight: 600;
    font-size: 13px;
  }

  .header h1 {
    color: #2c3e50;
    font-size: 18px;
    margin: 0 0 5px 0;
  }

  .header p {
    color: #7f8c8d;
    font-size: 13px;
    margin: 0;
  }

  .form-group {
    margin-bottom: 14px;
  }

  .form-group label {
    display: block;
    color: #2c3e50;
    font-weight: 600;
    margin-bottom: 6px;
    font-size: 13px;
  }

  .required {
    color: #e74c3c;
  }

  .form-group input,
  .form-group textarea,
  .form-group select {
    width: 100%;
    padding: 12px 14px;
    border: 2px solid #e0e0e0;
    border-radius: 10px;
    font-size: 14px;
    transition: all 0.3s ease;
    font-family: inherit;
    background: white;
  }

  .form-group input:focus,
  .form-group textarea:focus,
  .form-group select:focus {
    outline: none;
    border-color: #6c757d;
    box-shadow: 0 0 0 3px rgba(108, 117, 125, 0.1);
  }

  .form-group textarea {
    resize: vertical;
    min-height: 100px;
  }

  .submit-btn {
    background: linear-gradient(135deg, #6c757d, #495057);
    color: white;
    border: none;
    padding: 14px 20px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(108, 117, 125, 0.4);
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(108, 117, 125, 0.6);
  }

  .submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .submit-btn.success {
    background: linear-gradient(135deg, #27ae60, #2ecc71);
  }

  .submit-btn.error {
    background: linear-gradient(135deg, #e74c3c, #c0392b);
  }

  .notification {
    margin-top: 16px;
    padding: 14px 18px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 14px;
    text-align: center;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .notification.success {
    background: rgba(39, 174, 96, 0.15);
    color: #27ae60;
    border: 1px solid rgba(39, 174, 96, 0.3);
  }

  .notification.error {
    background: rgba(231, 76, 60, 0.15);
    color: #e74c3c;
    border: 1px solid rgba(231, 76, 60, 0.3);
  }

  .error-state {
    text-align: center;
    padding: 40px 20px;
  }

  .error-icon {
    font-size: 50px;
    margin-bottom: 16px;
  }

  .error-state h2 {
    color: #2c3e50;
    margin: 0 0 8px 0;
    font-size: 18px;
  }

  .error-state p {
    color: #7f8c8d;
    margin: 0;
    font-size: 14px;
  }

  @media (max-width: 480px) {
    .suggestion-page {
      padding: 4px;
    }

    .suggestion-container {
      padding: 16px 14px;
      border-radius: 14px;
    }

    .header h1 {
      font-size: 16px;
    }

    .header p {
      font-size: 12px;
    }

    .form-group input,
    .form-group textarea,
    .form-group select {
      padding: 10px 12px;
      font-size: 13px;
    }

    .submit-btn {
      padding: 12px 18px;
      font-size: 14px;
    }
  }
`;

export default function SuggestionPage() {
  return (
    <Suspense fallback={
      <div className="suggestion-page" style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: '#666', margin: 0 }}>Yükleniyor...</p>
        </div>
      </div>
    }>
      <SuggestionContent />
    </Suspense>
  );
}
