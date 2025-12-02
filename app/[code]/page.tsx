'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useMenu } from '@/contexts/MenuContext';
import { useTable } from '@/contexts/TableContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/UserContext';
import { useSignalR } from '@/hooks/useSignalR';
import SplashScreen from '@/components/layout/SplashScreen';
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
import ImagePreloadContainer from '@/components/common/ImagePreloadContainer';
import type { MenuDto, CustomerInfoResponse, CategoryDto } from '@/types/api';
import { api } from '@/lib/api';

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
    // TableContext'ten gelen tableId'yi MenuContext'e aktar
    if (tableContextId && tableContextId !== tableId) {
      setTableId(tableContextId);
      console.log('✅ TableContext -> MenuContext tableId senkronize edildi:', tableContextId);
    }
  }, [tableContextId, tableId, setTableId]);

  const [showSplash, setShowSplash] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [menuDataLocal, setMenuDataLocal] = useState<MenuDto | null>(null);
  const [customerData, setCustomerData] = useState<CustomerInfoResponse | null>(null);
  const [categoriesData, setCategoriesData] = useState<CategoryDto[]>([]);
  const [initialLoading, setInitialLoading] = useState(true); // Customer data için
  const [dataLoading, setDataLoading] = useState(false); // Menu/categories için
  const [error, setError] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
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

  // Dinamik sayfa başlığı - Restoran adına göre
  useEffect(() => {
    if (customerData?.customer?.name) {
      document.title = `${customerData.customer.name} | Dijital Menü`;
    }
  }, [customerData?.customer?.name]);

  // 🔗 SignalR: Token balance güncelleme callback'i
  const handleTokenBalanceUpdated = useCallback((data: { userId: number; currentTokens: number; message: string }) => {
    // Kullanıcının token'ını kontrol et
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      const currentUserId = user.id || user.userId || user.Id;

      if (currentUserId && currentUserId === data.userId) {
        // Context'teki token balance'ı güncelle
        setUserTokenBalance(data.currentTokens);

        // Bildirim göster
        if (data.message) {
          // Custom event dispatch et - CartSidebar güncellensin
          window.dispatchEvent(new CustomEvent('tokenBalanceUpdated', {
            detail: { balance: data.currentTokens, message: data.message }
          }));
        }
      }
    }
  }, [setUserTokenBalance]);

  // 📦 Sipariş oluşturuldu callback'i
  const handleOrderCreated = useCallback((data: any) => {
    console.log('📦 Sipariş oluşturuldu:', data);
    // Bildirim göster veya UI güncelle
    if (data.orderNumber) {
      // Toast veya alert gösterilebilir
      window.dispatchEvent(new CustomEvent('orderCreated', { detail: data }));
    }
  }, []);

  // 🔗 SignalR bağlantısı - customerData yüklendikten sonra
  useSignalR({
    customerId: customerData?.customer.id,
    customerCode: code, // Customer code ile gruba katıl
    onTokenBalanceUpdated: handleTokenBalanceUpdated,
    onOrderCreated: handleOrderCreated,
    enabled: !!customerData?.customer.id,
  });

  useEffect(() => {
    // URL'den table parametresini context'e set et
    if (tableParam) {
      setTableId(tableParam);

      // ✅ Table parametresini URL'den gizle (güvenlik için)
      setTimeout(() => {
        const url = new URL(window.location.href);
        if (url.searchParams.has('table')) {
          url.searchParams.delete('table');
          window.history.replaceState({}, '', url.toString());
          console.log('🔒 Table ID URL\'den gizlendi');
        }
      }, 100);
    }

    // Session parametresini de gizle
    if (sessionParam) {
      setTimeout(() => {
        const url = new URL(window.location.href);
        if (url.searchParams.has('session')) {
          url.searchParams.delete('session');
          window.history.replaceState({}, '', url.toString());
          console.log('🔒 Session ID URL\'den gizlendi');
        }
      }, 100);
    }
  }, [tableParam, sessionParam, setTableId]);

  // Toast'tan sepete git tıklandığında sidebar'ı aç
  useEffect(() => {
    const handleOpenCart = () => setIsCartOpen(true);
    window.addEventListener('openCart', handleOpenCart);
    return () => window.removeEventListener('openCart', handleOpenCart);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Önce customer data'yı al (logo için hızlı)
        setInitialLoading(true);
        setCustomerCode(code); // Customer code'u context'e kaydet

        const customerResponse = await fetch(`/api/customer/${code}`);

        if (!customerResponse.ok) {
          throw new Error('Müşteri bilgisi yüklenemedi');
        }

        const customerInfo = await customerResponse.json();
        setCustomerData(customerInfo);
        setCustomerDataContext(customerInfo); // Context'e de set et
        setInitialLoading(false); // Logo artık gösterilebilir

        // 1.5. Table parametresi varsa, masa doğrulama yap ve gerçek masa adını kaydet
        // 🔒 GÜVENLİK: Sadece secureId ile eşleşme yapılır, gerçek masa adı kabul edilmez
        if (tableParam && customerInfo.customer.id) {
          const tablesResponse = await fetch(`/api/tables/${customerInfo.customer.id}`);
          if (tablesResponse.ok) {
            const tables = await tablesResponse.json();

            // Sadece secureId ile eşleşme yap (güvenlik için)
            const matchedTable = tables.find(
              (t: any) => t.secureId?.toLowerCase() === tableParam.toLowerCase()
            );

            if (!matchedTable) {
              // Geçersiz veya güvensiz masa kodu - table parametresi olmadan yönlendir
              console.warn('🔒 Geçersiz masa kodu:', tableParam);
              window.location.href = `/${code}`;
              return;
            }

            // Gerçek masa adını localStorage'a kaydet (sipariş özetinde göstermek için)
            const tableName = matchedTable.name || matchedTable.tableName || tableParam;
            localStorage.setItem('currentTableName', tableName);
          }
        }

        // 2. Sonra menu ve categories'i paralel al
        setDataLoading(true);
        const [menuResponse, categoriesResponse] = await Promise.all([
          fetch(`/api/menu/${code}`),
          fetch(`/api/categories/${code}`)
        ]);

        if (!menuResponse.ok || !categoriesResponse.ok) {
          throw new Error('Veri yüklenemedi');
        }

        const [menuData, categoriesInfo] = await Promise.all([
          menuResponse.json(),
          categoriesResponse.json()
        ]);

        setMenuDataLocal(menuData);
        setCategoriesData(categoriesInfo);
        setMenuData(menuData); // Also set in context
        setCategoriesDataContext(categoriesInfo); // Set categories in context

        // 3. Token settings'i yükle (sadece masa kodu varsa)
        if (tableParam) {
          try {
            const tokenResponse = await fetch(`/api/token-settings/${code}`);
            if (tokenResponse.ok) {
              const tokenData = await tokenResponse.json();
              const tokenMap: Record<number, any> = {};
              tokenData.settings.forEach((setting: any) => {
                // Hem productId hem sambaProductId ile eşleştir
                if (setting.productId) {
                  tokenMap[setting.productId] = setting;
                }
                if (setting.sambaProductId) {
                  tokenMap[setting.sambaProductId] = setting;
                }
              });
              setProductTokenSettings(tokenMap);
            }
          } catch (tokenErr) {
            console.error('Token settings load error:', tokenErr);
            // Token hatası ana akışı engellemesin
          }
        }

        // 4. Popüler ürünleri yükle (advertisements'tan)
        try {
          const adsResponse = await fetch(`/api/advertisements/${code}`);
          if (adsResponse.ok) {
            const adsData = await adsResponse.json();
            if (adsData.success && adsData.data) {
              const popularIds = new Set<number>();
              adsData.data.forEach((ad: any) => {
                // FavoriteProducts veya BestSellingProducts tab'larından ID'leri al
                if ((ad.tabType === 'FavoriteProducts' || ad.tabType === 'BestSellingProducts') && ad.selectedProductIds) {
                  try {
                    const ids = JSON.parse(ad.selectedProductIds);
                    ids.forEach((id: number) => popularIds.add(id));
                  } catch (e) {
                    console.error('Failed to parse product IDs:', e);
                  }
                }
              });
              if (popularIds.size > 0) {
                setPopularProductIds(popularIds);
              }
            }
          }
        } catch (adsErr) {
          console.error('Advertisements load error:', adsErr);
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

    if (code) {
      fetchData();
    }
  }, [code, setMenuData]);

  // Banner'ı splash ile beraber hazırla (z-index ile arka planda)
  useEffect(() => {
    if (!dataLoading && customerData?.customer.showBanner && customerData?.customer.banner) {
      setShowBanner(true);
    }
  }, [dataLoading, customerData]);

  // joinRoom parametresi kontrolü - link ile gelen kullanıcılar için
  useEffect(() => {
    // Splash ekranı kapandıktan ve data yüklendikten sonra kontrol et
    if (showSplash || initialLoading || !joinRoomParam) return;

    // ========================================
    // 🔧 TEST MODU: Authentication kontrolü bypass
    // ========================================
    // const userNickname = currentUser?.nickName || currentUser?.nickname;
    // if (!userNickname) {
    //   // Giriş yapmamış - profil sidebar'ı aç ve pending room ID'yi kaydet
    //   setPendingJoinRoomId(joinRoomParam);
    //   alert('Bu oyuna katılmak için önce giriş yapmalısınız.');
    //   openProfile();
    // } else {
    //   // Giriş yapmış - pending room ID'yi kaydet ve oyun modalını aç
    //   setPendingJoinRoomId(joinRoomParam);
    //   openGameModal('okey');

    //   // URL'den joinRoom parametresini temizle
    //   const url = new URL(window.location.href);
    //   url.searchParams.delete('joinRoom');
    //   window.history.replaceState({}, '', url.toString());
    // }

    // TEST: Direkt pending room ID'yi kaydet ve oyun modalını aç
    setPendingJoinRoomId(joinRoomParam);
    openGameModal('okey');

    // URL'den joinRoom parametresini temizle
    const url = new URL(window.location.href);
    url.searchParams.delete('joinRoom');
    window.history.replaceState({}, '', url.toString());
    // ========================================
  }, [showSplash, initialLoading, joinRoomParam, currentUser, setPendingJoinRoomId, openProfile, openGameModal]);

  // joinBackgammon parametresi kontrolü - Tavla link ile gelen kullanıcılar için
  useEffect(() => {
    // Splash ekranı kapandıktan ve data yüklendikten sonra kontrol et
    if (showSplash || initialLoading || !joinBackgammonParam) return;

    // TEST: Direkt pending room ID'yi kaydet ve Tavla oyun modalını aç
    setPendingJoinRoomId(joinBackgammonParam);
    openGameModal('backgammon');

    // URL'den joinBackgammon parametresini temizle
    const url = new URL(window.location.href);
    url.searchParams.delete('joinBackgammon');
    window.history.replaceState({}, '', url.toString());
  }, [showSplash, initialLoading, joinBackgammonParam, currentUser, setPendingJoinRoomId, openProfile, openGameModal]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const handleImagesLoaded = () => {
    // Görseller arka planda yüklendi
  };

  const handleBannerClose = () => {
    setShowBanner(false);
  };

  const handleWaiterCall = async () => {
    // TableContext veya MenuContext'ten tableId al
    const currentTableId = tableContextId || tableId;

    if (!currentTableId) {
      alert('Masa bilgisi bulunamadı. Lütfen QR kodu tekrar okutun.');
      return;
    }

    try {
      // Get user ID if logged in
      const userData = localStorage.getItem('userData');
      const endUserId = userData ? JSON.parse(userData).id : null;

      const response = await fetch('/api/waiter-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        // Rate limit error check
        if (result.isRateLimited) {
          showRateLimitError(result.error, result.remainingSeconds, result.isRegistered || false);
        } else {
          throw new Error(result.error || 'Garson çağırma işlemi başarısız oldu.');
        }
      }
    } catch (error) {
      console.error('Garson çağırma hatası:', error);
      alert(error instanceof Error ? error.message : 'Garson çağırma işlemi başarısız oldu. Lütfen tekrar deneyin.');
    }
  };

  const showWaiterCallSuccess = () => {
    const message = document.createElement('div');
    message.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(76, 175, 80, 0.95);
        color: white;
        padding: 20px 30px;
        border-radius: 15px;
        text-align: center;
        z-index: 10000;
        font-size: 16px;
        font-weight: 600;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      ">
        <div style="font-size: 24px; margin-bottom: 10px;">✅</div>
        <div>Garson çağırıldı!</div>
        <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">En kısa sürede yanınızda olacak</div>
      </div>
    `;
    document.body.appendChild(message);

    setTimeout(() => {
      if (document.body.contains(message)) {
        document.body.removeChild(message);
      }
    }, 3000);
  };

  const showRateLimitError = (errorMessage: string, remainingSeconds: number, isRegistered: boolean) => {
    setRateLimitModal({
      isOpen: true,
      errorMessage,
      remainingSeconds,
      isRegistered,
    });
  };

  // İlk yükleme veya veri yüklenirken
  if (initialLoading || dataLoading) {
    const logoUrl = customerData?.customer.logo
      ? customerData.customer.logo.startsWith('http')
        ? customerData.customer.logo.replace('http://', 'https://')
        : `https://canlimenu.online/Uploads/${customerData.customer.logo.replace('Uploads/', '')}`
      : undefined;

    const backgroundUrl = customerData?.customer.webBackground
      ? customerData.customer.webBackground.startsWith('http')
        ? customerData.customer.webBackground.replace('http://', 'https://')
        : `https://canlimenu.online/Uploads/${customerData.customer.webBackground.replace('Uploads/', '')}`
      : undefined;

    return <LoadingScreen logoUrl={logoUrl} backgroundUrl={backgroundUrl} />;
  }

  if (error || !menuDataLocal) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ color: 'white', textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>❌ Hata</h1>
          <p>{error || 'Menü bulunamadı'}</p>
        </div>
      </div>
    );
  }

  // Menu listesini al
  const categories = menuDataLocal.menu || [];

  // Logo URL (customerData.customer'dan al - camelCase field'lar)
  const logoUrl = customerData?.customer.logo
    ? customerData.customer.logo.startsWith('http')
      ? customerData.customer.logo.replace('http://', 'https://')
      : `https://canlimenu.online/Uploads/${customerData.customer.logo.replace('Uploads/', '')}`
    : menuDataLocal.customerLogo
    ? menuDataLocal.customerLogo.startsWith('http')
      ? menuDataLocal.customerLogo.replace('http://', 'https://')
      : `https://canlimenu.online/Uploads/${menuDataLocal.customerLogo.replace('Uploads/', '')}`
    : undefined;

  // Background URL (customerData.customer.webBackground - camelCase)
  const backgroundUrl = customerData?.customer.webBackground
    ? customerData.customer.webBackground.startsWith('http')
      ? customerData.customer.webBackground.replace('http://', 'https://')
      : `https://canlimenu.online/Uploads/${customerData.customer.webBackground.replace('Uploads/', '')}`
    : undefined;

  // Banner URL
  const bannerUrl = customerData?.customer.showBanner && customerData?.customer.banner
    ? customerData.customer.banner.startsWith('http')
      ? customerData.customer.banner.replace('http://', 'https://')
      : `https://canlimenu.online/Uploads/${customerData.customer.banner.replace('Uploads/', '')}`
    : undefined;

  // Background style
  const bgStyle = backgroundUrl
    ? {
        backgroundImage: `url('${backgroundUrl}')`,
        backgroundPosition: 'center center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }
    : { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };

  // Kategorileri dönüştür - categoriesData'dan picture VE titleEnglish al
  const categoryList = categories.map((cat) => {
    // categoriesData'dan bu kategorinin picture'ını VE titleEnglish'ini bul
    const categoryWithPicture = categoriesData.find((c) => c.category.sambaId === cat.sambaId);
    let categoryImageUrl = '';

    if (categoryWithPicture && categoryWithPicture.picture) {
      // Picture varsa URL'i oluştur
      const picture = categoryWithPicture.picture;
      if (picture.startsWith('http')) {
        categoryImageUrl = picture.replace('http://', 'https://');
      } else {
        const picturePath = picture.startsWith('Uploads/')
          ? picture.substring('Uploads/'.length)
          : picture;
        categoryImageUrl = `https://canlimenu.online/Uploads/${picturePath}`;
      }
    } else if (logoUrl) {
      // Picture yoksa logo kullan
      categoryImageUrl = logoUrl;
    } else {
      // Placeholder
      categoryImageUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23667eea" width="300" height="300"/%3E%3C/svg%3E';
    }

    // titleEnglish'i categoriesData'dan al (API'de var)
    const titleEnglish = categoryWithPicture?.category?.titleEnglish || '';

    return {
      id: cat.sambaId,
      name: cat.title,
      nameEn: titleEnglish, // categoriesData'dan gelen titleEnglish
      image: categoryImageUrl,
    };
  });

  return (
    <>
      {/* Splash Screen with Liquid Morph Animation */}
      {showSplash && logoUrl && (
        <SplashScreen
          logoUrl={logoUrl}
          backgroundUrl={backgroundUrl}
          onComplete={handleSplashComplete}
        />
      )}

      {/* Banner Modal - Splash'den sonra göster, kapatılınca menü görünsün */}
      {bannerUrl && (
        <BannerModal
          bannerUrl={bannerUrl}
          isOpen={showBanner}
          onClose={handleBannerClose}
        />
      )}

      {/* Image Preload Container - EN ÖNCE render et, hemen yüklemeye başlasın */}
      <ImagePreloadContainer
        menuData={menuDataLocal}
        categoriesData={categoriesData}
        customerLogo={logoUrl}
        backgroundUrl={backgroundUrl}
        bannerUrl={bannerUrl}
        onImagesLoaded={handleImagesLoaded}
      />

      {/* Main Content */}
      <div className="main-container" style={{ ...bgStyle, minHeight: '100vh' }}>
        {/* Language Selector - Fixed Top Right */}
        <LanguageSelector />

        {/* Header Area - Logo/Tabs/Slider */}
        <HeaderTabs customerCode={code} fallbackLogoUrl={logoUrl} />

        {/* Categories Grid with Cascade Animation */}
        <CategoryGrid categories={categoryList} />
      </div>

      {/* Bottom Navigation Bar - Fixed Bottom (Oyun açıkken gizle) */}
      {activeGame !== 'okey' && activeGame !== 'alienattack' && activeGame !== 'backgammon' && activeGame !== 'ludo' && (
        <BottomNavBar
        onProfileClick={() => {
          // Diğer sidebar'ları kapat
          setIsCartOpen(false);
          setIsAIChatOpen(false);
          // Bu sidebar'ı aç/kapat
          if (isProfileOpen) {
            closeProfile();
          } else {
            openProfile();
          }
        }}
        onAIClick={() => {
          // Diğer sidebar'ları kapat
          setIsCartOpen(false);
          closeProfile();
          // Bu sidebar'ı aç/kapat
          setIsAIChatOpen(prev => !prev);
        }}
        onCartClick={() => {
          // Diğer sidebar'ları kapat
          closeProfile();
          setIsAIChatOpen(false);
          // Bu sidebar'ı aç/kapat
          setIsCartOpen(prev => !prev);
        }}
        onWaiterCall={handleWaiterCall}
        onGameClick={() => {
          if (isGameModalOpen) {
            // Modal açıksa, kapat
            closeGameModal();
          } else {
            // Modal kapalıysa, sidebar'ları kapat ve modalı aç
            setIsCartOpen(false);
            closeProfile();
            setIsAIChatOpen(false);
            openGameModal();
          }
        }}
        onContactClick={() => {
          if (customerData?.customer.phone) {
            window.location.href = `tel:${customerData.customer.phone}`;
          }
        }}
        onSuggestionClick={() => setIsSuggestionModalOpen(true)}
        showAIChat={customerData?.customer.showAIChat ?? true}
        showCart={isTableMode && (canUseBasket || !!basketDisabledMessage)}
        showWaiterCall={canCallWaiter}
        tableId={tableId || undefined}
        phone={customerData?.customer.phone}
        cartItemCount={0}
        basketDisabledMessage={basketDisabledMessage}
      />
      )}

      {/* Product Modals */}
      <ProductListModal />
      <ProductDetailModal />

      {/* Game Modal */}
      <GameModal />

      {/* Cart Sidebar */}
      {isTableMode && canUseBasket && (
        <CartSidebar
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          tableId={tableId || ''}
          customerCode={code}
        />
      )}

      {/* Profile Sidebar */}
      <ProfileSidebar isOpen={isProfileOpen} onClose={closeProfile} customerCode={code} />

      {/* AI Chat Sidebar */}
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

      {/* Suggestion Modal */}
      <SuggestionModal
        isOpen={isSuggestionModalOpen}
        onClose={() => setIsSuggestionModalOpen(false)}
        venueCode={code}
      />

      {/* Email Verified Popup */}
      <EmailVerifiedPopup />

      {/* Waiter Call Rate Limit Modal */}
      <WaiterCallRateLimitModal
        isOpen={rateLimitModal.isOpen}
        onClose={() => setRateLimitModal({ ...rateLimitModal, isOpen: false })}
        errorMessage={rateLimitModal.errorMessage}
        remainingSeconds={rateLimitModal.remainingSeconds}
        isRegistered={rateLimitModal.isRegistered}
      />
    </>
  );
}
