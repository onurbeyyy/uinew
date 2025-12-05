'use client';

export default function KVKKPage() {
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
          marginBottom: '10px',
          textAlign: 'center',
        }}>
          KİŞİSEL VERİLERİN KORUNMASI KANUNU (KVKK)
        </h1>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 600,
          color: '#667eea',
          marginBottom: '30px',
          textAlign: 'center',
        }}>
          Aydınlatma Metni
        </h2>

        <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#555' }}>

          <p style={{ marginBottom: '20px' }}>
            Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") 10. maddesi ile
            Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ
            kapsamında veri sorumlusu sıfatıyla tarafınıza sunulmaktadır.
          </p>

          {/* 1. VERİ SORUMLUSU */}
          <div style={{ background: '#f8f9ff', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginBottom: '15px' }}>
              1. Veri Sorumlusunun Kimliği
            </h2>
            <p>
              <strong>Unvan:</strong> Canlı Menü Dijital Çözümler<br />
              <strong>Adres:</strong> İstanbul, Türkiye<br />
              <strong>E-posta:</strong> info@canlimenu.online
            </p>
          </div>

          {/* 2. İŞLENEN KİŞİSEL VERİLER */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            2. İşlenen Kişisel Veriler ve Kategorileri
          </h2>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ background: '#667eea', color: 'white' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderRadius: '8px 0 0 0' }}>Veri Kategorisi</th>
                <th style={{ padding: '12px', textAlign: 'left', borderRadius: '0 8px 0 0' }}>İşlenen Veriler</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: '#f8f9ff' }}>
                <td style={{ padding: '12px', border: '1px solid #eee' }}><strong>Kimlik Bilgileri</strong></td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Ad, soyad, kullanıcı adı (nickname)</td>
              </tr>
              <tr>
                <td style={{ padding: '12px', border: '1px solid #eee' }}><strong>İletişim Bilgileri</strong></td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>E-posta adresi, telefon numarası</td>
              </tr>
              <tr style={{ background: '#f8f9ff' }}>
                <td style={{ padding: '12px', border: '1px solid #eee' }}><strong>Müşteri İşlem Bilgileri</strong></td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Sipariş geçmişi, ürün tercihleri, masa bilgisi</td>
              </tr>
              <tr>
                <td style={{ padding: '12px', border: '1px solid #eee' }}><strong>Finansal Bilgiler</strong></td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Sadakat puanı, jeton bakiyesi</td>
              </tr>
              <tr style={{ background: '#f8f9ff' }}>
                <td style={{ padding: '12px', border: '1px solid #eee' }}><strong>Demografik Bilgiler</strong></td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Doğum tarihi, cinsiyet</td>
              </tr>
              <tr>
                <td style={{ padding: '12px', border: '1px solid #eee' }}><strong>İşlem Güvenliği Bilgileri</strong></td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>IP adresi, cihaz bilgisi, tarayıcı bilgisi, çerez verileri, log kayıtları</td>
              </tr>
              <tr style={{ background: '#fff3cd' }}>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>
                  <strong>Sağlık Bilgileri</strong><br/>
                  <span style={{ fontSize: '12px', color: '#856404' }}>(Özel Nitelikli Veri)</span>
                </td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>
                  Alerji bilgileri (gluten, fındık, süt ürünleri vb.)<br/>
                  <span style={{ fontSize: '12px', color: '#856404' }}>* Bu veriler yalnızca açık rızanız ile işlenir</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 3. İŞLEME AMAÇLARI */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            3. Kişisel Verilerin İşlenme Amaçları
          </h2>
          <p>Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>

          <div style={{ marginLeft: '20px', marginTop: '15px' }}>
            <p><strong>a) Hizmet Sunumu Amaçları:</strong></p>
            <ul style={{ marginLeft: '20px', marginTop: '5px' }}>
              <li>Üyelik işlemlerinin gerçekleştirilmesi ve hesap yönetimi</li>
              <li>Sipariş alınması ve takibi</li>
              <li>Garson çağırma ve hesap isteme işlemlerinin yürütülmesi</li>
              <li>Müşteri memnuniyeti ve talep yönetimi</li>
            </ul>

            <p style={{ marginTop: '15px' }}><strong>b) Sadakat Programı Amaçları:</strong></p>
            <ul style={{ marginLeft: '20px', marginTop: '5px' }}>
              <li>Sadakat puanı kazandırma ve kullandırma</li>
              <li>Jeton sistemi yönetimi</li>
              <li>Doğum günü ve özel gün kampanyalarının sunulması</li>
            </ul>

            <p style={{ marginTop: '15px' }}><strong>c) Sağlık ve Güvenlik Amaçları (Açık Rıza ile):</strong></p>
            <ul style={{ marginLeft: '20px', marginTop: '5px' }}>
              <li>Alerjen uyarılarının gösterilmesi</li>
              <li>Sağlığınızı tehdit edebilecek ürünler hakkında bilgilendirme</li>
            </ul>

            <p style={{ marginTop: '15px' }}><strong>d) Yasal Yükümlülükler:</strong></p>
            <ul style={{ marginLeft: '20px', marginTop: '5px' }}>
              <li>5651 sayılı Kanun kapsamında log kayıtlarının tutulması</li>
              <li>Yetkili kurum ve kuruluşlara bilgi sunulması</li>
              <li>Hukuki süreçlerin yürütülmesi</li>
            </ul>
          </div>

          {/* 4. HUKUKİ SEBEPLER */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            4. Kişisel Verilerin İşlenmesinin Hukuki Sebepleri
          </h2>
          <p>Kişisel verileriniz, KVKK'nın 5. ve 6. maddelerinde belirtilen aşağıdaki hukuki sebeplere dayalı olarak işlenmektedir:</p>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', marginBottom: '20px' }}>
            <thead>
              <tr style={{ background: '#667eea', color: 'white' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Hukuki Sebep</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>KVKK Maddesi</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Uygulama Alanı</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: '#f8f9ff' }}>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Sözleşmenin kurulması veya ifası</td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Md. 5/2(c)</td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Üyelik, sipariş işlemleri</td>
              </tr>
              <tr>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Hukuki yükümlülük</td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Md. 5/2(ç)</td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Log kayıtları, yasal bildirimler</td>
              </tr>
              <tr style={{ background: '#f8f9ff' }}>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Meşru menfaat</td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Md. 5/2(f)</td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Hizmet kalitesi, güvenlik</td>
              </tr>
              <tr style={{ background: '#fff3cd' }}>
                <td style={{ padding: '12px', border: '1px solid #eee' }}><strong>Açık Rıza</strong></td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Md. 5/1 ve Md. 6/2</td>
                <td style={{ padding: '12px', border: '1px solid #eee' }}>Alerji bilgileri (özel nitelikli), pazarlama</td>
              </tr>
            </tbody>
          </table>

          {/* 5. VERİ AKTARIMI */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            5. Kişisel Verilerin Aktarılması
          </h2>
          <p>Kişisel verileriniz, yukarıda belirtilen amaçların gerçekleştirilmesi doğrultusunda:</p>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li><strong>İş ortağı restoranlar:</strong> Sipariş işleme ve hizmet sunumu için</li>
            <li><strong>Teknik hizmet sağlayıcılar:</strong> Sunucu, bulut hizmeti, yazılım desteği için</li>
            <li><strong>Yetkili kamu kurum ve kuruluşları:</strong> Yasal yükümlülükler kapsamında talep halinde</li>
          </ul>
          <p style={{ marginTop: '10px' }}>
            aktarılabilmektedir. Aktarım, KVKK'nın 8. ve 9. maddelerinde belirtilen şartlara uygun olarak gerçekleştirilmektedir.
          </p>

          {/* 6. TOPLAMA YÖNTEMİ */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            6. Kişisel Verilerin Toplanma Yöntemi
          </h2>
          <p>Kişisel verileriniz aşağıdaki yöntemlerle toplanmaktadır:</p>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li>Web sitesi ve mobil uygulama üzerinden üyelik formları</li>
            <li>QR kod tarama ile restoran erişimi</li>
            <li>Sipariş ve tercih işlemleri sırasında</li>
            <li>Çerezler (cookies) ve benzeri teknolojiler aracılığıyla</li>
            <li>Müşteri hizmetleri iletişimi</li>
          </ul>

          {/* 7. SAKLAMA SÜRESİ */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            7. Kişisel Verilerin Saklanma Süresi
          </h2>
          <p>Kişisel verileriniz, işleme amacının gerektirdiği süre boyunca saklanmaktadır:</p>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li><strong>Üyelik bilgileri:</strong> Üyelik süresince ve sonlandırmadan itibaren 2 yıl</li>
            <li><strong>Sipariş geçmişi:</strong> İşlemden itibaren 10 yıl (6102 sayılı TTK)</li>
            <li><strong>Log kayıtları:</strong> 2 yıl (5651 sayılı Kanun)</li>
            <li><strong>Alerji bilgileri:</strong> Rıza geri alınana veya hesap kapatılana kadar</li>
          </ul>

          {/* 8. HAKLARINIZ */}
          <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '12px', marginTop: '25px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginBottom: '15px' }}>
              8. İlgili Kişi Olarak Haklarınız (KVKK Madde 11)
            </h2>
            <p>KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:</p>
            <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
              <li>Kişisel verilerinizin işlenip işlenmediğini <strong>öğrenme</strong></li>
              <li>Kişisel verileriniz işlenmişse buna ilişkin <strong>bilgi talep etme</strong></li>
              <li>İşlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını <strong>öğrenme</strong></li>
              <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri <strong>bilme</strong></li>
              <li>Eksik veya yanlış işlenmiş olması hâlinde bunların <strong>düzeltilmesini isteme</strong></li>
              <li>KVKK'nın 7. maddesi kapsamında <strong>silinmesini veya yok edilmesini isteme</strong></li>
              <li>Düzeltme, silme veya yok edilme işlemlerinin aktarıldığı üçüncü kişilere <strong>bildirilmesini isteme</strong></li>
              <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına <strong>itiraz etme</strong></li>
              <li>Kanuna aykırı işleme sebebiyle zarara uğramanız hâlinde <strong>zararın giderilmesini talep etme</strong></li>
            </ul>
          </div>

          {/* 9. BAŞVURU */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            9. Haklarınızı Kullanma Yöntemi
          </h2>
          <p>
            Yukarıda belirtilen haklarınızı kullanmak için aşağıdaki yöntemlerle başvurabilirsiniz:
          </p>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li><strong>E-posta:</strong> kvkk@canlimenu.online (kişisel e-posta adresinizden)</li>
            <li><strong>Posta:</strong> [Şirket Adresi] - "KVKK Başvurusu" ibaresiyle</li>
            <li><strong>Uygulama içi:</strong> Profil → Ayarlar → KVKK Başvurusu</li>
          </ul>
          <p style={{ marginTop: '15px' }}>
            Başvurularınız en geç <strong>30 gün</strong> içinde sonuçlandırılacaktır. İşlemin ayrıca bir maliyet
            gerektirmesi hâlinde, Kişisel Verileri Koruma Kurulu tarafından belirlenen tarifedeki ücret alınabilir.
          </p>

          {/* 10. AÇIK RIZA */}
          <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '12px', marginTop: '25px', marginBottom: '20px', border: '1px solid #ffc107' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#856404', marginBottom: '15px' }}>
              10. Açık Rıza Gerektiren Durumlar
            </h2>
            <p style={{ color: '#856404' }}>
              KVKK'nın 6. maddesi uyarınca, aşağıdaki veriler yalnızca açık rızanız ile işlenmektedir:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '10px', color: '#856404' }}>
              <li><strong>Sağlık Bilgileri:</strong> Alerji ve gıda intoleransı bilgileriniz (özel nitelikli kişisel veri)</li>
              <li><strong>Pazarlama:</strong> Kampanya, promosyon ve kişiselleştirilmiş teklifler</li>
            </ul>
            <p style={{ marginTop: '15px', color: '#856404' }}>
              Açık rızanızı dilediğiniz zaman, hiçbir gerekçe göstermeksizin geri alabilirsiniz.
              Rızanızı geri almak için uygulama içi ayarlardan veya kvkk@canlimenu.online adresinden başvurabilirsiniz.
            </p>
          </div>

          {/* 11. DEĞİŞİKLİKLER */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginTop: '25px', marginBottom: '15px' }}>
            11. Aydınlatma Metninde Değişiklikler
          </h2>
          <p>
            Bu aydınlatma metni, yasal düzenlemeler ve veri işleme faaliyetlerimizdeki değişikliklere bağlı olarak
            güncellenebilir. Güncellemeler, Platform üzerinde yayınlandığı tarihte yürürlüğe girer. Önemli
            değişiklikler hakkında e-posta ile bilgilendirileceksiniz.
          </p>

          <p style={{ marginTop: '30px', fontSize: '12px', color: '#888', textAlign: 'center' }}>
            Son güncelleme: 27 Kasım 2025
          </p>

          <p style={{ marginTop: '10px', fontSize: '11px', color: '#aaa', textAlign: 'center' }}>
            Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu ve ilgili mevzuat kapsamında hazırlanmıştır.
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
