'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useMenu } from '@/contexts/MenuContext';
import { useTable } from '@/contexts/TableContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/UserContext';
import { useSignalR } from '@/hooks/useSignalR';
import BannerModal from '@/components/layout/BannerModal';
import LoadingScreen from '@/components/layout/LoadingScreen';
import LanguageSelector from '@/components/layout/LanguageSelector';
import HeaderTabs from '@/components/home/HeaderTabs';
import CategoryGrid from '@/components/home/CategoryGrid';
import BottomNavBar from '@/components/layout/BottomNavBar';
import ProductListModal from '@/components/modals/ProductListModal';
import ProductDetailModal from '@/components/modals/ProductDetailModal';
import GameModal from '@/components/modals/GameModal';
import CartSidebar from '@/components/cart/CartSidebar';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import AIChatSidebar from '@/components/ai/AIChatSidebar';
import SuggestionModal from '@/components/modals/SuggestionModal';
import EmailVerifiedPopup from '@/components/notifications/EmailVerifiedPopup';
import WaiterCallRateLimitModal from '@/components/modals/WaiterCallRateLimitModal';
import TableOrdersModal from '@/components/modals/TableOrdersModal';
import ImagePreloadContainer from '@/components/common/ImagePreloadContainer';
import type { MenuDto, CustomerInfoResponse, CategoryDto, Advertisement } from '@/types/api';

