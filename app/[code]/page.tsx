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
import ImagePreloadContainer from '@/components/common/ImagePreloadContainer';
import type { MenuDto, CustomerInfoResponse, CategoryDto } from '@/types/api';

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
    if (tableContextId && tableContextId !== tableId) {
      setTableId(tableContextId);
    }
  }, [tableContextId, tableId, setTableId]);

  const [showBanner, setShowBanner] = useState(false);
  const [menuDataLocal, setMenuDataLocal] = useState<MenuDto | null>(null);
  const [customerData, setCustomerData] = useState<CustomerInfoResponse | null>(null);
  const [categoriesData, setCategoriesData] = useState<CategoryDto[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
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

  // Dinamik sayfa başlığı
  useEffect(() => {
    if (customerData?.customer?.name) {
      document.title = `${customerData.customer.name} | Dijital Menü`;
    }
  }, [customerData?.customer?.name]);

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

  // 🔗 SignalR bağlantısı
  useSignalR({
    customerId: customerData?.customer.id,
    customerCode: code,
    onTokenBalanceUpdated: handleTokenBalanceUpdated,
    onOrderCreated: handleOrderCreated,
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
      setTimeout(() => {
        const url = new URL(window.location.href);
        if (url.searchParams.has('session')) {
          url.searchParams.delete('session');
          window.history.replaceState({}, '', url.toString());
        }
      }, 100);
    }
  }, [tableParam, sessionParam, setTableId]);

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

        const customerResponse = await fetch(`/api/customer/${code}`);
        if (!customerResponse.ok) throw new Error('Müşteri bilgisi yüklenemedi');

        const customerInfo = await customerResponse.json();
        setCustomerData(customerInfo);
        setCustomerDataContext(customerInfo);
        setInitialLoading(false);

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

        // Menu ve categories paralel
        setDataLoading(true);
        const [menuResponse, categoriesResponse] = await Promise.all([
          fetch(`/api/menu/${code}`),
          fetch(`/api/categories/${code}`)
        ]);

        if (!menuResponse.ok || !categoriesResponse.ok) throw new Error('Veri yüklenemedi');

        const [menuData, categoriesInfo] = await Promise.all([
          menuResponse.json(),
          categoriesResponse.json()
        ]);

        setMenuDataLocal(menuData);
        setCategoriesData(categoriesInfo);
        setMenuData(menuData);
        setCategoriesDataContext(categoriesInfo);

        // Token settings
        if (tableParam) {
          try {
            const tokenResponse = await fetch(`/api/token-settings/${code}`);
            if (tokenResponse.ok) {
              const tokenData = await tokenResponse.json();
              const tokenMap: Record<number, any> = {};
              tokenData.settings.forEach((setting: any) => {
                if (setting.productId) tokenMap[setting.productId] = setting;
                if (setting.sambaProductId) tokenMap[setting.sambaProductId] = setting;
              });
              setProductTokenSettings(tokenMap);
            }
          } catch (tokenErr) {}
        }

        // Popüler ürünler
        try {
          const adsResponse = await fetch(`/api/advertisements/${code}`);
          if (adsResponse.ok) {
            const adsData = await adsResponse.json();
            if (adsData.success && adsData.data) {
              const popularIds = new Set<number>();
              adsData.data.forEach((ad: any) => {
                if ((ad.tabType === 'FavoriteProducts' || ad.tabType === 'BestSellingProducts') && ad.selectedProductIds) {
                  try {
                    const ids = JSON.parse(ad.selectedProductIds);
                    ids.forEach((id: number) => popularIds.add(id));
                  } catch (e) {}
                }
              });
              if (popularIds.size > 0) setPopularProductIds(popularIds);
            }
          }
        } catch (adsErr) {}

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

  const handleImagesLoaded = () => {};
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
      : `https://canlimenu.online/Uploads/${customerData.customer.logo.replace('Uploads/', '')}`
    : menuDataLocal.customerLogo
    ? menuDataLocal.customerLogo.startsWith('http')
      ? menuDataLocal.customerLogo.replace('http://', 'https://')
      : `https://canlimenu.online/Uploads/${menuDataLocal.customerLogo.replace('Uploads/', '')}`
    : undefined;

  const backgroundUrl = customerData?.customer.webBackground
    ? customerData.customer.webBackground.startsWith('http')
      ? customerData.customer.webBackground.replace('http://', 'https://')
      : `https://canlimenu.online/Uploads/${customerData.customer.webBackground.replace('Uploads/', '')}`
    : undefined;

  const bannerUrl = customerData?.customer.showBanner && customerData?.customer.banner
    ? customerData.customer.banner.startsWith('http')
      ? customerData.customer.banner.replace('http://', 'https://')
      : `https://canlimenu.online/Uploads/${customerData.customer.banner.replace('Uploads/', '')}`
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
        categoryImageUrl = `https://canlimenu.online/Uploads/${picturePath}`;
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

      <ImagePreloadContainer
        menuData={menuDataLocal}
        categoriesData={categoriesData}
        customerLogo={logoUrl}
        backgroundUrl={backgroundUrl}
        bannerUrl={bannerUrl}
        onImagesLoaded={handleImagesLoaded}
      />

      <div className="main-container" style={{ ...bgStyle, minHeight: '100vh' }}>
        <LanguageSelector />
        <HeaderTabs customerCode={code} fallbackLogoUrl={logoUrl} />
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
          showAIChat={customerData?.customer.showAIChat ?? true}
          showCart={isTableMode && (canUseBasket || !!basketDisabledMessage)}
          showWaiterCall={canCallWaiter}
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
    </>
  );
}
