'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/UserContext';

interface PhoneNumberModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PhoneNumberModal({ onClose, onSuccess }: PhoneNumberModalProps) {
  const { currentUser, refreshUserProfile } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Telefon numarası varsa modalı gösterme
  useEffect(() => {
    if (currentUser?.phoneNumber && !currentUser.phoneNumber.startsWith('TEMP_')) {
      onClose();
    }
  }, [currentUser?.phoneNumber, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validasyon
    if (!phoneNumber) {
      setError('Telefon numarası zorunludur');
      return;
    }

    if (phoneNumber.length !== 11) {
      setError('Telefon numarası 11 haneli olmalıdır (05XXXXXXXXX)');
      return;
    }

    if (!phoneNumber.startsWith('05')) {
      setError('Telefon numarası 05 ile başlamalıdır');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await refreshUserProfile();
        onSuccess?.();
        onClose();
      } else {
        setError(data.message || 'Telefon numarası kaydedilemedi');
      }
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '20px',
          padding: '30px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Kapatma Butonu */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '20px',
            transition: 'all 0.2s ease',
          }}
        >
          ×
        </button>

        {/* Başlık */}
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>📱</div>
          <h2 style={{
            color: 'white',
            fontSize: '22px',
            fontWeight: 700,
            margin: 0,
            marginBottom: '10px'
          }}>
            Telefon Numaranızı Ekleyin
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '14px',
            margin: 0,
            lineHeight: 1.5
          }}>
            Kampanya ve çekilişlerden haberdar olmak için telefon numaranızı kaydedin.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="tel"
              placeholder="05XX XXX XX XX"
              value={phoneNumber}
              onChange={(e) => {
                // Sadece rakam kabul et
                const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                setPhoneNumber(value);
              }}
              style={{
                width: '100%',
                padding: '15px 20px',
                fontSize: '18px',
                fontWeight: 600,
                letterSpacing: '2px',
                textAlign: 'center',
                border: error ? '2px solid #ff6b6b' : '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
              }}
            />
            {error && (
              <p style={{
                color: '#ff6b6b',
                fontSize: '13px',
                marginTop: '8px',
                textAlign: 'center'
              }}>
                {error}
              </p>
            )}
          </div>

          {/* Kaydet Butonu */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '16px',
              fontWeight: 700,
              color: 'white',
              background: isLoading
                ? 'rgba(255, 255, 255, 0.2)'
                : 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
              border: 'none',
              borderRadius: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isLoading ? 'none' : '0 4px 15px rgba(243, 156, 18, 0.4)',
            }}
          >
            {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>

          {/* Daha Sonra */}
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '12px',
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.6)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Daha sonra
          </button>
        </form>
      </div>
    </div>
  );
}
