# Localized API Kullanım Kılavuzu

## Genel Bakış

API'den gelen veriler artık otomatik olarak seçili dile göre çevrilir. `useLocalizedApi` hook'u kullanarak API'den veri çekerken, tüm menu, kategori, ürün isimleri ve açıklamaları otomatik olarak Türkçe veya İngilizce olarak gelir.

## Önemli Özellikler

✅ **Otomatik Çeviri**: API'den gelen veriler seçili dile göre otomatik çevrilir
✅ **Tip Güvenliği**: TypeScript desteğiyle tam tip güvenliği
✅ **Performans**: Gereksiz re-render'ları önleyen memoization
✅ **Kolay Kullanım**: Tek bir hook ile tüm API işlemleri
✅ **Fallback Desteği**: İngilizce çeviri yoksa Türkçe gösterilir

## Hızlı Başlangıç

### 1. Hook Kullanımı

```tsx
'use client';

import { useLocalizedApi } from '@/hooks/useLocalizedApi';
import { useTranslation } from '@/hooks/useTranslation';

export default function MenuPage() {
  const { getMenu, locale } = useLocalizedApi();
  const { t } = useTranslation();

  const [menu, setMenu] = useState(null);

  useEffect(() => {
    async function loadMenu() {
      const menuData = await getMenu('ABC123');
      setMenu(menuData);
      // menuData.menu array'i otomatik olarak locale'e göre çevrilmiş
    }
    loadMenu();
  }, [locale]); // Locale değişince yeniden yükle

  return (
    <div>
      {menu?.menu.map(category => (
        <div key={category.sambaId}>
          <h2>{category.title}</h2> {/* Otomatik çevrilmiş */}
          {category.products.map(product => (
            <div key={product.id}>
              <h3>{product.title}</h3> {/* Otomatik çevrilmiş */}
              <p>{product.description}</p> {/* Otomatik çevrilmiş */}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

### 2. Manuel Çeviri (Helper Fonksiyonlar)

Eğer API'den gelen ham veriyi kendiniz işlemek isterseniz:

```tsx
import {
  getProductTitle,
  getProductDescription,
  formatPrice
} from '@/lib/localeHelpers';

const product = {
  title: 'Kahve',
  titleEn: 'Coffee',
  price: 50
};

const title = getProductTitle(product, 'en'); // "Coffee"
const titleTr = getProductTitle(product, 'tr'); // "Kahve"
const priceFormatted = formatPrice(50, 'tr'); // "50.00 ₺"
```

## API Metodları

### getMenu(customerCode, screenCode?)

Menüyü getirir ve tüm kategoriler/ürünleri otomatik çevirir.

```tsx
const { getMenu } = useLocalizedApi();
const menu = await getMenu('ABC123');

// menu.menu[0].title -> Seçili dile göre çevrilmiş
// menu.menu[0].products[0].title -> Seçili dile göre çevrilmiş
```

### getCategories(customerCode)

Kategorileri getirir (resimlerle birlikte).

```tsx
const { getCategories } = useLocalizedApi();
const categories = await getCategories('ABC123');

// categories[0].category.title -> Seçili dile göre çevrilmiş
```

### getCustomer(customerCode)

Müşteri bilgilerini getirir (locale'den etkilenmez).

```tsx
const { getCustomer } = useLocalizedApi();
const customer = await getCustomer('ABC123');
```

### callWaiter(customerCode, tableName, message)

Garson çağırır.

```tsx
const { callWaiter } = useLocalizedApi();
const { t } = useTranslation();

await callWaiter('ABC123', 'Masa 5', t('waiter.defaultMessage'));
```

### createOrder(orderRequest)

Sipariş oluşturur.

```tsx
const { createOrder } = useLocalizedApi();

await createOrder({
  customerCode: 'ABC123',
  tableName: 'Masa 5',
  items: [
    {
      productId: 1,
      quantity: 2,
      note: 'Şekersiz'
    }
  ]
});
```

## Helper Fonksiyonlar

### formatPrice(price, locale)

Fiyatı formatlı string olarak döndürür.

```tsx
const { formatPrice, locale } = useLocalizedApi();

