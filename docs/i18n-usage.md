# i18n Kullanım Kılavuzu

## Genel Bakış

Proje artık Türkçe (tr) ve İngilizce (en) dil desteğine sahip. API mesajları, hatalar ve UI metinleri otomatik olarak seçili dile göre gösterilir.

## Dosya Yapısı

```
/locales
  ├── tr.json          # Türkçe çeviriler
  └── en.json          # İngilizce çeviriler

/lib
  └── i18n.ts          # i18n utility fonksiyonları

/hooks
  └── useTranslation.ts # React hook

/contexts
  └── LocaleContext.tsx # Global context provider
```

## Kullanım Örnekleri

### 1. Component'lerde Hook Kullanımı

```tsx
'use client';

import { useTranslation } from '@/hooks/useTranslation';

export default function MyComponent() {
  const { t, locale, setLocale } = useTranslation();

  return (
    <div>
      {/* Basit çeviri */}
      <h1>{t('api.errors.network')}</h1>

      {/* Dil değiştirme */}
      <button onClick={() => setLocale(locale === 'tr' ? 'en' : 'tr')}>
        {locale === 'tr' ? 'Switch to English' : 'Türkçeye Geç'}
      </button>

      {/* Mevcut dili göster */}
      <p>Current locale: {locale}</p>
    </div>
  );
}
```

### 2. Context Provider ile Global Kullanım

`app/layout.tsx` dosyasında tüm uygulamayı sarmalayın:

```tsx
import { LocaleProvider } from '@/contexts/LocaleContext';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <LocaleProvider>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
```

Component'lerde kullanım:

```tsx
'use client';

import { useLocale } from '@/contexts/LocaleContext';

export default function MyComponent() {
  const { t, locale, setLocale } = useLocale();

  return <div>{t('common.loading')}</div>;
}
```

### 3. API Client'ında Otomatik Kullanım

API client otomatik olarak dil desteği sağlar:

```tsx
import { api } from '@/lib/api';

try {
  const customer = await api.getCustomer('ABC123');
} catch (error) {
  // Hata mesajı otomatik olarak seçili dilde gelir
  console.error(error.message); // "Bağlantı hatası" veya "Connection error"
}
```

### 4. Game API'de Kullanım

```tsx
import { submitScore } from '@/lib/gameApi';

const result = await submitScore({
  GameType: 'backgammon',
  PlayerNickname: 'Player1',
  Score: 1500
});

// result.message otomatik olarak seçili dilde gelir
console.log(result.message); // "Skor kaydedildi" veya "Score submitted"
```

## Çeviri Anahtarları

### API Hataları
- `api.errors.general` - Genel hata
- `api.errors.network` - Bağlantı hatası
- `api.errors.notFound` - Bulunamadı
- `api.errors.unauthorized` - Yetkisiz erişim
- `api.errors.serverError` - Sunucu hatası

### API Başarı Mesajları
- `api.success.waiterCalled` - Garson çağrıldı
- `api.success.orderCreated` - Sipariş oluşturuldu
- `api.success.scoreSubmitted` - Skor kaydedildi

### Yükleme Mesajları
- `api.loading.menu` - Menü yükleniyor...
- `api.loading.leaderboard` - Sıralama yükleniyor...

### Oyun Hataları
- `game.errors.scoreNotSubmitted` - Skor kaydedilemedi
- `game.errors.leaderboardNotLoaded` - Leaderboard getirilemedi

### Genel UI
- `common.ok` - Tamam
- `common.cancel` - İptal
- `common.loading` - Yükleniyor...
- `common.noData` - Veri bulunamadı

## Yeni Çeviri Ekleme

1. `locales/tr.json` ve `locales/en.json` dosyalarını açın
2. İlgili bölüme yeni anahtar ekleyin:

```json
{
  "api": {
    "errors": {
      "newError": "Yeni hata mesajı"
    }
  }
}
```

3. Component'te kullanın:

```tsx
const message = t('api.errors.newError');
```

## Özellikler

✅ Otomatik tarayıcı dil algılama
✅ localStorage'da dil tercihi kaydetme
✅ API isteklerinde otomatik `Accept-Language` header
✅ Tip güvenli (TypeScript)
✅ Performanslı (localStorage cache)
✅ Server-side rendering desteği

## Notlar

- Dil tercihi otomatik olarak localStorage'a kaydedilir
- Sayfa yeniden yüklendiğinde son seçilen dil kullanılır
- Desteklenmeyen bir dil seçilirse Türkçe (tr) varsayılan olarak kullanılır
