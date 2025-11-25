'use client';

import { useEffect, useState } from 'react';

export default function EmailVerifiedPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if email was verified
    const emailVerified = localStorage.getItem('menupark_emailVerified');

    if (emailVerified === 'true') {
      // Clear flag immediately
      localStorage.removeItem('menupark_emailVerified');

      // Show popup
      setShow(true);

      // Hide after 2 seconds
      setTimeout(() => {
        setShow(false);
      }, 2000);
    }
  }, []);

  if (!show) return null;

  return (
    <>
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          to {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
        }

        .email-verified-popup {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px 40px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          z-index: 100001;
          font-size: 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: slideDown 0.3s ease-out;
        }

        .email-verified-popup.hiding {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>

      <div className={`email-verified-popup ${!show ? 'hiding' : ''}`}>
        <span style={{ fontSize: '24px' }}>✓</span>
        <span>Email adresiniz başarıyla doğrulandı!</span>
      </div>
    </>
  );
}