formatPrice(50, locale); // TR: "50.00 ₺", EN: "50.00 $"
```

### getProductTitle(product, locale)

Ürün başlığını seçili dile göre döndürür.

```tsx
import { getProductTitle } from '@/lib/localeHelpers';

const product = { title: 'Kahve', titleEn: 'Coffee' };
getProductTitle(product, 'en'); // "Coffee"
getProductTitle(product, 'tr'); // "Kahve"
```

### getProductDescription(product, locale)

Ürün açıklamasını seçili dile göre döndürür.

```tsx
import { getProductDescription } from '@/lib/localeHelpers';

const product = {
  description: 'Türk kahvesi',
  descriptionEn: 'Turkish coffee'
};
getProductDescription(product, 'en'); // "Turkish coffee"
```

## Locale Değiştirme

### Component'te Locale Değiştirme

```tsx
import { useTranslation } from '@/hooks/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function MyPage() {
  const { locale, setLocale } = useTranslation();

  return (
    <div>
      <p>Current language: {locale}</p>
      <LanguageSwitcher /> {/* TR/EN butonları */}

      {/* veya manuel */}
      <button onClick={() => setLocale(locale === 'tr' ? 'en' : 'tr')}>
        Toggle Language
      </button>
    </div>
  );
}
```

## UI Çevirileri

Menu, sipariş ve diğer UI elementleri için çeviriler:

```tsx
const { t } = useTranslation();

t('menu.title')              // "Menü" / "Menu"
t('menu.addToCart')          // "Sepete Ekle" / "Add to Cart"
t('menu.cart')               // "Sepet" / "Cart"
t('order.confirmOrder')      // "Siparişi Onayla" / "Confirm Order"
t('waiter.callWaiter')       // "Garson Çağır" / "Call Waiter"
t('token.balance')           // "Token Bakiyesi" / "Token Balance"
t('common.loading')          // "Yükleniyor..." / "Loading..."
```

## Tam Örnek Component

`/components/examples/LocalizedMenuExample.tsx` dosyasına bakın.

## Veri Akışı

```
1. Component useLocalizedApi() çağırır
2. useLocalizedApi içinde locale belirlenir (TR/EN)
3. API'den veri çekilir (api.getMenu)
4. Veri locale helper'lardan geçirilir (localizeMenuList)
5. Çevrilmiş veri component'e döner
6. Component veriyi direkt kullanır (başka işlem gerekmez)
```

## Performans İpuçları

1. **Locale değişiminde yeniden yükleme**:
   ```tsx
   useEffect(() => {
     loadMenu();
   }, [locale]); // Dil değişince yeniden yükle
   ```

2. **Memoization**:
   ```tsx
   const localizedMenu = useMemo(
     () => localizeMenuList(menuData, locale),
     [menuData, locale]
   );
   ```

## API Verisi vs Locale Verisi

| Veri Tipi | API'den Gelir | Locale'den Gelir |
|-----------|---------------|------------------|
| Ürün isimleri | ✅ (title/titleEn) | ✅ Fallback olarak |
| Kategori isimleri | ✅ (title/titleEn) | ✅ Fallback olarak |
| UI metinleri | ❌ | ✅ |
| Hata mesajları | ❌ | ✅ |
| Button metinleri | ❌ | ✅ |

## Troubleshooting

### Çeviriler görünmüyor
- Browser console'da locale değerini kontrol edin
- API'den gelen veride titleEn/descriptionEn alanları var mı kontrol edin
- Fallback olarak Türkçe title gösterilir

### Locale değişmiyor
- localStorage'da 'locale' key'ini kontrol edin
- Component'in useEffect dependency'lerini kontrol edin

### TypeScript hataları
- `@/types/api` tiplerinin import edildiğinden emin olun
- Product/Category interface'lerinde titleEn/descriptionEn field'ları var mı kontrol edin
