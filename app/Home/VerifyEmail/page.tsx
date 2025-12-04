'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Email doğrulanıyor...');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      const code = searchParams.get('code');
      const table = searchParams.get('table');

      if (!token) {
        setStatus('error');
        setMessage('Geçersiz doğrulama linki');
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://canlimenu.online';
        const response = await fetch(
          `${apiUrl}/api/EndUser/verify-email?token=${encodeURIComponent(token)}`,
          { method: 'GET' }
        );

        const data = await response.json();

        if (data.success) {
          setStatus('success');
          setMessage('Email adresiniz başarıyla doğrulandı! 🎉');

          // 3 saniye sonra menüye yönlendir
          setTimeout(() => {
            if (code) {
              router.push(`/?code=${code}${table ? `&table=${table}` : ''}`);
            } else {
              router.push('/');
            }
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Doğrulama başarısız');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400 to-red-500 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Email Doğrulanıyor</h1>
            <p className="text-gray-600">Lütfen bekleyin...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">Başarılı!</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Menüye yönlendiriliyorsunuz...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Hata!</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition"
            >
              Ana Sayfaya Dön
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400 to-red-500 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Yükleniyor</h1>
        <p className="text-gray-600">Lütfen bekleyin...</p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
