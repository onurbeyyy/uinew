'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTable } from '@/contexts/TableContext';
import { checkAndCleanCart } from '@/utils/cartUtils';
import type { MenuDto, MenuListDto, Product, CustomerInfoResponse, CategoryDto, ProductTokenSetting } from '@/types/api';

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
  selectedGame: '2048' | 'rps' | 'quiz' | 'okey' | 'backgammon' | null;
  activeGame: '2048' | 'rps' | 'quiz' | 'okey' | 'backgammon' | null;
  setActiveGame: (game: '2048' | 'rps' | 'quiz' | 'okey' | 'backgammon' | null) => void;
  openGameModal: (game?: '2048' | 'rps' | 'quiz' | 'okey' | 'backgammon') => void;
  closeGameModal: () => void;
  pendingJoinRoomId: string | null;
  setPendingJoinRoomId: (roomId: string | null) => void;
  // Profile sidebar
  isProfileOpen: boolean;
  openProfile: () => void;
  closeProfile: () => void;
  // Token system
  productTokenSettings: Record<number, ProductTokenSetting>;
  setProductTokenSettings: (settings: Record<number, ProductTokenSetting>) => void;
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
  const [selectedGame, setSelectedGame] = useState<'2048' | 'rps' | 'quiz' | 'okey' | 'backgammon' | null>(null);
  const [activeGame, setActiveGame] = useState<'2048' | 'rps' | 'quiz' | 'okey' | 'backgammon' | null>(null);
  const [pendingJoinRoomId, setPendingJoinRoomId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [productTokenSettings, setProductTokenSettings] = useState<Record<number, ProductTokenSetting>>({});
  const [userTokenBalance, setUserTokenBalance] = useState(0);
  const [popularProductIds, setPopularProductIds] = useState<Set<number>>(new Set());

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
  };

  const closeProductListModal = () => {
    setIsProductListModalOpen(false);
    document.body.style.overflow = '';
    setTimeout(() => setSelectedCategory(null), 300);
  };

  const openProductDetailModal = (product: Product) => {
    // Diğer modalları kapat
    setIsProductListModalOpen(false);
    setIsGameModalOpen(false);
    setIsProfileOpen(false);
    setSelectedCategory(null);
    setSelectedGame(null);

    // Bu modalı aç
    setSelectedProduct(product);
    setIsProductDetailModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeProductDetailModal = () => {
    setIsProductDetailModalOpen(false);
    document.body.style.overflow = '';
    setTimeout(() => setSelectedProduct(null), 300);
  };

  const openGameModal = (game?: '2048' | 'rps' | 'quiz' | 'okey' | 'backgammon') => {
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
        setProductTokenSettings,
        userTokenBalance,
        setUserTokenBalance,
        popularProductIds,
        setPopularProductIds,
        // Table/Session state (from TableContext)
        isTableMode,
        isSelfService,
        sessionId: tableSessionId,
        cartKey,
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
