# SignalR Gerçek Zamanlı İletişim Sistemi

## 📡 Genel Bakış

Next.js uygulaması, ASP.NET Core backend ile SignalR üzerinden gerçek zamanlı iletişim kurar. Bu sayede kullanıcılar backend'deki değişiklikleri anında görür.

## 🔗 Bağlantı Detayları

### Hub URL
```
https://api.canlimenu.com/apimenuhub
```

### Transport Yöntemleri
- WebSockets (öncelikli)
- LongPolling (fallback)

### Otomatik Yeniden Bağlanma
- **Retry Delays:** [0ms, 2000ms, 10000ms, 30000ms]
- **Maksimum Deneme:** 4 kez
- **Reconnect Stratejisi:** Exponential backoff

## 🏗️ Mimari

### 1. **useSignalR Hook** (`/hooks/useSignalR.ts`)

Custom React hook olarak implementasyon:

```typescript
import { useSignalR } from '@/hooks/useSignalR';

// Kullanım
useSignalR({
  customerId: customerData?.customer.id,
  onTokenBalanceUpdated: (data) => {
    console.log('Token balance:', data.currentTokens);
  },
  enabled: !!customerData?.customer.id,
});
```

**Özellikler:**
- ✅ Automatic connection management
- ✅ Customer group subscription
- ✅ Event listener registration
- ✅ Cleanup on unmount
- ✅ Conditional connection (enabled flag)

### 2. **Event Flow**

```
Backend (SignalR Hub)
    ↓
ApiMenuHub → JoinCustomerGroup(customerId)
    ↓
TokenBalanceUpdated Event
    ↓
useSignalR Hook (Ana Sayfa)
    ↓
Custom Event Dispatch (tokenBalanceUpdated)
    ↓
CartSidebar & ProfileSidebar Listeners
    ↓
UI Güncelleme + Bildirim
```

## 📨 Desteklenen Event'ler

### 1. **TokenBalanceUpdated** ✅ (Aktif)

Backend token bakiyesini güncellediğinde tetiklenir.

**Payload:**
```typescript
{
  userId: number;
  currentTokens: number;
  message: string;
}
```

**Kullanıldığı Yerler:**
- ✅ Ana sayfa (`[code]/page.tsx`)
- ✅ CartSidebar (`/components/cart/CartSidebar.tsx`)
- ✅ ProfileSidebar (`/components/profile/ProfileSidebar.tsx`)

**İşlevler:**
- Token bakiyesini context'te günceller
- CartSidebar'da header'daki token sayısını günceller
- ProfileSidebar'da Jetonlar tab'ını yeniler
- Başarı bildirimi gösterir

### 2. **AdminApproveOrder** 🚫 (Kullanılmıyor)

Service ve APK için - Web UI kullanmıyor.

**Neden Boş:**
Web UI sipariş onaylarken backend'e REST API ile gönderir, gerçek zamanlı onay beklemez.

### 3. **OrderStatusUpdate** 🚫 (Kullanılmıyor)

APK için - Web UI kullanmıyor.

**Neden Boş:**
Müşteri web UI'da sipariş durumunu gerçek zamanlı takip etmez, sadece sipariş verir.

### 4. **OrderStatusChanged** 🚫 (Kullanılmıyor)

APK için - Web UI kullanmıyor.

**Gelecek Geliştirme:**
Web UI'da sipariş durumu takibi eklenirse bu event kullanılabilir.

### 5. **OrderProcessResult** 🚫 (Kullanılmıyor)

Service için - Web UI kullanmıyor.

**Neden Boş:**
SambaPOS servisinin backend'e gönderdiği sipariş işleme sonuçları için kullanılır.

### 6. **NewOrder** 🚫 (Kullanılmıyor)

Admin Panel için - Web UI kullanmıyor.

**Neden Boş:**
Yeni sipariş geldiğinde admin panele bildirim göndermek için kullanılır, müşteri UI'ı bu event'i dinlemez.

## 🔐 Güvenlik

### Connection Protection

Eski sistemde `signalrProtection.js` vardı. Şu an için Next.js tarafında implemente edilmedi çünkü:

1. SignalR kütüphanesinin kendi rate limiting mekanizması var
2. Backend'de rate limiting var
3. Web UI sadece pasif listener, spam riski düşük

**Gelecek Geliştirme:**
Gerekirse aşağıdaki özellikler eklenebilir:
- Connection attempt tracking
- Exponential backoff
- Message rate limiting

## 📊 Bağlantı Durumu İzleme

### Console Log'ları

SignalR bağlantısı durumunu console'da takip edebilirsiniz:

