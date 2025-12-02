'use client';

export default function KullanimKosullariPage() {
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
          Kullanım Koşulları ve Hizmet Sözleşmesi
        </h1>

        <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#555' }}>

          <p style={{ marginBottom: '20px', fontStyle: 'italic' }}>
            Bu Kullanım Koşulları, Canlı Menü Dijital Çözümler ("Şirket", "biz") ile Platform'u kullanan
            ("Kullanıcı", "siz") arasındaki hukuki ilişkiyi düzenlemektedir. Platform'a erişerek veya
            kullanarak bu koşulları kabul etmiş sayılırsınız.
          </p>

          {/* 1. TANIMLAR */}
          <div style={{ background: '#f8f9ff', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginBottom: '15px' }}>
              1. Tanımlar
            </h2>
            <ul style={{ marginLeft: '20px' }}>
              <li><strong>Platform:</strong> Canlı Menü web sitesi (canlimenu.online) ve ilgili mobil uygulamalar</li>
              <li><strong>Hizmet:</strong> QR menü, sipariş yönetimi, sadakat programı ve tüm dijital hizmetler</li>
              <li><strong>Kullanıcı:</strong> Platform'u kullanan gerçek kişiler (restoran müşterileri)</li>
              <li><strong>İşletme:</strong> Platform aracılığıyla hizmet sunan restoran, kafe ve benzeri işletmeler</li>
              <li><strong>İçerik:</strong> Platform'da yer alan tüm metin, görsel, yazılım ve diğer materyaller</li>
            </ul>
          </div>

          {/* 2. HİZMET TANIMI */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            2. Hizmetin Kapsamı
          </h2>
          <p>Platform aracılığıyla sunulan hizmetler:</p>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li>QR kod ile dijital menü görüntüleme</li>
            <li>Sipariş verme ve takip etme</li>
            <li>Garson çağırma ve hesap isteme</li>
            <li>Sadakat puanı ve jeton kazanma/kullanma</li>
            <li>Etkileşimli oyunlar oynama</li>
            <li>AI asistan ile etkileşim</li>
            <li>Alerjen bilgilendirme ve uyarılar</li>
            <li>Müşteri geri bildirimi (istek, dilek, şikayet)</li>
          </ul>

          {/* 3. ÜYELİK */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            3. Üyelik ve Hesap
          </h2>
          <p><strong>3.1. Üyelik Koşulları</strong></p>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li>Platform'un tüm özelliklerini kullanabilmek için üyelik gereklidir</li>
            <li>Üyelik için 18 yaşından büyük olmanız veya yasal temsilcinizin onayı gerekmektedir</li>
            <li>Üyelik sırasında verdiğiniz bilgilerin doğru ve güncel olması zorunludur</li>
            <li>Her kullanıcı yalnızca bir hesap açabilir</li>
          </ul>

          <p style={{ marginTop: '15px' }}><strong>3.2. Hesap Güvenliği</strong></p>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li>Hesap bilgilerinizin gizliliğinden siz sorumlusunuz</li>
            <li>Şifrenizi kimseyle paylaşmamalısınız</li>
            <li>Hesabınızda şüpheli bir aktivite fark ederseniz derhal bize bildirmelisiniz</li>
            <li>Hesabınız üzerinden gerçekleştirilen tüm işlemlerden siz sorumlusunuz</li>
          </ul>

          {/* 4. KULLANICI YÜKÜMLÜLÜKLERİ */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            4. Kullanıcı Yükümlülükleri
          </h2>
          <p>Platform'u kullanırken aşağıdaki kurallara uymayı kabul edersiniz:</p>

          <div style={{ background: '#ffebee', padding: '15px', borderRadius: '8px', marginTop: '15px' }}>
            <p style={{ color: '#c62828', fontWeight: 600, marginBottom: '10px' }}>Yasaklanan Davranışlar:</p>
            <ul style={{ marginLeft: '20px', color: '#c62828' }}>
              <li>Yasalara ve genel ahlaka aykırı davranışlar</li>
              <li>Başkalarının kişilik haklarına saldırı</li>
              <li>Platform'un işleyişini bozma veya engelleme girişimleri</li>
              <li>Yanıltıcı, sahte veya hatalı bilgi verme</li>
              <li>Spam, istenmeyen mesaj veya reklam gönderme</li>
              <li>Virüs, zararlı yazılım veya kod yayma</li>
              <li>Başka kullanıcıların hesaplarına yetkisiz erişim</li>
              <li>Platform verilerini otomatik yollarla toplama (scraping)</li>
              <li>Oyunlarda hile yapma veya sistemleri manipüle etme</li>
            </ul>
          </div>

          {/* 5. SADAKAT PROGRAMI */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            5. Sadakat Programı ve Jetonlar
          </h2>
          <p><strong>5.1. Genel Kurallar</strong></p>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li>Sadakat puanları ve jetonlar yalnızca Platform içinde geçerlidir</li>
            <li>Puanlar ve jetonlar nakit paraya çevrilemez</li>
            <li>Puanlar ve jetonlar başkasına devredilemez</li>
            <li>Her işletmenin kendi puan/jeton politikası olabilir</li>
          </ul>

          <p style={{ marginTop: '15px' }}><strong>5.2. Puan ve Jeton Kaybı</strong></p>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li>12 ay süreyle kullanılmayan puanlar geçerliliğini kaybedebilir</li>
            <li>Hesap kapatıldığında tüm puanlar ve jetonlar silinir</li>
            <li>Kötüye kullanım tespit edildiğinde puanlar iptal edilebilir</li>
          </ul>

          <p style={{ marginTop: '15px' }}><strong>5.3. Program Değişiklikleri</strong></p>
          <p style={{ marginLeft: '20px' }}>
            Şirket, sadakat programı koşullarını, puan değerlerini ve kullanım kurallarını
            önceden bildirmeksizin değiştirme hakkını saklı tutar. Önemli değişiklikler
            Platform üzerinden duyurulacaktır.
          </p>

          {/* 6. FİKRİ MÜLKİYET */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            6. Fikri Mülkiyet Hakları
          </h2>
          <p><strong>6.1. Şirket Hakları</strong></p>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li>Platform'daki tüm içerik, tasarım, logo, yazılım ve kodlar Şirket'e aittir</li>
            <li>Tüm haklar 5846 sayılı Fikir ve Sanat Eserleri Kanunu ile korunmaktadır</li>
            <li>İçeriklerin izinsiz kopyalanması, dağıtılması veya değiştirilmesi yasaktır</li>
          </ul>

          <p style={{ marginTop: '15px' }}><strong>6.2. Kullanıcı İçerikleri</strong></p>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li>Platform'a yüklediğiniz içerikler (yorumlar, geri bildirimler) üzerinde size ait haklar saklıdır</li>
            <li>Ancak bu içerikleri Platform'da kullanmamız için bize lisans vermiş sayılırsınız</li>
            <li>İçeriklerinizin üçüncü kişilerin haklarını ihlal etmemesinden siz sorumlusunuz</li>
          </ul>

          {/* 7. İŞLETME İLİŞKİSİ */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            7. İşletmeler ile İlişki
          </h2>
          <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
            <p style={{ color: '#856404' }}>
              <strong>Önemli:</strong> Platform, işletmeler ile müşteriler arasında aracılık hizmeti sunmaktadır.
              İşletmeler tarafından sunulan ürün ve hizmetlerin kalitesi, fiyatı, güvenliği ve teslimatı
              tamamen ilgili işletmenin sorumluluğundadır. Şirket, işletmelerin ürün ve hizmetleri hakkında
              herhangi bir garanti vermemektedir.
            </p>
          </div>

          {/* 8. SORUMLULUK SINIRLAMASI */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            8. Sorumluluk Sınırlaması
          </h2>
          <p><strong>8.1. Hizmet Garantisi</strong></p>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li>Platform "olduğu gibi" sunulmaktadır</li>
            <li>Kesintisiz veya hatasız çalışma garantisi verilmemektedir</li>
            <li>Teknik bakım, güncelleme veya mücbir sebeplerle hizmette kesintiler olabilir</li>
          </ul>

          <p style={{ marginTop: '15px' }}><strong>8.2. Zarar Sorumluluğu</strong></p>
          <p style={{ marginLeft: '20px' }}>
            Platform kullanımından doğabilecek doğrudan, dolaylı, özel, arızi veya cezai zararlardan
            (kar kaybı, veri kaybı, itibar kaybı dahil) Şirket sorumlu tutulamaz. Şirket'in toplam
            sorumluluğu her halükarda son 12 ayda Platform için ödediğiniz tutarla sınırlıdır.
          </p>

          {/* 9. FESİH */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            9. Hesap Askıya Alma ve Fesih
          </h2>
          <p><strong>9.1. Şirket'in Hakları</strong></p>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li>Bu koşulları ihlal eden hesaplar önceden bildirimsiz askıya alınabilir veya kapatılabilir</li>
            <li>Dolandırıcılık veya kötüye kullanım şüphesinde hesap derhal kapatılabilir</li>
            <li>Yasal talepler doğrultusunda hesap bilgileri yetkili makamlara iletilebilir</li>
          </ul>

          <p style={{ marginTop: '15px' }}><strong>9.2. Kullanıcı Hakları</strong></p>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li>Hesabınızı dilediğiniz zaman kapatabilirsiniz</li>
            <li>Hesap kapatma talebi için Profil → Ayarlar → Hesabı Sil seçeneğini kullanabilirsiniz</li>
            <li>Hesap kapatıldığında kişisel verileriniz KVKK kapsamında işlenir</li>
          </ul>

          {/* 10. DEĞİŞİKLİKLER */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            10. Koşullarda Değişiklik
          </h2>
          <p>
            Şirket, bu kullanım koşullarını herhangi bir zamanda değiştirme hakkını saklı tutar.
            Değişiklikler Platform'da yayınlandığı tarihte yürürlüğe girer. Önemli değişiklikler
            hakkında kayıtlı e-posta adresinize bildirim yapılacaktır. Platform'u kullanmaya
            devam etmeniz, güncel koşulları kabul ettiğiniz anlamına gelir.
          </p>

          {/* 11. UYUŞMAZLIK */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            11. Uyuşmazlık Çözümü
          </h2>
          <p><strong>11.1. Uygulanacak Hukuk</strong></p>
          <p style={{ marginLeft: '20px' }}>
            Bu sözleşme Türkiye Cumhuriyeti kanunlarına tabidir.
          </p>

          <p style={{ marginTop: '15px' }}><strong>11.2. Yetkili Mahkeme</strong></p>
          <p style={{ marginLeft: '20px' }}>
            Uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.
          </p>

          <p style={{ marginTop: '15px' }}><strong>11.3. Tüketici Hakları</strong></p>
          <p style={{ marginLeft: '20px' }}>
            6502 sayılı Tüketicinin Korunması Hakkında Kanun kapsamındaki haklarınız saklıdır.
            Şikayetlerinizi Tüketici Hakem Heyetleri'ne veya Tüketici Mahkemeleri'ne iletebilirsiniz.
          </p>

          {/* 12. İLETİŞİM */}
          <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '12px', marginTop: '25px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginBottom: '15px' }}>
              12. İletişim
            </h2>
            <p>
              Bu kullanım koşulları hakkında sorularınız için bizimle iletişime geçebilirsiniz:
            </p>
            <p style={{ marginTop: '10px' }}>
              <strong>Şirket:</strong> Canlı Menü Dijital Çözümler<br />
              <strong>E-posta:</strong> info@canlimenu.online<br />
              <strong>Destek:</strong> destek@canlimenu.online<br />
              <strong>Telefon:</strong> 0542 674 32 69
            </p>
          </div>

          {/* 13. DİĞER HÜKÜMLER */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            13. Diğer Hükümler
          </h2>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li><strong>Bölünebilirlik:</strong> Bu koşulların herhangi bir hükmünün geçersiz sayılması, diğer hükümlerin geçerliliğini etkilemez</li>
            <li><strong>Feragat:</strong> Herhangi bir hakkın kullanılmaması, o haktan feragat anlamına gelmez</li>
            <li><strong>Devir:</strong> Bu sözleşmeden doğan haklarınızı izinsiz devredemezsiniz</li>
            <li><strong>Bütünlük:</strong> Bu koşullar, KVKK Aydınlatma Metni ve Çerez Politikası ile birlikte tam sözleşmeyi oluşturur</li>
          </ul>

          <p style={{ marginTop: '30px', fontSize: '12px', color: '#888', textAlign: 'center' }}>
            Son güncelleme: 27 Kasım 2025
          </p>

          <p style={{ marginTop: '10px', fontSize: '11px', color: '#aaa', textAlign: 'center' }}>
            Bu metin, 6098 sayılı Türk Borçlar Kanunu, 6502 sayılı Tüketicinin Korunması Hakkında Kanun
            ve ilgili mevzuat kapsamında hazırlanmıştır.
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
