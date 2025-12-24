'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/UserContext';
import { useMenu } from '@/contexts/MenuContext';
import { useSignalR } from '@/hooks/useSignalR';
import { saveCart as saveCartToStorage, loadCart as loadCartFromStorage, clearCart as clearCartFromStorage } from '@/utils/cartUtils';
import BottomNavBar from '@/components/layout/BottomNavBar';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import CartSidebar from '@/components/cart/CartSidebar';
import type { MenuDto, CustomerInfoResponse, Product } from '@/types/api';

// Loading komponenti
function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '50px', height: '50px', border: '4px solid #e0e0e0', borderTopColor: '#9c27b0', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }} />
        <p style={{ color: '#666' }}>Yükleniyor...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Local cart item interface
interface LocalCartItem {
  id: number;
  productId: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  note?: string;
  sambaId?: number;
  portionName?: string;
  sambaPortionId?: number;
}

// Porsiyon tipi
interface ProductPortion {
  id: number;
  name: string;
  nameEnglish?: string;
  nameEn?: string;
  price: number;
  sambaPortionId?: number;
}

// Ana içerik komponenti
function SelfServiceContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = params.code as string;

  // Session bilgisini state'e kaydet ve URL'den temizle
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionValidated, setSessionValidated] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionCheckDone, setSessionCheckDone] = useState(false); // Session kontrolü tamamlandı mı?
  const sessionValidatedRef = useRef(false); // Race condition önlemek için ref
  const hasCheckedRef = useRef(false); // Sadece bir kez kontrol et

  // Session süresi (dakika)
  const SESSION_DURATION_MINUTES = 15;
  const WARNING_THRESHOLD_MINUTES = 5; // Son 5 dk uyarı

  // Kalan süre state'i
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);
  const [showTimeWarning, setShowTimeWarning] = useState(false);

  useEffect(() => {
    // Sadece bir kez kontrol et
    if (hasCheckedRef.current || sessionValidatedRef.current) {
      return;
    }
    hasCheckedRef.current = true;

    // URL'den session'ı window.location ile oku (searchParams hydration sorunu için)
    const urlParams = new URLSearchParams(window.location.search);
    const urlSession = urlParams.get('session');

    const STORAGE_KEY = `selfservice_session_${code}`;
    const TIMESTAMP_KEY = `selfservice_session_time_${code}`;

    // URL'de yeni session varsa, localStorage'daki eski session'ı temizle
    if (urlSession) {
      const oldSession = localStorage.getItem(STORAGE_KEY);
      if (oldSession && oldSession !== urlSession) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TIMESTAMP_KEY);
      }
    }

    // localStorage'dan session ve timestamp oku
    const storedSession = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const storedTimestamp = typeof window !== 'undefined' ? localStorage.getItem(TIMESTAMP_KEY) : null;

    // Session süresini kontrol et
    let isStoredSessionValid = false;
    if (storedSession && storedTimestamp) {
      const sessionAge = Date.now() - parseInt(storedTimestamp, 10);
      const maxAge = SESSION_DURATION_MINUTES * 60 * 1000; // dakika -> milisaniye
      isStoredSessionValid = sessionAge < maxAge;

      if (!isStoredSessionValid) {
        // Süresi dolmuş session'ı temizle
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TIMESTAMP_KEY);
      }
    }

    // URL'de session varsa kullan, yoksa geçerli localStorage'dan oku
    const session = urlSession || (isStoredSessionValid ? storedSession : null);

    // Session varsa HEMEN güven ve devam et
    if (session) {
      // Önce ref'i güncelle (anında), sonra state'i
      sessionValidatedRef.current = true;
      setSessionId(session);
      setSessionValidated(true);
      setSessionCheckDone(true);

      // Session'ı localStorage'a kaydet
      localStorage.setItem(STORAGE_KEY, session);
      localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());

      // URL'den temizle (varsa)
      if (urlSession) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }

      // Arka planda session doğrula (sadece expired session'ları engelle)
      fetch(`/api/self-service/validate-session?sessionId=${session}`)
        .then(res => res.json())
        .then(data => {
          if (!data.success) {
            const errorType = data.error || data.message || '';

            // Sadece kesin olarak süresi dolmuş session'ları engelle
            if (errorType.toLowerCase().includes('expired') || errorType.toLowerCase().includes('doldu')) {
              sessionValidatedRef.current = false;
              setSessionValidated(false);
              setSessionError('Oturum süreniz doldu. Lütfen yeni QR kodu okutun.');
              localStorage.removeItem(STORAGE_KEY);
              localStorage.removeItem(TIMESTAMP_KEY);
            } else {
              // Diğer hatalar (bulunamadı, vs) - sessizce devam et
              // QR'dan gelen session'a güven, backend senkronizasyon gecikmesi olabilir
            }
          } else {
            // Session'ı kullanıldı olarak işaretle
            fetch('/api/self-service/use', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: session })
            }).catch(() => {});
          }
        })
        .catch(err => {
          // API hatası - sessizce devam et (bağlantı sorunu olabilir)
        });

      return;
    }

    // Session yoksa erişim engelle
    setSessionError('Bu sayfaya erişmek için QR kodu okutmanız gerekiyor.');
    setSessionCheckDone(true);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Session süre takibi - her dakika kontrol et
  useEffect(() => {
    if (!sessionValidated) return;

    const STORAGE_KEY = `selfservice_session_${code}`;
    const TIMESTAMP_KEY = `selfservice_session_time_${code}`;

    const checkRemainingTime = () => {
      const storedTimestamp = localStorage.getItem(TIMESTAMP_KEY);
      if (!storedTimestamp) return;

      const elapsed = Date.now() - parseInt(storedTimestamp, 10);
      const maxAge = SESSION_DURATION_MINUTES * 60 * 1000;
      const remaining = maxAge - elapsed;
      const remainingMins = Math.ceil(remaining / 60000);

      setRemainingMinutes(remainingMins);

      // Son 5 dakika uyarısı
      if (remainingMins <= WARNING_THRESHOLD_MINUTES && remainingMins > 0) {
        setShowTimeWarning(true);
      }

      // Süre doldu
      if (remaining <= 0) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TIMESTAMP_KEY);
        setSessionError('Oturum süreniz doldu. Lütfen yeni QR kodu okutun.');
        setSessionValidated(false);
      }
    };

    // İlk kontrol
    checkRemainingTime();

    // Her 30 saniyede bir kontrol
    const interval = setInterval(checkRemainingTime, 30000);

    return () => clearInterval(interval);
  }, [sessionValidated, code, SESSION_DURATION_MINUTES, WARNING_THRESHOLD_MINUTES]);

  // Cart key - session bazlı
  const CART_KEY = sessionId || 'selfservice';

  // Context
  const { currentUser } = useAuth();
  const {
    isProfileOpen,
    openProfile,
    closeProfile,
    setCustomerCode,
    setMenuData: setMenuDataContext,
    setCustomerData: setCustomerDataContext,
    productTokenSettings,
    portionTokenSettings,
    setProductTokenSettings,
    setPortionTokenSettings,
    getTokenSettingsForItem,
    canUseSelfService,
    selfServiceDisabledMessage,
    userTokenBalance,
    setUserTokenBalance,
  } = useMenu();

  // Data states
  const [menuData, setMenuData] = useState<MenuDto | null>(null);
  const [customerData, setCustomerData] = useState<CustomerInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI states
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Porsiyon seçimi
  const [portionModalProduct, setPortionModalProduct] = useState<Product | null>(null);
  const [selectedPortion, setSelectedPortion] = useState<ProductPortion | null>(null);

  // Alt kategori tab'ları (product-tab-nav)
  const [activeSubTabs, setActiveSubTabs] = useState<{ [categoryId: number]: string }>({});

  // Refs
  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const productSectionsRef = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Cart state
  const [cartItems, setCartItems] = useState<LocalCartItem[]>([]);

  // 📊 Ziyaret kaydı fonksiyonu (30 dk içinde tekrar sayma)
  const trackVisit = (customerId: number) => {
    try {
      const storageKey = `menuVisit_${customerId}`;
      const lastVisit = localStorage.getItem(storageKey);
      const now = Date.now();

      if (lastVisit) {
        const lastTime = parseInt(lastVisit, 10);
        const diffMinutes = (now - lastTime) / (1000 * 60);
        if (diffMinutes < 5) return;
      }

      let visitSessionId = localStorage.getItem('menuSessionId');
      if (!visitSessionId) {
        visitSessionId = crypto.randomUUID();
        localStorage.setItem('menuSessionId', visitSessionId);
      }

      fetch(`/api/visit?customerId=${customerId}&sessionId=${visitSessionId}`)
        .then(() => localStorage.setItem(storageKey, now.toString()))
        .catch(() => {});
    } catch {}
  };

  // Dinamik sayfa başlığı
  useEffect(() => {
    if (customerData?.customer?.name) {
      document.title = `${customerData.customer.name} - Self Servis | Dijital Menü`;
    }
  }, [customerData?.customer?.name]);

  // Cart functions
  const loadCart = useCallback(() => {
    if (!CART_KEY || !code) return;
    const items = loadCartFromStorage(CART_KEY, code);
    setCartItems(items);
  }, [CART_KEY, code]);

  const saveCart = useCallback((newItems: LocalCartItem[]) => {
    if (!CART_KEY || !code) return;
    saveCartToStorage(CART_KEY, newItems, code);
    setCartItems(newItems);
    window.dispatchEvent(new Event('cartUpdated'));
  }, [CART_KEY, code]);

  const getTotalPrice = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cartItems]);

  const getTotalItems = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  // Load cart on mount
  useEffect(() => {
    if (code && CART_KEY) {
      loadCart();
    }
  }, [code, CART_KEY, loadCart]);

  // Listen for cart updates
  useEffect(() => {
    const handleCartUpdate = () => loadCart();
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [loadCart]);

  // SignalR: Token balance güncelleme handler'ı
  const handleTokenBalanceUpdated = useCallback((data: { userId: number; currentTokens: number; message: string }) => {
    setUserTokenBalance(data.currentTokens);
  }, [setUserTokenBalance]);

  // SignalR: Sipariş oluşturuldu handler'ı
  const handleOrderCreated = useCallback((data: any) => {
    // Sipariş oluşturulduğunda bildirim
    if (data.customerCode === code) {
      loadCart(); // Sepeti yenile
    }
  }, [code, loadCart]);

  // SignalR bağlantısı
  useSignalR({
    customerId: customerData?.customer?.id,
    customerCode: code,
    onTokenBalanceUpdated: handleTokenBalanceUpdated,
    onOrderCreated: handleOrderCreated,
    enabled: !!customerData?.customer?.id && sessionValidated,
  });

  // Fetch data - sadece session doğrulandıysa
  useEffect(() => {
    if (!sessionValidated) return;

    async function fetchData() {
      try {
        setLoading(true);
        setCustomerCode(code);

        const customerResponse = await fetch(`/api/customer/${code}`);

        if (!customerResponse.ok) {
          throw new Error('Müşteri bilgisi yüklenemedi');
        }

        const customerInfo = await customerResponse.json();
        setCustomerData(customerInfo);
        setCustomerDataContext(customerInfo);

        // 📊 Ziyaret kaydı - arka planda gönder
        if (customerInfo.customer?.id) {
          trackVisit(customerInfo.customer.id);
        }

        const menuResponse = await fetch(`/api/menu/${code}`);
        if (!menuResponse.ok) throw new Error('Menü yüklenemedi');

        const menuInfo = await menuResponse.json();
        setMenuData(menuInfo);
        setMenuDataContext(menuInfo);

        if (menuInfo.menu && menuInfo.menu.length > 0) {
          setSelectedCategoryId(menuInfo.menu[0].sambaId);
        }

        // Token settings - ürün ve porsiyon bazlı ayrı ayrı
        try {
          const tokenResponse = await fetch(`/api/token-settings/${code}`);
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            const productMap: Record<number, any> = {};
            const portionMap: Record<number, any> = {};

            tokenData.settings.forEach((setting: any) => {
              // Porsiyon bazlı mı kontrol et
              if (setting.sambaPortionId) {
                portionMap[setting.sambaPortionId] = setting;
              } else {
                // Ürün bazlı
                if (setting.productId) productMap[setting.productId] = setting;
                if (setting.sambaProductId) productMap[setting.sambaProductId] = setting;
              }
            });

            setProductTokenSettings(productMap);
            setPortionTokenSettings(portionMap);
          }
        } catch (e) {
        }

        setError(null);
      } catch (err) {
        console.error('Data fetch error:', err);
        setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      } finally {
        setLoading(false);
      }
    }

    if (code && sessionValidated) fetchData();
  }, [code, sessionValidated, setCustomerCode, setCustomerDataContext, setMenuDataContext, setProductTokenSettings, setPortionTokenSettings]);

  // Giriş yapmamış kullanıcılar için otomatik login modalı açma (sadece bir kere)
  const hasShownLoginRef = useRef(false);

  useEffect(() => {
    if (!loading && sessionValidated && menuData && !currentUser && !hasShownLoginRef.current) {
      // Veriler yüklendi ama kullanıcı giriş yapmamış - login modalı aç (sadece 1 kere)
      hasShownLoginRef.current = true;
      openProfile();
    }
  }, [loading, sessionValidated, menuData, currentUser, openProfile]);

  // Kategori tıkla
  const handleCategoryClick = (categoryId: number) => {
    setSelectedCategoryId(categoryId);

    // Ürün section'a scroll
    const section = productSectionsRef.current[categoryId];
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Kategori tab'ını ortala
    setTimeout(() => {
      const tabsContainer = categoryTabsRef.current;
      if (tabsContainer) {
        const activeTab = tabsContainer.querySelector(`button[data-category-id="${categoryId}"]`) as HTMLButtonElement;
        if (activeTab) {
          const containerWidth = tabsContainer.offsetWidth;
          const tabLeft = activeTab.offsetLeft;
          const tabWidth = activeTab.offsetWidth;
          const scrollPosition = tabLeft - (containerWidth / 2) + (tabWidth / 2);
          tabsContainer.scrollTo({ left: scrollPosition, behavior: 'smooth' });
        }
      }
    }, 100);
  };

  // Swipe handlers - kategoriler arası geçiş
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX; // Aynı değerle başlat
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 60; // Minimum swipe mesafesi

    if (Math.abs(diff) < minSwipeDistance) return;

    const cats = menuData?.menu || [];
    if (cats.length === 0) return;

    const currentIndex = cats.findIndex(c => c.sambaId === selectedCategoryId);
    if (currentIndex === -1) return;

    let newCategoryId: number | null = null;

    if (diff > 0 && currentIndex < cats.length - 1) {
      // Sola swipe - sonraki kategori
      newCategoryId = cats[currentIndex + 1].sambaId;
    } else if (diff < 0 && currentIndex > 0) {
      // Sağa swipe - önceki kategori
      newCategoryId = cats[currentIndex - 1].sambaId;
    }

    if (newCategoryId !== null) {
      handleCategoryClick(newCategoryId);
    }
  };

  // Ürün görseli URL
  const getProductImageUrl = (product: Product): string => {
    const picture = product.picture || product.Picture;
    if (picture) {
      if (picture.startsWith('http')) return picture.replace('http://', 'https://');
      const picturePath = picture.startsWith('Uploads/') ? picture.substring('Uploads/'.length) : picture;
      return `https://apicanlimenu.online/Uploads/${picturePath}`;
    }
    return '';
  };

  // Logo URL
  const getLogoUrl = (): string => {
    if (customerData?.customer.logo) {
      if (customerData.customer.logo.startsWith('http')) {
        return customerData.customer.logo.replace('http://', 'https://');
      }
      return `https://apicanlimenu.online/Uploads/${customerData.customer.logo.replace('Uploads/', '')}`;
    }
    return '';
  };

  // Sepete ekle
  const handleAddToCart = (product: Product, portion?: ProductPortion) => {
    if (!currentUser) {
      openProfile();
      return;
    }

    const portions = (product as any).Portions || (product as any).portions || [];
    if (portions.length > 1 && !portion) {
      setPortionModalProduct(product);
      setSelectedPortion(portions[0]);
      return;
    }

    const productId = portion?.id ?? (product.sambaId || product.SambaId || product.id || 0);
    const portionName = portion?.name || '';
    const itemPrice = portion?.price ?? product.price ?? (product as any).Price ?? 0;

    const existingIndex = cartItems.findIndex(item =>
      (item.sambaId === (product.sambaId || product.SambaId) || item.productId === productId) &&
      item.portionName === portionName
    );

    if (existingIndex !== -1) {
      const newItems = [...cartItems];
      newItems[existingIndex].quantity += 1;
      saveCart(newItems);
    } else {
      const productName = product.title || (product as any).Title || '';
      const displayName = portionName ? `${productName} (${portionName})` : productName;

      // sambaPortionId: önce portion'dan, yoksa tek porsiyon varsa ondan, yoksa product'tan al
      const portionId = portion?.sambaPortionId
        || (portions.length === 1 ? portions[0]?.sambaPortionId : undefined)
        || (product as any).SambaPortionId
        || (product as any).sambaPortionId;

      const newItem: LocalCartItem = {
        id: Date.now(),
        productId: product.id || (product as any).Id || productId,
        sambaId: product.sambaId || product.SambaId || 0,
        sambaPortionId: portionId,
        portionName: portionName,
        name: displayName,
        price: itemPrice,
        quantity: 1,
        image: getProductImageUrl(product),
      };
      saveCart([...cartItems, newItem]);
    }
  };


  // Session kontrolü henüz tamamlanmadıysa loading göster
  if (!sessionCheckDone) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '50px', height: '50px', border: '4px solid #e0e0e0', borderTopColor: '#9c27b0', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }} />
          <p style={{ color: '#666' }}>Doğrulanıyor...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Session hatası
  if (sessionError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 100%)' }}>
        <div style={{ textAlign: 'center', padding: '40px', maxWidth: '400px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#333', marginBottom: '12px' }}>Erişim Engellendi</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, marginBottom: '24px' }}>{sessionError}</p>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📱</div>
            <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
              Self servis noktasındaki QR kodu telefonunuzla okutarak sipariş verebilirsiniz.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Self-servis müşteri için kapalıysa
  if (!loading && customerData && !canUseSelfService) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 100%)' }}>
        <div style={{ textAlign: 'center', padding: '40px', maxWidth: '400px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚫</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#333', marginBottom: '12px' }}>Self Servis Kullanılamıyor</h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, marginBottom: '24px' }}>
            {selfServiceDisabledMessage || 'Self servis hizmeti şu an bu restoran için aktif değil.'}
          </p>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🍽️</div>
            <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
              Lütfen garsondan yardım isteyin veya normal menüden sipariş verin.
            </p>
          </div>
          <button
            onClick={() => router.push(`/${code}`)}
            style={{
              marginTop: '20px',
              background: '#9c27b0',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Menüye Git
          </button>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '50px', height: '50px', border: '4px solid #e0e0e0', borderTopColor: '#9c27b0', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }} />
          <p style={{ color: '#666' }}>Menü yükleniyor...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error
  if (error || !menuData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
        <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>😕</div>
          <h2>Bir şeyler yanlış gitti</h2>
          <p>{error || 'Menü bulunamadı'}</p>
          <div style={{ marginTop: '20px', padding: '15px', background: '#fff', borderRadius: '10px', fontSize: '12px', textAlign: 'left', maxWidth: '300px', margin: '20px auto' }}>
            <strong>Debug bilgisi:</strong><br/>
            Code: {code}<br/>
            Session: {sessionId || 'yok'}<br/>
            Validated: {sessionValidated ? 'evet' : 'hayır'}<br/>
            URL: {typeof window !== 'undefined' ? window.location.pathname : '-'}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '15px', padding: '10px 20px', background: '#9c27b0', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  const categories = menuData.menu || [];
  const totalPrice = getTotalPrice();
  const totalItems = getTotalItems();

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', paddingBottom: totalItems > 0 ? '180px' : '100px' }}>
      {/* Kompakt Header */}
      <div style={{ background: '#9c27b0', color: 'white', padding: '10px 15px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Sol: Logo, isim ve Self Servis etiketi */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {getLogoUrl() && (
              <img src={getLogoUrl()} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
            )}
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{customerData?.customer.name || 'Restoran'}</div>
              <div style={{ fontSize: '10px', opacity: 0.85, marginTop: '1px' }}>🍽️ Self Servis</div>
            </div>
          </div>

          {/* Sağ: Süre göstergesi */}
          {showTimeWarning && remainingMinutes !== null && remainingMinutes > 0 ? (
            <div style={{
              background: '#ff6b00',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              animation: 'blink 1s infinite'
            }}>
              ⏰ {remainingMinutes} dk
            </div>
          ) : remainingMinutes !== null ? (
            <div style={{ fontSize: '11px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
              ⏱️ {remainingMinutes} dk
            </div>
          ) : null}
        </div>
      </div>

      {/* Süre dolmak üzere uyarısı - sadece son 5 dk */}
      {showTimeWarning && remainingMinutes !== null && remainingMinutes > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #ff6b00, #ff9500)',
          color: 'white',
          padding: '8px 15px',
          fontSize: '12px',
          textAlign: 'center',
          fontWeight: 500
        }}>
          ⚠️ Oturum süreniz dolmak üzere! Sipariş vermezseniz yeni QR okutmanız gerekecek.
        </div>
      )}

      {/* Blink animation for warning */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      {/* Category Tabs - Kompakt */}
      <div style={{ position: 'sticky', top: '52px', zIndex: 99, background: 'white' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '20px', background: 'linear-gradient(to right, white 60%, transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '20px', background: 'linear-gradient(to left, white 60%, transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div ref={categoryTabsRef} style={{ borderBottom: '1px solid #eee', overflowX: 'auto', whiteSpace: 'nowrap', padding: '0 10px', WebkitOverflowScrolling: 'touch' }} className="hide-scrollbar">
          {categories.map((category) => (
            <button
              key={category.sambaId}
              data-category-id={category.sambaId}
              onClick={() => handleCategoryClick(category.sambaId)}
              style={{
                display: 'inline-block',
                padding: '10px 12px',
                border: 'none',
                background: 'none',
                fontSize: '13px',
                fontWeight: selectedCategoryId === category.sambaId ? 600 : 400,
                color: selectedCategoryId === category.sambaId ? '#9c27b0' : '#666',
                borderBottom: selectedCategoryId === category.sambaId ? '2px solid #9c27b0' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {category.title}
            </button>
          ))}
        </div>
      </div>

      {/* Products - Swipe destekli */}
      <div
        style={{ padding: '12px' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {categories.map((category) => {
          // SubCategoryTag'e göre grupla
          const groupedProducts: { [key: string]: Product[] } = {};
          const ungroupedProducts: Product[] = [];

          category.products.forEach((product: any) => {
            const tag = product.subCategoryTag || product.SubCategoryTag || '';
            if (tag) {
              if (!groupedProducts[tag]) {
                groupedProducts[tag] = [];
              }
              groupedProducts[tag].push(product);
            } else {
              ungroupedProducts.push(product);
            }
          });

          const uniqueTags = Object.keys(groupedProducts).sort();
          const hasTags = uniqueTags.length > 0;
          const hasUngrouped = ungroupedProducts.length > 0;

          // Aktif sub-tab (varsayılan: ilk tag veya 'all')
          let currentSubTab = activeSubTabs[category.sambaId];

          // Varsayılan tab belirleme
          if (!currentSubTab || (!groupedProducts[currentSubTab] && currentSubTab !== 'ungrouped')) {
            if (hasTags) {
              currentSubTab = uniqueTags[0];
            } else {
              currentSubTab = 'all';
            }
          }

          // Gösterilecek ürünler
          let displayProducts: Product[] = [];
          if (!hasTags) {
            // Tag yoksa tüm ürünleri göster
            displayProducts = category.products;
          } else if (currentSubTab === 'ungrouped') {
            displayProducts = ungroupedProducts;
          } else if (groupedProducts[currentSubTab]) {
            displayProducts = groupedProducts[currentSubTab];
          } else {
            // Fallback: tüm ürünleri göster
            displayProducts = category.products;
          }

          return (
          <div key={category.sambaId} ref={(el) => { productSectionsRef.current[category.sambaId] = el; }} style={{ marginBottom: '25px', scrollMarginTop: '100px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#333', marginBottom: '10px' }}>
              {category.title}
            </h2>

            {/* Sub-category tabs */}
            {hasTags && (
              <div style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                paddingBottom: '10px',
                marginBottom: '10px',
                WebkitOverflowScrolling: 'touch'
              }} className="hide-scrollbar">
                {uniqueTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveSubTabs(prev => ({ ...prev, [category.sambaId]: tag }))}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '12px',
                      border: 'none',
                      background: currentSubTab === tag ? '#9c27b0' : '#f0f0f0',
                      color: currentSubTab === tag ? 'white' : '#666',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tag}
                  </button>
                ))}
                {hasUngrouped && (
                  <button
                    onClick={() => setActiveSubTabs(prev => ({ ...prev, [category.sambaId]: 'ungrouped' }))}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '12px',
                      border: 'none',
                      background: currentSubTab === 'ungrouped' ? '#9c27b0' : '#f0f0f0',
                      color: currentSubTab === 'ungrouped' ? 'white' : '#666',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Diğer
                  </button>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {displayProducts.map((product, idx) => {
                const imageUrl = getProductImageUrl(product);
                const productTitle = product.title || product.Title || '';
                const productDetail = product.detail || product.Detail || '';
                const productPrice = product.price || product.Price || 0;
                const portions = (product as any).Portions || (product as any).portions || [];
                const productSambaId = product.sambaId || product.SambaId || product.id;
                // Porsiyon varsa porsiyon bazlı, yoksa ürün bazlı token ayarı
                const productPortionId = portions.length === 1 ? portions[0]?.sambaPortionId : ((product as any).SambaPortionId || (product as any).sambaPortionId);
                const tokenSettings = getTokenSettingsForItem(productSambaId, productPortionId);

                return (
                  <div key={`${category.sambaId}-${product.sambaId || idx}`} style={{ background: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      {/* Ürün görseli - küçük kare (fallback: restoran logosu) */}
                      <div style={{ width: '55px', height: '55px', flexShrink: 0, background: '#f5f5f5', borderRadius: '8px', overflow: 'hidden' }}>
                        <img
                          src={imageUrl || getLogoUrl() || ''}
                          alt={productTitle}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            // Ürün görseli yüklenemezse logo dene
                            if (target.src !== getLogoUrl() && getLogoUrl()) {
                              target.src = getLogoUrl();
                            } else {
                              // Logo da yoksa placeholder
                              target.style.display = 'none';
                              target.parentElement!.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;color:#ccc">🍽️</div>';
                            }
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div>
                          <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#333', margin: '0 0 2px 0' }}>{productTitle}</h3>
                          {productDetail && portions.length <= 1 && (
                            <p style={{ fontSize: '10px', color: '#999', margin: 0, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{productDetail}</p>
                          )}
                        </div>

                        {portions.length > 1 && (
                          <div style={{ marginTop: '6px', marginBottom: '6px' }}>
                            {portions.map((portion: ProductPortion) => {
                              const portionTokens = getTokenSettingsForItem(productSambaId, portion.sambaPortionId);
                              return (
                                <div key={portion.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#444', padding: '4px 0', borderBottom: '1px solid #f5f5f5' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                    <span style={{ fontWeight: 500 }}>{portion.name}</span>
                                    {portionTokens && (portionTokens.redeemTokens > 0 || portionTokens.earnTokens > 0) && (
                                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {portionTokens.redeemTokens > 0 && (
                                          <span style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 600 }}>🪙 {portionTokens.redeemTokens}</span>
                                        )}
                                        {portionTokens.earnTokens > 0 && (
                                          <span style={{ fontSize: '9px', color: '#22c55e', fontWeight: 500 }}>+{portionTokens.earnTokens}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <span style={{ fontWeight: 700, color: '#9c27b0' }}>{portion.price.toFixed(2)} ₺</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: portions.length > 1 ? '0' : '4px', flexWrap: 'wrap', gap: '4px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {portions.length <= 1 && (
                              <>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#9c27b0' }}>{productPrice.toFixed(2)} ₺</span>
                                {/* Tek porsiyon/porsiyonsuz ürünler için jeton bilgisi */}
                                {(() => {
                                  // Porsiyon varsa porsiyon ID, yoksa ürünün kendi sambaPortionId'si
                                  const singlePortionId = portions.length === 1
                                    ? portions[0].sambaPortionId
                                    : ((product as any).SambaPortionId || (product as any).sambaPortionId);
                                  const itemTokens = getTokenSettingsForItem(productSambaId, singlePortionId);
                                  return itemTokens && (
                                    <>
                                      {itemTokens.redeemTokens > 0 && (
                                        <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                          🪙 {itemTokens.redeemTokens} jeton ile
                                        </span>
                                      )}
                                      {itemTokens.earnTokens > 0 && (
                                        <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: 500 }}>
                                          +{itemTokens.earnTokens} jeton kazan
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                          <button
                            onClick={() => handleAddToCart(product)}
                            style={{ background: '#9c27b0', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            + Ekle
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>

      {/* Bottom Cart Bar */}
      {totalItems > 0 && (
        <div style={{ position: 'fixed', bottom: '80px', left: 0, right: 0, background: 'white', borderTop: '1px solid #eee', padding: '12px 20px', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', zIndex: 1000 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div onClick={() => setIsCartOpen(!isCartOpen)} style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: '13px', color: '#666' }}>{totalItems} ürün</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>{totalPrice.toFixed(2)} ₺</div>
            </div>
            <button
              onClick={() => setIsCartOpen(!isCartOpen)}
              style={{ background: '#9c27b0', color: 'white', border: 'none', borderRadius: '12px', padding: '14px 28px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
            >
              {isCartOpen ? 'Sepeti Kapat' : 'Sepete Git →'}
            </button>
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        tableId={sessionId || 'selfservice'}
        customerCode={code}
        isSelfService={true}
      />

      {/* Portion Modal - Mini */}
      {portionModalProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setPortionModalProduct(null)}>
          <div style={{ background: 'white', borderRadius: '10px', width: '85%', maxWidth: '280px', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '15px', color: '#333' }}>{portionModalProduct.title || (portionModalProduct as any).Title}</span>
              <button onClick={() => setPortionModalProduct(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999', padding: 0, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '10px 14px' }}>
              {((portionModalProduct as any).Portions || (portionModalProduct as any).portions || []).map((portion: ProductPortion) => {
                const modalProductSambaId = portionModalProduct.sambaId || (portionModalProduct as any).SambaId || portionModalProduct.id;
                const portionTokens = getTokenSettingsForItem(modalProductSambaId, portion.sambaPortionId);
                return (
                  <div
                    key={portion.id}
                    onClick={() => { setSelectedPortion(portion); handleAddToCart(portionModalProduct, portion); setPortionModalProduct(null); }}
                    style={{
                      padding: '12px 14px',
                      marginBottom: '6px',
                      border: '1px solid #eee',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: 'white',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '14px',
                    }}
                  >
                    <span>{portion.name}</span>
                    <span style={{ fontWeight: 700, color: '#9c27b0' }}>{portion.price.toFixed(2)} ₺</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavBar
        onProfileClick={() => { setIsCartOpen(false); isProfileOpen ? closeProfile() : openProfile(); }}
        onAIClick={() => {}}
        onCartClick={() => { closeProfile(); currentUser ? setIsCartOpen(!isCartOpen) : openProfile(); }}
        onWaiterCall={() => {}}
        onGameClick={() => {}}
        onContactClick={() => { if (customerData?.customer.phone) window.location.href = `tel:${customerData.customer.phone}`; }}
        onSuggestionClick={() => {}}
        onAddressClick={() => {}}
        showAIChat={false}
        showCart={true}
        showWaiterCall={false}
        showGame={false}
        showAddresses={false}
        phone={customerData?.customer.phone}
        cartItemCount={totalItems}
      />

      {/* Profile Sidebar */}
      <ProfileSidebar isOpen={isProfileOpen} onClose={closeProfile} customerCode={code} openRegister={!currentUser} />

      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
}

// Suspense ile sarılmış export - searchParams için gerekli
export default function SelfServicePage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SelfServiceContent />
    </Suspense>
  );
}