```javascript
// Başarılı bağlantı
✅ SignalR: Connected successfully
✅ SignalR: Joined customer group 123

// Yeniden bağlanma
🔄 SignalR: Reconnecting...
✅ SignalR: Reconnected <connectionId>

// Bağlantı kapanma
🔌 SignalR: Connection closed
```

### Hata Durumları

```javascript
❌ SignalR: Connection failed <error>
❌ SignalR: JoinCustomerGroup failed <error>
```

## 🧪 Test Etme

### 1. Token Balance Güncelleme Testi

1. Web UI'da login olun
2. Admin panel'den token ekleyin veya sipariş onaylayın
3. Web UI'da anında token güncellemesini görmelisiniz

**Beklenen Sonuç:**
- ✅ CartSidebar header'da token sayısı güncellenir
- ✅ ProfileSidebar Jetonlar tab'ı yenilenir
- ✅ Yeşil bildirim gösterilir

### 2. Yeniden Bağlanma Testi

1. Network tab'ı açın
2. WebSocket bağlantısını manuel kapatın
3. SignalR otomatik olarak yeniden bağlanmalı

**Beklenen Sonuç:**
- ✅ Console'da "Reconnecting..." mesajı
- ✅ 2 saniye sonra yeniden bağlanma
- ✅ Customer grubuna otomatik yeniden katılma

### 3. Multi-Tab Testi

1. Aynı müşteriyi 2 tab'da açın
2. Bir tab'da token kazanın
3. Diğer tab'da da güncelleme görmelisiniz

**Beklenen Sonuç:**
- ✅ Her iki tab da TokenBalanceUpdated event'i alır
- ✅ Her iki tab da token bakiyesini günceller

## 🔧 Sorun Giderme

### SignalR Bağlanmıyor

**Kontrol Listesi:**
1. ✅ Network tab'da WebSocket bağlantısı var mı?
2. ✅ Console'da "Connected successfully" mesajı var mı?
3. ✅ customerData yüklendi mi? (SignalR sadece customerId varsa başlar)
4. ✅ CORS ayarları doğru mu?

### Event'ler Gelmiyor

**Kontrol Listesi:**
1. ✅ "Joined customer group" mesajı var mı?
2. ✅ Backend event'i doğru customer grubuna gönderiyor mu?
3. ✅ userId eşleşiyor mu? (Console'da kontrol edin)
4. ✅ Event listener doğru register edilmiş mi?

### Token Güncellenmiyor

**Kontrol Listesi:**
1. ✅ SignalR event'i geliyor mu? (Console'da "Token balance updated" mesajı)
2. ✅ userId kontrolü geçiyor mu?
3. ✅ CartSidebar açık mı? (Event listener sadece mount olduğunda çalışır)
4. ✅ localStorage'da userData var mı?

## 📝 Kod Örnekleri

### Custom Event Listener Ekleme

```typescript
useEffect(() => {
  const handleMyEvent = (event: any) => {
    const data = event.detail;
    console.log('Event received:', data);
  };

  window.addEventListener('myCustomEvent', handleMyEvent);
  return () => window.removeEventListener('myCustomEvent', handleMyEvent);
}, []);
```

### SignalR Event'e Tepki Verme

```typescript
const handleTokenBalanceUpdated = useCallback((data: {
  userId: number;
  currentTokens: number;
  message: string
}) => {
  // Token bakiyesini güncelle
  setUserTokenBalance(data.currentTokens);

  // Custom event dispatch et
  window.dispatchEvent(new CustomEvent('tokenBalanceUpdated', {
    detail: { balance: data.currentTokens, message: data.message }
  }));
}, []);
```

## 🚀 Gelecek Geliştirmeler

### Potansiyel Yeni Event'ler

1. **OrderStatusChanged** - Sipariş durumu takibi
   - Sipariş hazırlandı bildirimi
   - Gerçek zamanlı sipariş durumu

2. **MenuItemUpdated** - Menü değişiklikleri
   - Ürün stok durumu
   - Fiyat güncellemeleri

3. **TableStatusChanged** - Masa durumu
   - Masa müsaitlik durumu
   - Masa transfer bildirimleri

### Performans İyileştirmeleri

- [ ] Event debouncing
- [ ] Selective event subscription
- [ ] Connection pooling
- [ ] Offline queue

## 📚 Referanslar

- [SignalR JavaScript Client](https://docs.microsoft.com/en-us/aspnet/core/signalr/javascript-client)
- [React Hooks Best Practices](https://react.dev/reference/react)
- [Custom Events API](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent)
