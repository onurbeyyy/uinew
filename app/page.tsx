'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';

export default function WelcomePage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    // Sadece ana sayfada ("/") müşteri logolarını yükle
    // Bu kontrol, chunk bundling nedeniyle diğer sayfalarda çalışmasını engeller
    if (pathname !== '/') return;

    loadCustomerReferences();

    // Intersection Observer for animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      observer.observe(el);
    });

    // Scroll effect for hero section
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const heroContent = document.querySelector('.hero-content') as HTMLElement;
      if (heroContent) {
        heroContent.style.transform = `translateY(${scrolled * 0.5}px)`;
        heroContent.style.opacity = String(1 - (scrolled * 0.002));
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  async function loadCustomerReferences() {
    try {
      const response = await fetch('/api/customers/active');
      const data = await response.json();

      if (data && data.length > 0) {
        const validCustomers = data.filter((c: any) => c.logo && c.code);
        setCustomers(validCustomers.slice(0, 30));
      }
    } catch (error) {
      console.error('Müşteri listesi yüklenirken hata:', error);
    }
  }

  return (
    <>
      {/* Google Ads & Analytics */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=AW-17674614141"
        strategy="afterInteractive"
      />
      <Script id="google-ads" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'AW-17674614141');
        `}
      </Script>

      <Script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js" />

      {/* Schema.org Structured Data - SoftwareApplication */}
      <Script id="schema-software" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "@id": "https://canlimenu.com/#qr-menu-software",
          "name": "Canlı Menü - QR Menü Sistemi",
          "alternateName": ["QR Menü", "Dijital Menü", "Akıllı Menü Sistemi", "Restaurant QR Menu"],
          "description": "Türkiye'nin 1 numaralı QR menü sistemi. 500+ restoran kullanıyor. AI asistan, müşteri sadakat programı, oyunlar, sipariş yönetimi, POS entegrasyonu.",
          "url": "https://canlimenu.com",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web, iOS, Android",
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "bestRating": "5",
            "worstRating": "1",
            "ratingCount": "523"
          },
          "featureList": "QR Menü, AI Asistan, Müşteri Sadakat Programı, Oyunlar, Sipariş Yönetimi, POS Entegrasyonu, Çoklu Dil Desteği, Alerjen Takibi",
          "author": {
            "@type": "Organization",
            "name": "Canlı Menü",
            "url": "https://canlimenu.com"
          }
        })}
      </Script>

      {/* Schema.org - Organization */}
      <Script id="schema-organization" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Canlı Menü",
          "url": "https://canlimenu.com",
          "logo": "https://canlimenu.com/images/logo.png",
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+90-542-674-32-69",
            "contactType": "Sales",
            "areaServed": "TR",
            "availableLanguage": ["Turkish", "English"]
          },
          "sameAs": [
            "https://www.instagram.com/canlimenu",
            "https://www.facebook.com/canlimenu"
          ]
        })}
      </Script>

      {/* Schema.org - FAQPage */}
      <Script id="schema-faq" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "QR menü sistemi nedir?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "QR menü sistemi, restoranların dijital menülerini QR kod aracılığıyla müşterilerine sunmasını sağlayan modern bir çözümdür. Müşteriler QR kodu telefonlarıyla taratarak menüye anında erişebilir."
              }
            },
            {
              "@type": "Question",
              "name": "En iyi QR menü sistemi hangisidir?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Canlı Menü, Türkiye'de 500+ restoranın kullandığı, AI asistan, müşteri sadakat programı ve oyunlar gibi özellikleriyle en kapsamlı QR menü sistemidir."
              }
            },
            {
              "@type": "Question",
              "name": "QR menü nasıl yapılır?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Canlı Menü ile QR menü oluşturmak çok kolay: 1) Kayıt olun, 2) Menünüzü yükleyin, 3) QR kodunuzu alın, 4) Masalarınıza yerleştirin. Kurulum desteği ücretsizdir."
              }
            },
            {
              "@type": "Question",
              "name": "QR menü sistemi hangi özellikleri içerir?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Canlı Menü: AI menü asistanı, müşteri sadakat programı, oyunlar, sipariş yönetimi, POS entegrasyonu, çoklu dil desteği, alerjen takibi, doğum günü kampanyaları ve daha fazlasını içerir."
              }
            },
            {
              "@type": "Question",
              "name": "QR menü SambaPOS ile entegre çalışır mı?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Evet, Canlı Menü SambaPOS ile tam entegre çalışır. Siparişler otomatik olarak POS sisteminize aktarılır."
              }
            }
          ]
        })}
      </Script>

      <div className="welcome-page">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-bg-animation"></div>

          {/* Floating Food Elements */}
          <div className="floating-elements">
            <div className="floating-food">🍕</div>
            <div className="floating-food">🍔</div>
            <div className="floating-food">🍝</div>
            <div className="floating-food">🥗</div>
            <div className="floating-food">☕</div>
          </div>

          <div className="hero-content animate-on-scroll">
            <Image src="/images/logo.png" alt="Canlı Menü Logo" width={150} height={150} className="hero-logo" priority />
            <h1 className="hero-title">QR Menü Sistemi | Dijital Restoran Menüsü 2025</h1>
            <p className="hero-subtitle">
              ✨ 15 GÜN ÜCRETSİZ DENEYİN ✨<br/>
              500+ Restoran Kullanıyor • AI Asistan • Müşteri Sadakat • Oyunlar
            </p>

            <div className="hero-features">
              {[
                { icon: 'fa-robot', text: 'AI Asistan' },
                { icon: 'fa-heart', text: 'Müşteri Sadakat Uygulaması' },
                { icon: 'fa-gamepad', text: 'Eğlenceli Oyunlar' },
                { icon: 'fa-user-circle', text: 'Kullanıcı Profili' },
                { icon: 'fa-birthday-cake', text: 'Doğum Günü Sürprizleri' },
                { icon: 'fa-qrcode', text: 'QR Menü' }
              ].map((feature, idx) => (
                <div key={idx} className="hero-feature">
                  <i className={`fas ${feature.icon}`}></i>
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>

            <div className="hero-cta">
              <Link href="/register" className="btn-primary-custom">
                <i className="fas fa-rocket"></i>
                15 Gün Ücretsiz Deneyin
              </Link>
              <a href="#features" className="btn-secondary-custom">
                <i className="fas fa-arrow-down"></i>
                Özellikleri İncele
              </a>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="features-section-welcome">
          <h2 className="section-title-welcome animate-on-scroll">Neden Canlı Menü?</h2>
          <p className="section-subtitle-welcome animate-on-scroll">Restoranlar için özel tasarım dijital menü sistemi</p>

          <div className="features-grid-welcome">
            {[
              { icon: 'fa-qrcode', title: 'QR Kod Menü', desc: 'Temassız, hijyenik ve anında güncellenen dijital menü sistemi.' },
              { icon: 'fa-robot', title: 'Yapay Zeka Asistan', desc: '7/24 müşterilerinizin sorularını yanıtlayan akıllı asistan.' },
              { icon: 'fa-bell', title: 'Garson Çağırma', desc: 'Müşteriler tek tuşla anlık garson çağırabilir.' },
              { icon: 'fa-heart', title: 'Müşteri Sadakat Kartı', desc: 'Jeton sistemi ile müşteri sadakati artırın.' },
              { icon: 'fa-gamepad', title: 'Eğlenceli Oyunlar', desc: 'Bekleme süresini eğlenceli hale getirin.' },
              { icon: 'fa-mobile-alt', title: 'Telefondan Hızlı Sipariş', desc: 'Garsonlar mobil cihazlardan anında sipariş alabilir.' }
            ].map((feature, idx) => (
              <div key={idx} className="feature-card-welcome animate-on-scroll">
                <div className="feature-icon-welcome">
                  <i className={`fas ${feature.icon}`}></i>
                </div>
                <h3 className="feature-title-welcome">{feature.title}</h3>
                <p className="feature-description-welcome">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* References */}
        <section className="references-section-welcome">
          <h2 className="section-title-welcome animate-on-scroll">Bizi Tercih Eden İşletmeler</h2>
          <div className="references-grid-welcome">
            {customers.length > 0 ? (
              customers.map((customer, idx) => {
                const logoUrl = customer.logo.startsWith('http')
                  ? customer.logo
                  : `https://apicanlimenu.online/Uploads/${customer.logo.replace('Uploads/', '')}`;

                return (
                  <div key={idx} className="reference-card-welcome animate-on-scroll">
                    <img src={logoUrl} alt={customer.customerTitle} className="reference-logo-welcome" />
                    <div className="reference-name-welcome">{customer.customerTitle}</div>
                  </div>
                );
              })
            ) : (
              <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '40px'}}>
                <div style={{display: 'inline-block'}}>
                  <i className="fas fa-store" style={{fontSize: '3rem', color: 'var(--primary-color)', marginBottom: '15px'}}></i>
                </div>
                <p style={{marginTop: '15px', color: 'var(--text-light)', fontSize: '1.1rem'}}>Başarılı müşterilerimiz yükleniyor...</p>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section-welcome">
          <h2 className="cta-title-welcome animate-on-scroll">🎁 15 Gün Ücretsiz Deneme</h2>
          <p className="cta-subtitle-welcome animate-on-scroll">Kredi kartı gerekmez • Anında başlayın • İstediğiniz zaman iptal edin</p>

          <div className="animate-on-scroll">
            <Link href="/register" className="btn-primary-custom">
              <i className="fas fa-rocket"></i>
              15 Gün Ücretsiz Deneyin
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer-welcome">
          <div className="footer-links-welcome">
            <a href="#features">Özellikler</a>
            <a href="https://wa.me/905426743269" target="_blank" rel="noreferrer">İletişim</a>
          </div>
          <p>&copy; 2024 Canlı Menü. Tüm hakları saklıdır.</p>
        </footer>
      </div>

      <style jsx global>{`
        :root {
          --primary-color: #4a5568;
          --secondary-color: #2d3748;
          --text-dark: #1a202c;
          --text-light: #718096;
          --bg-light: #f7fafc;
          --white: #ffffff;
          --success: #48bb78;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: var(--text-dark);
          line-height: 1.6;
          overflow-x: hidden;
        }

        /* Hero Section */
        .hero-section {
          background: linear-gradient(135deg, rgba(74, 85, 104, 0.9) 0%, rgba(45, 55, 72, 0.9) 100%), url('/images/restro/pic1.jpg');
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 20px;
        }

        .hero-bg-animation {
          position: absolute;
          width: 200%;
          height: 200%;
          top: -50%;
          left: -50%;
          background: linear-gradient(45deg, rgba(226, 232, 240, 0.05) 0%, rgba(203, 213, 224, 0.08) 25%, rgba(160, 174, 192, 0.05) 50%, rgba(113, 128, 150, 0.08) 75%, rgba(74, 85, 104, 0.05) 100%);
          animation: wave 20s linear infinite;
        }

        @keyframes wave {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .hero-content {
          text-align: center;
          color: var(--white);
          z-index: 3;
          max-width: 100%;
          position: relative;
        }

        .hero-logo {
          margin-bottom: 20px;
          filter: drop-shadow(0 8px 30px rgba(102, 126, 234, 0.6));
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }

        .hero-title {
          font-size: 1.8rem;
          font-weight: 800;
          margin-bottom: 10px;
          text-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }

        .hero-subtitle {
          font-size: 0.95rem;
          margin-bottom: 30px;
          opacity: 0.95;
        }

        .hero-features {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 15px;
          margin-bottom: 30px;
        }

        .hero-feature {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.2);
          padding: 6px 12px;
          border-radius: 25px;
          backdrop-filter: blur(10px);
          font-size: 0.8rem;
          border: 1px solid rgba(255,255,255,0.3);
        }

        .hero-cta {
          display: flex;
          flex-direction: column;
          gap: 15px;
          align-items: center;
        }

        .btn-primary-custom {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: var(--white);
          padding: 14px 28px;
          border-radius: 50px;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: all 0.4s;
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
          font-size: 0.95rem;
        }

        .btn-primary-custom:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 0 12px 35px rgba(102, 126, 234, 0.6);
          color: var(--white);
          text-decoration: none;
        }

        .btn-secondary-custom {
          background: rgba(255,255,255,0.1);
          color: var(--white);
          padding: 14px 28px;
          border: 2px solid rgba(255,255,255,0.5);
          border-radius: 50px;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: all 0.4s;
          backdrop-filter: blur(10px);
          font-size: 0.95rem;
        }

        .btn-secondary-custom:hover {
          background: var(--white);
          color: #667eea;
          text-decoration: none;
          transform: translateY(-3px);
        }

        .floating-elements {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
        }

        .floating-food {
          position: absolute;
          opacity: 0.08;
          animation: float-food 6s ease-in-out infinite;
          font-size: 2rem;
        }

        .floating-food:nth-child(1) { top: 15%; left: 10%; animation-delay: -1s; }
        .floating-food:nth-child(2) { top: 25%; right: 15%; animation-delay: -3s; }
        .floating-food:nth-child(3) { bottom: 30%; left: 15%; animation-delay: -2s; }
        .floating-food:nth-child(4) { bottom: 20%; right: 10%; animation-delay: -4s; }
        .floating-food:nth-child(5) { top: 35%; left: 50%; animation-delay: -0.5s; }

        @keyframes float-food {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(5deg); }
          66% { transform: translateY(10px) rotate(-3deg); }
        }

        /* Features Section */
        .features-section-welcome {
          padding: 60px 20px;
          background: var(--bg-light);
        }

        .section-title-welcome {
          text-align: center;
          font-size: 1.6rem;
          font-weight: 700;
          margin-bottom: 15px;
          color: var(--text-dark);
        }

        .section-subtitle-welcome {
          text-align: center;
          font-size: 0.95rem;
          color: var(--text-light);
          margin-bottom: 40px;
        }

        .features-grid-welcome {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .feature-card-welcome {
          background: var(--white);
          padding: 30px;
          border-radius: 20px;
          box-shadow: 0 5px 20px rgba(0,0,0,0.08);
          text-align: center;
          transition: all 0.5s;
        }

        .feature-card-welcome:hover {
          transform: translateY(-10px);
          box-shadow: 0 15px 40px rgba(74, 85, 104, 0.25);
        }

        .feature-icon-welcome {
          width: 70px;
          height: 70px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          font-size: 1.8rem;
          color: var(--white);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .feature-title-welcome {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 10px;
          color: var(--text-dark);
        }

        .feature-description-welcome {
          color: var(--text-light);
          line-height: 1.6;
          font-size: 0.9rem;
        }

        /* References Section */
        .references-section-welcome {
          padding: 60px 20px;
          background: linear-gradient(135deg, #cbd5e0 0%, #e2e8f0 100%);
        }

        .references-grid-welcome {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          max-width: 600px;
          margin: 0 auto;
        }

        .reference-card-welcome {
          background: var(--white);
          padding: 20px;
          border-radius: 15px;
          text-align: center;
          transition: all 0.5s;
          border: 2px solid #e2e8f0;
          box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        }

        .reference-card-welcome:hover {
          transform: translateY(-10px) scale(1.05);
          box-shadow: 0 15px 40px rgba(102, 126, 234, 0.3);
          border-color: #667eea;
        }

        .reference-logo-welcome {
          width: 100px;
          height: 100px;
          object-fit: contain;
          margin-bottom: 10px;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));
        }

        .reference-name-welcome {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-dark);
        }

        /* CTA Section */
        .cta-section-welcome {
          padding: 60px 20px;
          background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
          text-align: center;
          color: var(--white);
        }

        .cta-title-welcome {
          font-size: 1.6rem;
          font-weight: 700;
          margin-bottom: 15px;
        }

        .cta-subtitle-welcome {
          font-size: 0.95rem;
          margin-bottom: 30px;
          opacity: 0.9;
        }

        /* Footer */
        .footer-welcome {
          padding: 40px 20px 20px;
          background: var(--text-dark);
          color: var(--white);
          text-align: center;
        }

        .footer-links-welcome {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 20px;
          margin-bottom: 20px;
        }

        .footer-links-welcome a {
          color: var(--white);
          text-decoration: none;
          opacity: 0.8;
          transition: opacity 0.3s ease;
        }

        .footer-links-welcome a:hover {
          opacity: 1;
        }

        /* Animations */
        .animate-on-scroll {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.6s ease;
        }

        .animate-on-scroll.animated {
          opacity: 1;
          transform: translateY(0);
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .hero-title { font-size: 1.5rem !important; }
          .hero-subtitle { font-size: 0.85rem !important; }
          .hero-features { flex-direction: column; }
          .section-title-welcome { font-size: 1.3rem !important; }
          .features-grid-welcome { grid-template-columns: repeat(2, 1fr) !important; }
          .references-grid-welcome { grid-template-columns: repeat(2, 1fr) !important; }
        }

        @media (min-width: 769px) {
          .hero-title { font-size: 2rem; }
          .hero-subtitle { font-size: 1rem; }
          .hero-cta { flex-direction: row; justify-content: center; }
        }

        @media (min-width: 1024px) {
          .hero-title { font-size: 2.2rem; }
          .hero-content { max-width: 1200px; margin: 0 auto; }
        }

        @media (min-width: 1440px) {
          .hero-title { font-size: 2.4rem; }
        }
      `}</style>
    </>
  );
}