export default function CustomerMenu() {
  const params = useParams();
  const searchParams = useSearchParams();
  const code = params.code as string;
  const tableParam = searchParams.get('table');
  const sessionParam = searchParams.get('session');
  const joinRoomParam = searchParams.get('joinRoom');
  const joinBackgammonParam = searchParams.get('joinBackgammon');

  const { isTableMode, isSelfService, canCallWaiter, tableId: tableContextId } = useTable();
  const { language } = useLanguage();
  const { currentUser } = useAuth();

  const {
    setMenuData,
    setCustomerData: setCustomerDataContext,
    setCategoriesData: setCategoriesDataContext,
    setCustomerCode,
    setTableId,
    tableId,
    setProductTokenSettings,
    setPortionTokenSettings,
    setUserTokenBalance,
    setPopularProductIds,
    isGameModalOpen,
    activeGame,
    openGameModal,
    closeProductListModal,
    closeProductDetailModal,
    closeGameModal,
    setPendingJoinRoomId,
    isProfileOpen,
    openProfile,
    closeProfile,
    canUseBasket,
    basketDisabledMessage
  } = useMenu();

  // Table context -> Menu context senkronizasyonu
  useEffect(() => {
    if (tableContextId && tableContextId !== tableId) {
      setTableId(tableContextId);
    }
  }, [tableContextId, tableId, setTableId]);

  // 🪙 Token settings - isTableMode true olduğunda yükle (cookie'den gelen dahil)
  useEffect(() => {
    const loadTokenSettings = async () => {
      if (!isTableMode || !code) return;

      try {
        const tokenResponse = await fetch(`/api/token-settings/${code}`);
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          const productMap: Record<number, any> = {};
          const portionMap: Record<number, any> = {};

          tokenData.settings.forEach((setting: any) => {
            if (setting.sambaPortionId) {
              portionMap[setting.sambaPortionId] = setting;
            } else {
              if (setting.productId) productMap[setting.productId] = setting;
              if (setting.sambaProductId) productMap[setting.sambaProductId] = setting;
            }
          });

          setProductTokenSettings(productMap);
          setPortionTokenSettings(portionMap);
        }
      } catch (err) {
        console.error('Token settings yükleme hatası:', err);
      }
    };

    loadTokenSettings();
  }, [isTableMode, code, setProductTokenSettings, setPortionTokenSettings]);

  // 🪙 User token balance - giriş yapılmışsa yükle (cached - 60 saniye)
  useEffect(() => {
    const loadUserTokenBalance = async () => {
      if (!isTableMode || !currentUser) return;

      try {
        const userId = currentUser.id || currentUser.userId || currentUser.Id;
        if (!userId) return;

        // localStorage cache kontrolü (60 saniye)
        const cacheKey = `tokenBalance_${userId}_${code}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { balance, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 60000) { // 60 saniye
            setUserTokenBalance(balance);
            return;
          }
        }

        const response = await fetch(`/api/user/token-balance?userId=${userId}&customerCode=${code}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && typeof data.balance === 'number') {
            setUserTokenBalance(data.balance);
            // Cache'e kaydet
            localStorage.setItem(cacheKey, JSON.stringify({ balance: data.balance, timestamp: Date.now() }));
          }
        }
      } catch {
        // Sessizce başarısız ol
      }
    };

    loadUserTokenBalance();
  }, [isTableMode, currentUser, setUserTokenBalance, code]);

  const [showBanner, setShowBanner] = useState(false);
  const [menuDataLocal, setMenuDataLocal] = useState<MenuDto | null>(null);
  const [customerData, setCustomerData] = useState<CustomerInfoResponse | null>(null);
  const [categoriesData, setCategoriesData] = useState<CategoryDto[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[] | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [isTableOrdersModalOpen, setIsTableOrdersModalOpen] = useState(false);
  const [rateLimitModal, setRateLimitModal] = useState<{
    isOpen: boolean;
    errorMessage: string;
    remainingSeconds: number;
    isRegistered: boolean;
  }>({
    isOpen: false,
    errorMessage: '',
    remainingSeconds: 0,
    isRegistered: false,
  });

  // 🪑 Masa ismi - cookie'den gelen tableId için sorgulanır
  useEffect(() => {
    const loadTableName = async () => {
      // tableContextId varsa ve localStorage'da masa ismi yoksa sorgula
      if (!tableContextId || !customerData?.customer?.id) return;

      const savedTableName = localStorage.getItem('currentTableName');
      if (savedTableName) return; // Zaten var

      try {
        const tablesResponse = await fetch(`/api/tables/${customerData.customer.id}`);
        if (tablesResponse.ok) {
          const tables = await tablesResponse.json();
          const matchedTable = tables.find(
            (t: { secureId?: string }) => t.secureId?.toLowerCase() === tableContextId.toLowerCase()
          );
          if (matchedTable) {
            const tableName = matchedTable.name || matchedTable.tableName || tableContextId;
            localStorage.setItem('currentTableName', tableName);
          }
        }
      } catch {
        // Sessizce başarısız ol
      }
    };

    loadTableName();
  }, [tableContextId, customerData]);

  // 📊 Ziyaret kaydı fonksiyonu (30 dk içinde tekrar sayma)
  const trackVisit = (customerId: number) => {
    try {
      const storageKey = `menuVisit_${customerId}`;
      const lastVisit = localStorage.getItem(storageKey);
      const now = Date.now();

      // Son 5 dakika içinde ziyaret varsa tekrar sayma
      if (lastVisit) {
        const lastTime = parseInt(lastVisit, 10);
        const diffMinutes = (now - lastTime) / (1000 * 60);
        if (diffMinutes < 5) {
          return; // 5 dk geçmemiş, sayma
        }
      }

      // Session ID oluştur veya mevcut olanı kullan
      let sessionId = localStorage.getItem('menuSessionId');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem('menuSessionId', sessionId);
      }

      // Arka planda API'ye gönder (beklemeden)
      fetch(`/api/visit?customerId=${customerId}&sessionId=${sessionId}`)
        .then(() => {
          // Başarılı olursa son ziyaret zamanını kaydet
          localStorage.setItem(storageKey, now.toString());
        })
        .catch(() => {
          // Hata olursa sessizce devam et
        });
    } catch {
      // localStorage hatası olursa sessizce devam et
    }
  };

  // Dinamik sayfa başlığı
  useEffect(() => {
    if (customerData?.customer?.name) {
      document.title = `${customerData.customer.name} | Dijital Menü`;
    }
  }, [customerData?.customer?.name]);

  // 🧹 Normal menüye girildiğinde self-service session'ını temizle
  useEffect(() => {
    if (typeof window !== 'undefined' && code) {
      const STORAGE_KEY = `selfservice_session_${code}`;
      const TIMESTAMP_KEY = `selfservice_session_time_${code}`;

      const hadSession = localStorage.getItem(STORAGE_KEY);
      if (hadSession) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TIMESTAMP_KEY);
      }
    }
  }, [code]);

  // 🔗 SignalR: Token balance güncelleme callback'i
  const handleTokenBalanceUpdated = useCallback((data: { userId: number; currentTokens: number; message: string }) => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      const currentUserId = user.id || user.userId || user.Id;

      if (currentUserId && currentUserId === data.userId) {
        setUserTokenBalance(data.currentTokens);
        if (data.message) {
          window.dispatchEvent(new CustomEvent('tokenBalanceUpdated', {
            detail: { balance: data.currentTokens, message: data.message }
          }));
        }
      }
    }
  }, [setUserTokenBalance]);

  // 📦 Sipariş oluşturuldu callback'i
  const handleOrderCreated = useCallback((data: any) => {
    if (data.orderNumber) {
      window.dispatchEvent(new CustomEvent('orderCreated', { detail: data }));
    }
  }, []);

  // ✅ Sipariş onaylandı callback'i
  const handleOrderApproved = useCallback((data: {
    orderId: number;
    orderNumber: string;
    endUserId: number;
    earnedTokens?: number;
    newBalance?: number;
    message?: string;
  }) => {
    // Jeton bakiyesini güncelle
    if (data.newBalance !== undefined) {
      setUserTokenBalance(data.newBalance);
    }

    // Bildirim göster
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: linear-gradient(135deg, #4CAF50, #2e7d32); color: white; padding: 25px 35px; border-radius: 20px; text-align: center; z-index: 100000; font-size: 16px; font-weight: 600; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3); animation: fadeIn 0.3s ease;">
        <div style="font-size: 48px; margin-bottom: 15px;">✅</div>
        <div style="font-size: 20px; margin-bottom: 10px;">Siparişiniz Onaylandı!</div>
        <div style="font-size: 16px; opacity: 0.9;">Sipariş No: ${data.orderNumber}</div>
        ${data.earnedTokens ? `<div style="margin-top: 15px; padding: 10px 20px; background: rgba(255,255,255,0.2); border-radius: 10px; font-size: 18px;">🎁 +${data.earnedTokens} jeton kazandınız!</div>` : ''}
        ${data.newBalance !== undefined ? `<div style="margin-top: 8px; font-size: 14px; opacity: 0.8;">Toplam bakiye: ${data.newBalance} jeton</div>` : ''}
      </div>
    `;
    document.body.appendChild(notification);

    // 5 saniye sonra kaldır
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }
    }, 5000);

    // Event dispatch et (diğer bileşenler için)
    window.dispatchEvent(new CustomEvent('orderApproved', { detail: data }));
  }, [setUserTokenBalance]);

  // Kullanıcı ID'sini al
  const currentEndUserId = currentUser?.id || currentUser?.userId || currentUser?.Id;

  // 🔗 SignalR bağlantısı
  useSignalR({
    customerId: customerData?.customer.id,
    customerCode: code,
    endUserId: currentEndUserId,
    onTokenBalanceUpdated: handleTokenBalanceUpdated,
    onOrderCreated: handleOrderCreated,
    onOrderApproved: handleOrderApproved,
    enabled: !!customerData?.customer.id,
  });

  useEffect(() => {
    if (tableParam) {
      setTableId(tableParam);
      setTimeout(() => {
        const url = new URL(window.location.href);
        if (url.searchParams.has('table')) {
          url.searchParams.delete('table');
          window.history.replaceState({}, '', url.toString());
        }
      }, 100);
    }

    if (sessionParam) {
      // Self-service session varsa self sayfasına yönlendir
      window.location.href = `/${code}/self?session=${sessionParam}`;
      return;
    }
  }, [tableParam, sessionParam, setTableId, code]);

  // Toast'tan sepete git
  useEffect(() => {
    const handleOpenCart = () => setIsCartOpen(true);
    window.addEventListener('openCart', handleOpenCart);
    return () => window.removeEventListener('openCart', handleOpenCart);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        setInitialLoading(true);
        setCustomerCode(code);

        // ═══════════════════════════════════════════════════════════
        // AŞAMA 1: Müşteri bilgisi (3 deneme)
        // ═══════════════════════════════════════════════════════════
        let customerResponse: Response | null = null;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            customerResponse = await fetch(`/api/customer/${code}`);
            if (customerResponse.ok) break;
            lastError = new Error('Müşteri bilgisi yüklenemedi');
          } catch (err) {
            lastError = err instanceof Error ? err : new Error('Bağlantı hatası');
          }

          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        if (!customerResponse?.ok) throw lastError || new Error('Müşteri bilgisi yüklenemedi');

        const customerInfo = await customerResponse.json();
        setCustomerData(customerInfo);
        setCustomerDataContext(customerInfo);

        // ═══════════════════════════════════════════════════════════
        // AŞAMA 2: Kategoriler + Reklamları al
        // ═══════════════════════════════════════════════════════════
        const normalizeUrl = (url: string): string => {
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            const cleanPath = url.startsWith('Uploads/') ? url.substring('Uploads/'.length) : url;
            return `https://apicanlimenu.online/Uploads/${cleanPath}`;
          }
          return url.replace('http://', 'https://');
        };

        const [categoriesResponse, adsResponse] = await Promise.all([
          fetch(`/api/categories/${code}`),
          fetch(`/api/advertisements/${code}`)
        ]);

        let categoriesInfo: CategoryDto[] = [];
        if (categoriesResponse.ok) {
          categoriesInfo = await categoriesResponse.json();
          setCategoriesData(categoriesInfo);
          setCategoriesDataContext(categoriesInfo);
        }

        // Reklamları işle
        let adsData: Advertisement[] = [];
        if (adsResponse.ok) {
          const adsResult = await adsResponse.json();
          if (adsResult.success && adsResult.data) {
            adsData = adsResult.data;
            setAdvertisements(adsData);

            const popularIds = new Set<number>();
            adsData.forEach((ad: any) => {
              if ((ad.tabType === 'FavoriteProducts' || ad.tabType === 'BestSellingProducts') && ad.selectedProductIds) {
                try {
                  const ids = JSON.parse(ad.selectedProductIds);
                  ids.forEach((id: number) => popularIds.add(id));
                } catch (e) {}
              }
            });
            if (popularIds.size > 0) setPopularProductIds(popularIds);
          } else {
            setAdvertisements([]);
          }
        } else {
          setAdvertisements([]);
        }

        // ═══════════════════════════════════════════════════════════
        // AŞAMA 3: TÜM kritik görselleri topla ve ÖNCE yükle
        // Sıra: Banner → Reklamlar → Logo → Background → Kategoriler
        // ═══════════════════════════════════════════════════════════
        const criticalUrls: string[] = [];

        // 1. Banner
        if (customerInfo.customer?.showBanner && customerInfo.customer?.banner) {
          criticalUrls.push(normalizeUrl(customerInfo.customer.banner));
        }

        // 2. Reklam görselleri
        adsData.forEach(ad => {
          if (ad.imageUrl) {
            ad.imageUrl.split(',').forEach(url => {
              const trimmed = url.trim();
              if (trimmed) criticalUrls.push(normalizeUrl(trimmed));
            });
          }
        });

        // 3. Logo
        if (customerInfo.customer?.logo) {
          criticalUrls.push(normalizeUrl(customerInfo.customer.logo));
        }

        // 4. Background
        if (customerInfo.customer?.webBackground) {
          criticalUrls.push(normalizeUrl(customerInfo.customer.webBackground));
        }

        // 5. Kategori görselleri
        categoriesInfo.forEach(cat => {
          if (cat.picture) {
            criticalUrls.push(normalizeUrl(cat.picture));
          }
        });

        // Duplicate'leri kaldır
        const uniqueUrls = [...new Set(criticalUrls)];

        // Görselleri yükle ve GERÇEKTEN tamamlanmasını bekle
        if (uniqueUrls.length > 0) {
          const preloadImage = (url: string): Promise<void> => {
            return new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = url;
            });
          };

          // Tümünü başlat ve max 2 saniye bekle
          const allPreloads = uniqueUrls.map(url => preloadImage(url));

          await Promise.race([
            Promise.all(allPreloads),
            new Promise(resolve => setTimeout(resolve, 2000))
          ]);
        }

        // ⚠️ dataLoading'i set et - loading ekranını göstermeye devam
        setDataLoading(true);
        setInitialLoading(false);

        // 📊 Ziyaret kaydı - arka planda gönder
        if (customerInfo.customer?.id) {
          trackVisit(customerInfo.customer.id);
        }

        // Table doğrulama
        if (tableParam && customerInfo.customer.id) {
          const tablesResponse = await fetch(`/api/tables/${customerInfo.customer.id}`);
          if (tablesResponse.ok) {
            const tables = await tablesResponse.json();
            const matchedTable = tables.find(
              (t: any) => t.secureId?.toLowerCase() === tableParam.toLowerCase()
            );

            if (!matchedTable) {
              window.location.href = `/${code}`;
              return;
            }

            const tableName = matchedTable.name || matchedTable.tableName || tableParam;
            localStorage.setItem('currentTableName', tableName);
          }
        }

        // ═══════════════════════════════════════════════════════════
        // AŞAMA 4: Menüyü al (kategoriler zaten hazır)
        // ═══════════════════════════════════════════════════════════
        let menuResponse: Response | null = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            menuResponse = await fetch(`/api/menu/${code}`);
            if (menuResponse.ok) break;
          } catch {
            // Retry on error
          }

          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        if (!menuResponse?.ok) throw new Error('Menü yüklenemedi');

        const menuData = await menuResponse.json();
        setMenuDataLocal(menuData);
        setMenuData(menuData);

        // Token settings
        if (tableParam) {
          try {
            const tokenResponse = await fetch(`/api/token-settings/${code}`);
            if (tokenResponse.ok) {
              const tokenData = await tokenResponse.json();
              const productMap: Record<number, any> = {};
              const portionMap: Record<number, any> = {};

              tokenData.settings.forEach((setting: any) => {
                if (setting.sambaPortionId) {
                  portionMap[setting.sambaPortionId] = setting;
                } else {
                  if (setting.productId) productMap[setting.productId] = setting;
                  if (setting.sambaProductId) productMap[setting.sambaProductId] = setting;
                }
              });

              setProductTokenSettings(productMap);
              setPortionTokenSettings(portionMap);
            }
          } catch (tokenErr) {}
        }

        setDataLoading(false);
        setError(null);
      } catch (err) {
        console.error('Data fetch error:', err);
        setError(err instanceof Error ? err.message : 'Bir hata oluştu');
        setInitialLoading(false);
        setDataLoading(false);
      }
    }

    if (code) fetchData();
  }, [code, setMenuData]);

  // Banner
  useEffect(() => {
    if (!dataLoading && customerData?.customer.showBanner && customerData?.customer.banner) {
      setShowBanner(true);
    }
  }, [dataLoading, customerData]);

  // joinRoom parametresi
  useEffect(() => {
    if (initialLoading || !joinRoomParam) return;
    setPendingJoinRoomId(joinRoomParam);
    openGameModal('okey');
    const url = new URL(window.location.href);
    url.searchParams.delete('joinRoom');
    window.history.replaceState({}, '', url.toString());
  }, [initialLoading, joinRoomParam, setPendingJoinRoomId, openGameModal]);

  // joinBackgammon parametresi
  useEffect(() => {
    if (initialLoading || !joinBackgammonParam) return;
    setPendingJoinRoomId(joinBackgammonParam);
    openGameModal('backgammon');
    const url = new URL(window.location.href);
    url.searchParams.delete('joinBackgammon');
    window.history.replaceState({}, '', url.toString());
  }, [initialLoading, joinBackgammonParam, setPendingJoinRoomId, openGameModal]);

  const handleBannerClose = () => setShowBanner(false);

  const handleWaiterCall = async () => {
    const currentTableId = tableContextId || tableId;
    if (!currentTableId) {
      alert('Masa bilgisi bulunamadı. Lütfen QR kodu tekrar okutun.');
      return;
    }

    try {
      const userData = localStorage.getItem('userData');
      const endUserId = userData ? JSON.parse(userData).id : null;

      const response = await fetch('/api/waiter-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CustomerCode: code,
          TableName: currentTableId,
          Message: 'Garson çağrısı',
          CallType: 'General',
          EndUserId: endUserId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showWaiterCallSuccess();
      } else {
        if (result.isRateLimited) {
          showRateLimitError(result.error, result.remainingSeconds, result.isRegistered || false);
        } else {
          throw new Error(result.error || 'Garson çağırma işlemi başarısız oldu.');
        }
      }
    } catch (error) {
      console.error('Garson çağırma hatası:', error);
      alert(error instanceof Error ? error.message : 'Garson çağırma işlemi başarısız oldu.');
    }
  };

  const showWaiterCallSuccess = () => {
    const message = document.createElement('div');
    message.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(76, 175, 80, 0.95); color: white; padding: 20px 30px; border-radius: 15px; text-align: center; z-index: 10000; font-size: 16px; font-weight: 600; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
        <div style="font-size: 24px; margin-bottom: 10px;">✅</div>
        <div>Garson çağırıldı!</div>
        <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">En kısa sürede yanınızda olacak</div>
      </div>
    `;
    document.body.appendChild(message);
    setTimeout(() => {
      if (document.body.contains(message)) document.body.removeChild(message);
    }, 3000);
  };

  const showRateLimitError = (errorMessage: string, remainingSeconds: number, isRegistered: boolean) => {
    setRateLimitModal({ isOpen: true, errorMessage, remainingSeconds, isRegistered });
  };

  // Loading - Artık beyaz arka plan (mor değil)
  if (initialLoading || dataLoading) {
    const logoUrl = customerData?.customer.logo
      ? customerData.customer.logo.startsWith('http')
        ? customerData.customer.logo.replace('http://', 'https://')
        : `https://apicanlimenu.online/Uploads/${customerData.customer.logo.replace('Uploads/', '')}`
      : undefined;

    const backgroundUrl = customerData?.customer.webBackground
      ? customerData.customer.webBackground.startsWith('http')
        ? customerData.customer.webBackground.replace('http://', 'https://')
        : `https://apicanlimenu.online/Uploads/${customerData.customer.webBackground.replace('Uploads/', '')}`
      : undefined;

    return <LoadingScreen logoUrl={logoUrl} backgroundUrl={backgroundUrl} />;
  }

  if (error || !menuDataLocal) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
        <div style={{ color: '#333', textAlign: 'center', background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>❌ Hata</h1>
          <p>{error || 'Menü bulunamadı'}</p>
        </div>
      </div>
    );
  }

  const categories = menuDataLocal.menu || [];

  const logoUrl = customerData?.customer.logo
    ? customerData.customer.logo.startsWith('http')
      ? customerData.customer.logo.replace('http://', 'https://')
      : `https://apicanlimenu.online/Uploads/${customerData.customer.logo.replace('Uploads/', '')}`
    : menuDataLocal.customerLogo
    ? menuDataLocal.customerLogo.startsWith('http')
      ? menuDataLocal.customerLogo.replace('http://', 'https://')
      : `https://apicanlimenu.online/Uploads/${menuDataLocal.customerLogo.replace('Uploads/', '')}`
    : undefined;

  const backgroundUrl = customerData?.customer.webBackground
    ? customerData.customer.webBackground.startsWith('http')
      ? customerData.customer.webBackground.replace('http://', 'https://')
      : `https://apicanlimenu.online/Uploads/${customerData.customer.webBackground.replace('Uploads/', '')}`
    : undefined;

  const bannerUrl = customerData?.customer.showBanner && customerData?.customer.banner
    ? customerData.customer.banner.startsWith('http')
      ? customerData.customer.banner.replace('http://', 'https://')
      : `https://apicanlimenu.online/Uploads/${customerData.customer.banner.replace('Uploads/', '')}`
    : undefined;

  const bgStyle = backgroundUrl
    ? {
        backgroundImage: `url('${backgroundUrl}')`,
        backgroundPosition: 'center center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }
    : { background: '#f5f5f5' };

  const categoryList = categories.map((cat) => {
    const categoryWithPicture = categoriesData.find((c) => c.category.sambaId === cat.sambaId);
    let categoryImageUrl = '';

    if (categoryWithPicture && categoryWithPicture.picture) {
      const picture = categoryWithPicture.picture;
      if (picture.startsWith('http')) {
        categoryImageUrl = picture.replace('http://', 'https://');
      } else {
        const picturePath = picture.startsWith('Uploads/') ? picture.substring('Uploads/'.length) : picture;
        categoryImageUrl = `https://apicanlimenu.online/Uploads/${picturePath}`;
      }
    } else if (logoUrl) {
      categoryImageUrl = logoUrl;
    } else {
      categoryImageUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23e0e0e0" width="300" height="300"/%3E%3C/svg%3E';
    }

    const titleEnglish = categoryWithPicture?.category?.titleEnglish || '';

    return {
      id: cat.sambaId,
      name: cat.title,
      nameEn: titleEnglish,
      image: categoryImageUrl,
    };
  });

  return (
    <>
      {bannerUrl && (
        <BannerModal bannerUrl={bannerUrl} isOpen={showBanner} onClose={handleBannerClose} />
      )}

      {/* Ürün görselleri arka planda preload edilir (kritik görseller zaten yüklendi) */}
      <ImagePreloadContainer menuData={menuDataLocal} />

      <div className="main-container" style={{ ...bgStyle, minHeight: '100vh' }}>
        <LanguageSelector />
        <HeaderTabs customerCode={code} fallbackLogoUrl={logoUrl} advertisements={advertisements} />
        <CategoryGrid categories={categoryList} />
      </div>

      {activeGame !== 'okey' && activeGame !== 'alienattack' && activeGame !== 'backgammon' && activeGame !== 'ludo' && (
        <BottomNavBar
          onProfileClick={() => {
            setIsCartOpen(false);
            setIsAIChatOpen(false);
            if (isProfileOpen) closeProfile();
            else openProfile();
          }}
          onAIClick={() => {
            setIsCartOpen(false);
            closeProfile();
            setIsAIChatOpen(prev => !prev);
          }}
          onCartClick={() => {
            closeProfile();
            setIsAIChatOpen(false);
            setIsCartOpen(prev => !prev);
          }}
          onWaiterCall={handleWaiterCall}
          onGameClick={() => {
            if (isGameModalOpen) closeGameModal();
            else {
              setIsCartOpen(false);
              closeProfile();
              setIsAIChatOpen(false);
              openGameModal();
            }
          }}
          onContactClick={() => {
            if (customerData?.customer.phone) window.location.href = `tel:${customerData.customer.phone}`;
          }}
          onSuggestionClick={() => setIsSuggestionModalOpen(true)}
          onTableOrdersClick={() => setIsTableOrdersModalOpen(true)}
          showAIChat={customerData?.customer.showAIChat ?? true}
          showCart={isTableMode && (canUseBasket || !!basketDisabledMessage)}
          showWaiterCall={canCallWaiter}
          showTableOrders={isTableMode && (canUseBasket || !!basketDisabledMessage)}
          tableId={tableId || undefined}
          phone={customerData?.customer.phone}
          cartItemCount={0}
          basketDisabledMessage={basketDisabledMessage}
        />
      )}

      <ProductListModal />
      <ProductDetailModal />
      <GameModal />

      {isTableMode && canUseBasket && (
        <CartSidebar
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          tableId={tableId || ''}
          customerCode={code}
        />
      )}

      <ProfileSidebar isOpen={isProfileOpen} onClose={closeProfile} customerCode={code} />

      <AIChatSidebar
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        customerCode={code}
        menuData={menuDataLocal ? {
          customerCode: code,
          customerTitle: menuDataLocal.customerTitle,
          categories: menuDataLocal.menu.map(cat => ({
            title: cat.title,
            sambaId: cat.sambaId.toString(),
            products: cat.products.map(p => ({
              title: p.title,
              price: p.price,
              detail: p.detail || p.description || ''
            }))
          }))
        } : undefined}
      />

      <SuggestionModal
        isOpen={isSuggestionModalOpen}
        onClose={() => setIsSuggestionModalOpen(false)}
        venueCode={code}
      />

      <EmailVerifiedPopup />

      <WaiterCallRateLimitModal
        isOpen={rateLimitModal.isOpen}
        onClose={() => setRateLimitModal({ ...rateLimitModal, isOpen: false })}
        errorMessage={rateLimitModal.errorMessage}
        remainingSeconds={rateLimitModal.remainingSeconds}
        isRegistered={rateLimitModal.isRegistered}
      />

      <TableOrdersModal
        isOpen={isTableOrdersModalOpen}
        onClose={() => setIsTableOrdersModalOpen(false)}
        customerCode={code}
        tableId={tableId || ''}
      />
    </>
  );
}
