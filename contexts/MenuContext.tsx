'use client';

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useTable } from '@/contexts/TableContext';
import { checkAndCleanCart } from '@/utils/cartUtils';
import { parseHappyHourSettings, isCurrentlyHappyHour, canOrderHappyHourProduct, getTodayHappyHourTimeRange } from '@/utils/happyHour';
import type { MenuDto, MenuListDto, Product, CustomerInfoResponse, CategoryDto, ProductTokenSetting, HappyHourSettings } from '@/types/api';

interface MenuContextType {
  menuData: MenuDto | null;
  setMenuData: (data: MenuDto | null) => void;
  customerData: CustomerInfoResponse | null;
  setCustomerData: (data: CustomerInfoResponse | null) => void;
  categoriesData: CategoryDto[];
  setCategoriesData: (data: CategoryDto[]) => void;
  customerCode: string | null;
  setCustomerCode: (code: string | null) => void;
  tableId: string | null;
  setTableId: (tableId: string | null) => void;
  selectedCategory: MenuListDto | null;
  setSelectedCategory: (category: MenuListDto | null) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  isProductListModalOpen: boolean;
  openProductListModal: (category: MenuListDto) => void;
  closeProductListModal: () => void;
  isProductDetailModalOpen: boolean;
  openProductDetailModal: (product: Product) => void;
  closeProductDetailModal: () => void;
  // Game modal
  isGameModalOpen: boolean;
  selectedGame: '2048' | 'rps' | 'quiz' | 'okey' | 'backgammon' | 'ludo' | 'alienattack' | null;
  activeGame: '2048' | 'rps' | 'quiz' | 'okey' | 'backgammon' | 'ludo' | 'alienattack' | null;
  setActiveGame: (game: '2048' | 'rps' | 'quiz' | 'okey' | 'backgammon' | 'ludo' | 'alienattack' | null) => void;
  openGameModal: (game?: '2048' | 'rps' | 'quiz' | 'okey' | 'backgammon' | 'ludo' | 'alienattack') => void;
  closeGameModal: () => void;
  pendingJoinRoomId: string | null;
  setPendingJoinRoomId: (roomId: string | null) => void;
  // Profile sidebar
  isProfileOpen: boolean;
  openProfile: () => void;
  closeProfile: () => void;
  // Token system
  productTokenSettings: Record<number, ProductTokenSetting>; // sambaProductId -> setting (porsiyon belirtilmemiş olanlar)
  portionTokenSettings: Record<number, ProductTokenSetting>; // sambaPortionId -> setting (porsiyon bazlı olanlar)
  setProductTokenSettings: (settings: Record<number, ProductTokenSetting>) => void;
  setPortionTokenSettings: (settings: Record<number, ProductTokenSetting>) => void;
  getTokenSettingsForItem: (sambaProductId: number, sambaPortionId?: number) => ProductTokenSetting | undefined;
  userTokenBalance: number;
  setUserTokenBalance: (balance: number) => void;
  // Popular products (from advertisements)
  popularProductIds: Set<number>;
  setPopularProductIds: (ids: Set<number>) => void;
  // Table/Session state (from TableContext)
  isTableMode: boolean;
  isSelfService: boolean;
  sessionId: string | null;
  cartKey: string; // tableId or sessionId for cart storage
  // Feature access (computed from customerData)
  canUseBasket: boolean; // hasBasketAccess && basketSystemEnabled && hasValidSubscription
  canUseSelfService: boolean; // hasSelfServiceAccess && isSelfServiceEnabled && hasValidSubscription
  hasValidSubscription: boolean;
  basketDisabledMessage: string | null; // Sepet neden kapalı?
  selfServiceDisabledMessage: string | null; // Self-servis neden kapalı?
  // Happy Hour
  happyHourSettings: HappyHourSettings | null;
  isHappyHourTime: boolean;
  canOrderProduct: (product: Product) => boolean;
  todayHappyHourTimeRange: string | null; // Bugünün HH saat aralığı (örn: "17:00 - 20:00")
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
  // Get table/session state from TableContext
  const { isTableMode, isSelfService, sessionId: tableSessionId, tableId: tableContextTableId } = useTable();

