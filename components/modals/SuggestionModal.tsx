'use client';

import { useState, FormEvent } from 'react';

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueCode?: string;
}

export default function SuggestionModal({ isOpen, onClose, venueCode }: SuggestionModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    newVenueRequest: '',
    type: '',
    content: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/suggestion/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: formData.name || 'Anonim',
          venueCode: venueCode || 'bilinmiyor',
          newVenueRequest: formData.newVenueRequest,
          suggestionType: formData.type,
          suggestionContent: formData.content,
          userAgent: navigator.userAgent,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitStatus('success');
        setTimeout(() => {
          onClose();
          setFormData({ name: '', newVenueRequest: '', type: '', content: '' });
          setSubmitStatus('idle');
        }, 2000);
      } else {
        setSubmitStatus('error');
        setTimeout(() => setSubmitStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Suggestion error:', error);
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(5px)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="suggestion-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          borderRadius: '20px',
          padding: '30px',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '24px', color: '#fff', fontWeight: 700 }}>
            💡 Öneri & Geri Bildirim
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#aaa' }}>
            Fikirleriniz bizim için değerli!
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc', fontWeight: 600 }}>
              İsim (Opsiyonel)
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Adınız"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
              }}
            />
          </div>

          {/* New Venue Request */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc', fontWeight: 600 }}>
              🏪 Görmek İstediğiniz Mekan
            </label>
            <input
              type="text"
              value={formData.newVenueRequest}
              onChange={(e) => setFormData({ ...formData, newVenueRequest: e.target.value })}
              placeholder="Örn: X Restoranı, Y Kafe..."
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Suggestion Type */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc', fontWeight: 600 }}>
              Kategori
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
              }}
            >
              <option value="">Seçiniz</option>
              <option value="suggestion">💡 Öneri</option>
              <option value="complaint">😞 Şikayet</option>
              <option value="compliment">😊 Teşekkür</option>
              <option value="feature">✨ Özellik İsteği</option>
              <option value="other">🔖 Diğer</option>
            </select>
          </div>

          {/* Content */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc', fontWeight: 600 }}>
              Mesajınız
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              placeholder="Düşüncelerinizi paylaşın..."
              rows={5}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || submitStatus !== 'idle'}
            style={{
              width: '100%',
              padding: '14px',
              background:
                submitStatus === 'success'
                  ? 'linear-gradient(135deg, #27ae60, #2ecc71)'
                  : submitStatus === 'error'
                  ? 'linear-gradient(135deg, #e74c3c, #c0392b)'
                  : isSubmitting
                  ? '#666'
                  : 'linear-gradient(135deg, #667eea, #764ba2)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: isSubmitting || submitStatus !== 'idle' ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              marginBottom: '10px',
            }}
          >
            {submitStatus === 'success' ? (
              <>
                <i className="fas fa-heart" style={{ marginRight: '8px' }}></i>
                Teşekkürler!
              </>
            ) : submitStatus === 'error' ? (
              <>
                <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                Hata!
              </>
            ) : isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                Gönderiliyor...
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane" style={{ marginRight: '8px' }}></i>
                Gönder
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ccc',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            İptal
          </button>
        </form>
      </div>
    </div>
  );
}
