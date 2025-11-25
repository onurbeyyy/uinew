# 🎉 Canlı Menü - Next.js 16 Projesi

## 📦 Kurulum

```bash
npm install
npm run dev
```

Tarayıcıda: **http://localhost:3000**

---

## 🚀 Teknolojiler

- ✅ **Next.js 16.0.3** (App Router, Server Components)
- ✅ **React 19.2.0** (En yeni)
- ✅ **TypeScript 5.9.3**
- ✅ **Tailwind CSS 4.1.17**
- ✅ **SignalR 10.0.0** (Real-time iletişim)
- ✅ **Node.js 22.21.1**

---

## 📁 Proje Yapısı

```
uinew/
├── app/
│   ├── layout.tsx                 # Root layout (CartProvider)
│   ├── page.tsx                   # Ana sayfa (test)
│   ├── globals.css                # Tailwind CSS
│   ├── [code]/page.tsx            # Menü sayfası (dinamik)
│   ├── category/[id]/page.tsx     # Kategori detay
│   └── api/
│       └── menu/[code]/route.ts   # API Proxy (endpoint gizleme)
├── components/
│   ├── SplashScreen.tsx           # Logo animasyonu (2 saniye)
│   ├── CategoryCard.tsx           # Kategori kartı
│   ├── ProductCard.tsx            # Ürün kartı
│   ├── CartButton.tsx             # Floating sepet butonu
│   └── CartModal.tsx              # Sepet modalı
├── contexts/
│   └── CartContext.tsx            # Sepet state management
├── lib/
│   ├── api.ts                     # API client (fetch wrapper)
│   └── signalr.ts                 # SignalR service
├── types/
│   └── api.ts                     # TypeScript tipleri (API DTO'ları)
├── next.config.ts                 # Next.js config
├── tsconfig.json                  # TypeScript config
├── .env.local                     # Environment variables
└── package.json
```

---

## 🔒 Güvenlik Özellikleri

### 1. **API Proxy** (Endpoint Gizleme)
```typescript
// Kullanıcı sadece bunu görür:
fetch('/api/menu/thedraft')

// Gerçek endpoint gizli:
// https://api.canlimenu.com/api/Menu/GetMenuDto?code=thedraft
```

### 2. **TypeScript** (Tip Güvenliği)
```typescript
interface Product {
  id: number;
  title: string;
  price: number;
  // ... compile-time hata yakalama
}
```

### 3. **Obfuscation** (Planlı)
Production build'de JavaScript karıştırma:
```bash
npm run build  # Obfuscation aktif olacak
```

### 4. **WASM** (Planlı)
Kritik iş mantığı (fiyat hesaplama) Rust → WASM ile korunacak.

---

## 📖 API Endpoint'leri

### Menü Çekme
```typescript
// API Proxy kullan
const response = await fetch(`/api/menu/${customerCode}`);
const menuData: MenuDto = await response.json();
```

### Garson Çağırma
```typescript
import { signalRService } from '@/lib/signalr';

await signalRService.connect();
await signalRService.callWaiter('thedraft', 'Masa 5', 'Hesap istiyorum');
```

### Sipariş Gönderme
```typescript
await signalRService.sendOrder('thedraft', 'Masa 5', [
  {
    productId: 123,
    portionId: 456,
    propertyIds: [789, 790],
    quantity: 2,
    note: 'Az acılı lütfen'
  }
]);
```

---

## 🎨 Component Kullanımı

### Sepet (Cart)
```tsx
'use client';

import { useCart } from '@/contexts/CartContext';

export default function MyComponent() {
  const { addItem, items, getTotalPrice } = useCart();

  const handleAddToCart = () => {
    addItem(product, portion, properties, 1, 'Not');
  };

  return <div>{items.length} ürün - {getTotalPrice()} ₺</div>;
}
```

---

## 🧪 Test Sayfaları

1. **Ana Sayfa**: http://localhost:3000
2. **Menü**: http://localhost:3000/thedraft
3. **Kategori**: http://localhost:3000/category/123

---

## ✅ Tamamlanan Özellikler

- [x] Next.js 16 + React 19 kurulumu
- [x] TypeScript tipleri (API DTO'ları)
- [x] API servis katmanı + Proxy
- [x] Menü sayfası (Splash + Kategori listesi)
- [x] Kategori detay sayfası
- [x] Sepet (Cart Context + Modal)
- [x] SignalR entegrasyonu

---

## 🔜 Yapılacaklar

- [ ] Product Modal (ürün detay + porsiyon/ekstra seçimi)
- [ ] Banner/Reklam sistemi
- [ ] Obfuscation (webpack-obfuscator)
- [ ] WASM (Rust ile fiyat hesaplama)
- [ ] Unit testler
- [ ] Production build optimizasyonu

---

## 🚢 Production Build

```bash
npm run build   # Build (obfuscation aktif)
npm start       # Production server
```

---

## 📝 Notlar

- **Eski proje**: `/samba/UI` (Razor + inline JS)
- **Yeni proje**: `/samba/uinew` (Next.js + React + TypeScript)
- **API**: MenuPark.API (değişmedi, uyumlu)
- **Node.js**: v22.21.1 (WSL'de NVM ile kuruldu)

---

## 🔗 Linkler

- [Next.js Docs](https://nextjs.org/docs)
- [React 19 Blog](https://react.dev/blog/2024/12/05/react-19)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [SignalR JS](https://docs.microsoft.com/en-us/aspnet/core/signalr/javascript-client)
