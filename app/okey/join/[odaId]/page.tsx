'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getOkeySignalRService } from '@/lib/okey/okeySignalR';

export default function OkeyJoinPage() {
  const params = useParams();
  const router = useRouter();
  const odaId = params.odaId as string;
  const [oyuncuAdi, setOyuncuAdi] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');

  const katil = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oyuncuAdi.trim()) {
      setHata('Lütfen takma adınızı girin');
      return;
    }

    setYukleniyor(true);
    setHata('');

    try {
      const signalRService = getOkeySignalRService();
      await signalRService.connect();

      // Önce odanın bilgisini al (venueCode için)
      const odaBilgisi = await signalRService.getOdaBilgisi(odaId);
      if (!odaBilgisi) {
        throw new Error('Oda bulunamadı');
      }

      const oyuncuId = `oyuncu-${Date.now()}`;
      await signalRService.odayaKatil(odaId, oyuncuId, oyuncuAdi);

      // Odanın venue code'una yönlendir
      window.location.href = `/${odaBilgisi.venueCode}?game=okey`;
    } catch (error: any) {
      setHata(error.message || 'Odaya katılınamadı');
      setYukleniyor(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="quiz-setup-modal" style={{ maxWidth: '400px', width: '100%' }}>
        <h2>🎲 Okey Oyununa Katıl</h2>
        <p style={{
          textAlign: 'center',
          color: '#95a5a6',
          fontSize: '14px',
          marginTop: '-10px',
          marginBottom: '20px',
          wordBreak: 'break-all'
        }}>
          Oda: <span style={{ color: '#3498db', fontFamily: 'monospace' }}>{odaId}</span>
        </p>

        <form onSubmit={katil}>
          <div className="quiz-form-group">
            <label htmlFor="nickname">Takma Ad</label>
            <input
              type="text"
              id="nickname"
              value={oyuncuAdi}
              onChange={(e) => setOyuncuAdi(e.target.value)}
              placeholder="Takma adınızı girin"
              maxLength={20}
              required
              autoFocus
              disabled={yukleniyor}
            />
          </div>

          {hata && (
            <div style={{
              padding: '12px',
              background: 'rgba(231, 76, 60, 0.1)',
              border: '1px solid rgba(231, 76, 60, 0.3)',
              borderRadius: '8px',
              marginBottom: '15px',
              color: '#e74c3c',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              {hata}
            </div>
          )}

          <button
            type="submit"
            className="quiz-create-game-btn"
            disabled={!oyuncuAdi.trim() || yukleniyor}
          >
            {yukleniyor ? 'Katılıyor...' : 'Odaya Katıl'}
          </button>

          <button
            type="button"
            onClick={() => window.history.back()}
            style={{
              width: '100%',
              marginTop: '10px',
              padding: '12px',
              background: '#34495e',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#2c3e50'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#34495e'}
          >
            ← Geri
          </button>
        </form>
      </div>
    </div>
  );
}
