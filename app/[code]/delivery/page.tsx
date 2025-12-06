'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/UserContext';
import { useMenu } from '@/contexts/MenuContext';
import { saveCart as saveCartToStorage, loadCart as loadCartFromStorage, clearCart as clearCartFromStorage } from '@/utils/cartUtils';
import BottomNavBar from '@/components/layout/BottomNavBar';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import CartSidebar from '@/components/cart/CartSidebar';
import type { MenuDto, CustomerInfoResponse, Product } from '@/types/api';
import turkeyAddressData from '@/data/turkey-addresses.json';

// Local cart item interface (localStorage için)
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

// Delivery Address Type
interface DeliveryAddress {
  city: string;
  district: string;
  neighborhood: string;
  street: string;
  buildingNo: string;
  floor: string;
  apartmentNo: string;
  directions: string;
}

// Saved Address Type (API'den gelen)
interface SavedAddress {
  id: number;
  title?: string;
  city: string;
  district: string;
  neighborhood: string;
  street: string;
  buildingNo: string;
  floor?: string;
  apartmentNo?: string;
  directions?: string;
  isDefault: boolean;
  fullAddress?: string;
}

// Türkiye Adres Verisi - @/data/turkey-addresses.json'dan import edildi
// 81 İl, 1010 İlçe, 32283 Mahalle
type TurkeyAddressData = { [city: string]: { [district: string]: string[] } };
const addressData = turkeyAddressData as TurkeyAddressData;

