'use client';

import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { QRCodeSVG } from 'qrcode.react';
import OkeyTile from './OkeyTile';
import { getOkeySignalRService, OkeyTasi, OkeyOda } from '@/lib/okey/okeySignalR';
import { useAuth } from '@/contexts/UserContext';
import { useMenu } from '@/contexts/MenuContext';

interface OkeyGameProps {
  customerCode: string;
  onBack?: () => void;
}

export default function OkeyGame({ customerCode, onBack }: OkeyGameProps) {
  const { currentUser } = useAuth();
  const { pendingJoinRoomId, setPendingJoinRoomId } = useMenu();

  // ========================================
  // 🔧 TEST MODU: Authentication kontrolü devre dışı
  // ========================================
  // const userNickname = currentUser?.nickName || currentUser?.nickname || '';
  const userNickname = `Oyuncu${Math.floor(Math.random() * 1000)}`; // TEST: Random nickname
  // ========================================

  const [baglantiDurumu, setBaglantiDurumu] = useState('Bağlanıyor...');
  const [oda, setOda] = useState<OkeyOda | null>(null);
  const [elimdekiTaslar, setElimdekiTaslar] = useState<OkeyTasi[]>([]);
  const [seciliTas, setSeciliTas] = useState<string | null>(null);

  // Stabil oyuncu ID - sessionStorage'dan al veya oluştur (her tab için farklı)
  const [oyuncuId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = sessionStorage.getItem('okey-oyuncu-id');
      if (!id) {
        id = `oyuncu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('okey-oyuncu-id', id);
      }
      console.log('🆔 Oyuncu ID:', id);
      return id;
    }
    return `oyuncu-${Date.now()}`;
  });

  const [oyuncuAdi, setOyuncuAdi] = useState(userNickname);
  const [odaAramaModunda, setOdaAramaModunda] = useState(true);

  // currentUser değiştiğinde oyuncuAdi'yi güncelle
  useEffect(() => {
    if (userNickname && !oyuncuAdi) {
      setOyuncuAdi(userNickname);
    }
  }, [userNickname, oyuncuAdi]);
  const [testModu, setTestModu] = useState(false);
  const [kalanTasSayisi, setKalanTasSayisi] = useState(0);
  const [atilanTaslar, setAtilanTaslar] = useState<OkeyTasi[]>([]);
  const [lobbyOdalari, setLobbyOdalari] = useState<OkeyOda[]>([]);
  const [linkKopyalandi, setLinkKopyalandi] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  const signalRService = getOkeySignalRService();

  // Ekran oryantasyonunu dinle
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Oyun modalı açıkken arka plan scroll'u engelle
  useEffect(() => {
    // Oyun başladığında veya test modundaysa body scroll'u kilitle
    if (!odaAramaModunda) {
      // Mevcut scroll pozisyonunu kaydet
      const scrollY = window.scrollY;

      // Body overflow'u kilitle
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      // Touch scroll'u da engelle (mobile)
      document.body.style.touchAction = 'none';

      return () => {
        // Cleanup: Kilidi kaldır
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.touchAction = '';

        // Scroll pozisyonunu geri yükle
        window.scrollTo(0, scrollY);
      };
    }
  }, [odaAramaModunda]);

  const linkKopyala = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setLinkKopyalandi(true);
      setTimeout(() => setLinkKopyalandi(false), 2000);
    } catch (err) {
      console.error('Link kopyalanamadı:', err);
    }
  };

  useEffect(() => {
    baglantiKur();

    return () => {
      signalRService.offAll();
    };
  }, []);

  // Pending join room kontrolü - link ile gelen kullanıcılar için
  useEffect(() => {
    if (pendingJoinRoomId && baglantiDurumu === 'Online' && oyuncuAdi && odaAramaModunda) {
      // Otomatik olarak odaya katıl
      console.log('🔗 Pending room bulundu, otomatik katılım yapılıyor:', pendingJoinRoomId);
      console.log('🔗 Oyuncu ID:', oyuncuId);
      console.log('🔗 Oyuncu Adı:', oyuncuAdi);

      odayaKatil(pendingJoinRoomId).then(() => {
        console.log('✅ Pending join: Odaya katılım başarılı');
      }).catch((err) => {
        console.error('❌ Pending join: Odaya katılım hatası:', err);
      });

      // Pending room ID'yi temizle
      setPendingJoinRoomId(null);
    }
  }, [pendingJoinRoomId, baglantiDurumu, oyuncuAdi, odaAramaModunda]);

  const baglantiKur = async () => {
    try {
      await signalRService.connect();

      // Lobby'ye katıl
      await signalRService.lobbyeKatil(customerCode);

      // Mevcut tüm odaları getir
      const mevcutOdalar = await signalRService.lobbyOdalariniGetir();
      setLobbyOdalari(mevcutOdalar);

      // Event dinleyicilerini kur
      signalRService.onOdaOlusturuldu((yeniOda) => {
        // Lobby'ye yeni oda eklendi
        setLobbyOdalari((prev) => [...prev, yeniOda]);
      });

      signalRService.onOyunBasladi((yeniOda) => {
        console.log('🎮 Oyun başladı!', yeniOda);
        console.log('👤 Benim oyuncu ID:', oyuncuId);

        setOda(yeniOda);
        setOdaAramaModunda(false);

        // Kendi taşlarımı bul
        const benimOyuncu = yeniOda.oyuncular.find((o) => o.id === oyuncuId);
        console.log('🔍 Bulunan oyuncu:', benimOyuncu);

        if (benimOyuncu) {
          console.log('🎴 Elimdeki taşlar:', benimOyuncu.istaka);
          setElimdekiTaslar(benimOyuncu.istaka);
        } else {
          console.error('❌ Oyuncu bulunamadı! Tüm oyuncular:', yeniOda.oyuncular.map(o => ({ id: o.id, ad: o.ad })));
        }

        // Lobby'den kaldır (oyun başladı)
        setLobbyOdalari((prev) => prev.filter((o) => o.id !== yeniOda.id));
      });

      signalRService.onTasCekildi((tas) => {
        console.log('🎴 Taş çekildi:', tas);
        setElimdekiTaslar((prev) => [...prev, tas]);
      });

      signalRService.onSonTasAlindi((alanOyuncuId, tas) => {
        console.log('📥 Son taş alındı:', { alanOyuncuId, tas });

        // Eğer ben aldıysam, elime ekle
        if (alanOyuncuId === oyuncuId) {
          setElimdekiTaslar((prev) => [...prev, tas]);
        }

        // Atılan taşlardan son taşı çıkar
        setOda((prevOda) => {
          if (!prevOda) return prevOda;
          const yeniAtilanTaslar = [...(prevOda.atilanTaslar || [])];
          yeniAtilanTaslar.pop();
          return {
            ...prevOda,
            atilanTaslar: yeniAtilanTaslar
          };
        });
      });

      signalRService.onTasAtildi((oyuncuId, tas, yeniSira) => {
        if (oda) {
          // Atılan taşı listeye ekle
          const yeniAtilanTaslar = [...(oda.atilanTaslar || []), tas];
          setOda({
            ...oda,
            sirasiGelen: yeniSira,
            atilanTaslar: yeniAtilanTaslar
          });
        }
      });

      signalRService.onOyuncuKatildi((guncellenenOda) => {
        console.log('👥 Oyuncu katıldı event\'i geldi:', guncellenenOda);
        setOda(guncellenenOda);

        // Eğer oyun "Oynuyor" durumundaysa (4. oyuncu katıldı ve oyun başladı)
        if (guncellenenOda.durum === 'Oynuyor') {
          console.log('🎮 Oyun zaten başlamış, taşları yükleniyor...');
          setOdaAramaModunda(false);

          // Kendi taşlarımı bul
          const benimOyuncu = guncellenenOda.oyuncular.find((o) => o.id === oyuncuId);
          console.log('🔍 (OyuncuKatildi) Bulunan oyuncu:', benimOyuncu);

          if (benimOyuncu) {
            console.log('🎴 (OyuncuKatildi) Elimdeki taşlar:', benimOyuncu.istaka);
            setElimdekiTaslar(benimOyuncu.istaka);
          }
        }

        // Lobby'deki odayı güncelle
        setLobbyOdalari((prev) =>
          prev.map((o) => (o.id === guncellenenOda.id ? guncellenenOda : o))
        );
      });

      signalRService.onOyuncuAyrildi((ayrilanOyuncuId) => {
        console.log('👋 Oyuncu ayrıldı:', ayrilanOyuncuId);
        // Odadan oyuncuyu çıkar
        if (oda) {
          const yeniOyuncular = oda.oyuncular.filter((o) => o.id !== ayrilanOyuncuId);
          setOda({
            ...oda,
            oyuncular: yeniOyuncular
          });
        }
      });

      signalRService.onOyunBitti((data) => {
        console.log('🎉 Oyun bitti:', data);
        alert(`🎉 ${data.message}`);
        // Oyun bittiğinde oda durumunu güncelle
        if (oda) {
          setOda({
            ...oda,
            durum: 'Bitti'
          });
        }
      });

      signalRService.onHata((hata) => {
        console.error('❌ Hata:', hata);
        alert(`❌ ${hata}`);
      });

      // ÖNEMLI: Event listener'lar kurulduktan SONRA durumu Online yap
      // Böylece pending join çalıştığında event'leri alabilir
      console.log('✅ Event listener\'lar kuruldu, durum Online yapılıyor');
      setBaglantiDurumu('Online');
    } catch (error) {
      console.error('Bağlantı hatası:', error);
      setBaglantiDurumu('Bağlantı Hatası');
    }
  };

  const odaOlustur = async () => {
    if (!oyuncuAdi.trim()) {
      alert('Lütfen isminizi girin');
      return;
    }

    try {
      const yeniOda = await signalRService.odaOlustur(oyuncuId, oyuncuAdi, customerCode);
      setOda(yeniOda);
      setOdaAramaModunda(false);
    } catch (error: any) {
      alert('Oda oluşturulamadı: ' + error.message);
    }
  };

  const odayaKatil = async (odaId: string) => {
    if (!oyuncuAdi.trim()) {
      alert('Lütfen önce takma adınızı girin');
      return;
    }

    try {
      console.log('📞 odayaKatil çağrılıyor:', { odaId, oyuncuId, oyuncuAdi });
      await signalRService.odayaKatil(odaId, oyuncuId, oyuncuAdi);
      console.log('✅ odayaKatil başarılı - bekleme ekranına geçiliyor...');

      // Lobby'den katıldığında direkt bekleme ekranına git
      setOdaAramaModunda(false);
    } catch (error: any) {
      console.error('❌ odayaKatil hatası:', error);
      alert('Odaya katılınamadı: ' + error.message);
    }
  };

  const testTaslariniDagit = async () => {
    try {
      const taslar = await signalRService.testTaslarDagit(oyuncuId);
      // Her taşa benzersiz dndId ekle (drag & drop için gerekli)
      const taslarDndId = taslar.map((tas, index) => ({
        ...tas,
        dndId: `tas-${tas.id}-${index}-${Date.now()}`
      }));
      setElimdekiTaslar(taslarDndId);
      setOdaAramaModunda(false);
      setTestModu(true);

      // Kalan taş sayısını al
      const kalanSayi = await signalRService.testKalanTasSayisi(oyuncuId);
      setKalanTasSayisi(kalanSayi);
    } catch (error: any) {
      alert('Taşlar dağıtılamadı: ' + error.message);
    }
  };

  const testTasCek = async () => {
    try {
      // Elinde 15 taş varsa çekemesin (Okey kuralı)
      if (elimdekiTaslar.length >= 15) {
        alert('Elinde zaten 15 taş var! Önce bir taş atmalısın.');
        return;
      }

      const yeniTas = await signalRService.testTasCek(oyuncuId);
      if (yeniTas) {
        // Yeni taşa dndId ekle ve listeye ekle
        const tasWithDndId = {
          ...yeniTas,
          dndId: `tas-${yeniTas.id}-${Date.now()}`
        };
        setElimdekiTaslar((prev) => [...prev, tasWithDndId]);

        // Kalan taş sayısını güncelle
        const kalanSayi = await signalRService.testKalanTasSayisi(oyuncuId);
        setKalanTasSayisi(kalanSayi);
      } else {
        alert('Destede taş kalmadı!');
      }
    } catch (error: any) {
      alert('Taş çekilemedi: ' + error.message);
    }
  };

  // Çift tıklama ile taş atma
  const handleDoubleClick = async (tas: any) => {
    try {
      // Sunucuya taş atma isteği gönder
      await signalRService.testTasAt(oyuncuId, tas.id);

      // Taşı elden çıkar
      setElimdekiTaslar((prev) => prev.filter((t: any) => t.dndId !== tas.dndId));

      // Atılan taşlara ekle
      setAtilanTaslar((prev) => [...prev, tas]);
    } catch (error: any) {
      alert('Taş atılamadı: ' + error.message);
    }
  };

  // Sürükle-bırak bittiğinde çalışacak fonksiyon
  const onDragEnd = (result: DropResult) => {
    // Destination yoksa iptal et
    if (!result.destination) return;

    const { source, destination } = result;

    // Istaka içinde sıralama
    if (source.droppableId === 'istaka-test' && destination.droppableId === 'istaka-test') {
      const yeniTaslar = Array.from(elimdekiTaslar);
      const [tasinanTas] = yeniTaslar.splice(source.index, 1);
      yeniTaslar.splice(destination.index, 0, tasinanTas);
      setElimdekiTaslar(yeniTaslar);
    }

    // Istakadan atılan taşlara sürükleme
    if (source.droppableId === 'istaka-test' && destination.droppableId === 'atilan-taslar') {
      const yeniTaslar = Array.from(elimdekiTaslar);
      const [atilanTas] = yeniTaslar.splice(source.index, 1);

      // Sunucuya bildir
      signalRService.testTasAt(oyuncuId, atilanTas.id).catch((err) => {
        console.error('Taş atma hatası:', err);
      });

      setElimdekiTaslar(yeniTaslar);
      setAtilanTaslar((prev) => [...prev, atilanTas]);
    }
  };

  const tasCek = async () => {
    if (!oda || oda.durum !== 'Oynuyor') return;

    const benimSiramMi = oda.oyuncular.findIndex((o) => o.id === oyuncuId) === oda.sirasiGelen;
    if (!benimSiramMi) {
      alert('Şu an senin sıran değil!');
      return;
    }

    // Okey kuralı: Elinde 14 taş varken taş çekersin (15 olur)
    if (elimdekiTaslar.length !== 14) {
      alert('Elinde 14 taş olmalı!');
      return;
    }

    try {
      await signalRService.tasCek(oda.id, oyuncuId);
    } catch (error: any) {
      alert('Taş çekilemedi: ' + error.message);
    }
  };

  const sonTasiAl = async () => {
    if (!oda || oda.durum !== 'Oynuyor') return;

    const benimSiramMi = oda.oyuncular.findIndex((o) => o.id === oyuncuId) === oda.sirasiGelen;
    if (!benimSiramMi) {
      alert('Şu an senin sıran değil!');
      return;
    }

    // Okey kuralı: Elinde 14 taş olmalı
    if (elimdekiTaslar.length !== 14) {
      alert('Elinde 14 taş olmalı!');
      return;
    }

    // Atılan taş olmalı
    if (!oda.atilanTaslar || oda.atilanTaslar.length === 0) {
      alert('Atılan taş yok!');
      return;
    }

    try {
      await signalRService.sonTasiAl(oda.id, oyuncuId);
    } catch (error: any) {
      alert('Son taş alınamadı: ' + error.message);
    }
  };

  const tasAt = async () => {
    if (!oda || !seciliTas || oda.durum !== 'Oynuyor') return;

    const benimSiramMi = oda.oyuncular.findIndex((o) => o.id === oyuncuId) === oda.sirasiGelen;
    if (!benimSiramMi) {
      alert('Şu an senin sıran değil!');
      return;
    }

    // Okey kuralı: Taş atmadan önce elinde 15 taş olmalı
    // (taş çekmiş veya son taşı almış olmalısın)
    if (elimdekiTaslar.length !== 15) {
      alert('Önce desteden taş çek veya atılan son taşı al!');
      return;
    }

    try {
      await signalRService.tasAt(oda.id, oyuncuId, seciliTas);
      setElimdekiTaslar((prev) => prev.filter((t) => t.id !== seciliTas));
      setSeciliTas(null);
    } catch (error: any) {
      alert('Taş atılamadı: ' + error.message);
    }
  };

  const eliBitir = async () => {
    if (!oda || oda.durum !== 'Oynuyor') return;

    // Okey kuralı: 14 taş olmalı (son taş atılmış)
    if (elimdekiTaslar.length !== 14) {
      alert('Eli bitirmek için 14 taşın olmalı!');
      return;
    }

    const onay = confirm('Elinizi bitirmek istediğinizden emin misiniz?');
    if (!onay) return;

    try {
      await signalRService.eliBitir(oda.id, oyuncuId);
    } catch (error: any) {
      alert('Hata: ' + error.message);
    }
  };

  // Taş joker mi kontrol et
  const tasJokerMi = (tas: OkeyTasi): boolean => {
    if (!oda) return false;
    // Sahte joker'lar zaten sahteJoker=true ile işaretli
    if (tas.sahteJoker) return true;
    // Gerçek joker: göstergenin bir sonraki sayısı ve aynı rengi
    return tas.renk === oda.jokerRengi && tas.sayi === oda.jokerSayisi;
  };

  // Taşları otomatik sırala (renge ve sayıya göre)
  const taslariSirala = () => {
    const renkSirasi: any = { 'kirmizi': 1, 'siyah': 2, 'mavi': 3, 'sari': 4, 'joker': 5 };
    const siraliTaslar = [...elimdekiTaslar].sort((a, b) => {
      // Önce renge göre sırala
      const renkFark = renkSirasi[a.renk] - renkSirasi[b.renk];
      if (renkFark !== 0) return renkFark;
      // Aynı renkteyse sayıya göre sırala
      return a.sayi - b.sayi;
    });
    setElimdekiTaslar(siraliTaslar);
  };

  // Oda arama ekranı (RPS/Quiz stilinde)
  if (odaAramaModunda) {
    // ========================================
    // 🔧 TEST MODU: Giriş kontrolü devre dışı
    // ========================================
    // // Giriş yapmamışsa uyar
    // if (!userNickname) {
    //   return (
    //     <div className="quiz-setup-modal">
    //       <h2>🔒 Giriş Gerekli</h2>
    //       <div style={{
    //         textAlign: 'center',
    //         padding: '40px 20px',
    //         color: '#95a5a6'
    //       }}>
    //         <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎲</div>
    //         <p style={{ fontSize: '16px', marginBottom: '10px', color: '#ecf0f1' }}>
    //           Okey oyununa katılmak için giriş yapmalısınız
    //         </p>
    //         <p style={{ fontSize: '14px', color: '#7f8c8d' }}>
    //           Sadece kayıtlı kullanıcılar oyun oluşturabilir ve katılabilir
    //         </p>
    //       </div>
    //       {onBack && (
    //         <button
    //           type="button"
    //           onClick={onBack}
    //           className="quiz-create-game-btn"
    //         >
    //           ← Geri Dön
    //         </button>
    //       )}
    //     </div>
    //   );
    // }
    // ========================================

    return (
      <div className="quiz-setup-modal">
        <h2>🎲 Okey Oyunu</h2>
        <p style={{ textAlign: 'center', color: '#95a5a6', fontSize: '14px', marginTop: '-10px', marginBottom: '20px' }}>
          4 kişilik çok oyunculu Okey
        </p>

        <form onSubmit={(e) => { e.preventDefault(); odaOlustur(); }}>
          <div className="quiz-form-group">
            <label htmlFor="nickname">Oyuncu Adı</label>
            <input
              type="text"
              id="nickname"
              value={oyuncuAdi}
              onChange={(e) => setOyuncuAdi(e.target.value)}
              placeholder="Oyuncu adınızı girin"
              // ========================================
              // 🔧 TEST MODU: Input aktif (disabled kaldırıldı)
              // ========================================
              // disabled
              // style={{
              //   background: 'rgba(255, 255, 255, 0.05)',
              //   cursor: 'not-allowed',
              //   opacity: 0.7
              // }}
            />
          </div>

          {/* Oyun Modu Seçimi */}
          <div className="rps-mode-container">
            <div className="rps-mode-title">Oyun Modu</div>
            <div className="rps-mode-buttons">
              <button
                type="button"
                className="rps-mode-btn active"
                style={{ cursor: 'default' }}
              >
                🎮 4 Oyunculu Oda
              </button>
              <button
                type="button"
                className="rps-mode-btn"
                onClick={testTaslariniDagit}
              >
                🧪 Test Modu
              </button>
            </div>
          </div>

          {/* Aktif Odalar */}
          {lobbyOdalari.length > 0 && (
            <div className="quiz-options">
              <div className="rps-mode-title" style={{ marginBottom: '10px' }}>
                🎮 Aktif Odalar
              </div>
              {lobbyOdalari
                .filter(o => o.durum === 'Bekliyor') // Sadece bekleyen odaları göster
                .map((lobbyOda) => (
                  <div
                    key={lobbyOda.id}
                    className="quiz-player-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 15px',
                      marginBottom: '8px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#2c3e50' }}>
                        {lobbyOda.id}
                      </div>
                      <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '2px' }}>
                        👥 {lobbyOda.oyuncular.length}/4 oyuncu
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => odayaKatil(lobbyOda.id)}
                      disabled={!oyuncuAdi.trim() || lobbyOda.oyuncular.length >= 4}
                      style={{
                        padding: '8px 16px',
                        background: lobbyOda.oyuncular.length >= 4 ? '#95a5a6' : '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: lobbyOda.oyuncular.length >= 4 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (lobbyOda.oyuncular.length < 4) {
                          e.currentTarget.style.background = '#2980b9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (lobbyOda.oyuncular.length < 4) {
                          e.currentTarget.style.background = '#3498db';
                        }
                      }}
                    >
                      {lobbyOda.oyuncular.length >= 4 ? 'Dolu' : 'Katıl'}
                    </button>
                  </div>
                ))}
            </div>
          )}

          {/* Okey Bilgileri */}
          <div className="quiz-options">
            <div style={{
              background: 'rgba(46, 204, 113, 0.1)',
              padding: '15px',
              borderRadius: '8px',
              borderLeft: '4px solid #2ecc71'
            }}>
              <p style={{ margin: '5px 0', fontSize: '14px', color: '#7f8c8d' }}>
                🎯 106 taş ile geleneksel Okey oyunu
              </p>
              <p style={{ margin: '5px 0', fontSize: '14px', color: '#7f8c8d' }}>
                👥 4 oyuncu masa etrafında
              </p>
              <p style={{ margin: '5px 0', fontSize: '14px', color: '#7f8c8d' }}>
                🃏 Gösterge taşı ve joker sistemi
              </p>
              <p style={{ margin: '5px 0', fontSize: '14px', color: '#7f8c8d' }}>
                🎲 Sürükle-bırak ile taş sıralama
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="quiz-create-game-btn"
            disabled={!oyuncuAdi.trim() || baglantiDurumu !== 'Online'}
          >
            {baglantiDurumu === 'Online' ? 'Yeni Oda Oluştur' : 'Bağlanıyor...'}
          </button>

          {onBack && (
            <button
              type="button"
              onClick={() => {
                // State'leri temizle
                setOda(null);
                setElimdekiTaslar([]);
                setSeciliTas(null);
                setOdaAramaModunda(true);
                setLobbyOdalari([]);
                onBack();
              }}
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
              ← Geri Dön
            </button>
          )}
        </form>

        <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '12px', color: '#95a5a6' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: 'rgba(46, 204, 113, 0.1)',
            borderRadius: '20px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              background: baglantiDurumu === 'Online' ? '#2ecc71' : '#e74c3c',
              borderRadius: '50%',
              animation: baglantiDurumu === 'Online' ? 'pulse 2s infinite' : 'none'
            }}></span>
            {baglantiDurumu}
          </span>
        </div>
      </div>
    );
  }

  // TEST MODU EKRANI - Yatay Tasarım
  if (testModu && !odaAramaModunda) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0
      }}>
        {/* Ana Container - Oryantasyona göre döner */}
        <div style={{
          width: isLandscape ? '100vw' : '100vh',
          height: isLandscape ? '100vh' : '100vw',
          transform: isLandscape ? 'none' : 'rotate(90deg)',
          transformOrigin: 'center center',
          position: 'absolute',
          top: '50%',
          left: '50%',
          marginTop: isLandscape ? '-50vh' : '-50vw',
          marginLeft: isLandscape ? '-50vw' : '-50vh'
        }}>
          <div className="h-full w-full bg-green-900 flex overflow-hidden relative">
            {/* Sol Taraf - Istaka */}
        <div className="w-2/3 flex flex-col">
          {/* Üst Bilgi */}
          <div className="bg-black/30 p-2 flex justify-between text-white text-xs">
            <span>Durum: {baglantiDurumu}</span>
            <span className="text-yellow-400">🧪 TEST MODU</span>
            <span>El: {elimdekiTaslar.length} | Deste: {kalanTasSayisi} | Atılan: {atilanTaslar.length}</span>
          </div>

          {/* ISTAKA ALANI - Sürükle Bırak */}
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex-1 bg-amber-800 p-3 shadow-[0_-4px_10px_rgba(0,0,0,0.5)] flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <p className="text-amber-200 text-sm font-bold tracking-widest">TAŞLARI SÜRÜKLE VE SIRALA</p>
              </div>

              {/* Taşlar Yatay Dizilim - Droppable */}
              <Droppable droppableId="istaka-test" direction="horizontal">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex gap-2 overflow-x-auto pb-2 items-center h-full scrollbar-hide min-h-[90px]"
                  >
                    {elimdekiTaslar.map((tas: any, index: number) => (
                      <Draggable key={tas.dndId} draggableId={tas.dndId} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onDoubleClick={() => handleDoubleClick(tas)}
                            className={`flex-shrink-0 transition-all cursor-pointer ${
                              snapshot.isDragging ? 'z-50 scale-110 drop-shadow-2xl rotate-3' : 'hover:scale-105'
                            }`}
                            style={{
                              ...provided.draggableProps.style,
                            }}
                            title="Çift tıkla veya sürükleyip ortaya at"
                          >
                            <OkeyTile
                              renk={tas.renk}
                              sayi={tas.sayi}
                              sahteJoker={tas.sahteJoker}
                              isJoker={tasJokerMi(tas)}
                              secili={false}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* ATILAN TAŞLAR ALANI */}
            <div className="bg-green-700 border-t-4 border-green-800 p-2 shadow-[0_-4px_10px_rgba(0,0,0,0.3)]">
              <p className="text-green-200 text-xs font-bold tracking-widest mb-1 text-center">ATILAN TAŞLAR</p>
              <Droppable droppableId="atilan-taslar" direction="horizontal">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex gap-1 overflow-x-auto pb-1 items-center scrollbar-hide min-h-[60px] justify-center border-2 border-dashed rounded ${
                      snapshot.isDraggingOver ? 'border-yellow-400 bg-yellow-500/10' : 'border-green-500/30'
                    }`}
                  >
                    {atilanTaslar.length === 0 ? (
                      <p className="text-green-400/50 text-xs italic">Taşları buraya sürükle veya çift tıkla</p>
                    ) : (
                      atilanTaslar.slice(-8).map((tas: any, index: number) => (
                        <div key={`atilan-${tas.dndId}-${index}`} className="flex-shrink-0 opacity-70 scale-75">
                          <OkeyTile renk={tas.renk} sayi={tas.sayi} sahteJoker={tas.sahteJoker} isJoker={tasJokerMi(tas)} secili={false} />
                        </div>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </DragDropContext>
        </div>

        {/* Sağ Taraf - Masa Ortası + Test Bilgisi */}
        <div className="w-1/3 flex flex-col items-center justify-start p-4 bg-green-800 overflow-y-auto">
          {/* Orta Deste - TAŞ ÇEK */}
          <div className="mb-6 mt-4">
            <p className="text-white/70 text-xs mb-2 text-center">Orta Deste</p>
            <div
              onClick={testTasCek}
              className="group cursor-pointer relative select-none"
            >
              {/* 3 Katmanlı Kart Efekti */}
              <div className="w-20 h-28 md:w-24 md:h-32 bg-stone-200 rounded-lg border border-stone-400 shadow-xl absolute top-2 left-2"></div>
              <div className="w-20 h-28 md:w-24 md:h-32 bg-stone-200 rounded-lg border border-stone-400 shadow-xl absolute top-1 left-1"></div>

              {/* En Üstteki Kart (Tıklanabilir) */}
              <div className="w-20 h-28 md:w-24 md:h-32 bg-stone-100 rounded-lg border-2 border-stone-400 flex flex-col items-center justify-center shadow-2xl relative active:translate-y-1 transition-transform hover:bg-stone-50">
                <span className="text-stone-400 font-bold text-3xl md:text-4xl">+</span>
                <div className="absolute bottom-2 text-[10px] md:text-xs text-stone-500 font-bold">TAŞ ÇEK</div>
              </div>
            </div>
            <p className="text-white/60 text-xs mt-2 text-center">Kalan: {kalanTasSayisi}</p>
          </div>

          {/* Test Bilgisi */}
          <div className="text-center">
            <div className="text-4xl mb-3">🧪</div>
            <h2 className="text-white text-lg font-bold mb-2">TEST MODU</h2>
            <p className="text-white/70 text-xs mb-3">Sunucu 106 taş oluşturdu, karıştırdı ve sana 14 taş dağıttı.</p>
            <div className="bg-black/30 rounded-lg p-3 mb-3">
              <p className="text-yellow-400 text-[10px] mb-1">✓ Sunucu tarafında oluşturuldu</p>
              <p className="text-yellow-400 text-[10px] mb-1">✓ Fisher-Yates karıştırma</p>
              <p className="text-yellow-400 text-[10px] mb-1">✓ İlk 14 taş dağıtıldı</p>
              <p className="text-green-400 text-[10px] font-bold">✓ Sürükle-bırak aktif!</p>
            </div>
            <div className="bg-green-700/30 rounded-lg p-2 mb-3 border-2 border-green-500/30">
              <p className="text-white text-[10px] mb-1 font-bold">🎮 Kontroller:</p>
              <p className="text-white text-[10px] mb-1">🖱️ <strong>Sürükle:</strong> Taşları sırala</p>
              <p className="text-white text-[10px] mb-1">👆 <strong>Çift Tıkla:</strong> Taşı at</p>
              <p className="text-white text-[10px]">🎯 <strong>Sürükle-At:</strong> Yeşil alana bırak</p>
            </div>
            {onBack && (
              <button
                onClick={() => {
                  // State'leri temizle
                  setOda(null);
                  setElimdekiTaslar([]);
                  setSeciliTas(null);
                  setOdaAramaModunda(true);
                  setTestModu(false);
                  setLobbyOdalari([]);
                  onBack();
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg font-semibold transition-all"
              >
                ← Geri Dön
              </button>
            )}
          </div>
        </div>
          </div>
        </div>
      </div>
    );
  }

  // Oyun ekranı - RPS/Quiz stilinde bekleme ekranı
  const benimOyuncu = oda?.oyuncular.find((o) => o.id === oyuncuId);
  const benimSiramMi = oda ? oda.oyuncular.findIndex((o) => o.id === oyuncuId) === oda.sirasiGelen : false;

  // Bekleme durumu (4 oyuncu toplanmadı) - Normal Görünüm (Düz)
  if (oda && oda.durum === 'Bekliyor') {
    const joinUrl = `${window.location.origin}/${customerCode}?joinRoom=${oda.id}`;

    return (
      <div className="rps-game-container">
        {/* Room Info with QR Code */}
        {oda.id && (
          <div className="rps-room-info">
            <div style={{ marginBottom: '20px', fontSize: '16px', fontWeight: '600' }}>
              Arkadaşlarınızı Davet Edin
            </div>

            {/* QR Code */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '10px',
              padding: '15px',
              background: 'white',
              borderRadius: '12px',
              display: 'inline-block'
            }}>
              <QRCodeSVG
                value={joinUrl}
                size={150}
                level="H"
                includeMargin={true}
              />
            </div>

            {/* Join Link */}
            <div
              onClick={() => linkKopyala(joinUrl)}
              style={{
                marginTop: '15px',
                padding: '10px 15px',
                background: linkKopyalandi ? 'rgba(46, 204, 113, 0.15)' : 'rgba(52, 152, 219, 0.1)',
                borderRadius: '8px',
                border: linkKopyalandi ? '1px solid rgba(46, 204, 113, 0.5)' : '1px solid rgba(52, 152, 219, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!linkKopyalandi) {
                  e.currentTarget.style.background = 'rgba(52, 152, 219, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!linkKopyalandi) {
                  e.currentTarget.style.background = 'rgba(52, 152, 219, 0.1)';
                }
              }}
            >
              <div style={{
                fontSize: '11px',
                color: '#95a5a6',
                marginBottom: '5px',
                textAlign: 'center'
              }}>
                {linkKopyalandi ? '✓ Kopyalandı!' : 'Katılım Linki (tıkla & kopyala):'}
              </div>
              <div style={{
                fontSize: '12px',
                color: linkKopyalandi ? '#2ecc71' : '#3498db',
                wordBreak: 'break-all',
                textAlign: 'center',
                fontFamily: 'monospace'
              }}>
                {joinUrl}
              </div>
            </div>
          </div>
        )}

        {/* Waiting Section */}
        <div className="rps-waiting-section" style={{ display: 'block' }}>
          <div className="rps-waiting-text">
            Diğer oyuncuların katılması bekleniyor...
          </div>
          <div className="rps-spinner"></div>
        </div>

        {/* Players Section - Quiz stilinde */}
        {oda.oyuncular.length > 0 && (
          <div className="quiz-players-section" style={{ marginTop: '30px' }}>
            <div className="quiz-players-title">
              Katılımcılar ({oda.oyuncular.length}/4)
            </div>
            <div className="quiz-players-list">
              {oda.oyuncular.map((oyuncu: any) => (
                <div key={oyuncu.id} className="quiz-player-item">
                  <div className="quiz-player-avatar">
                    {oyuncu.ad.charAt(0).toUpperCase()}
                  </div>
                  <div className="quiz-player-name">{oyuncu.ad}</div>
                  {oyuncu.id === oyuncuId && (
                    <div className="quiz-player-badge">Siz</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div style={{
          marginTop: '30px',
          padding: '15px',
          background: 'rgba(46, 204, 113, 0.1)',
          borderRadius: '8px',
          borderLeft: '4px solid #2ecc71',
          maxWidth: '400px',
          margin: '30px auto 0'
        }}>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#bdc3c7', textAlign: 'center' }}>
            🎯 4 oyuncu toplandığında oyun otomatik başlayacak
          </p>
        </div>

        {/* Back Button */}
        {onBack && (
          <button
            onClick={() => {
              // State'leri temizle
              setOda(null);
              setElimdekiTaslar([]);
              setSeciliTas(null);
              setOdaAramaModunda(true);
              setLobbyOdalari([]);
              onBack();
            }}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
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
            ← Geri Dön
          </button>
        )}
      </div>
    );
  }

  // Oyun başladı - Yatay Tasarım (90° döndürülmüş)
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      {/* Ana Container - Oryantasyona göre döner */}
      <div style={{
        width: isLandscape ? '100vw' : '100vh',
        height: isLandscape ? '100vh' : '100vw',
        transform: isLandscape ? 'none' : 'rotate(90deg)',
        transformOrigin: 'center center',
        background: 'linear-gradient(135deg, #2d5f3f 0%, #1a3d26 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: isLandscape ? '-50vh' : '-50vw',
        marginLeft: isLandscape ? '-50vw' : '-50vh'
      }}>
        {/* Üst Bar */}
        <div style={{
          height: '50px',
          background: 'rgba(0, 0, 0, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 15px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <button
            style={{
              padding: '8px 15px',
              background: 'rgba(100, 100, 100, 0.5)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '5px',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            ⚙️ AYARLAR
          </button>

          {/* Oyun Durumu */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px'
          }}>
            <div style={{
              color: benimSiramMi ? '#ffd700' : 'white',
              fontSize: '11px',
              fontWeight: '700'
            }}>
              {benimSiramMi ? '⭐ SENİN SIRAN' : 'SIRA BEKLENİYOR'}
            </div>
            <div style={{
              color: elimdekiTaslar.length === 14 ? '#3498db' : elimdekiTaslar.length === 15 ? '#e74c3c' : 'white',
              fontSize: '10px',
              fontWeight: '600'
            }}>
              {elimdekiTaslar.length === 14 && benimSiramMi && '📥 TAŞ ÇEK'}
              {elimdekiTaslar.length === 15 && benimSiramMi && '📤 TAŞ AT'}
              {!benimSiramMi && `🎴 ${elimdekiTaslar.length} TAŞ`}
            </div>
          </div>

          <div style={{
            color: 'white',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🟢 ONLINE
          </div>

          {onBack && (
            <button
              onClick={() => {
                // State'leri temizle
                setOda(null);
                setElimdekiTaslar([]);
                setSeciliTas(null);
                setOdaAramaModunda(true);
                setLobbyOdalari([]);

                // Oyunu kapat
                onBack();
              }}
              style={{
                padding: '8px 15px',
                background: '#d32f2f',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              YENİ OYUN
            </button>
          )}
        </div>

        {/* Ana Oyun Alanı */}
        <div style={{
          flex: 1,
          display: 'flex',
          position: 'relative'
        }}>
          {/* Masa Ortası */}
          <div style={{
            flex: 1,
            background: 'radial-gradient(circle, rgba(45, 95, 63, 0.9) 0%, rgba(26, 61, 38, 1) 100%)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Üst Oyuncu */}
            {oda && oda.oyuncular[1] && (
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(0, 0, 0, 0.6)',
                padding: '8px 15px',
                borderRadius: '10px',
                border: oda.sirasiGelen === 1 ? '2px solid #ffd700' : '2px solid rgba(255, 255, 255, 0.2)'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '700'
                }}>
                  {oda.oyuncular[1].ad.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
                    {oda.oyuncular[1].ad}
                  </div>
                  <div style={{ color: '#ffd700', fontSize: '10px' }}>
                    🎴 {oda.oyuncular[1].istaka.length}
                  </div>
                </div>
              </div>
            )}

            {/* Sol Oyuncu */}
            {oda && oda.oyuncular[2] && (
              <div style={{
                position: 'absolute',
                left: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(0, 0, 0, 0.6)',
                padding: '8px 15px',
                borderRadius: '10px',
                border: oda.sirasiGelen === 2 ? '2px solid #ffd700' : '2px solid rgba(255, 255, 255, 0.2)'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '700'
                }}>
                  {oda.oyuncular[2].ad.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
                    {oda.oyuncular[2].ad}
                  </div>
                  <div style={{ color: '#ffd700', fontSize: '10px' }}>
                    🎴 {oda.oyuncular[2].istaka.length}
                  </div>
                </div>
              </div>
            )}

            {/* Sağ Oyuncu */}
            {oda && oda.oyuncular[3] && (
              <div style={{
                position: 'absolute',
                right: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(0, 0, 0, 0.6)',
                padding: '8px 15px',
                borderRadius: '10px',
                border: oda.sirasiGelen === 3 ? '2px solid #ffd700' : '2px solid rgba(255, 255, 255, 0.2)'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '700'
                }}>
                  {oda.oyuncular[3].ad.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
                    {oda.oyuncular[3].ad}
                  </div>
                  <div style={{ color: '#ffd700', fontSize: '10px' }}>
                    🎴 {oda.oyuncular[3].istaka.length}
                  </div>
                </div>
              </div>
            )}

            {/* Orta - Gösterge Taşı, Atılan Taşlar ve Deste */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '30px'
            }}>
              {/* Gösterge Taşı */}
              {oda && oda.gostergeTasi && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ transform: 'scale(2)', marginBottom: '20px' }}>
                    <OkeyTile
                      renk={oda.gostergeTasi.renk as any}
                      sayi={oda.gostergeTasi.sayi}
                      sahteJoker={oda.gostergeTasi.sahteJoker}
                      isJoker={false}
                    />
                  </div>
                  <div style={{
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '700',
                    background: 'rgba(0, 0, 0, 0.5)',
                    padding: '5px 10px',
                    borderRadius: '5px'
                  }}>
                    🃏 {oda.jokerRengi} {oda.jokerSayisi}
                  </div>
                </div>
              )}

              {/* Atılan Taşlar Alanı */}
              <div style={{ textAlign: 'center' }}>
                <div
                  onClick={() => {
                    // Sıra bendeyse ve 14 taşım varsa son taşı alabilirim
                    if (benimSiramMi && elimdekiTaslar.length === 14 && oda.atilanTaslar && oda.atilanTaslar.length > 0) {
                      sonTasiAl();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!benimSiramMi || !seciliTas) return;

                    // Seçili taşı at
                    tasAt();
                  }}
                  style={{
                    minWidth: '120px',
                    minHeight: '140px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: benimSiramMi && elimdekiTaslar.length === 14 && oda.atilanTaslar && oda.atilanTaslar.length > 0
                      ? '3px solid rgba(46, 204, 113, 0.6)'
                      : '3px dashed rgba(255, 255, 255, 0.3)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    padding: '10px',
                    cursor: benimSiramMi && elimdekiTaslar.length === 14 && oda.atilanTaslar && oda.atilanTaslar.length > 0 ? 'pointer' : 'default',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {oda && oda.atilanTaslar && oda.atilanTaslar.length > 0 ? (
                    <div style={{ transform: 'scale(1.3)' }}>
                      <OkeyTile
                        renk={oda.atilanTaslar[oda.atilanTaslar.length - 1].renk as any}
                        sayi={oda.atilanTaslar[oda.atilanTaslar.length - 1].sayi}
                        sahteJoker={oda.atilanTaslar[oda.atilanTaslar.length - 1].sahteJoker}
                        isJoker={tasJokerMi(oda.atilanTaslar[oda.atilanTaslar.length - 1])}
                      />
                    </div>
                  ) : (
                    <div style={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '12px',
                      textAlign: 'center'
                    }}>
                      Buraya<br/>sürükle
                    </div>
                  )}
                </div>
                {benimSiramMi && elimdekiTaslar.length === 14 && oda.atilanTaslar && oda.atilanTaslar.length > 0 && (
                  <div style={{
                    marginTop: '8px',
                    color: '#2ecc71',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    👆 Tıkla & Al
                  </div>
                )}
              </div>

              {/* Deste */}
              <button
                onClick={tasCek}
                disabled={!benimSiramMi || oda?.durum !== 'Oynuyor'}
                style={{
                  width: '100px',
                  height: '140px',
                  background: 'white',
                  border: '3px solid #333',
                  borderRadius: '8px',
                  cursor: benimSiramMi ? 'pointer' : 'not-allowed',
                  position: 'relative',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                  opacity: benimSiramMi ? 1 : 0.5,
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (benimSiramMi) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '48px',
                  fontWeight: '700',
                  color: '#333'
                }}>
                  {oda?.ortaYigin.length || 0}
                </div>
              </button>
            </div>
          </div>

          {/* Sağ Panel - Oyun Butonları */}
          <div style={{
            width: '120px',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '15px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {/* Okey Bitti Butonu */}
            <button
              onClick={eliBitir}
              disabled={elimdekiTaslar.length !== 14 || oda?.durum !== 'Oynuyor'}
              style={{
                padding: '12px 8px',
                background: elimdekiTaslar.length === 14 && oda?.durum === 'Oynuyor'
                  ? 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)'
                  : 'rgba(100, 100, 100, 0.3)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '11px',
                cursor: elimdekiTaslar.length === 14 && oda?.durum === 'Oynuyor' ? 'pointer' : 'not-allowed',
                fontWeight: '700',
                boxShadow: elimdekiTaslar.length === 14 && oda?.durum === 'Oynuyor'
                  ? '0 0 15px rgba(46, 204, 113, 0.5)'
                  : 'none',
                opacity: elimdekiTaslar.length === 14 && oda?.durum === 'Oynuyor' ? 1 : 0.5
              }}
            >
              🎉 OKEY BİTTİ
            </button>

          </div>
        </div>

        {/* Alt Kısım - İstaka (İki Sıralı) */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(139, 87, 42, 1) 0%, rgba(101, 67, 33, 1) 100%)',
          padding: '15px 20px',
          height: '200px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          borderTop: '3px solid rgba(101, 67, 33, 0.8)',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)'
        }}>
          {/* Üst Sıra */}
          <div style={{
            display: 'flex',
            gap: '5px',
            height: '80px',
            alignItems: 'center',
            padding: '5px 10px',
            background: 'rgba(0, 0, 0, 0.1)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              gap: '5px',
              overflowX: 'auto',
              overflowY: 'hidden',
              flex: 1
            }}>
              {elimdekiTaslar.length === 0 ? (
                <div style={{
                  flex: 1,
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '12px'
                }}>
                  {benimSiramMi ? 'Taş çekmek için desteden çek' : 'Sıranızı bekleyin'}
                </div>
              ) : (
                elimdekiTaslar.slice(0, Math.ceil(elimdekiTaslar.length / 2)).map((tas, index) => (
                  <div
                    key={tas.id}
                    draggable={benimSiramMi}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('tasIndex', index.toString());
                      e.dataTransfer.effectAllowed = 'move';
                      setSeciliTas(tas.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const dragIndex = parseInt(e.dataTransfer.getData('tasIndex'));
                      if (dragIndex !== index && !isNaN(dragIndex)) {
                        const yeniTaslar = [...elimdekiTaslar];
                        const [tasinanTas] = yeniTaslar.splice(dragIndex, 1);
                        yeniTaslar.splice(index, 0, tasinanTas);
                        setElimdekiTaslar(yeniTaslar);
                      }
                    }}
                    style={{
                      flexShrink: 0,
                      cursor: benimSiramMi ? 'grab' : 'default',
                      opacity: benimSiramMi ? 1 : 0.8,
                      userSelect: 'none',
                      WebkitUserSelect: 'none'
                    }}
                    onClick={() => {
                      if (benimSiramMi) {
                        setSeciliTas(seciliTas === tas.id ? null : tas.id);
                      }
                    }}
                  >
                    <OkeyTile
                      renk={tas.renk}
                      sayi={tas.sayi}
                      sahteJoker={tas.sahteJoker}
                      isJoker={tasJokerMi(tas)}
                      secili={seciliTas === tas.id}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Alt Sıra + Kontroller */}
          <div style={{
            display: 'flex',
            gap: '5px',
            height: '80px',
            alignItems: 'center',
            padding: '5px 10px',
            background: 'rgba(0, 0, 0, 0.1)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              gap: '5px',
              overflowX: 'auto',
              overflowY: 'hidden',
              flex: 1
            }}>
              {elimdekiTaslar.length > Math.ceil(elimdekiTaslar.length / 2) && (
                elimdekiTaslar.slice(Math.ceil(elimdekiTaslar.length / 2)).map((tas, index) => {
                  const realIndex = Math.ceil(elimdekiTaslar.length / 2) + index;
                  return (
                    <div
                      key={tas.id}
                      draggable={benimSiramMi}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('tasIndex', realIndex.toString());
                        e.dataTransfer.effectAllowed = 'move';
                        setSeciliTas(tas.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const dragIndex = parseInt(e.dataTransfer.getData('tasIndex'));
                        if (dragIndex !== realIndex && !isNaN(dragIndex)) {
                          const yeniTaslar = [...elimdekiTaslar];
                          const [tasinanTas] = yeniTaslar.splice(dragIndex, 1);
                          yeniTaslar.splice(realIndex, 0, tasinanTas);
                          setElimdekiTaslar(yeniTaslar);
                        }
                      }}
                      style={{
                        flexShrink: 0,
                        cursor: benimSiramMi ? 'grab' : 'default',
                        opacity: benimSiramMi ? 1 : 0.8,
                        userSelect: 'none',
                        WebkitUserSelect: 'none'
                      }}
                      onClick={() => {
                        if (benimSiramMi) {
                          setSeciliTas(seciliTas === tas.id ? null : tas.id);
                        }
                      }}
                    >
                      <OkeyTile
                        renk={tas.renk}
                        sayi={tas.sayi}
                        sahteJoker={tas.sahteJoker}
                        isJoker={tasJokerMi(tas)}
                        secili={seciliTas === tas.id}
                      />
                    </div>
                  );
                })
              )}
            </div>

            {/* Kontrol Butonları */}
            <div style={{ display: 'flex', gap: '5px', marginLeft: 'auto' }}>
              {elimdekiTaslar.length > 0 && (
                <button
                  onClick={taslariSirala}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(52, 152, 219, 0.8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '10px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🔄 SIRALA
                </button>
              )}
              {seciliTas && benimSiramMi && (
                <button
                  onClick={tasAt}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(231, 76, 60, 0.9)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '10px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🗑️ AT
                </button>
              )}
            </div>
          </div>
        </div>
      {/* Döndürülmüş container kapanış */}
      </div>
    </div>
  );
}
