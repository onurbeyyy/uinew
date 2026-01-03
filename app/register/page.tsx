'use client';

import { useState, useRef, FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://apicanlimenu.online';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showAlert('Logo dosyası 5MB\'dan küçük olmalıdır', 'danger');
      return;
    }

    if (!file.type.match('image/(png|jpeg|jpg)')) {
      showAlert('Sadece PNG ve JPG formatları desteklenir', 'danger');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    setErrors(prev => ({ ...prev, logo: false }));
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const showAlert = (message: string, type: 'success' | 'danger') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), type === 'danger' ? 8000 : 5000);
  };

  const showEmailExistsError = (email: string) => {
    setAlert({
      message: `❌ Bu Email Zaten Kullanılıyor!\n${email} adresi daha önce kayıt edilmiş. Farklı bir email ile kayıt olun veya giriş yapın.`,
      type: 'danger'
    });
    document.getElementById('email')?.focus();
    setTimeout(() => setAlert(null), 8000);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, boolean> = {};
    if (!formData.name.trim()) newErrors.name = true;
    if (!formData.email.trim() || !formData.email.includes('@')) newErrors.email = true;
    if (!formData.password || formData.password.length < 6) newErrors.password = true;
    if (!logoFile) newErrors.logo = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showAlert('Lütfen tüm zorunlu alanları doldurun', 'danger');
      return;
    }

    setIsLoading(true);

    try {
      const registerData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        password: formData.password
      };

      const registerResponse = await fetch(`${API_BASE_URL}/api/Auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      });

      const registerResult = await registerResponse.json();

      if (!registerResponse.ok || !registerResult.success) {
        const errorMessage = registerResult.message || 'Kayıt sırasında bir hata oluştu';

        if (errorMessage.toLowerCase().includes('email') ||
            errorMessage.toLowerCase().includes('e-posta') ||
            errorMessage.toLowerCase().includes('kullanılıyor') ||
            errorMessage.toLowerCase().includes('kayıtlı')) {
          showEmailExistsError(formData.email);
        } else {
          showAlert(errorMessage, 'danger');
        }
        setIsLoading(false);
        return;
      }

      const customerId = registerResult.customerId;

      // Logo dosyası yükleme (logoFile validation zaten yapıldı, TypeScript için check)
      if (!logoFile) {
        showAlert('Logo dosyası seçilmedi', 'danger');
        setIsLoading(false);
        return;
      }

      const formDataUpload = new FormData();
      formDataUpload.append('files', logoFile);
      formDataUpload.append('folder', 'Logo');
      formDataUpload.append('customerId', customerId.toString());

      const uploadResponse = await fetch(`${API_BASE_URL}/api/Upload/UploadPicture`, {
        method: 'POST',
        body: formDataUpload
      });

      const logoPath = await uploadResponse.text();

      if (uploadResponse.ok && logoPath) {
        const updateData = {
          id: customerId,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || '',
          logo: logoPath,
          webBackground: '',
          database: '',
          location: '',
          code: registerResult.customerCode,
          mainMenu: '',
          priceTag: '',
          whatsApp: '',
          googleUrl: '',
          instagramUrl: '',
          indexBackground: '',
          indexTextColor: '#FFFFFF',
          productTitleColor: '#FFFFFF',
          productDescriptionColor: '#FFFFFF',
          showLogoAndText: true,
          banner: '',
          showBanner: false,
          showAIChat: true,
          customerType: 1
        };

        await fetch(`${API_BASE_URL}/api/Customer/CreateCustomer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });
      }

      setRegisteredEmail(formData.email);
      setShowSuccessModal(true);

      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'ads_conversion_Kaydolma_1', {
          value: 10000,
          currency: 'TRY'
        });
      }

    } catch (error) {
      console.error('Register error:', error);
      showAlert('Bağlantı hatası. Lütfen tekrar deneyin.', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
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

      <div style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '500px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
            padding: '40px 30px',
            textAlign: 'center',
            color: '#ffffff'
          }}>
            <Image
              src="/images/logo.png"
              alt="Canlı Menü Logo"
              width={80}
              height={80}
              style={{
                marginBottom: '15px',
                filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.2))'
              }}
              priority
            />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '5px' }}>Hemen Başlayın!</h1>
            <p style={{ fontSize: '0.85rem', opacity: 0.9 }}>Restoranınız için dijital menü sistemi</p>
            <span style={{
              display: 'inline-block',
              background: '#4ade80',
              color: '#ffffff',
              padding: '6px 16px',
              borderRadius: '25px',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginTop: '12px'
            }}>
              🎉 15 Gün Ücretsiz Deneme
            </span>
          </div>

          {/* Body */}
          <div style={{ padding: '40px 30px' }}>
            {alert && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                marginBottom: '20px',
                background: alert.type === 'success' ? '#d1fae5' : '#fee2e2',
                color: alert.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${alert.type === 'success' ? '#10b981' : '#ef4444'}`,
                whiteSpace: 'pre-line',
                fontSize: '0.85rem'
              }}>
                {alert.message}
              </div>
            )}

            {/* Features List */}
            <div style={{
              background: '#f7fafc',
              padding: '20px',
              borderRadius: '10px',
              marginBottom: '20px'
            }}>
              <h4 style={{
                fontSize: '0.85rem',
                color: '#1a202c',
                marginBottom: '10px',
                fontWeight: 600
              }}>✨ 15 Günlük Deneme Sürenizde:</h4>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px 12px'
              }}>
                {[
                  'Sınırsız QR kod menü sistemi',
                  'Masadan sipariş alma',
                  'Garson çağırma sistemi',
                  'Sadakat programı ve ödül sistemi',
                  'Alerjen bilgileri yönetimi',
                  'AI menü asistanı',
                  'Oyunlar ve eğlenceli içerikler',
                  'Detaylı analitik ve raporlar',
                  'Çoklu dil desteği (TR/EN)',
                  'Kredi kartı gerektirmez'
                ].map((feature, idx) => (
                  <li key={idx} style={{
                    padding: '4px 0',
                    color: '#718096',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ color: '#48bb78', fontWeight: 'bold', flexShrink: 0 }}>✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontWeight: 600,
                  color: '#1a202c',
                  marginBottom: '6px',
                  fontSize: '0.85rem'
                }}>
                  İşletme Adı<span style={{ color: '#fc8181', marginLeft: '3px' }}>*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }));
                    setErrors(prev => ({ ...prev, name: false }));
                  }}
                  placeholder="Örn: Güzel Lezzet Restaurant"
                  autoComplete="organization"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `2px solid ${errors.name ? '#fc8181' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4a5568';
                    e.target.style.boxShadow = '0 0 0 3px rgba(74, 85, 104, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.name ? '#fc8181' : '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {errors.name && <span style={{ color: '#fc8181', fontSize: '0.75rem', marginTop: '5px', display: 'block' }}>İşletme adı zorunludur</span>}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontWeight: 600,
                  color: '#1a202c',
                  marginBottom: '6px',
                  fontSize: '0.85rem'
                }}>
                  E-posta<span style={{ color: '#fc8181', marginLeft: '3px' }}>*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, email: e.target.value }));
                    setErrors(prev => ({ ...prev, email: false }));
                  }}
                  placeholder="ornek@email.com"
                  autoComplete="email"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `2px solid ${errors.email ? '#fc8181' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4a5568';
                    e.target.style.boxShadow = '0 0 0 3px rgba(74, 85, 104, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.email ? '#fc8181' : '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {errors.email && <span style={{ color: '#fc8181', fontSize: '0.75rem', marginTop: '5px', display: 'block' }}>Geçerli bir e-posta adresi girin</span>}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontWeight: 600,
                  color: '#1a202c',
                  marginBottom: '6px',
                  fontSize: '0.85rem'
                }}>Telefon</label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="05XX XXX XX XX"
                  autoComplete="tel"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4a5568';
                    e.target.style.boxShadow = '0 0 0 3px rgba(74, 85, 104, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Logo Upload */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontWeight: 600,
                  color: '#1a202c',
                  marginBottom: '6px',
                  fontSize: '0.85rem'
                }}>
                  Logo<span style={{ color: '#fc8181', marginLeft: '3px' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    ref={logoInputRef}
                    type="file"
                    id="logo"
                    onChange={handleLogoChange}
                    accept="image/png,image/jpeg,image/jpg"
                    style={{ display: 'none' }}
                  />
                  <div
                    onClick={() => !logoPreview && logoInputRef.current?.click()}
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      border: `2px dashed ${logoPreview ? '#48bb78' : errors.logo ? '#fc8181' : '#cbd5e0'}`,
                      borderRadius: '10px',
                      background: logoPreview ? '#f0fdf4' : errors.logo ? '#fee2e2' : '#f7fafc',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      padding: '20px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {logoPreview ? (
                      <>
                        <img src={logoPreview} alt="Logo preview" style={{ maxWidth: '100%', maxHeight: '100px', objectFit: 'contain', borderRadius: '8px' }} />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeLogo(); }}
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            width: '30px',
                            height: '30px',
                            background: '#fc8181',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#e53e3e'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#fc8181'}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </>
                    ) : (
                      <>
                        <svg style={{ width: '48px', height: '48px', color: '#718096' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                        </svg>
                        <div style={{ color: '#1a202c', fontWeight: 600, fontSize: '0.85rem' }}>Logo Yükle</div>
                        <div style={{ color: '#718096', fontSize: '0.75rem' }}>PNG, JPG (Maks. 5MB)</div>
                      </>
                    )}
                  </div>
                </div>
                {errors.logo && <span style={{ color: '#fc8181', fontSize: '0.75rem', marginTop: '5px', display: 'block' }}>Logo yüklemek zorunludur</span>}
              </div>

              {/* Password */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontWeight: 600,
                  color: '#1a202c',
                  marginBottom: '6px',
                  fontSize: '0.85rem'
                }}>
                  Şifre<span style={{ color: '#fc8181', marginLeft: '3px' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, password: e.target.value }));
                      setErrors(prev => ({ ...prev, password: false }));
                    }}
                    placeholder="En az 6 karakter"
                    autoComplete="new-password"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `2px solid ${errors.password ? '#fc8181' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      transition: 'all 0.3s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4a5568';
                      e.target.style.boxShadow = '0 0 0 3px rgba(74, 85, 104, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.password ? '#fc8181' : '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '15px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#718096',
                      cursor: 'pointer',
                      padding: '5px'
                    }}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                {errors.password && <span style={{ color: '#fc8181', fontSize: '0.75rem', marginTop: '5px', display: 'block' }}>Şifre en az 6 karakter olmalıdır</span>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  opacity: isLoading ? 0.6 : 1
                }}
                onMouseEnter={(e) => !isLoading && (e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)')}
                onMouseLeave={(e) => !isLoading && (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = 'none')}
              >
                {isLoading ? (
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #ffffff',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}></div>
                ) : (
                  <>
                    <i className="fas fa-rocket"></i>
                    <span>15 Günlük Ücretsiz Denemeyi Başlat</span>
                  </>
                )}
              </button>
            </form>

            {/* Login Link */}
            <div style={{
              textAlign: 'center',
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid #e2e8f0',
              color: '#718096',
              fontSize: '0.85rem'
            }}>
              Zaten hesabınız var mı?{' '}
              <Link href="/login" style={{ color: '#4a5568', textDecoration: 'none', fontWeight: 600 }}>
                Giriş Yapın
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{
          display: 'flex',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.7)',
          zIndex: 9999,
          justifyContent: 'center',
          alignItems: 'center',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px 30px',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center',
            animation: 'slideUp 0.4s ease',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #28a745, #20c997)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              animation: 'scaleIn 0.5s ease'
            }}>
              <svg style={{ width: '50px', height: '50px', fill: 'white' }} viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a202c', marginBottom: '15px' }}>Kayıt Başarılı! 🎉</h2>
            <p style={{ color: '#718096', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px' }}>Hesabınız başarıyla oluşturuldu.</p>
            <div style={{
              background: '#f7fafc',
              padding: '20px',
              borderRadius: '10px',
              marginBottom: '20px',
              borderLeft: '4px solid #28a745'
            }}>
              <strong style={{ color: '#1a202c', display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>📧 Onay Maili Gönderildi!</strong>
              <p style={{ color: '#718096', fontSize: '0.85rem', margin: 0 }}>
                {registeredEmail} adresinize hesap onaylama linki gönderdik. Lütfen email'inizdeki linke tıklayarak hesabınızı onaylayın ve 15 günlük ücretsiz deneme sürenizi başlatın.
              </p>
            </div>
            <div style={{
              background: '#fff3cd',
              borderLeft: '4px solid #ffc107',
              padding: '15px',
              borderRadius: '8px'
            }}>
              <strong style={{ color: '#856404', display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>⚠️ Önemli:</strong>
              <p style={{ color: '#856404', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                Email gelmezse lütfen <strong>Spam/Gereksiz</strong> klasörünüzü kontrol edin!
              </p>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
