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
      {/* Container for button + label */}
      <div
        style={{
          position: 'fixed',
          bottom: '70px',
          right: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 9998,
        }}
      >
        <button
          onClick={onClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            transform: isHovered ? 'scale(1.15)' : 'scale(1)',
            padding: 0,
          }}
          aria-label="AI Asistan"
        >
          {isOpen ? (
            <span style={{ fontSize: '32px' }}>✕</span>
          ) : (
            <span style={{ fontSize: '36px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>🤖</span>
          )}
        </button>

        {/* Label */}
        <span
          style={{
            marginTop: '4px',
            fontSize: '10px',
            fontWeight: 600,
            color: 'white',
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap',
          }}
        >
          {isOpen ? 'Kapat' : 'AI Asistan'}
        </span>
      </div>

    </>
  );
}
