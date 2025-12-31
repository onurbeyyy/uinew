'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/UserContext';
import { useMenu } from '@/contexts/MenuContext';

interface RaffleModalProps {
  isOpen: boolean;
  onClose: () => void;
  raffleId: number;
  raffleTitle?: string;
  prizeDescription?: string;
  prizeImage?: string;
}

export default function RaffleModal({
  isOpen,
  onClose,
  raffleId,
  raffleTitle,
  prizeDescription,
  prizeImage
}: RaffleModalProps) {
  const { currentUser, refreshUserProfile } = useAuth();
  const { openProfile } = useMenu();
  const [isLoading, setIsLoading] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [needsPhone, setNeedsPhone] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [checkingParticipation, setCheckingParticipation] = useState(true);

  // Katılım durumunu kontrol et
  useEffect(() => {
    if (isOpen && currentUser && raffleId) {
      checkParticipation();
    }
  }, [isOpen, currentUser, raffleId]);

  // Telefon numarası kontrolü
  useEffect(() => {
    if (currentUser) {
      const phone = currentUser.phoneNumber;
      setNeedsPhone(!phone || phone === '' || phone.startsWith('TEMP_'));
    }
  }, [currentUser]);

  const checkParticipation = async () => {
    if (!currentUser) return;

    setCheckingParticipation(true);
    try {
      const response = await fetch(
        `/api/advertisements/check-participation?raffleId=${raffleId}&endUserId=${currentUser.id}`
      );
      const data = await response.json();

      if (data.success) {
        setHasJoined(data.hasJoined);
      }
    } catch (err) {
      console.error('Katılım kontrolü hatası:', err);
    } finally {
      setCheckingParticipation(false);
    }
  };

  const handlePhoneUpdate = async () => {
    if (!phoneNumber) {
      setError('Telefon numarası zorunludur');
      return false;
    }

    if (phoneNumber.length !== 11) {
      setError('Telefon numarası 11 haneli olmalıdır (05XXXXXXXXX)');
      return false;
    }

    if (!phoneNumber.startsWith('05')) {
      setError('Telefon numarası 05 ile başlamalıdır');
      return false;
    }

    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await refreshUserProfile();
        setNeedsPhone(false);
        return true;
      } else {
        setError(data.message || 'Telefon numarası kaydedilemedi');
        return false;
      }
    } catch (err) {
      setError('Bir hata oluştu');
      return false;
    }
  };

  const handleJoinRaffle = async () => {
    if (!currentUser) {
      setError('Çekilişe katılmak için giriş yapmalısınız');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Telefon numarası güncelleme gerekiyorsa
      if (needsPhone && phoneNumber) {
        const phoneUpdated = await handlePhoneUpdate();
        if (!phoneUpdated) {
          setIsLoading(false);
          return;
        }
      }

      const token = localStorage.getItem('userToken');
      const response = await fetch('/api/advertisements/join-raffle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          raffleId,
          endUserId: currentUser.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Çekilişe başarıyla katıldınız!');
        setHasJoined(true);
      } else if (data.alreadyJoined) {
        setHasJoined(true);
        setError('Bu çekilişe zaten katıldınız');
      } else if (data.needsPhone) {
        setNeedsPhone(true);
        setError('Çekilişe katılmak için telefon numaranızı kaydetmeniz gerekiyor');
      } else {
        setError(data.message || 'Çekilişe katılırken bir hata oluştu');
      }
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  // Giriş yapılmamışsa profil modalını aç
  useEffect(() => {
    if (isOpen && !currentUser) {
      onClose();
      openProfile();
    }
  }, [isOpen, currentUser, onClose, openProfile]);

  if (!isOpen || !currentUser) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
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
          maxWidth: '450px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Kapatma butonu */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            color: 'white',
            fontSize: '20px',
          }}
        >
          ×
        </button>

        {/* Başlık */}
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h2 style={{ color: 'white', fontSize: '24px', margin: 0 }}>
            {raffleTitle || 'Çekiliş'}
          </h2>
        </div>

        {/* Ödül açıklaması */}
        {prizeDescription && (
          <div
            style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '15px',
              marginBottom: '20px',
            }}
          >
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '5px' }}>
              ÖDÜL
            </div>
            <div style={{ color: 'white', fontSize: '16px', fontWeight: 600 }}>
              {prizeDescription}
            </div>
          </div>
        )}

        {/* Yükleniyor */}
        {checkingParticipation ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ color: 'rgba(255,255,255,0.7)' }}>Kontrol ediliyor...</div>
          </div>
        ) : hasJoined ? (
          /* Zaten katılmış */
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '15px',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>✓</div>
              <div style={{ color: 'white', fontSize: '18px', fontWeight: 600 }}>
                Çekilişe Katıldınız!
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '5px' }}>
                Sonuçlar için takipte kalın
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '12px 30px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              Kapat
            </button>
          </div>
        ) : (
          /* Katılım formu */
          <div>
            {/* Telefon numarası gerekiyorsa */}
            {needsPhone && (
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '14px',
                    marginBottom: '8px',
                  }}
                >
                  Telefon Numaranız
                </label>
                <input
                  type="tel"
                  placeholder="05XX XXX XX XX"
                  value={phoneNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setPhoneNumber(value);
                  }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '16px',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'white',
                    textAlign: 'center',
                    letterSpacing: '2px',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '5px' }}>
                  Çekilişe katılmak için telefon numaranız gereklidir
                </div>
              </div>
            )}

            {/* Hata mesajı */}
            {error && (
              <div
                style={{
                  background: 'rgba(231, 76, 60, 0.2)',
                  border: '1px solid rgba(231, 76, 60, 0.5)',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '15px',
                  color: '#e74c3c',
                  fontSize: '14px',
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}

            {/* Başarı mesajı */}
            {success && (
              <div
                style={{
                  background: 'rgba(46, 204, 113, 0.2)',
                  border: '1px solid rgba(46, 204, 113, 0.5)',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '15px',
                  color: '#2ecc71',
                  fontSize: '14px',
                  textAlign: 'center',
                }}
              >
                {success}
              </div>
            )}

            {/* Katıl butonu */}
            <button
              onClick={handleJoinRaffle}
              disabled={isLoading || (needsPhone && !phoneNumber)}
              style={{
                width: '100%',
                padding: '16px',
                background: isLoading
                  ? 'rgba(255,255,255,0.2)'
                  : 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: isLoading ? 'none' : '0 4px 15px rgba(243, 156, 18, 0.4)',
              }}
            >
              {isLoading ? 'Katılınıyor...' : 'Katıl'}
            </button>

            {/* Bilgilendirme */}
            <div
              style={{
                marginTop: '15px',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '12px',
                textAlign: 'center',
              }}
            >
              Katılarak çekiliş kurallarını kabul etmiş olursunuz
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