  const [menuData, setMenuData] = useState<MenuDto | null>(null);
  const [customerData, setCustomerData] = useState<CustomerInfoResponse | null>(null);
  const [categoriesData, setCategoriesData] = useState<CategoryDto[]>([]);
  const [customerCode, setCustomerCode] = useState<string | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MenuListDto | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductListModalOpen, setIsProductListModalOpen] = useState(false);
  const [isProductDetailModalOpen, setIsProductDetailModalOpen] = useState(false);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<'2048' | 'rps' | 'quiz' | 'okey' | 'backgammon' | 'ludo' | 'alienattack' | null>(null);
  const [activeGame, setActiveGame] = useState<'2048' | 'rps' | 'quiz' | 'okey' | 'backgammon' | 'ludo' | 'alienattack' | null>(null);
  const [pendingJoinRoomId, setPendingJoinRoomId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [productTokenSettings, setProductTokenSettings] = useState<Record<number, ProductTokenSetting>>({});
  const [portionTokenSettings, setPortionTokenSettings] = useState<Record<number, ProductTokenSetting>>({});
  const [userTokenBalance, setUserTokenBalance] = useState(0);
  const [popularProductIds, setPopularProductIds] = useState<Set<number>>(new Set());

  // 📱 Android geri tuşu desteği - popstate event listener
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Modal durumlarını kontrol et ve uygun olanı kapat
      if (isProductDetailModalOpen) {
        setIsProductDetailModalOpen(false);
        document.body.style.overflow = '';
        setTimeout(() => setSelectedProduct(null), 300);
        return;
      }
      if (isProductListModalOpen) {
        setIsProductListModalOpen(false);
        document.body.style.overflow = '';
        setTimeout(() => setSelectedCategory(null), 300);
        return;
      }
      if (isGameModalOpen) {
        setIsGameModalOpen(false);
        setActiveGame(null);
        document.body.style.overflow = '';
        setTimeout(() => setSelectedGame(null), 300);
        return;
      }
      if (isProfileOpen) {
        setIsProfileOpen(false);
        document.body.style.overflow = '';
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isProductDetailModalOpen, isProductListModalOpen, isGameModalOpen, isProfileOpen]);

  // Helper: Porsiyon veya ürün için token ayarlarını getir
  const getTokenSettingsForItem = (sambaProductId: number, sambaPortionId?: number): ProductTokenSetting | undefined => {
    // Önce porsiyon bazlı kontrol et
    if (sambaPortionId && portionTokenSettings[sambaPortionId]) {
      return portionTokenSettings[sambaPortionId];
    }
    // Porsiyon yoksa veya porsiyon için ayar yoksa, ürün bazlı kontrol et
    return productTokenSettings[sambaProductId];
  };

  // Happy Hour ayarları
  const happyHourSettings = useMemo(() => {
    return parseHappyHourSettings(customerData?.customer?.happyHourJson);
  }, [customerData?.customer?.happyHourJson]);

  // Şu an HH zamanı mı?
  const [isHappyHourTime, setIsHappyHourTime] = useState(false);

  // HH zamanını her dakika kontrol et
  useEffect(() => {
    const checkHappyHour = () => {
      setIsHappyHourTime(isCurrentlyHappyHour(happyHourSettings));
    };
    checkHappyHour(); // İlk kontrol
    const interval = setInterval(checkHappyHour, 60000); // Her dakika kontrol
    return () => clearInterval(interval);
  }, [happyHourSettings]);

  // Ürün sipariş edilebilir mi? (HH kontrolü dahil)
  const canOrderProduct = (product: Product): boolean => {
    return canOrderHappyHourProduct(product, happyHourSettings);
  };

  // Cart key: use tableId if available, otherwise sessionId
  const cartKey = tableId || tableSessionId || tableContextTableId || '';

  // 🛒 Sepet yönetimi: customer değiştiğinde veya 3 saat geçtiğinde temizle
  useEffect(() => {
    if (cartKey && customerCode) {
      checkAndCleanCart(cartKey, customerCode);
    }
  }, [cartKey, customerCode]);

  const openProductListModal = (category: MenuListDto) => {
    // Diğer modalları kapat
    setIsProductDetailModalOpen(false);
    setIsGameModalOpen(false);
    setIsProfileOpen(false);
    setSelectedProduct(null);
    setSelectedGame(null);

    // Bu modalı aç
    setSelectedCategory(category);
    setIsProductListModalOpen(true);
    document.body.style.overflow = 'hidden';

    // 📱 Android geri tuşu için history'ye kayıt ekle
    window.history.pushState({ modal: 'productList' }, '');
  };

  const closeProductListModal = () => {
    setIsProductListModalOpen(false);
    document.body.style.overflow = '';
    setTimeout(() => setSelectedCategory(null), 300);
  };

  const openProductDetailModal = (product: Product) => {
    // ProductListModal açık kalsın, sadece game ve profile kapat
    setIsGameModalOpen(false);
    setIsProfileOpen(false);
    setSelectedGame(null);

    // Bu modalı aç (liste modalı arkada kalacak)
    setSelectedProduct(product);
    setIsProductDetailModalOpen(true);
    document.body.style.overflow = 'hidden';

    // 📱 Android geri tuşu için history'ye kayıt ekle
    window.history.pushState({ modal: 'productDetail' }, '');
  };

  const closeProductDetailModal = () => {
    setIsProductDetailModalOpen(false);
    document.body.style.overflow = '';
    setTimeout(() => setSelectedProduct(null), 300);
  };

  const openGameModal = (game?: '2048' | 'rps' | 'quiz' | 'okey' | 'backgammon' | 'ludo' | 'alienattack') => {
    // Diğer modalları kapat
    setIsProductListModalOpen(false);
    setIsProductDetailModalOpen(false);
    setIsProfileOpen(false);
    setSelectedCategory(null);
    setSelectedProduct(null);

    // Bu modalı aç
    setSelectedGame(game || null);
    setIsGameModalOpen(true);
    document.body.style.overflow = 'hidden';

    // 📱 Android geri tuşu için history'ye kayıt ekle
    window.history.pushState({ modal: 'game' }, '');
  };

  const closeGameModal = () => {
    setIsGameModalOpen(false);
    setActiveGame(null);
    document.body.style.overflow = '';
    setTimeout(() => setSelectedGame(null), 300);
  };

  const openProfile = () => {
    // Diğer modalları kapat
    setIsProductListModalOpen(false);
    setIsProductDetailModalOpen(false);
    setIsGameModalOpen(false);
    setSelectedCategory(null);
    setSelectedProduct(null);
    setSelectedGame(null);

    // Profili aç
    setIsProfileOpen(true);
    document.body.style.overflow = 'hidden';

    // 📱 Android geri tuşu için history'ye kayıt ekle
    window.history.pushState({ modal: 'profile' }, '');
  };

  const closeProfile = () => {
    setIsProfileOpen(false);
    document.body.style.overflow = '';
  };

  return (
    <MenuContext.Provider
      value={{
        menuData,
        setMenuData,
        customerData,
        setCustomerData,
        categoriesData,
        setCategoriesData,
        customerCode,
        setCustomerCode,
        tableId,
        setTableId,
        selectedCategory,
        setSelectedCategory,
        selectedProduct,
        setSelectedProduct,
        isProductListModalOpen,
        openProductListModal,
        closeProductListModal,
        isProductDetailModalOpen,
        openProductDetailModal,
        closeProductDetailModal,
        isGameModalOpen,
        selectedGame,
        activeGame,
        setActiveGame,
        openGameModal,
        closeGameModal,
        pendingJoinRoomId,
        setPendingJoinRoomId,
        isProfileOpen,
        openProfile,
        closeProfile,
        productTokenSettings,
        portionTokenSettings,
        setProductTokenSettings,
        setPortionTokenSettings,
        getTokenSettingsForItem,
        userTokenBalance,
        setUserTokenBalance,
        popularProductIds,
        setPopularProductIds,
        // Table/Session state (from TableContext)
        isTableMode,
        isSelfService,
        sessionId: tableSessionId,
        cartKey,
        // Feature access (computed)
        hasValidSubscription: customerData?.hasValidSubscription ?? true,
        canUseBasket: (customerData?.hasValidSubscription ?? true) &&
                      (customerData?.customer?.hasBasketAccess ?? false) &&
                      (customerData?.customer?.basketSystemEnabled ?? false),
        basketDisabledMessage: (() => {
          if (!customerData) return null;
          if (!customerData.hasValidSubscription) return 'Abonelik süresi dolmuş';
          if (!customerData.customer?.basketSystemEnabled) return 'Sipariş sistemi şu an kapalı';
          if (!customerData.customer?.hasBasketAccess) return 'Sipariş sistemi bu restoran için aktif değil';
          return null;
        })(),
        // Self-servis kontrolü: Varsayılan olarak KAPALI - sadece açıkça true ise izin ver
        canUseSelfService: (customerData?.hasValidSubscription ?? true) &&
                          // hasSelfServiceAccess açıkça true olmalı
                          (customerData?.customer?.hasSelfServiceAccess === true) &&
                          // isSelfServiceEnabled açıkça true olmalı
                          (customerData?.customer?.isSelfServiceEnabled === true),
        selfServiceDisabledMessage: (() => {
          if (!customerData) return null;
          if (!customerData.hasValidSubscription) return 'Abonelik süresi dolmuş';
          if (!customerData.customer?.hasSelfServiceAccess) return 'Self-servis bu restoran için aktif değil';
          if (!customerData.customer?.isSelfServiceEnabled) return 'Self-servis şu an kapalı';
          return null;
        })(),
        // Happy Hour
        happyHourSettings,
        isHappyHourTime,
        canOrderProduct,
        todayHappyHourTimeRange: getTodayHappyHourTimeRange(happyHourSettings),
      }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
}
