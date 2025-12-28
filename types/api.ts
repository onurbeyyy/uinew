// API Response Types - MenuPark.API ile uyumlu

// API Response - CustomerInfoByCode
export interface CustomerInfoResponse {
  customer: CustomerEntity;
  hasValidSubscription: boolean;
  daysRemaining: number;
  subscriptionEndDate?: string;
}

export interface CustomerEntity {
  id: number;
  name: string;
  code: string;
  logo?: string;
  webBackground?: string;
  indexBackground?: string;
  selfServiceBackground?: string;
  banner?: string;
  showBanner: boolean;
  showPrices: boolean;
  showAIChat: boolean;
  indexTextColor?: string;
  productTitleColor?: string;
  productDescriptionColor?: string;
  categoryFont?: string;
  productFont?: string;
  priceTag?: string;
  phone?: string;
  // Social Media
  website?: string;
  facebook?: string;
  instagramUrl?: string;
  youtube?: string;
  googleUrl?: string;
  whatsApp?: string;
  // Feature Access (Süperadmin tarafından verilir)
  hasBasketAccess?: boolean;      // Sipariş sistemi erişim hakkı
  hasDeliveryAccess?: boolean;    // Paket servis erişim hakkı
  hasSelfServiceAccess?: boolean; // Self-servis erişim hakkı
  // Feature Settings (Müşteri tarafından açılır/kapatılır)
  basketSystemEnabled?: boolean;  // Sipariş sistemi aktif mi
  isDeliveryEnabled?: boolean;    // Paket servis aktif mi
  isSelfServiceEnabled?: boolean; // Self-servis aktif mi
  // Delivery Settings
  minimumOrderAmount?: number;
  deliveryFee?: number;
  freeDeliveryThreshold?: number;
  estimatedDeliveryTime?: number;
  deliveryZones?: string;
  // Happy Hour Settings
  happyHourJson?: string;
  // 🔒 GÜVENLİK: token field'ı API'den artık gelmiyor (güvenlik nedeniyle kaldırıldı)
  // database, email, emailVerificationToken field'ları da asla frontend'e gelmemeli
}

// Header Tabs / Advertisements Types
export interface Advertisement {
  id: number;
  tabType: 'Image' | 'Video' | 'Campaign' | 'FavoriteProducts' | 'BestSellingProducts';
  imageUrl?: string; // Comma-separated URLs for Image type
  videoUrl?: string; // For Video type
  campaignText?: string; // JSON string for Campaign type
  selectedProductIds?: string; // JSON array string for Products types
  sliderInterval?: number; // Auto-rotation interval in milliseconds
  orderNo: number;
  isActive: boolean;
}

export interface CampaignData {
  title?: string;
  subtitle?: string;
  ctaText?: string;
}

export interface Category {
  id?: number; // Optional - API'de olmayabilir
  sambaId: number;
  title: string;
  titleEn?: string; // API'dan gelen titleEn field'ı
  orderNo: number;
  picture?: string;
  products: Product[];
}

export interface Product {
  id: number;
  sambaId: number;
  title: string;
  titleEn?: string;
  price: number;
  description?: string;
  descriptionEn?: string;
  detail?: string; // API'de description yerine detail kullanılıyor
  detailEn?: string;
  picture?: string;
  categoryId: number;
  orderNo: number;
  portions?: ProductPortion[];
  Portions?: ProductPortion[]; // Capital case (API uyumluluğu)
  properties?: ProductProperty[];
  subCategoryTag?: string;
  allergens?: string; // Alerjenler (virgülle ayrılmış veya JSON array)
  linkedProductId?: number; // Happy Hour ürünlerinin bağlı olduğu normal ürün ID'si
  // Capital case alternatives (for compatibility)
  Id?: number;
  LinkedProductId?: number;
  SambaId?: number;
  Title?: string;
  TitleEn?: string;
  Price?: number;
  Description?: string;
  DescriptionEn?: string;
  Detail?: string;
  DetailEn?: string;
  Picture?: string;
  CategoryId?: number;
  OrderNo?: number;
  Allergens?: string;
}

export interface ProductPortion {
  id: number;
  sambaPortionId: number;
  name: string;
  nameEn?: string;
  nameEnglish?: string; // API uyumluluğu
  price: number;
}

export interface ProductProperty {
  id: number;
  name: string;
  nameEn?: string;
  price: number;
  propertyGroupName: string;
}

// API'den gelen gerçek MenuDto yapısı
export interface MenuDto {
  customerTitle: string;
  customerLogo: string;
  title: string;
  menu: MenuListDto[];
  customization: {
    indexTextColor?: string;
    productTitleColor?: string;
    productDescriptionColor?: string;
    categoryFont?: string;
    productFont?: string;
  };
  screenType?: number;
  // 📍 Konum doğrulama
  latitude?: number | null;
  longitude?: number | null;
  requireLocationVerification?: boolean;
  locationToleranceMeters?: number;
}

// Menu listesi içindeki kategori yapısı
export interface MenuListDto {
  title: string;
  sambaId: number;
  orderNo: number;
  products: Product[];
}

// Category DTO with Picture (GetCategoriesByCode endpoint)
export interface CategoryDto {
  category: {
    id: number;
    sambaId: number;
    title: string;
    titleEnglish?: string;
    customerId: number;
    orderNo: number;
    isActive: boolean;
  };
  picture: string;
  customerLogo: string;
  status: boolean;
  products?: Product[];
}

// Table Entity
export interface TableEntity {
  id: number;
  sambaId: number;
  name: string;
  tableName?: string;
  qrCode: string;
  secureId?: string;
  customerId: number;
  orderNo: number;
}

export interface CartItem {
  product: Product;
  portion?: ProductPortion;
  properties: ProductProperty[];
  quantity: number;
  note?: string;
  totalPrice: number;
}

export interface WaiterCallRequest {
  customerCode: string;
  tableName: string;
  message: string;
}

export interface OrderRequest {
  customerCode: string;
  tableName: string;
  endUserId: number; // Kullanıcı ID'si (zorunlu)
  Source?: string; // "UI" veya "APK"
  isSelfService?: boolean; // Self-service modu
  items: {
    productId: number; // SambaProductId (SambaPOS için)
    actualProductId?: number; // Gerçek Products.Id (jeton sistemi için)
    productName?: string;
    portionId?: number;
    propertyIds?: number[];
    quantity: number;
    price?: number;
    orderTag?: string; // Ürün özel notu (Ekstra acı, soğuk, vb.)
    note?: string; // Eski format
    tokenQuantity?: number; // Kaç adeti jeton ile
    tokensPerItem?: number; // Adet başına jeton miktarı
  }[];
  notificationMessage?: string; // Sipariş genel notu
  customerNote?: string; // Müşteri notu
}

// Token Types
export interface ProductTokenSetting {
  productId: number;
  sambaProductId: number;
  sambaPortionId?: number; // Porsiyon bazlı jeton desteği
  earnTokens: number;
  redeemTokens: number;
}

export interface ProductTokenSettingsResponse {
  settings: ProductTokenSetting[];
}

export interface UserTokenBalance {
  currentTokens: number;
}

// Happy Hour Settings (gün bazlı)
export interface DayHappyHour {
  enabled: boolean;
  startTime: string; // "17:00"
  endTime: string;   // "20:00"
}

export interface HappyHourSettings {
  isActive: boolean;
  monday: DayHappyHour;
  tuesday: DayHappyHour;
  wednesday: DayHappyHour;
  thursday: DayHappyHour;
  friday: DayHappyHour;
  saturday: DayHappyHour;
  sunday: DayHappyHour;
}
