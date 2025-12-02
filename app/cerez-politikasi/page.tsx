'use client';

export default function CerezPolitikasiPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: '#333',
          marginBottom: '30px',
          textAlign: 'center',
        }}>
          Çerez (Cookie) Politikası
        </h1>

        <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#555' }}>

          <p style={{ marginBottom: '20px' }}>
            Bu Çerez Politikası, Canlı Menü Dijital Çözümler ("Şirket", "biz") tarafından işletilen
            canlimenu.online web sitesi ve mobil uygulaması ("Platform") üzerinde kullanılan çerezler
            hakkında sizi bilgilendirmek amacıyla hazırlanmıştır.
          </p>

          {/* 1. ÇEREZ NEDİR */}
          <div style={{ background: '#f8f9ff', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginBottom: '15px' }}>
              1. Çerez Nedir?
            </h2>
            <p>
              Çerezler (cookies), web sitelerinin veya mobil uygulamaların cihazınıza (bilgisayar, tablet,
              akıllı telefon) yerleştirdiği küçük metin dosyalarıdır. Bu dosyalar, sizi tanımak, tercihlerinizi
              hatırlamak ve size daha iyi bir kullanıcı deneyimi sunmak için kullanılır.
            </p>
          </div>

          {/* 2. KULLANILAN ÇEREZ TÜRLERİ */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            2. Kullanılan Çerez Türleri
          </h2>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ background: '#667eea', color: 'white' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Çerez Türü</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Amaç</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Süre</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: '#e8f5e9' }}>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>
                  <strong>Zorunlu Çerezler</strong>
                </td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>
                  Platform'un temel işlevlerinin çalışması için gereklidir. Oturum yönetimi, güvenlik,
                  masa/session bilgisi gibi kritik fonksiyonlar için kullanılır.
                </td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Oturum / 15 dakika</td>
              </tr>
              <tr>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>
                  <strong>İşlevsel Çerezler</strong>
                </td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>
                  Tercihlerinizi hatırlamak için kullanılır. Dil seçimi, tema tercihi, sepet içeriği
                  gibi bilgileri saklar.
                </td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>1 yıl</td>
              </tr>
              <tr style={{ background: '#f8f9ff' }}>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>
                  <strong>Performans Çerezleri</strong>
                </td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>
                  Platform'un performansını analiz etmek için kullanılır. Sayfa yükleme süreleri,
                  hata raporları gibi verileri toplar.
                </td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>2 yıl</td>
              </tr>
              <tr>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>
                  <strong>Analitik Çerezler</strong>
                </td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>
                  Ziyaretçi davranışlarını anlamak için kullanılır. Hangi sayfaların ziyaret edildiği,
                  kullanıcı etkileşimleri gibi anonim veriler toplanır.
                </td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>2 yıl</td>
              </tr>
            </tbody>
          </table>

          {/* 3. KULLANDIĞIMIZ ÇEREZLER */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            3. Platform'da Kullanılan Çerezler
          </h2>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ background: '#667eea', color: 'white' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Çerez Adı</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Tür</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Açıklama</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Süre</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: '#f8f9ff' }}>
                <td style={{ padding: '12px', border: '1px solid #eee' }}><code>userToken</code></td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Zorunlu</td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Kullanıcı oturum kimlik doğrulaması</td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Oturum</td>
              </tr>
              <tr>
                <td style={{ padding: '12px', border: '1px solid #eee' }}><code>tableId</code></td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Zorunlu</td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>QR kod ile okutulan masa bilgisi</td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>15 dakika</td>
              </tr>
              <tr style={{ background: '#f8f9ff' }}>
                <td style={{ padding: '12px', border: '1px solid #eee' }}><code>isSelfService</code></td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Zorunlu</td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Self-servis modu aktif mi</td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>15 dakika</td>
              </tr>
              <tr>
                <td style={{ padding: '12px', border: '1px solid #eee' }}><code>selfServiceSessionId</code></td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Zorunlu</td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Self-servis oturum kimliği</td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>15 dakika</td>
              </tr>
              <tr style={{ background: '#f8f9ff' }}>
                <td style={{ padding: '12px', border: '1px solid #eee' }}><code>cookieConsent</code></td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Zorunlu</td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Çerez tercihleriniz</td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>1 yıl</td>
              </tr>
              <tr>
                <td style={{ padding: '12px', border: '1px solid #eee' }}><code>preferredLanguage</code></td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>İşlevsel</td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Tercih edilen dil</td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>1 yıl</td>
              </tr>
            </tbody>
          </table>

          {/* 4. ÜÇÜNCÜ TARAF ÇEREZLERİ */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            4. Üçüncü Taraf Çerezleri
          </h2>
          <p>Platform'da aşağıdaki üçüncü taraf hizmetleri kullanılabilmektedir:</p>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li><strong>Google Analytics:</strong> Anonim kullanım istatistikleri için</li>
            <li><strong>Google Sign-In:</strong> Google ile giriş işlemleri için</li>
            <li><strong>Vercel Analytics:</strong> Performans izleme için</li>
          </ul>
          <p style={{ marginTop: '10px' }}>
            Bu hizmetlerin kendi çerez ve gizlilik politikaları bulunmaktadır. Detaylı bilgi için
            ilgili hizmet sağlayıcıların web sitelerini ziyaret edebilirsiniz.
          </p>

          {/* 5. ÇEREZ YÖNETİMİ */}
          <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '12px', marginTop: '25px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginBottom: '15px' }}>
              5. Çerez Tercihlerinizi Yönetme
            </h2>
            <p><strong>5.1. Platform Üzerinden</strong></p>
            <p style={{ marginLeft: '20px', marginTop: '10px' }}>
              Platform'a ilk girişinizde çerez tercihlerinizi seçebilirsiniz. Tercihlerinizi daha sonra
              değiştirmek için sayfanın altındaki "Çerez Ayarları" bağlantısını kullanabilirsiniz.
            </p>

            <p style={{ marginTop: '15px' }}><strong>5.2. Tarayıcı Ayarları</strong></p>
            <p style={{ marginLeft: '20px', marginTop: '10px' }}>
              Çerezleri tarayıcınızın ayarlarından da yönetebilirsiniz:
            </p>
            <ul style={{ marginLeft: '40px', marginTop: '10px' }}>
              <li><strong>Chrome:</strong> Ayarlar → Gizlilik ve Güvenlik → Çerezler</li>
              <li><strong>Firefox:</strong> Ayarlar → Gizlilik ve Güvenlik → Çerezler</li>
              <li><strong>Safari:</strong> Tercihler → Gizlilik → Çerezler</li>
              <li><strong>Edge:</strong> Ayarlar → Çerezler ve site izinleri</li>
            </ul>

            <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', marginTop: '15px' }}>
              <p style={{ color: '#856404', fontSize: '13px' }}>
                <strong>Uyarı:</strong> Zorunlu çerezleri devre dışı bırakmanız halinde Platform'un
                bazı temel işlevleri çalışmayabilir. Örneğin, oturum açamayabilir veya sipariş veremeyebilirsiniz.
              </p>
            </div>
          </div>

          {/* 6. HUKUKİ DAYANAK */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            6. Hukuki Dayanak
          </h2>
          <p>Çerez kullanımımız aşağıdaki mevzuata uygun şekilde gerçekleştirilmektedir:</p>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li>6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK)</li>
            <li>5651 sayılı İnternet Ortamında Yapılan Yayınların Düzenlenmesi Kanunu</li>
            <li>Elektronik Ticaretin Düzenlenmesi Hakkında Kanun</li>
            <li>Kişisel Verileri Koruma Kurulu kararları ve rehberleri</li>
          </ul>

          {/* 7. DEĞİŞİKLİKLER */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            7. Politika Değişiklikleri
          </h2>
          <p>
            Bu Çerez Politikası, yasal düzenlemeler veya hizmetlerimizdeki değişikliklere bağlı olarak
            güncellenebilir. Güncellemeler Platform'da yayınlandığı tarihte yürürlüğe girer.
          </p>

          {/* 8. İLETİŞİM */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            8. İletişim
          </h2>
          <p>Çerez kullanımımız hakkında sorularınız için:</p>
          <p style={{ marginTop: '10px' }}>
            <strong>E-posta:</strong> info@canlimenu.online<br />
            <strong>KVKK Başvuruları:</strong> kvkk@canlimenu.online<br />
            <strong>Telefon:</strong> 0542 674 32 69
          </p>

          <p style={{ marginTop: '30px', fontSize: '12px', color: '#888', textAlign: 'center' }}>
            Son güncelleme: 27 Kasım 2025
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '12px 30px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              marginRight: '10px',
            }}
          >
            Geri Dön
          </button>
          <button
            onClick={() => window.print()}
            style={{
              padding: '12px 30px',
              background: '#fff',
              color: '#667eea',
              border: '2px solid #667eea',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Yazdır
          </button>
        </div>
      </div>
    </div>
  );
}
