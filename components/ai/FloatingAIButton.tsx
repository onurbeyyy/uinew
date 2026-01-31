'use client';

import { useState } from 'react';

interface FloatingAIButtonProps {
  onClick: () => void;
  isOpen?: boolean;
}

export default function FloatingAIButton({ onClick, isOpen = false }: FloatingAIButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'fixed',
          bottom: '70px',
          right: '16px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: 'none',
          background: isOpen
            ? 'linear-gradient(135deg, #e53935 0%, #c62828 100%)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: isHovered
            ? '0 8px 25px rgba(102, 126, 234, 0.5)'
            : '0 4px 15px rgba(102, 126, 234, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
          transition: 'all 0.3s ease',
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        }}
        aria-label="AI Asistan"
      >
        {isOpen ? (
          // X (Close) icon
          <svg
            style={{ width: '24px', height: '24px', fill: 'white' }}
            viewBox="0 0 24 24"
          >
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        ) : (
          // AI/Robot icon - sparkle star design
          <svg
            style={{ width: '28px', height: '28px', fill: 'white' }}
            viewBox="0 0 24 24"
          >
            <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z" />
          </svg>
        )}
      </button>

      {/* Pulse animation when not open */}
      {!isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '70px',
            right: '16px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            opacity: 0.4,
            zIndex: 9997,
            animation: 'aiPulse 2s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      <style jsx>{`
        @keyframes aiPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.3);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
