'use client';

export default function GizlilikPolitikasiPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
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
          marginBottom: '10px',
          textAlign: 'center',
        }}>
          GİZLİLİK POLİTİKASI
        </h1>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 600,
          color: '#e74c3c',
          marginBottom: '30px',
          textAlign: 'center',
        }}>
          Canlı Garson - Restoran Yönetim Uygulaması
        </h2>

        <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#555' }}>

          {/* GENEL BAKIŞ */}
          <div style={{ background: '#fef9f9', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #f5c6cb' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginBottom: '15px' }}>
              Genel Bakış
            </h2>
            <p>
              Canlı Garson uygulaması, restoran ve kafe işletmelerinde sipariş takibi ve
              personel iletişimi için geliştirilmiş profesyonel bir mobil uygulamadır.
              Kullanıcılarımızın gizliliğine saygı duyuyor ve kişisel verilerin korunması
              konusunda azami özeni gösteriyoruz.
            </p>
          </div>

          {/* TOPLANAN VERİLER */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            1. Toplanan Veriler
          </h2>
          <p>Uygulamamız aşağıdaki verileri toplar ve işler:</p>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', marginBottom: '20px' }}>
            <thead>
              <tr style={{ background: '#e74c3c', color: 'white' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderRadius: '8px 0 0 0' }}>Veri Türü</th>
                <th style={{ padding: '12px', textAlign: 'left', borderRadius: '0 8px 0 0' }}>Kullanım Amacı</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: '#fef9f9' }}>
                <td style={{ padding: '12px', border: '1px solid #eee' }}><strong>Kullanıcı Kimlik Bilgileri</strong></td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Giriş için kullanılan kullanıcı adı ve şifre (şifreli saklanır)</td>
              </tr>
              <tr>
                <td style={{ padding: '12px', border: '1px solid #eee' }}><strong>Sipariş Verileri</strong></td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Masa numaraları, sipariş detayları ve işlem geçmişi</td>
              </tr>
              <tr style={{ background: '#fff3cd' }}>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>
                  <strong>Ses Verileri (Mikrofon)</strong><br/>
                  <span style={{ fontSize: '12px', color: '#856404' }}>* Hassas İzin</span>
                </td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>
                  Personel arasında anlık sesli iletişim (telsiz özelliği)<br/>
                  <span style={{ fontSize: '12px', color: '#856404' }}>Ses verileri kaydedilmez, yalnızca anlık iletilir</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* MİKROFON KULLANIMI */}
          <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '12px', marginTop: '25px', marginBottom: '20px', border: '2px solid #ffc107' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#856404', marginBottom: '15px' }}>
              🎤 Mikrofon Kullanımı Hakkında Önemli Bilgi
            </h2>
            <p style={{ color: '#856404', marginBottom: '10px' }}>
              Uygulamamız, restoran personeli arasında anlık sesli iletişim (telsiz) özelliği sunmaktadır.
            </p>
            <ul style={{ marginLeft: '20px', color: '#856404' }}>
              <li>Mikrofon yalnızca telsiz özelliği aktif olduğunda kullanılır</li>
              <li>Ses verileri <strong>KAYDEDİLMEZ</strong> ve <strong>SAKLANMAZ</strong></li>
              <li>Ses yalnızca anlık iletişim için gerçek zamanlı olarak iletilir</li>
              <li>Telsiz özelliğini kullanmak istemezseniz mikrofon iznini reddedebilirsiniz</li>
            </ul>
          </div>

          {/* VERİLERİN KULLANIMI */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            2. Verilerin Kullanımı
          </h2>
          <p>Toplanan veriler yalnızca aşağıdaki amaçlarla kullanılır:</p>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li>Sipariş yönetimi ve takibi</li>
            <li>Masa durumlarının gerçek zamanlı görüntülenmesi</li>
            <li>Personel arasında anlık sesli iletişim sağlanması</li>
            <li>Uygulama performansının iyileştirilmesi</li>
          </ul>

          {/* VERİ PAYLAŞIMI */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            3. Veri Paylaşımı
          </h2>
          <div style={{ background: '#d4edda', padding: '20px', borderRadius: '12px', border: '1px solid #c3e6cb' }}>
            <p style={{ color: '#155724', marginBottom: '10px' }}>
              <strong>✓ Kullanıcı verileri üçüncü taraflarla PAYLAŞILMAZ ve SATILMAZ.</strong>
            </p>
            <p style={{ color: '#155724' }}>
              Veriler yalnızca işletmenin kendi SambaPOS sistemi ile senkronize edilir ve
              işletme içinde kalır.
            </p>
          </div>

          {/* VERİ GÜVENLİĞİ */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            4. Veri Güvenliği
          </h2>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li>Tüm veriler şifreli bağlantılar (HTTPS/WSS) üzerinden iletilir</li>
            <li>Kullanıcı şifreleri güvenli algoritmalarla hashlenerek saklanır</li>
            <li>Uygulama, yerel ağ içinde çalışır ve dış erişime kapalıdır</li>
          </ul>

          {/* KULLANICI HAKLARI */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            5. Kullanıcı Hakları
          </h2>
          <p>Kullanıcılarımız aşağıdaki haklara sahiptir:</p>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li>Kişisel verilerine erişim talep etme</li>
            <li>Verilerinin düzeltilmesini isteme</li>
            <li>Verilerinin silinmesini talep etme</li>
            <li>Mikrofon iznini istediği zaman iptal etme</li>
            <li>Uygulamayı kullanmayı bırakma</li>
          </ul>

          {/* ÇOCUKLARIN GİZLİLİĞİ */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            6. Çocukların Gizliliği
          </h2>
          <p>
            Bu uygulama profesyonel iş kullanımı için tasarlanmıştır ve
            13 yaşın altındaki çocuklara yönelik değildir.
          </p>

          {/* POLİTİKA DEĞİŞİKLİKLERİ */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            7. Politika Değişiklikleri
          </h2>
          <p>
            Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişiklikler
            uygulama içinden bildirilecektir.
          </p>

          {/* İLETİŞİM */}
          <div style={{ background: '#e74c3c', padding: '20px', borderRadius: '12px', marginTop: '30px', color: 'white' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '15px' }}>
              İletişim
            </h2>
            <p>
              Gizlilik politikamız hakkında sorularınız için:<br/><br/>
              <strong>E-posta:</strong> destek@menupark.com<br/>
              <strong>Web:</strong> www.menupark.com
            </p>
          </div>

          <p style={{ marginTop: '30px', fontSize: '12px', color: '#888', textAlign: 'center' }}>
            Son güncelleme: 13 Aralık 2025
          </p>

        </div>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '12px 30px',
              background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
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
              color: '#e74c3c',
              border: '2px solid #e74c3c',
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
