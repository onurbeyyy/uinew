'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BottomNavBarProps {
  onProfileClick?: () => void;
  onAIClick?: () => void;
  onCartClick?: () => void;
  onWaiterCall?: () => void;
  onGameClick?: () => void;
  onContactClick?: () => void;
  onSuggestionClick?: () => void;
  showAIChat?: boolean;
  showCart?: boolean;
  showWaiterCall?: boolean;
  cartItemCount?: number;
  tableId?: string;
  phone?: string;
}

export default function BottomNavBar({
  onProfileClick,
  onAIClick,
  onCartClick,
  onWaiterCall,
  onGameClick,
  onContactClick,
  onSuggestionClick,
  showAIChat = true,
  showCart = true,
  showWaiterCall = false,
  cartItemCount = 0,
  tableId,
  phone,
}: BottomNavBarProps) {
  const [showWaiterModal, setShowWaiterModal] = useState(false);
  const { t } = useLanguage();

  const handleWaiterClick = () => {
    setShowWaiterModal(true);
  };

  const confirmWaiterCall = () => {
    setShowWaiterModal(false);
    if (onWaiterCall) {
      onWaiterCall();
    }
  };

  const NavButton = ({
    icon,
    label,
    onClick,
    gradient,
    top = '0',
    badge
  }: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    gradient: string;
    top?: string;
    badge?: number;
  }) => (
    <div
      className="nav-item"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
        padding: '8px',
        borderRadius: '12px',
        transition: 'all 0.3s ease',
        position: 'relative',
        top,
      }}
    >
      <div
        style={{
          width: top !== '0' ? '50px' : '32px',
          height: top !== '0' ? '50px' : '32px',
          background: gradient,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '4px',
          position: 'relative',
          boxShadow: top !== '0' ? '0 4px 15px rgba(102, 126, 234, 0.3)' : 'none',
        }}
      >
        {icon}
        {badge !== undefined && badge > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              background: '#dc3545',
              color: 'white',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 700,
              minWidth: '18px',
            }}
          >
            {badge}
          </div>
        )}
      </div>
      <span
        style={{
          fontSize: top !== '0' ? '11px' : '11px',
          color: top !== '0' ? '#667eea' : '#666',
          fontWeight: top !== '0' ? 600 : 500,
        }}
      >
        {label}
      </span>
    </div>
  );

  return (
    <>
      <div
        id="bottomNavBar"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '80px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(0, 0, 0, 0.1)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 999999,
          boxShadow: '0 -2px 20px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Profil Butonu */}
        <NavButton
          icon={
            <svg style={{ width: '18px', height: '18px', fill: 'white' }} viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          }
          label={t('profile')}
          onClick={onProfileClick}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />

        {/* AI Asistan */}
        {showAIChat && (
          <NavButton
            icon={
              <svg style={{ width: '18px', height: '18px', fill: 'white' }} viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
              </svg>
            }
            label={t('aiAssistant')}
            onClick={onAIClick}
            gradient="linear-gradient(135deg, #3498db 0%, #2980b9 100%)"
          />
        )}

        {/* Garson Çağır (sadece masa ID varsa) */}
        {showWaiterCall && tableId && (
          <NavButton
            icon={
              <svg style={{ width: '24px', height: '24px', fill: 'white' }} viewBox="0 0 24 24">
                <path d="M18.06 23H19.72C20.56 23 21.25 22.35 21.35 21.53L23 5.05H18V1H16.03V5.05H11.06L11.36 7.39C13.07 7.86 14.67 8.71 15.63 9.65C17.07 11.07 18.06 12.54 18.06 14.94V23M1 22V21H16.03V22C16.03 22.54 15.58 23 15.03 23H2C1.45 23 1 22.54 1 22M16.03 15C16.03 7 1 7 1 15H16.03M1 17H16V19H1V17Z" />
              </svg>
            }
            label={t('waiterCall')}
            onClick={handleWaiterClick}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            top="-15px"
          />
        )}

        {/* Oyun Butonu */}
        <NavButton
          icon={
            <svg style={{ width: '18px', height: '18px', fill: 'white' }} viewBox="0 0 24 24">
              <path d="M7.97,16L5,19C4.67,19.3 4.23,19.5 3.75,19.5A1.75,1.75 0 0,1 2,17.75V17.5L3,10.12C3.21,7.81 5.14,6 7.5,6H16.5C18.86,6 20.79,7.81 21,10.12L22,17.5V17.75A1.75,1.75 0 0,1 20.25,19.5C19.77,19.5 19.33,19.3 19,19L16.03,16H7.97M7.5,8A0.5,0.5 0 0,0 7,8.5A0.5,0.5 0 0,0 7.5,9A0.5,0.5 0 0,0 8,8.5A0.5,0.5 0 0,0 7.5,8M16.5,8A0.5,0.5 0 0,0 16,8.5A0.5,0.5 0 0,0 16.5,9A0.5,0.5 0 0,0 17,8.5A0.5,0.5 0 0,0 16.5,8M8.5,11A1.5,1.5 0 0,0 7,12.5A1.5,1.5 0 0,0 8.5,14A1.5,1.5 0 0,0 10,12.5A1.5,1.5 0 0,0 8.5,11M15.5,11A1.5,1.5 0 0,0 14,12.5A1.5,1.5 0 0,0 15.5,14A1.5,1.5 0 0,0 17,12.5A1.5,1.5 0 0,0 15.5,11M12,13C12.27,13 12.5,13.14 12.65,13.35L15,16H9L11.35,13.35C11.5,13.14 11.73,13 12,13Z" />
            </svg>
          }
          label={t('games')}
          onClick={onGameClick}
          gradient="linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)"
        />

        {/* İletişim / Sepet / Öneri */}
        {showCart ? (
          <NavButton
            icon={
              <svg style={{ width: '18px', height: '18px', fill: 'white' }} viewBox="0 0 24 24">
                <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z" />
              </svg>
            }
            label={t('cart')}
            onClick={onCartClick}
            gradient="linear-gradient(135deg, #28a745 0%, #20c997 100%)"
            badge={cartItemCount}
          />
        ) : phone ? (
          <NavButton
            icon={
              <svg style={{ width: '18px', height: '18px', fill: 'white' }} viewBox="0 0 24 24">
                <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z" />
              </svg>
            }
            label={t('callUs')}
            onClick={onContactClick}
            gradient="linear-gradient(135deg, #28a745 0%, #20c997 100%)"
          />
        ) : (
          <NavButton
            icon={
              <svg style={{ width: '18px', height: '18px', fill: 'white' }} viewBox="0 0 24 24">
                <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M6,9H18V11H6M14,14H6V12H14M18,8H6V6H18" />
              </svg>
            }
            label={t('sendSuggestion')}
            onClick={onSuggestionClick}
            gradient="linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)"
          />
        )}
      </div>

      {/* Garson Çağırma Onay Modal */}
      {showWaiterModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => setShowWaiterModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
              animation: 'slideUp 0.3s ease',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>🛎️</div>
            <h3
              style={{
                fontSize: '22px',
                color: '#2d3748',
                marginBottom: '15px',
                fontWeight: 600,
              }}
            >
              Garson Çağırılsın Mı?
            </h3>
            <p
              style={{
                color: '#718096',
                fontSize: '15px',
                marginBottom: '30px',
                lineHeight: 1.5,
              }}
            >
              Garsonunuz en kısa sürede masanıza gelecektir
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowWaiterModal(false)}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  background: '#e2e8f0',
                  color: '#4a5568',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                İptal
              </button>
              <button
                onClick={confirmWaiterCall}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(74, 222, 128, 0.3)',
                }}
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
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
      `}</style>
    </>
  );
}