export default function DeliveryPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  // Delivery için sabit cart key
  const DELIVERY_CART_KEY = 'delivery';

  // Context'leri kullan (CartContext hariç - localStorage kullanacağız)
  const { currentUser } = useAuth();
  const {
    isProfileOpen,
    openProfile,
    closeProfile,
    setCustomerCode,
    setMenuData: setMenuDataContext,
    setCustomerData: setCustomerDataContext,
    setProductTokenSettings,
    setPortionTokenSettings,
    getTokenSettingsForItem,
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
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Porsiyon seçimi için state
  const [portionModalProduct, setPortionModalProduct] = useState<Product | null>(null);
  const [selectedPortion, setSelectedPortion] = useState<ProductPortion | null>(null);

  // Address state
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    city: '',
    district: '',
    neighborhood: '',
    street: '',
    buildingNo: '',
    floor: '',
    apartmentNo: '',
    directions: '',
  });

  // Saved addresses (API'den)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [addressMode, setAddressMode] = useState<'list' | 'new' | 'edit'>('list');
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressTitle, setAddressTitle] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);

  // Delivery settings (Backend'den çekilecek)
  const [deliverySettings, setDeliverySettings] = useState({
    minOrderAmount: 0,
    deliveryFee: 0,
    freeDeliveryThreshold: 0,
    estimatedDeliveryTime: 30,
    isEnabled: false,
  });

  // Restoran kapalı mı? (müşteri tarafından kapatıldıysa)
  const [isStoreClosed, setIsStoreClosed] = useState(false);

  // Dinamik sayfa başlığı - Restoran adına göre
  useEffect(() => {
    if (customerData?.customer?.name) {
      document.title = `${customerData.customer.name} - Paket Servis | Dijital Menü`;
    }
  }, [customerData?.customer?.name]);

  // Refs for scroll sync
  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const productSectionsRef = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Cart state (localStorage tabanlı)
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
        if (diffMinutes < 30) return;
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

  // Cart functions
  const loadCart = useCallback(() => {
    if (!code) return;
    const items = loadCartFromStorage(DELIVERY_CART_KEY, code);
    setCartItems(items);
  }, [code]);

  const saveCart = useCallback((newItems: LocalCartItem[]) => {
    if (!code) return;
    saveCartToStorage(DELIVERY_CART_KEY, newItems, code);
    setCartItems(newItems);
    window.dispatchEvent(new Event('cartUpdated'));
  }, [code]);

  const getTotalPrice = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cartItems]);

  const getTotalItems = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  // Load cart on mount
  useEffect(() => {
    if (code) {
      loadCart();
    }
  }, [code, loadCart]);

  // Listen for cart updates from CartSidebar
  useEffect(() => {
    const handleCartUpdate = () => loadCart();
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [loadCart]);

  // Fetch data - Ana sayfa ile aynı API'leri kullan
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setCustomerCode(code); // Context'e kaydet

        // Önce customer bilgisini al
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

        // Delivery settings'i customer'dan al
        if (customerInfo?.customer) {
          const c = customerInfo.customer;

          // Paket servis kontrolü:
          // 1. hasDeliveryAccess = Süperadmin erişim hakkı vermiş mi?
          // 2. isDeliveryEnabled = Müşteri kendi paket servisi açmış mı?
          const hasAccess = c.hasDeliveryAccess ?? c.HasDeliveryAccess ?? false;
          const isEnabled = c.isDeliveryEnabled ?? c.IsDeliveryEnabled ?? false;

          console.log('🔍 Delivery Check:', { hasAccess, isEnabled });

          // Süperadmin erişim vermemişse → menüye yönlendir
          if (!hasAccess) {
            console.log('🚫 Paket servis erişim hakkı yok, menüye yönlendiriliyor...');
            router.replace(`/${code}`);
            return;
          }

          // Müşteri kapatmışsa → sayfa açılsın ama "kapalı" modunda
          if (!isEnabled) {
            console.log('🏪 Restoran paket servisi kapatmış - kapalı modu aktif');
            setIsStoreClosed(true);
          }

          setDeliverySettings({
            minOrderAmount: c.minimumOrderAmount ?? c.MinimumOrderAmount ?? 0,
            deliveryFee: c.deliveryFee ?? c.DeliveryFee ?? 0,
            freeDeliveryThreshold: c.freeDeliveryThreshold ?? c.FreeDeliveryThreshold ?? 0,
            estimatedDeliveryTime: c.estimatedDeliveryTime ?? c.EstimatedDeliveryTime ?? 30,
            isEnabled: isEnabled,
          });
        } else {
          // Customer bilgisi yoksa da yönlendir
          router.replace(`/${code}`);
          return;
        }

        // Sonra menu bilgisini al (kategoriler ve ürünler dahil)
        const menuResponse = await fetch(`/api/menu/${code}`);
        if (!menuResponse.ok) {
          throw new Error('Menü yüklenemedi');
        }
        const menuInfo = await menuResponse.json();
        setMenuData(menuInfo);
        setMenuDataContext(menuInfo);

        // İlk kategoriyi seç
        if (menuInfo.menu && menuInfo.menu.length > 0) {
          setSelectedCategoryId(menuInfo.menu[0].sambaId);
        }

        // Token settings yükle (jeton sistemi için) - ürün ve porsiyon bazlı ayrı ayrı
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
        } catch (tokenErr) {
          console.log('Token settings yüklenemedi:', tokenErr);
        }

        setError(null);
      } catch (err) {
        console.error('Data fetch error:', err);
        setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      } finally {
        setLoading(false);
      }
    }

    if (code) {
      fetchData();
    }
  }, [code, router, setCustomerCode, setCustomerDataContext, setMenuDataContext]);

  // Kayıtlı adresi localStorage'dan yükle
  useEffect(() => {
    const savedAddr = localStorage.getItem('deliveryAddress');
    if (savedAddr) {
      try {
        setDeliveryAddress(JSON.parse(savedAddr));
      } catch (e) {
        console.error('Failed to parse saved address');
      }
    }
  }, []);

  // Kategori tıkla - bölüme scroll
  const handleCategoryClick = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    const section = productSectionsRef.current[categoryId];
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Ürün görseli URL'i
  const getProductImageUrl = (product: Product): string => {
    const picture = product.picture || product.Picture;
    if (picture) {
      if (picture.startsWith('http')) {
        return picture.replace('http://', 'https://');
      }
      const picturePath = picture.startsWith('Uploads/')
        ? picture.substring('Uploads/'.length)
        : picture;
      return `https://canlimenu.online/Uploads/${picturePath}`;
    }
    return '';
  };

  // Logo URL'i
  const getLogoUrl = (): string => {
    if (customerData?.customer.logo) {
      if (customerData.customer.logo.startsWith('http')) {
        return customerData.customer.logo.replace('http://', 'https://');
      }
      return `https://canlimenu.online/Uploads/${customerData.customer.logo.replace('Uploads/', '')}`;
    }
    return '';
  };

  // Teslimat ücreti hesapla
  const calculateDeliveryFee = (): number => {
    const total = getTotalPrice();
    if (total >= deliverySettings.freeDeliveryThreshold) {
      return 0;
    }
    return deliverySettings.deliveryFee;
  };

  // Minimum sipariş kontrolü
  const isMinOrderReached = (): boolean => {
    return getTotalPrice() >= deliverySettings.minOrderAmount;
  };

  // Sepette ürün miktarını bul (tüm porsiyonlar dahil)
  const getItemQuantityInCart = (productSambaId: number): number => {
    return cartItems
      .filter(item => item.sambaId === productSambaId || item.productId === productSambaId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  // Sepette ürün index'ini bul
  const getItemIndexInCart = (productSambaId: number): number => {
    return cartItems.findIndex(item =>
      item.sambaId === productSambaId || item.productId === productSambaId
    );
  };

  // Sepetteki ürünün porsiyonlarını getir
  const getProductPortionsInCart = (productSambaId: number): LocalCartItem[] => {
    return cartItems.filter(item =>
      item.sambaId === productSambaId || item.productId === productSambaId
    );
  };

  // Porsiyon bazlı miktar güncelle
  const handleUpdatePortionQuantity = (cartItemId: number, newQuantity: number) => {
    const index = cartItems.findIndex(item => item.id === cartItemId);
    if (index === -1) return;

    if (newQuantity <= 0) {
      const newItems = cartItems.filter((_, i) => i !== index);
      saveCart(newItems);
    } else {
      const newItems = [...cartItems];
      newItems[index].quantity = newQuantity;
      saveCart(newItems);
    }
  };

  // Sepete ekle - Giriş yapmış olmalı
  const handleAddToCart = (product: Product, portion?: ProductPortion) => {
    if (!currentUser) {
      // Giriş yapmamış - profil sidebar'ı aç
      openProfile();
      return;
    }

    // Porsiyonlu ürün kontrolü
    const portions = (product as any).Portions || (product as any).portions || [];
    if (portions.length > 1 && !portion) {
      // Porsiyon seçimi gerekli - modal aç
      setPortionModalProduct(product);
      setSelectedPortion(portions[0]);
      return;
    }

    const productId = portion?.id ?? (product.sambaId || product.SambaId || product.id || 0);
    const portionName = portion?.name || '';
    const itemPrice = portion?.price ?? product.price ?? (product as any).Price ?? 0;

    // Aynı ürün + aynı porsiyon kombinasyonunu bul
    const existingIndex = cartItems.findIndex(item =>
      (item.sambaId === (product.sambaId || product.SambaId) || item.productId === productId) &&
      item.portionName === portionName
    );

    if (existingIndex !== -1) {
      // Varsa miktarı artır
      const newItems = [...cartItems];
      newItems[existingIndex].quantity += 1;
      saveCart(newItems);
    } else {
      // Yoksa yeni ekle
      const productName = product.title || (product as any).Title || '';
      const displayName = portionName ? `${productName} (${portionName})` : productName;

      const newItem: LocalCartItem = {
        id: Date.now(),
        productId: product.id || (product as any).Id || productId,
        sambaId: product.sambaId || product.SambaId || 0,
        sambaPortionId: portion?.sambaPortionId,
        portionName: portionName,
        name: displayName,
        price: itemPrice,
        quantity: 1,
        image: getProductImageUrl(product),
      };
      saveCart([...cartItems, newItem]);
    }
  };

  // Miktarı güncelle
  const handleUpdateQuantity = (productSambaId: number, newQuantity: number) => {
    const index = getItemIndexInCart(productSambaId);
    if (index === -1) return;

    if (newQuantity <= 0) {
      // Sil
      const newItems = cartItems.filter((_, i) => i !== index);
      saveCart(newItems);
    } else {
      // Güncelle
      const newItems = [...cartItems];
      newItems[index].quantity = newQuantity;
      saveCart(newItems);
    }
  };

  // Sepeti aç - adres kontrolü ile (selfservice modunda adres gerekmez)
  const handleOpenCart = () => {
    if (!currentUser) {
      openProfile();
      return;
    }

    // Adres eksikse önce adres modal'ı aç
    if (!deliveryAddress.city || !deliveryAddress.district || !deliveryAddress.neighborhood || !deliveryAddress.street || !deliveryAddress.buildingNo) {
      setShowAddressModal(true);
      return;
    }

    setIsCartOpen(true);
  };

  // API'den adresleri çek
  const fetchAddresses = useCallback(async () => {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    try {
      setAddressLoading(true);
      const response = await fetch('/api/user/addresses', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.addresses) {
          setSavedAddresses(data.addresses);
          // Varsayılan adresi seç
          const defaultAddr = data.addresses.find((a: SavedAddress) => a.isDefault);
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
            setDeliveryAddress({
              city: defaultAddr.city,
              district: defaultAddr.district,
              neighborhood: defaultAddr.neighborhood,
              street: defaultAddr.street,
              buildingNo: defaultAddr.buildingNo,
              floor: defaultAddr.floor || '',
              apartmentNo: defaultAddr.apartmentNo || '',
              directions: defaultAddr.directions || '',
            });
          }
        }
      }
    } catch (error) {
      console.error('Adres çekme hatası:', error);
    } finally {
      setAddressLoading(false);
    }
  }, []);

  // Kullanıcı giriş yaptığında adresleri çek (sadece id değişince)
  useEffect(() => {
    const userId = currentUser?.id || currentUser?.userId || currentUser?.Id;
    if (userId) {
      fetchAddresses();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.userId, currentUser?.Id]);

  // Yeni adres kaydet (API'ye)
  const handleSaveNewAddress = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      alert('Adres kaydetmek için giriş yapmalısınız');
      return;
    }

    try {
      setAddressLoading(true);
      const response = await fetch('/api/user/addresses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: addressTitle || 'Adresim',
          city: deliveryAddress.city,
          district: deliveryAddress.district,
          neighborhood: deliveryAddress.neighborhood,
          street: deliveryAddress.street,
          buildingNo: deliveryAddress.buildingNo,
          floor: deliveryAddress.floor || null,
          apartmentNo: deliveryAddress.apartmentNo || null,
          directions: deliveryAddress.directions || null,
          isDefault: savedAddresses.length === 0, // İlk adres varsayılan olsun
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchAddresses();
        setAddressMode('list');
        setAddressTitle('');
        // Yeni eklenen adresi seç
        if (data.address?.id) {
          setSelectedAddressId(data.address.id);
        }
      } else {
        alert(data.error || 'Adres kaydedilemedi');
      }
    } catch (error) {
      console.error('Adres kaydetme hatası:', error);
      alert('Adres kaydedilemedi');
    } finally {
      setAddressLoading(false);
    }
  };

  // Adres sil
  const handleDeleteAddress = async (addressId: number) => {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    if (!confirm('Bu adresi silmek istediğinize emin misiniz?')) return;

    try {
      const response = await fetch(`/api/user/addresses/${addressId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        await fetchAddresses();
        if (selectedAddressId === addressId) {
          setSelectedAddressId(null);
        }
      }
    } catch (error) {
      console.error('Adres silme hatası:', error);
    }
  };

  // Varsayılan adres yap
  const handleSetDefaultAddress = async (addressId: number) => {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    try {
      const response = await fetch(`/api/user/addresses/${addressId}/default`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        await fetchAddresses();
      }
    } catch (error) {
      console.error('Varsayılan adres hatası:', error);
    }
  };

  // Kayıtlı adresi seç
  const handleSelectAddress = (address: SavedAddress) => {
    setSelectedAddressId(address.id);
    setDeliveryAddress({
      city: address.city,
      district: address.district,
      neighborhood: address.neighborhood,
      street: address.street,
      buildingNo: address.buildingNo,
      floor: address.floor || '',
      apartmentNo: address.apartmentNo || '',
      directions: address.directions || '',
    });
    setShowAddressModal(false);
    // Adres seçildikten sonra sepeti aç
    if (getTotalItems() > 0) {
      setIsCartOpen(true);
    }
  };

  // Eski fonksiyon - localStorage ile (giriş yapmamış kullanıcılar için)
  const handleSaveAddress = () => {
    localStorage.setItem('deliveryAddress', JSON.stringify(deliveryAddress));
    setShowAddressModal(false);
    // Adres kaydedildikten sonra sepeti aç
    if (getTotalItems() > 0) {
      setIsCartOpen(true);
    }
  };

  // Yeni adres formu aç
  const openNewAddressForm = () => {
    setAddressMode('new');
    setAddressTitle('');
    setDeliveryAddress({
      city: '',
      district: '',
      neighborhood: '',
      street: '',
      buildingNo: '',
      floor: '',
      apartmentNo: '',
      directions: '',
    });
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f5f5f5',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e0e0e0',
            borderTopColor: '#ff6b00',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 15px',
          }} />
          <p style={{ color: '#666' }}>Menü yükleniyor...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error || !menuData) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f5f5f5',
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>😕</div>
          <h2>Bir şeyler yanlış gitti</h2>
          <p>{error || 'Menü bulunamadı'}</p>
        </div>
      </div>
    );
  }

  const categories = menuData.menu || [];
  const totalPrice = getTotalPrice();
  const totalItems = getTotalItems();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      paddingBottom: totalItems > 0 ? '180px' : '100px', // Navbar (80px) + Cart bar
    }}>
      {/* Header */}
      <div style={{
        background: '#ff6b00',
        color: 'white',
        padding: '15px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {getLogoUrl() && (
              <img
                src={getLogoUrl()}
                alt="Logo"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                }}
              />
            )}
            <div>
              <div style={{ fontSize: '12px', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🛵 Paket Servis</span>
                {deliverySettings.estimatedDeliveryTime > 0 && (
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                    ⏱️ ~{deliverySettings.estimatedDeliveryTime} dk
                  </span>
                )}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>
                {customerData?.customer.name || 'Restoran'}
              </div>
            </div>
          </div>

          {/* Sepet Simgesi */}
          <button
            onClick={() => !isStoreClosed && totalItems > 0 ? handleOpenCart() : null}
            style={{
              background: isStoreClosed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 12px',
              cursor: !isStoreClosed && totalItems > 0 ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              position: 'relative',
              opacity: isStoreClosed ? 0.5 : 1,
            }}
          >
            <span style={{ fontSize: '22px' }}>🛒</span>
            {totalItems > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: '#fff',
                color: '#ff6b00',
                fontSize: '12px',
                fontWeight: 700,
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {/* Address Section */}
        <div
            onClick={() => setShowAddressModal(true)}
            style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '10px',
              padding: '10px 15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>📍</span>
              <div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Teslimat Adresi</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>
                  {deliveryAddress.street
                    ? `${deliveryAddress.street} No:${deliveryAddress.buildingNo}`
                    : 'Adres ekleyin'}
                </div>
              </div>
            </div>
            <span style={{ fontSize: '18px' }}>›</span>
          </div>
      </div>

      {/* Kapalı Banner */}
      {isStoreClosed && (
        <div style={{
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          padding: '15px 20px',
          textAlign: 'center',
          boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)',
        }}>
          <div style={{ fontSize: '20px', marginBottom: '5px' }}>🚫</div>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>Paket Servis Şu An Kapalı</div>
          <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '5px' }}>
            Restoran şu an sipariş almıyor. Lütfen daha sonra tekrar deneyin.
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div style={{
        position: 'sticky',
        top: isStoreClosed ? '118px' : '118px',
        zIndex: 99,
        background: 'white',
      }}>
        {/* Left fade/arrow indicator */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '40px',
          background: 'linear-gradient(to right, white 50%, transparent)',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingLeft: '5px',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: '16px', color: '#999' }}>‹</span>
        </div>

        {/* Right fade/arrow indicator */}
        <div style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '40px',
          background: 'linear-gradient(to left, white 50%, transparent)',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '5px',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: '16px', color: '#999' }}>›</span>
        </div>

        <div
          ref={categoryTabsRef}
          style={{
            borderBottom: '1px solid #eee',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            padding: '0 35px',
            WebkitOverflowScrolling: 'touch',
          }}
          className="hide-scrollbar"
        >
          {categories.map((category) => (
            <button
              key={category.sambaId}
              onClick={() => handleCategoryClick(category.sambaId)}
              style={{
                display: 'inline-block',
                padding: '15px 20px',
                border: 'none',
                background: 'none',
                fontSize: '14px',
                fontWeight: selectedCategoryId === category.sambaId ? 600 : 400,
                color: selectedCategoryId === category.sambaId ? '#ff6b00' : '#666',
                borderBottom: selectedCategoryId === category.sambaId ? '3px solid #ff6b00' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {category.title}
            </button>
          ))}
        </div>
      </div>

      {/* Products List */}
      <div style={{ padding: '15px' }}>
        {categories.map((category) => (
          <div
            key={category.sambaId}
            ref={(el) => { productSectionsRef.current[category.sambaId] = el; }}
            style={{ marginBottom: '25px' }}
          >
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '15px',
              paddingBottom: '10px',
              borderBottom: '2px solid #ff6b00',
              display: 'inline-block',
            }}>
              {category.title}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {category.products.map((product, productIndex) => {
                const imageUrl = getProductImageUrl(product);
                const productTitle = product.title || product.Title || '';
                const productDetail = product.detail || product.Detail || product.description || '';
                const productPrice = product.price || product.Price || 0;
                const productId = product.sambaId || product.SambaId || productIndex;

                return (
                  <div
                    key={`${category.sambaId}-${productId}-${productIndex}`}
                    style={{
                      background: 'white',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'stretch',
                    }}>
                    {/* Product Image */}
                    {imageUrl && (
                      <div style={{
                        width: '70px',
                        minHeight: '70px',
                        flexShrink: 0,
                        background: '#f5f5f5',
                      }}>
                        <img
                          src={imageUrl}
                          alt={productTitle}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Product Info */}
                    <div style={{
                      flex: 1,
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}>
                      {(() => {
                        const portions = (product as any).Portions || (product as any).portions || [];

                        return (
                          <>
                            <div>
                              <h3 style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#333',
                                margin: '0 0 2px 0',
                              }}>
                                {productTitle}
                              </h3>
                              {productDetail && portions.length <= 1 && (
                                <p style={{
                                  fontSize: '10px',
                                  color: '#999',
                                  margin: 0,
                                  lineHeight: 1.3,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}>
                                  {productDetail}
                                </p>
                              )}
                            </div>

                            {/* Porsiyonlu ürün - porsiyonları listele */}
                            {portions.length > 1 && (
                              <div style={{ marginTop: '6px', marginBottom: '6px' }}>
                                {portions.map((portion: ProductPortion, idx: number) => (
                                  <div
                                    key={portion.id}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      fontSize: '13px',
                                      color: '#444',
                                      padding: '3px 0',
                                    }}
                                  >
                                    <span style={{ fontWeight: 500 }}>{portion.name}</span>
                                    <span style={{ fontWeight: 700, color: '#ff6b00' }}>
                                      {portion.price.toFixed(2)} ₺
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Fiyat ve Buton */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginTop: portions.length > 1 ? '0' : '4px',
                            }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {/* Porsiyonsuz ürün fiyatı */}
                                {portions.length <= 1 && (
                                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#ff6b00' }}>
                                    {productPrice.toFixed(2)} ₺
                                  </span>
                                )}
                                {/* Jeton bilgileri - porsiyon bazlı kontrol */}
                                {(() => {
                                  const portionId = portions.length === 1
                                    ? portions[0]?.sambaPortionId
                                    : ((product as any).SambaPortionId || (product as any).sambaPortionId);
                                  const tokenSettings = getTokenSettingsForItem(productId, portionId);
                                  if (!tokenSettings || (tokenSettings.redeemTokens <= 0 && tokenSettings.earnTokens <= 0)) return null;
                                  return (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                      {tokenSettings.redeemTokens > 0 && (
                                        <span style={{
                                          fontSize: '9px',
                                          color: '#fff',
                                          fontWeight: 700,
                                          background: 'linear-gradient(135deg, #ff9800, #ff6d00)',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          boxShadow: '0 1px 3px rgba(255,152,0,0.3)',
                                        }}>
                                          🪙 {tokenSettings.redeemTokens} jetona al
                                        </span>
                                      )}
                                      {tokenSettings.earnTokens > 0 && (
                                        <span style={{
                                          fontSize: '9px',
                                          color: '#fff',
                                          fontWeight: 700,
                                          background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          boxShadow: '0 1px 3px rgba(76,175,80,0.3)',
                                        }}>
                                          +{tokenSettings.earnTokens} jeton kazan
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>

                              {isStoreClosed ? (
                                <button
                                  disabled
                                  style={{
                                    background: '#ccc',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '5px 10px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'not-allowed',
                                    opacity: 0.6,
                                  }}
                                >
                                  🚫 Kapalı
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleAddToCart(product)}
                                  style={{
                                    background: '#ff6b00',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '5px 10px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  + Ekle
                                </button>
                              )}
                            </div>

                          </>
                        );
                      })()}
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Fixed Bottom Cart Bar - Navbar'ın üstünde (kapalı durumda gizle) */}
      {totalItems > 0 && !isStoreClosed && (
        <div style={{
          position: 'fixed',
          bottom: '80px', // BottomNavBar yüksekliği
          left: 0,
          right: 0,
          background: 'white',
          borderTop: '1px solid #eee',
          padding: '12px 20px',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
          zIndex: 1000,
        }}>
          {/* Minimum order warning */}
          {!isMinOrderReached() && (
            <div style={{
              background: '#fff5f0',
              padding: '8px 12px',
              borderRadius: '8px',
              marginBottom: '10px',
              fontSize: '13px',
              color: '#ff6b00',
            }}>
              💡 {(deliverySettings.minOrderAmount - totalPrice).toFixed(2)}₺ daha ekleyin, minimum tutara ulaşın!
            </div>
          )}

          {/* Free delivery hint */}
          {isMinOrderReached() && totalPrice < deliverySettings.freeDeliveryThreshold && (
            <div style={{
              background: '#f0fff4',
              padding: '8px 12px',
              borderRadius: '8px',
              marginBottom: '10px',
              fontSize: '13px',
              color: '#22c55e',
            }}>
              🚚 {(deliverySettings.freeDeliveryThreshold - totalPrice).toFixed(2)}₺ daha ekleyin, teslimat ücretsiz!
            </div>
          )}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div onClick={handleOpenCart} style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: '13px', color: '#666' }}>
                {totalItems} ürün
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>
                {totalPrice.toFixed(2)} ₺
                {calculateDeliveryFee() > 0 && (
                  <span style={{ fontSize: '12px', fontWeight: 400, color: '#888', marginLeft: '5px' }}>
                    +{calculateDeliveryFee()}₺ teslimat
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleOpenCart}
              disabled={!isMinOrderReached()}
              style={{
                background: isMinOrderReached() ? '#ff6b00' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '14px 28px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: isMinOrderReached() ? 'pointer' : 'not-allowed',
              }}
            >
              Sepete Git →
            </button>
          </div>
        </div>
      )}

      {/* Address Modal */}
      {showAddressModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: '80px',
          background: 'rgba(0,0,0,0.5)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'flex-end',
        }}
        onClick={() => { setShowAddressModal(false); setAddressMode('list'); }}
        >
          <div
            style={{
              background: 'white',
              width: '100%',
              maxHeight: '85vh',
              borderRadius: '20px 20px 0 0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {addressMode !== 'list' && (
                  <button
                    onClick={() => setAddressMode('list')}
                    style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: 0 }}
                  >
                    ←
                  </button>
                )}
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                  📍 {addressMode === 'list' ? 'Teslimat Adresi' : 'Yeni Adres Ekle'}
                </h3>
              </div>
              <button
                onClick={() => { setShowAddressModal(false); setAddressMode('list'); }}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Kayıtlı Adresler Listesi */}
              {addressMode === 'list' && (
                <>
                  {addressLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <div style={{ fontSize: '14px', color: '#666' }}>Adresler yükleniyor...</div>
                    </div>
                  ) : currentUser && savedAddresses.length > 0 ? (
                    <>
                      {savedAddresses.map((address) => (
                        <div
                          key={address.id}
                          onClick={() => handleSelectAddress(address)}
                          style={{
                            padding: '15px',
                            marginBottom: '10px',
                            border: selectedAddressId === address.id ? '2px solid #ff6b00' : '1px solid #eee',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            background: selectedAddressId === address.id ? '#fff8f5' : 'white',
                            position: 'relative',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                            <span style={{ fontWeight: 600, fontSize: '15px' }}>
                              {address.title || 'Adresim'}
                            </span>
                            {address.isDefault && (
                              <span style={{
                                fontSize: '10px',
                                background: '#ff6b00',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '4px',
                              }}>
                                Varsayılan
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.4 }}>
                            {address.fullAddress || `${address.neighborhood} Mah. ${address.street} No:${address.buildingNo} ${address.district}/${address.city}`}
                          </div>
                          {/* Adres İşlemleri */}
                          <div style={{
                            display: 'flex',
                            gap: '10px',
                            marginTop: '10px',
                            borderTop: '1px solid #f0f0f0',
                            paddingTop: '10px',
                          }}
                          onClick={(e) => e.stopPropagation()}
                          >
                            {!address.isDefault && (
                              <button
                                onClick={() => handleSetDefaultAddress(address.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ff6b00',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                              >
                                Varsayılan Yap
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteAddress(address.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#dc3545',
                                fontSize: '12px',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              Sil
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : currentUser ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                      <div style={{ fontSize: '40px', marginBottom: '10px' }}>📍</div>
                      <p>Henüz kayıtlı adresiniz yok</p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                      <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔐</div>
                      <p>Adres kaydetmek için giriş yapın</p>
                      <button
                        onClick={() => { setShowAddressModal(false); openProfile(); }}
                        style={{
                          marginTop: '10px',
                          background: '#ff6b00',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 20px',
                          cursor: 'pointer',
                        }}
                      >
                        Giriş Yap
                      </button>
                    </div>
                  )}

                  {/* Yeni Adres Ekle Butonu */}
                  {currentUser && (
                    <button
                      onClick={openNewAddressForm}
                      style={{
                        width: '100%',
                        padding: '15px',
                        background: 'white',
                        border: '2px dashed #ddd',
                        borderRadius: '12px',
                        fontSize: '15px',
                        fontWeight: 500,
                        color: '#666',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '10px',
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>+</span> Yeni Adres Ekle
                    </button>
                  )}
                </>
              )}

              {/* Yeni Adres Formu */}
              {addressMode === 'new' && (
                <>
                  {/* Adres Başlığı */}
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '5px', color: '#555' }}>
                      Adres Başlığı
                    </label>
                    <input
                      type="text"
                      value={addressTitle}
                      onChange={(e) => setAddressTitle(e.target.value)}
                      placeholder="Ev, İş, Annemin Evi..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '10px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* İl Seçimi */}
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '5px', color: '#555' }}>
                      İl *
                    </label>
                    <select
                      value={deliveryAddress.city}
                      onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value, district: '', neighborhood: '' })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box', background: 'white' }}
                    >
                      <option value="">İl Seçin</option>
                      {Object.keys(addressData).sort().map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  {/* İlçe ve Mahalle */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '5px', color: '#555' }}>İlçe *</label>
                      <select
                        value={deliveryAddress.district}
                        onChange={(e) => setDeliveryAddress({ ...deliveryAddress, district: e.target.value, neighborhood: '' })}
                        disabled={!deliveryAddress.city}
                        style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box', background: deliveryAddress.city ? 'white' : '#f5f5f5' }}
                      >
                        <option value="">İlçe Seçin</option>
                        {deliveryAddress.city && addressData[deliveryAddress.city] &&
                          Object.keys(addressData[deliveryAddress.city]).sort().map(district => (
                            <option key={district} value={district}>{district}</option>
                          ))
                        }
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '5px', color: '#555' }}>Mahalle *</label>
                      <select
                        value={deliveryAddress.neighborhood}
                        onChange={(e) => setDeliveryAddress({ ...deliveryAddress, neighborhood: e.target.value })}
                        disabled={!deliveryAddress.district}
                        style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box', background: deliveryAddress.district ? 'white' : '#f5f5f5' }}
                      >
                        <option value="">Mahalle Seçin</option>
                        {deliveryAddress.city && deliveryAddress.district &&
                          addressData[deliveryAddress.city]?.[deliveryAddress.district]?.sort().map(neighborhood => (
                            <option key={neighborhood} value={neighborhood}>{neighborhood}</option>
                          ))
                        }
                      </select>
                    </div>
                  </div>

                  {/* Sokak */}
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '5px', color: '#555' }}>Sokak / Cadde *</label>
                    <input
                      type="text"
                      value={deliveryAddress.street}
                      onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })}
                      placeholder="Örn: Moda Caddesi"
                      style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Bina No, Kat, Daire */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '5px', color: '#555' }}>Bina No *</label>
                      <input type="text" value={deliveryAddress.buildingNo} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, buildingNo: e.target.value })} placeholder="45" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '5px', color: '#555' }}>Kat</label>
                      <input type="text" value={deliveryAddress.floor} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, floor: e.target.value })} placeholder="3" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '5px', color: '#555' }}>Daire</label>
                      <input type="text" value={deliveryAddress.apartmentNo} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, apartmentNo: e.target.value })} placeholder="12" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  {/* Adres Tarifi */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '5px', color: '#555' }}>Adres Tarifi</label>
                    <textarea
                      value={deliveryAddress.directions}
                      onChange={(e) => setDeliveryAddress({ ...deliveryAddress, directions: e.target.value })}
                      placeholder="Sarı bina, bahçeli, kapıda zil var..."
                      rows={2}
                      style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '10px', fontSize: '14px', resize: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <button
                    onClick={handleSaveNewAddress}
                    disabled={addressLoading || !deliveryAddress.city || !deliveryAddress.district || !deliveryAddress.neighborhood || !deliveryAddress.street || !deliveryAddress.buildingNo}
                    style={{
                      width: '100%',
                      background: (deliveryAddress.city && deliveryAddress.district && deliveryAddress.neighborhood && deliveryAddress.street && deliveryAddress.buildingNo) ? '#ff6b00' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '15px',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: (deliveryAddress.city && deliveryAddress.district && deliveryAddress.neighborhood && deliveryAddress.street && deliveryAddress.buildingNo) ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {addressLoading ? 'Kaydediliyor...' : 'Adresi Kaydet'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Porsiyon Seçim Modalı */}
      {portionModalProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
        onClick={() => setPortionModalProduct(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '400px',
              maxHeight: '80vh',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                Porsiyon Seçin
              </h3>
              <button
                onClick={() => setPortionModalProduct(null)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' }}
              >
                ×
              </button>
            </div>

            {/* Ürün Bilgisi */}
            <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {getProductImageUrl(portionModalProduct) && (
                  <img
                    src={getProductImageUrl(portionModalProduct)}
                    alt=""
                    style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>
                    {portionModalProduct.title || (portionModalProduct as any).Title}
                  </div>
                </div>
              </div>
            </div>

            {/* Porsiyon Listesi */}
            <div style={{ padding: '15px 20px', maxHeight: '300px', overflowY: 'auto' }}>
              {((portionModalProduct as any).Portions || (portionModalProduct as any).portions || []).map((portion: ProductPortion) => (
                <div
                  key={portion.id}
                  onClick={() => setSelectedPortion(portion)}
                  style={{
                    padding: '12px 15px',
                    marginBottom: '10px',
                    border: selectedPortion?.id === portion.id ? '2px solid #ff6b00' : '1px solid #eee',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: selectedPortion?.id === portion.id ? '#fff8f5' : 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{portion.name}</span>
                  <span style={{ fontWeight: 700, color: '#ff6b00' }}>{portion.price.toFixed(2)} ₺</span>
                </div>
              ))}
            </div>

            {/* Ekle Butonu */}
            <div style={{ padding: '15px 20px', borderTop: '1px solid #eee' }}>
              <button
                onClick={() => {
                  if (selectedPortion) {
                    handleAddToCart(portionModalProduct, selectedPortion);
                    setPortionModalProduct(null);
                  }
                }}
                disabled={!selectedPortion}
                style={{
                  width: '100%',
                  background: selectedPortion ? '#ff6b00' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '15px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: selectedPortion ? 'pointer' : 'not-allowed',
                }}
              >
                Sepete Ekle - {selectedPortion?.price.toFixed(2) || '0.00'} ₺
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        tableId="delivery"
        customerCode={code}
        deliveryInfo={{
          address: deliveryAddress,
          deliveryFee: deliverySettings.deliveryFee,
          minOrderAmount: deliverySettings.minOrderAmount,
          freeDeliveryThreshold: deliverySettings.freeDeliveryThreshold,
        }}
      />

      {/* Bottom Navigation Bar */}
      <BottomNavBar
        onProfileClick={() => {
          setIsCartOpen(false);
          if (isProfileOpen) {
            closeProfile();
          } else {
            openProfile();
          }
        }}
        onAIClick={() => {}}
        onCartClick={() => {
          // Kapalı modda sepet açılmasın
          if (isStoreClosed) return;
          closeProfile();
          if (currentUser) {
            setIsCartOpen(prev => !prev);
          } else {
            openProfile();
          }
        }}
        onWaiterCall={() => {}}
        onGameClick={() => {}}
        onContactClick={() => {
          if (customerData?.customer.phone) {
            window.location.href = `tel:${customerData.customer.phone}`;
          }
        }}
        onSuggestionClick={() => {}}
        onAddressClick={() => setShowAddressModal(true)}
        showAIChat={false}
        showCart={!isStoreClosed}
        showWaiterCall={false}
        showGame={false}
        showAddresses={!isStoreClosed}
        phone={customerData?.customer.phone}
        cartItemCount={totalItems}
      />

      {/* Profile Sidebar */}
      <ProfileSidebar
        isOpen={isProfileOpen}
        onClose={closeProfile}
        customerCode={code}
      />

      {/* Hide scrollbar style */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
