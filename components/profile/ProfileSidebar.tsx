'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/UserContext';
import { useTable } from '@/contexts/TableContext';

// Google Sign-In types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  customerCode?: string;
}

type TabType = 'orders' | 'tokens' | 'allergies' | 'settings';

export default function ProfileSidebar({ isOpen, onClose, customerCode }: ProfileSidebarProps) {
  const { currentUser, isAuthenticated, login, register, logout } = useAuth();
  const { sessionId, tableId, isSelfService } = useTable(); // 🔧 Self-servis session için
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form states
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    nickName: '',
  });

  // Tab data states
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [tokens, setTokens] = useState<any>(null);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergiesLoading, setAllergiesLoading] = useState(false);
  const [otherAllergies, setOtherAllergies] = useState('');

  // Settings tab states
  const [settingsData, setSettingsData] = useState({
    email: '',
    phoneNumber: '',
    birthDate: '',
    gender: '',
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // 🪙 Listen for SignalR TokenBalanceUpdated event
  useEffect(() => {
    const handleTokenBalanceUpdate = (event: any) => {
      const { balance, message } = event.detail;

      if (currentUser && activeTab === 'tokens') {
        loadTokens();
      }

      if (message) {
        showNotification(message, 'success');
      }
    };

    window.addEventListener('tokenBalanceUpdated', handleTokenBalanceUpdate);
    return () => window.removeEventListener('tokenBalanceUpdated', handleTokenBalanceUpdate);
  }, [currentUser, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    try {
      const result = await login(phoneOrEmail, password);

      if (result.success) {
        // User bilgisi context'te güncellendi, bir süre sonra currentUser dolacak
        setTimeout(() => {
          alert(`Hoşgeldin ${currentUser?.name || ''}!`);
        }, 100);
        setShowLoginModal(false);
        setPhoneOrEmail('');
        setPassword('');
      } else {
        alert(result.error || 'Giriş başarısız');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const waitForGoogleSdk = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && window.google?.accounts) {
        resolve();
        return;
      }

      const checkGoogleLoaded = setInterval(() => {
        if (typeof window !== 'undefined' && window.google?.accounts) {
          clearInterval(checkGoogleLoaded);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkGoogleLoaded);
        reject(new Error('Google SDK yüklenemedi'));
      }, 10000);
    });
  };

  const handleGoogleCallback = async (response: any) => {
    try {
      setIsLoggingIn(true);

      const apiResponse = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: response.credential,
          mode: 'login',
          customerCode: customerCode || ''
        })
      });

      const data = await apiResponse.json();

      if (data.success && data.token && data.user) {
        // IMPORTANT: Let UserContext handle everything
        localStorage.setItem('userToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        localStorage.setItem('lastLoginTime', Date.now().toString());

        // Trigger UserContext to reload session
        window.location.reload();
      } else {
        alert(data.error || 'Google ile giriş başarısız');
      }
    } catch (error) {
      console.error('Google login error:', error);
      alert('Google ile bağlantı sırasında hata oluştu');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await waitForGoogleSdk();

      const GOOGLE_CLIENT_ID = '272265935268-q6o120vjjoch144ppf3bfp1l2o8da7ka.apps.googleusercontent.com';

      window.google!.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
        ux_mode: 'popup',
        use_fedcm_for_prompt: false
      });

      window.google!.accounts.id.prompt();
    } catch (error) {
      console.error('Google SDK load error:', error);
      alert('Google ile giriş başlatılamadı. Lütfen tekrar deneyin.');
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!registerData.email) {
      alert('E-posta adresi zorunludur');
      return;
    }

    if (!registerData.email.includes('@')) {
      alert('Geçerli bir e-posta adresi giriniz');
      return;
    }

    if (!registerData.phoneNumber) {
      alert('Telefon numarası zorunludur');
      return;
    }

    if (registerData.phoneNumber.length !== 11) {
      alert('Telefon numarası 11 haneli olmalıdır (05XXXXXXXXX)');
      return;
    }

    if (!registerData.phoneNumber.startsWith('05')) {
      alert('Telefon numarası 05 ile başlamalıdır');
      return;
    }

    if (!registerData.nickName || registerData.nickName.trim().length === 0) {
      alert('Kullanıcı adı zorunludur');
      return;
    }

    if (!registerData.firstName) {
      alert('İsim zorunludur');
      return;
    }

    if (!registerData.lastName) {
      alert('Soyisim zorunludur');
      return;
    }

    if (!registerData.password || registerData.password.length < 6) {
      alert('Şifre en az 6 karakter olmalıdır');
      return;
    }

    try {
      setIsLoggingIn(true);

      const result = await register({
        name: registerData.firstName,
        surname: registerData.lastName,
        email: registerData.email,
        password: registerData.password,
        phoneNumber: registerData.phoneNumber,
        sessionId: sessionId || undefined, // 🔧 Self-servis session ID
        customerCode: customerCode || undefined, // Kayıt olduğu restoran kodu
        tableCode: tableId || undefined, // Kayıt olduğu masa kodu
      });

      if (result.success) {
        alert(`Hoşgeldin ${registerData.firstName}! Kayıt başarıyla tamamlandı.`);
        setShowRegisterModal(false);
        // Reset form
        setRegisterData({
          firstName: '',
          lastName: '',
          email: '',
          phoneNumber: '',
          password: '',
          nickName: '',
        });
      } else {
        alert(result.error || 'Kayıt işlemi başarısız');
      }
    } catch (error) {
      console.error('Register error:', error);
      alert('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    logout();
    alert('Çıkış yapıldı');
  };

  // 🪙 Bildirim gösterme fonksiyonu
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 100001;
      font-size: 14px;
      font-weight: 600;
      max-width: 90%;
      text-align: center;
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  };

  // Load data when tab changes
  useEffect(() => {
    if (!currentUser) return;

    if (activeTab === 'orders') {
      loadOrders();
    } else if (activeTab === 'tokens') {
      loadTokens();
    } else if (activeTab === 'allergies') {
      loadAllergies();
    } else if (activeTab === 'settings') {
      loadSettings();
    }
  }, [activeTab, currentUser]);

  const loadOrders = async () => {
    const userId = currentUser?.id || currentUser?.userId || currentUser?.Id;

    if (!userId) {
      return;
    }

    setOrdersLoading(true);
    try {
      const response = await fetch(`/api/user/orders/${userId}`);
      const result = await response.json();

      if (result.errors) {
        console.error('Validation errors:', result.errors);
      }

      if (result.success && result.orders) {
        setOrders(result.orders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadTokens = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    setTokensLoading(true);
    try {
      const response = await fetch('/api/user/tokens', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = await response.json();

      if (result.success) {
        setTokens(result);
      } else {
        setTokens(null);
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
      setTokens(null);
    } finally {
      setTokensLoading(false);
    }
  };

  const loadAllergies = () => {
    // Load standard allergies
    const savedAllergies = localStorage.getItem('global_userAllergies');
    if (savedAllergies) {
      try {
        const parsedAllergies = JSON.parse(savedAllergies);
        // Separate standard allergies from "other" allergies
        const standardAllergies = parsedAllergies.filter((a: string) => !a.startsWith('Diğer: '));
        const otherAllergyItems = parsedAllergies.filter((a: string) => a.startsWith('Diğer: '));

        setAllergies(standardAllergies);

        // Combine all "other" allergies into textarea
        if (otherAllergyItems.length > 0) {
          const otherText = otherAllergyItems.map((a: string) => a.replace('Diğer: ', '')).join(', ');
          setOtherAllergies(otherText);
        }
      } catch (error) {
        setAllergies([]);
      }
    } else {
      setAllergies([]);
    }
  };

  const loadSettings = () => {
    if (currentUser) {
      setSettingsData({
        email: currentUser.email || '',
        phoneNumber: currentUser.phoneNumber || '',
        birthDate: currentUser.birthDate || '',
        gender: currentUser.gender || '',
      });
    }
  };

  const handleAllergiesUpdate = async () => {
    const token = localStorage.getItem('userToken');

    // Combine standard allergies with "other" allergies
    const allAllergies = [...allergies];

    // Add "other" allergies if textarea has content
    if (otherAllergies && otherAllergies.trim()) {
      // Split by comma and add "Diğer: " prefix
      const otherItems = otherAllergies.split(',').map(a => `Diğer: ${a.trim()}`).filter(a => a !== 'Diğer: ');
      allAllergies.push(...otherItems);
    }

    localStorage.setItem('global_userAllergies', JSON.stringify(allAllergies));

    if (token) {
      try {
        await fetch('/api/user/allergies', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ allergies: allAllergies }),
        });
        alert('Alerjan bilgileriniz kaydedildi');
      } catch (error) {
        alert('Alerjan bilgileriniz yerel olarak kaydedildi');
      }
    } else {
      alert('Alerjan bilgileriniz yerel olarak kaydedildi');
    }
  };

  const handleProfileUpdate = async () => {
    // Validate phone number if provided
    if (settingsData.phoneNumber && settingsData.phoneNumber.trim()) {
      if (settingsData.phoneNumber.length !== 11) {
        alert('Telefon numarası 11 haneli olmalıdır (05XXXXXXXXX)');
        return;
      }
      if (!settingsData.phoneNumber.startsWith('05')) {
        alert('Telefon numarası 05 ile başlamalıdır');
        return;
      }
    }

    // Validate email if provided
    if (settingsData.email && settingsData.email.trim() && !settingsData.email.includes('@')) {
      alert('Geçerli bir e-posta adresi giriniz');
      return;
    }

    setIsUpdatingProfile(true);
    const token = localStorage.getItem('userToken');

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: settingsData.email || null,
          phoneNumber: settingsData.phoneNumber || null,
          birthDate: settingsData.birthDate || null,
          gender: settingsData.gender || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update localStorage userData
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const updatedUserData = {
          ...userData,
          email: settingsData.email || userData.email,
          phoneNumber: settingsData.phoneNumber || userData.phoneNumber,
          birthDate: settingsData.birthDate || userData.birthDate,
          gender: settingsData.gender || userData.gender,
        };
        localStorage.setItem('userData', JSON.stringify(updatedUserData));

        alert('Profil bilgileriniz başarıyla güncellendi');
        window.location.reload(); // Reload to update context
      } else {
        alert(result.error || 'Profil güncellenirken hata oluştu');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      alert('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="profile-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          transition: 'all 0.3s ease',
          zIndex: 99998,
        }}
      />

      {/* Sidebar */}
      <div
        className={`profile-sidebar ${isOpen ? 'sidebar-open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: isOpen ? 0 : '-100%',
          width: '100%',
          maxWidth: '450px',
          height: '100vh',
          background: '#f8f9fa',
          transition: 'left 0.3s ease',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '2px 0 20px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Header */}
        <div
          className="profile-header"
          style={{
            background: 'linear-gradient(135deg, #343a40 0%, #212529 100%)',
            color: 'white',
            padding: '15px 20px',
            position: 'relative',
            textAlign: 'center',
          }}
        >
          <button
            className="modal-close"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '10px',
              right: '15px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              fontSize: '18px',
              cursor: 'pointer',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.3s ease',
            }}
          >
            <i className="fas fa-times"></i>
          </button>

          <div
            className="user-avatar"
            style={{
              margin: '0 auto 10px auto',
              width: '50px',
              height: '50px',
              fontSize: '20px',
              background: currentUser ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.3)',
            }}
          >
            <i className="fas fa-user"></i>
          </div>
          <h3 style={{ margin: '0 0 3px 0', fontSize: '16px', fontWeight: 600 }}>
            {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Misafir'}
          </h3>
          <p style={{ margin: '0 0 5px 0', opacity: 0.9, fontSize: '12px' }}>
            {currentUser ? (currentUser.email || currentUser.phoneNumber || '') : 'Giriş yaparak özelliklerden faydalanın'}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div
          className="profile-nav"
          style={{
            background: '#f8f9fa',
            padding: '15px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
          }}
        >
          {[
            { id: 'orders' as TabType, icon: 'fa-shopping-cart', label: 'Siparişler' },
            { id: 'tokens' as TabType, icon: 'fa-coins', label: 'Jetonlar' },
            { id: 'allergies' as TabType, icon: 'fa-exclamation-triangle', label: 'Alerjanlar' },
            { id: 'settings' as TabType, icon: 'fa-cog', label: 'Ayarlar' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'white',
                border: activeTab === tab.id ? '2px solid #667eea' : '2px solid #e9ecef',
                padding: '10px 4px',
                cursor: 'pointer',
                fontSize: '9px',
                fontWeight: 600,
                color: activeTab === tab.id ? '#667eea' : '#6c757d',
                borderRadius: '8px',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                boxShadow:
                  activeTab === tab.id
                    ? '0 2px 8px rgba(102, 126, 234, 0.15)'
                    : '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              <div>
                <i
                  className={`fas ${tab.icon}`}
                  style={{
                    fontSize: '11px',
                    display: 'block',
                    marginBottom: '3px',
                    color: tab.id === 'tokens' ? '#ffc107' : 'inherit',
                  }}
                ></i>
              </div>
              <div>{tab.label}</div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          className="profile-content"
          style={{
            padding: '15px',
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {!currentUser ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                textAlign: 'center',
                color: '#6c757d',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                }}
              >
                <i className="fas fa-user-circle" style={{ fontSize: '40px', color: 'white' }}></i>
              </div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 600, color: '#333' }}>
                Giriş Yapın
              </h4>
              <p style={{ margin: '0 0 20px 0', fontSize: '14px', opacity: 0.8 }}>
                Sipariş geçmişiniz, jetonlarınız ve daha fazlası için giriş yapın.
              </p>
              <button
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 32px',
                  borderRadius: '25px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.3s ease',
                }}
                onClick={() => setShowLoginModal(true)}
              >
                <i className="fas fa-sign-in-alt" style={{ marginRight: '8px' }}></i>
                Giriş Yap
              </button>
            </div>
          ) : (
            <div>
              {/* Tab Content */}
              {activeTab === 'orders' && (
                <div style={{ padding: '15px' }}>
                  {ordersLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                      <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '15px' }}></i>
                      <p>Siparişleriniz yükleniyor...</p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                      <div style={{ fontSize: '48px', marginBottom: '10px', opacity: 0.3 }}>🍽️</div>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Henüz siparişiniz bulunmuyor</p>
                      <p style={{ margin: '5px 0 0 0', fontSize: '12px', opacity: 0.7 }}>Sipariş vererek başlayın!</p>
                    </div>
                  ) : (
                    <div>
                      {orders.map((order: any) => {
                        // Handle logo URL
                        let logoUrl = '';
                        if (order.venueLogo) {
                          if (order.venueLogo.startsWith('http://') || order.venueLogo.startsWith('https://')) {
                            logoUrl = order.venueLogo.replace('http://', 'https://');
                          } else {
                            const cleanPath = order.venueLogo.replace(/^\/+/, '').replace('Uploads/', '');
                            logoUrl = `https://canlimenu.online/Uploads/${cleanPath}`;
                          }
                        }

                        return (
                          <div
                            key={order.id}
                            style={{
                              background: 'white',
                              padding: '15px',
                              borderRadius: '12px',
                              marginBottom: '12px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                              border: '1px solid #e9ecef',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '5px' }}>
                                  {order.orderNumber || `#${order.id}`}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                  📅 {new Date(order.date).toLocaleDateString('tr-TR')} {new Date(order.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                              <div style={{
                                background: order.status === 'Processed' ? '#d4edda' : '#fff3cd',
                                color: order.status === 'Processed' ? '#155724' : '#856404',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 600
                              }}>
                                {order.status === 'Processed' ? '✓ Tamamlandı' : order.status}
                              </div>
                            </div>

                            {order.venueName && (
                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #f0f0f0' }}>
                                {logoUrl && (
                                  <img
                                    src={logoUrl}
                                    alt={order.venueName}
                                    style={{
                                      width: '30px',
                                      height: '30px',
                                      borderRadius: '6px',
                                      objectFit: 'cover',
                                      marginRight: '8px'
                                    }}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                )}
                                <div style={{ fontSize: '13px', fontWeight: 500 }}>🏪 {order.venueName}</div>
                              </div>
                            )}

                            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px' }}>
                              🍽️ {order.tableName || 'Masa bilgisi yok'}
                            </div>

                            {order.items && order.items.length > 0 && (
                              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f0f0f0' }}>
                                <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '5px' }}>Ürünler ({order.itemCount || order.items.length}):</div>
                                {order.items.slice(0, 3).map((item: any, idx: number) => (
                                  <div key={idx} style={{ fontSize: '12px', marginBottom: '3px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{item.quantity || item.count}x {item.name || item.productName}</span>
                                    <span style={{ fontWeight: 600 }}>{item.price?.toFixed(2)} ₺</span>
                                  </div>
                                ))}
                                {order.items.length > 3 && (
                                  <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '3px' }}>+{order.items.length - 3} ürün daha...</div>
                                )}
                              </div>
                            )}

                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', color: '#6c757d' }}>Toplam:</span>
                              <span style={{ fontSize: '16px', fontWeight: 700, color: '#333' }}>{order.totalAmount?.toFixed(2)} ₺</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'tokens' && (
                <div style={{ padding: '15px' }}>
                  {tokensLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                      <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '15px', color: '#ffc107' }}></i>
                      <p>Jetonlar yükleniyor...</p>
                    </div>
                  ) : !tokens || !tokens.restaurants || tokens.restaurants.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                      <i className="fas fa-coins" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5, color: '#ffc107' }}></i>
                      <p>Henüz jetonunuz bulunmuyor</p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ background: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)', padding: '20px', borderRadius: '10px', marginBottom: '15px', textAlign: 'center', color: 'white' }}>
                        <div style={{ fontSize: '14px', marginBottom: '5px' }}>Toplam Jeton</div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>🪙 {tokens.summary?.totalTokens || 0}</div>
                      </div>
                      {tokens.restaurants.map((restaurant: any, idx: number) => {
                        // Handle logo URL
                        let logoUrl = '';
                        if (restaurant.restaurantLogo) {
                          if (restaurant.restaurantLogo.startsWith('http://') || restaurant.restaurantLogo.startsWith('https://')) {
                            logoUrl = restaurant.restaurantLogo.replace('http://', 'https://');
                          } else {
                            const cleanPath = restaurant.restaurantLogo.replace(/^\/+/, '').replace('Uploads/', '');
                            logoUrl = `https://canlimenu.online/Uploads/${cleanPath}`;
                          }
                        }

                        return (
                          <div
                            key={restaurant.customerId || `restaurant-${idx}`}
                            style={{
                              background: 'white',
                              padding: '15px',
                              borderRadius: '12px',
                              marginBottom: '12px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                              border: '1px solid #e9ecef',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                              {logoUrl ? (
                                <img
                                  src={logoUrl}
                                  alt={restaurant.restaurantName}
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '8px',
                                    objectFit: 'cover',
                                    marginRight: '10px'
                                  }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <div style={{ fontWeight: 600, fontSize: '14px', flex: 1 }}>{restaurant.restaurantName}</div>
                            </div>
                            <div style={{
                              background: 'linear-gradient(135deg, #fff9e6 0%, #fff4cc 100%)',
                              borderRadius: '8px',
                              padding: '10px',
                              border: '2px solid #ffc107',
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: '20px', fontWeight: 700, color: '#856404' }}>
                                <i className="fas fa-coins" style={{ color: '#ffc107', fontSize: '16px', marginRight: '5px' }}></i>
                                {restaurant.currentTokens}
                              </div>
                              <div style={{ marginTop: '4px', fontSize: '10px', color: '#856404', fontWeight: 500 }}>
                                Jeton
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'allergies' && (
                <div style={{ padding: '15px' }}>
                  <h4 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#333' }}>Alerji Bilgilerim</h4>

                  {/* Warning Info Box */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(220, 53, 69, 0.1), rgba(220, 53, 69, 0.15))',
                    border: '1px solid rgba(220, 53, 69, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '15px',
                    fontSize: '12px',
                    color: '#721c24',
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '5px' }}>⚠️ Önemli Uyarı</div>
                    <div>Ciddi alerjiniz varsa lütfen sipariş verirken garsonunuza mutlaka bildirin. Bu sistem sadece hatırlatma amaçlıdır.</div>
                  </div>

                  {/* Standard Allergens with Emojis */}
                  {[
                    { name: 'Gluten', emoji: '🌾' },
                    { name: 'Laktoz', emoji: '🥛' },
                    { name: 'Yumurta', emoji: '🥚' },
                    { name: 'Balık', emoji: '🐟' },
                    { name: 'Fındık', emoji: '🌰' },
                    { name: 'Yer Fıstığı', emoji: '🥜' },
                    { name: 'Soya', emoji: '🫘' },
                    { name: 'Süt', emoji: '🥛' },
                    { name: 'Susam', emoji: '🌰' },
                    { name: 'Hardal', emoji: '🌶️' },
                    { name: 'Kereviz', emoji: '🥬' },
                  ].map((allergen) => (
                    <label
                      key={allergen.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: allergies.includes(allergen.name)
                          ? 'linear-gradient(135deg, rgba(220, 53, 69, 0.15), rgba(220, 53, 69, 0.2))'
                          : 'white',
                        border: allergies.includes(allergen.name)
                          ? '2px solid rgba(220, 53, 69, 0.4)'
                          : '1px solid #e9ecef',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={allergies.includes(allergen.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAllergies([...allergies, allergen.name]);
                          } else {
                            setAllergies(allergies.filter(a => a !== allergen.name));
                          }
                        }}
                        style={{ marginRight: '10px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '18px', marginRight: '8px' }}>{allergen.emoji}</span>
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>{allergen.name}</span>
                    </label>
                  ))}

                  {/* Other Allergies Textarea */}
                  <div style={{ marginTop: '15px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 600,
                      marginBottom: '8px',
                      color: '#333'
                    }}>
                      📝 Diğer Alerjanlar ve Özel Durumlar
                    </label>
                    <textarea
                      value={otherAllergies}
                      onChange={(e) => setOtherAllergies(e.target.value)}
                      placeholder="Diğer alerji veya özel durumlarınızı buraya yazın (virgülle ayırın)"
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                    <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '5px' }}>
                      Örnek: Mantar, Ananas, Deniz ürünleri
                    </div>
                  </div>

                  <button
                    onClick={handleAllergiesUpdate}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: '15px',
                    }}
                  >
                    <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                    Kaydet
                  </button>
                </div>
              )}
              {activeTab === 'settings' && (
                <div style={{ padding: '15px' }}>
                  <h4 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#333' }}>⚙️ Hesap Ayarları</h4>

                  {/* Basic Info Display */}
                  <div style={{
                    background: 'white',
                    padding: '15px',
                    borderRadius: '10px',
                    marginBottom: '15px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                      <strong>İsim Soyisim:</strong> {currentUser.firstName} {currentUser.lastName}
                    </div>
                    {currentUser.email && (
                      <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                        <strong>Email:</strong> {currentUser.email}
                      </div>
                    )}
                    {currentUser.phoneNumber && (
                      <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                        <strong>Telefon:</strong> {currentUser.phoneNumber}
                      </div>
                    )}
                    {currentUser.birthDate && (
                      <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                        <strong>Doğum Tarihi:</strong> {new Date(currentUser.birthDate).toLocaleDateString('tr-TR')}
                      </div>
                    )}
                    {currentUser.gender && (
                      <div style={{ fontSize: '13px' }}>
                        <strong>Cinsiyet:</strong> {currentUser.gender === 'Male' ? 'Erkek' : currentUser.gender === 'Female' ? 'Kadın' : 'Diğer'}
                      </div>
                    )}
                  </div>

                  {/* Conditional Email Input */}
                  {!currentUser.email && (
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: '#333'
                      }}>
                        📧 Email Adresi Ekle
                      </label>
                      <input
                        type="email"
                        value={settingsData.email}
                        onChange={(e) => setSettingsData({ ...settingsData, email: e.target.value })}
                        placeholder="ornek@email.com"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  )}

                  {/* Conditional Phone Input */}
                  {!currentUser.phoneNumber && (
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: '#333'
                      }}>
                        📱 Telefon Numarası Ekle
                      </label>
                      <input
                        type="tel"
                        value={settingsData.phoneNumber}
                        onChange={(e) => setSettingsData({ ...settingsData, phoneNumber: e.target.value })}
                        placeholder="05XXXXXXXXX"
                        maxLength={11}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}
                      />
                      <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>
                        11 hane, 05 ile başlamalı
                      </div>
                    </div>
                  )}

                  {/* Birthdate Input */}
                  {!currentUser.birthDate && (
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: '#333'
                      }}>
                        🎂 Doğum Tarihi
                      </label>
                      <input
                        type="date"
                        value={settingsData.birthDate}
                        onChange={(e) => setSettingsData({ ...settingsData, birthDate: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}
                      />
                      <div style={{ fontSize: '11px', color: '#dc3545', marginTop: '4px', fontWeight: 500 }}>
                        🎉 Doğru tarihi yazın, doğum gününüz unutulmayacak! Bir daha değiştirilemez.
                      </div>
                    </div>
                  )}

                  {/* Gender Select */}
                  {!currentUser.gender && (
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: '#333'
                      }}>
                        👤 Cinsiyet
                      </label>
                      <select
                        value={settingsData.gender}
                        onChange={(e) => setSettingsData({ ...settingsData, gender: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '13px',
                          background: 'white',
                        }}
                      >
                        <option value="">Seçiniz</option>
                        <option value="Male">Erkek</option>
                        <option value="Female">Kadın</option>
                        <option value="Other">Diğer</option>
                      </select>
                      <div style={{ fontSize: '11px', color: '#dc3545', marginTop: '4px', fontWeight: 500 }}>
                        ⚠️ Bir defa seçebilirsiniz, sonra değiştirilemez.
                      </div>
                    </div>
                  )}

                  {/* Update Button */}
                  {(!currentUser.email || !currentUser.phoneNumber || !currentUser.birthDate || !currentUser.gender) && (
                    <button
                      onClick={handleProfileUpdate}
                      disabled={isUpdatingProfile}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: isUpdatingProfile
                          ? '#ccc'
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: isUpdatingProfile ? 'not-allowed' : 'pointer',
                        marginBottom: '15px',
                      }}
                    >
                      <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                      {isUpdatingProfile ? 'Güncelleniyor...' : 'Profili Güncelle'}
                    </button>
                  )}

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <i className="fas fa-sign-out-alt" style={{ marginRight: '8px' }}></i>
                    Çıkış Yap
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 100000,
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowLoginModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              width: '90%',
              maxWidth: '450px',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLoginModal(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#999',
                cursor: 'pointer',
                padding: '5px',
                borderRadius: '50%',
                transition: 'all 0.3s ease',
              }}
            >
              <i className="fas fa-times"></i>
            </button>

            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 600, color: '#333' }}>
                🔐 Giriş Yap
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                Telefon numaranla hemen giriş yap!
              </p>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: isLoggingIn ? '#f5f5f5' : 'white',
                border: '1px solid #ddd',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.3s ease',
                marginBottom: '20px',
                opacity: isLoggingIn ? 0.6 : 1,
              }}
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '20px', height: '20px' }} />
              {isLoggingIn ? 'Giriş Yapılıyor...' : 'Google ile Giriş Yap'}
            </button>

            <div style={{ position: 'relative', textAlign: 'center', margin: '20px 0' }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#e0e0e0' }}></div>
              <span style={{ position: 'relative', background: 'white', padding: '0 15px', color: '#999', fontSize: '12px' }}>
                veya
              </span>
            </div>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#333', fontWeight: 500 }}>
                  Telefon Numarası veya E-posta
                </label>
                <input
                  type="text"
                  value={phoneOrEmail}
                  onChange={(e) => setPhoneOrEmail(e.target.value)}
                  placeholder="05XX XXX XX XX veya email@ornek.com"
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '10px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#333', fontWeight: 500 }}>
                  Şifre
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifrenizi girin"
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '10px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: isLoggingIn
                    ? '#ccc'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.3s ease',
                }}
              >
                <i className="fas fa-sign-in-alt" style={{ marginRight: '8px' }}></i>
                {isLoggingIn ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setShowLoginModal(false);
                  setShowRegisterModal(true);
                }}
                style={{ color: '#667eea', fontSize: '14px', textDecoration: 'none' }}
              >
                Hesabın yok mu? Hemen kayıt ol
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 100000,
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowRegisterModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              width: '90%',
              maxWidth: '450px',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowRegisterModal(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#999',
                cursor: 'pointer',
                padding: '5px',
                borderRadius: '50%',
                transition: 'all 0.3s ease',
              }}
            >
              <i className="fas fa-times"></i>
            </button>

            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 600, color: '#333' }}>
                🎉 Kayıt Ol
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                Hemen üye ol, avantajlardan faydalan!
              </p>
            </div>

            <form onSubmit={handleRegister}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#333', fontWeight: 500 }}>
                    İsim
                  </label>
                  <input
                    type="text"
                    value={registerData.firstName}
                    onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                    placeholder="İsminiz"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '10px',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#333', fontWeight: 500 }}>
                    Soyisim
                  </label>
                  <input
                    type="text"
                    value={registerData.lastName}
                    onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                    placeholder="Soyisminiz"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '10px',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#333', fontWeight: 500 }}>
                  Kullanıcı Adı
                </label>
                <input
                  type="text"
                  value={registerData.nickName}
                  onChange={(e) => setRegisterData({ ...registerData, nickName: e.target.value })}
                  placeholder="Kullanıcı adınız"
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '10px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#333', fontWeight: 500 }}>
                  E-posta
                </label>
                <input
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  placeholder="email@ornek.com"
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '10px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#333', fontWeight: 500 }}>
                  Telefon Numarası
                </label>
                <input
                  type="tel"
                  value={registerData.phoneNumber}
                  onChange={(e) => setRegisterData({ ...registerData, phoneNumber: e.target.value })}
                  placeholder="05XX XXX XX XX"
                  required
                  maxLength={11}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '10px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#333', fontWeight: 500 }}>
                  Şifre
                </label>
                <input
                  type="password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  placeholder="En az 6 karakter"
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '10px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: isLoggingIn
                    ? '#ccc'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.3s ease',
                }}
              >
                <i className="fas fa-user-plus" style={{ marginRight: '8px' }}></i>
                {isLoggingIn ? 'Kayıt Yapılıyor...' : 'Kayıt Ol'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setShowRegisterModal(false);
                  setShowLoginModal(true);
                }}
                style={{ color: '#667eea', fontSize: '14px', textDecoration: 'none' }}
              >
                Zaten hesabın var mı? Giriş yap
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
