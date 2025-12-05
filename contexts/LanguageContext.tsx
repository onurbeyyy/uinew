'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'tr' | 'en';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  tr: {
    // Bottom Nav
    profile: 'Profilim',
    aiAssistant: 'AI Asistan',
    waiterCall: 'Garson Çağır',
    games: 'Oyunlar',
    cart: 'Sepetim',
    callUs: 'Bizi Arayın',
    sendSuggestion: 'Öneri Gönder',

    // Header Tabs
    home: 'Ana Sayfa',
    featuredProducts: 'Öne Çıkan Ürünler',
    bestSelling: 'En Çok Satılan Ürünler',

    // Product Modal
    price: 'Fiyat',
    addToCart: 'Sepete Ekle',
    description: 'Açıklama:',
    noPriceMessage: 'Fiyat bilgisi için lütfen garsonumuza danışın',
    tokenEarn: 'Bu üründen {amount} jeton kazanacaksınız',
    tokenRedeem: '{amount} jeton ile bedava alabilirsiniz',
    previousProduct: 'Önceki Ürün',
    nextProduct: 'Sonraki Ürün',

    // Cart
    myCart: 'Sepetim',
    emptyCart: 'Sepetiniz boş',
    total: 'Toplam',
    placeOrder: 'Sipariş Ver',
    note: 'Not',

    // Profile
    myProfile: 'Profilim',
    orders: 'Siparişlerim',
    tokens: 'Jetonlarım',
    allergies: 'Alerji Bilgilerim',
    settings: 'Ayarlar',
    login: 'Giriş Yap',
    register: 'Kayıt Ol',
    logout: 'Çıkış Yap',

    // Suggestion Modal
    suggestionTitle: 'Öneri & Geri Bildirim',
    suggestionSubtitle: 'Fikirleriniz bizim için değerli!',
    name: 'İsim',
    nameOptional: 'İsim (Opsiyonel)',
    venueRequest: 'Görmek İstediğiniz Mekan',
    category: 'Kategori',
    selectCategory: 'Seçiniz',
    suggestion: 'Öneri',
    complaint: 'Şikayet',
    compliment: 'Teşekkür',
    featureRequest: 'Özellik İsteği',
    other: 'Diğer',
    yourMessage: 'Mesajınız',
    send: 'Gönder',
    cancel: 'İptal',
    sending: 'Gönderiliyor...',
    thankYou: 'Teşekkürler!',
    error: 'Hata!',

    // Waiter Call
    waiterCalled: 'Garson çağırıldı!',
    waiterComingSoon: 'En kısa sürede yanınızda olacak',
    waiterRateLimit: 'Garson Çağırma Limiti',
    remainingTime: 'Kalan Süre:',
    memberInfo: 'Üye kullanıcılar 10 dakikada bir garson çağırabilir',
    guestInfo: 'Misafirler 30 dakikada bir garson çağırabilir',
    becomeMember: 'Üye olun ve 10 dakikada bir çağırın!',

    // Email Verified
    emailVerified: 'Email adresiniz başarıyla doğrulandı!',

    // Products
    noProductsInCategory: 'Bu kategoride ürün bulunmamaktadır.',
    productLoading: 'Ürün Yükleniyor...',
    noProductsFound: 'Ürün bulunamadı',
    noPrice: 'Fiyat yok',
    noPriceInfo: 'Fiyat bilgisi yok',
    addedToCart: 'sepete eklendi!',
    earnTokensMessage: 'Bu üründen {count} jeton kazanacaksınız',
    redeemTokensMessage: '{count} jeton ile bedava alabilirsiniz',

    // Common
    ok: 'Tamam',
    close: 'Kapat',
    confirm: 'Onayla',
    back: 'Geri',
    search: 'Ara',
    loading: 'Yükleniyor...',
  },
  en: {
    // Bottom Nav
    profile: 'My Profile',
    aiAssistant: 'AI Assistant',
    waiterCall: 'Call Waiter',
    games: 'Games',
    cart: 'My Cart',
    callUs: 'Call Us',
    sendSuggestion: 'Send Suggestion',

    // Header Tabs
    home: 'Home',
    featuredProducts: 'Featured Products',
    bestSelling: 'Best Selling Products',

    // Product Modal
    price: 'Price',
    addToCart: 'Add to Cart',
    description: 'Description:',
    noPriceMessage: 'Please ask our waiter for price information',
    tokenEarn: 'You will earn {amount} tokens from this product',
    tokenRedeem: 'You can get it for free with {amount} tokens',
    previousProduct: 'Previous Product',
    nextProduct: 'Next Product',

    // Cart
    myCart: 'My Cart',
    emptyCart: 'Your cart is empty',
    total: 'Total',
    placeOrder: 'Place Order',
    note: 'Note',

    // Profile
    myProfile: 'My Profile',
    orders: 'My Orders',
    tokens: 'My Tokens',
    allergies: 'My Allergies',
    settings: 'Settings',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',

    // Suggestion Modal
    suggestionTitle: 'Suggestions & Feedback',
    suggestionSubtitle: 'Your ideas are valuable to us!',
    name: 'Name',
    nameOptional: 'Name (Optional)',
    venueRequest: 'Venue You Want to See',
    category: 'Category',
    selectCategory: 'Select',
    suggestion: 'Suggestion',
    complaint: 'Complaint',
    compliment: 'Thank You',
    featureRequest: 'Feature Request',
    other: 'Other',
    yourMessage: 'Your Message',
    send: 'Send',
    cancel: 'Cancel',
    sending: 'Sending...',
    thankYou: 'Thank You!',
    error: 'Error!',

    // Waiter Call
    waiterCalled: 'Waiter called!',
    waiterComingSoon: 'Will be with you shortly',
    waiterRateLimit: 'Waiter Call Limit',
    remainingTime: 'Remaining Time:',
    memberInfo: 'Members can call waiter every 10 minutes',
    guestInfo: 'Guests can call waiter every 30 minutes',
    becomeMember: 'Become a member and call every 10 minutes!',

    // Email Verified
    emailVerified: 'Your email has been successfully verified!',

    // Products
    noProductsInCategory: 'No products in this category.',
    productLoading: 'Product Loading...',
    noProductsFound: 'No products found',
    noPrice: 'No price',
    noPriceInfo: 'No price information',
    addedToCart: 'added to cart!',
    earnTokensMessage: 'You will earn {count} tokens from this product',
    redeemTokensMessage: 'You can get it for free with {count} tokens',

    // Common
    ok: 'OK',
    close: 'Close',
    confirm: 'Confirm',
    back: 'Back',
    search: 'Search',
    loading: 'Loading...',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('tr');

  useEffect(() => {
    // Load saved language preference
    const savedLanguage = localStorage.getItem('preferredLanguage') as Language;
    if (savedLanguage === 'en' || savedLanguage === 'tr') {
      setLanguage(savedLanguage);
    }
  }, []);

  const toggleLanguage = () => {
    const newLang: Language = language === 'tr' ? 'en' : 'tr';
    setLanguage(newLang);
    localStorage.setItem('preferredLanguage', newLang);

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: newLang } }));
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.tr] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
