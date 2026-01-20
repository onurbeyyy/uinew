'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/UserContext';
import { useTable } from '@/contexts/TableContext';

// Google Sign-In types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, options: any) => void;
        };
      };
    };
  }
}

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  customerCode?: string;
  isDeliveryMode?: boolean;
  openRegister?: boolean; // Açıldığında kayıt modalı otomatik açılsın mı?
}

type TabType = 'orders' | 'tokens' | 'allergies' | 'addresses' | 'settings';

// Adres tipi
interface SavedAddress {
  id: string;
  title: string; // Ev, İş, vb.
  city: string;
  district: string;
  neighborhood: string;
  street: string;
  buildingNo: string;
  floor?: string;
  apartmentNo?: string;
  directions?: string;
  isDefault?: boolean;
}

export default function ProfileSidebar({ isOpen, onClose, customerCode, isDeliveryMode = false, openRegister = false }: ProfileSidebarProps) {
  const { currentUser, isAuthenticated, login, register, logout } = useAuth();
  const { sessionId, tableId, isSelfService } = useTable(); // 🔧 Self-servis session için
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
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
    birthDate: '',
    kvkkAccepted: false,
  });

  // Tab data states
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [tokens, setTokens] = useState<any>(null);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergiesLoading, setAllergiesLoading] = useState(false);
  const [otherAllergies, setOtherAllergies] = useState('');
  const [allergyConsentGiven, setAllergyConsentGiven] = useState(false);

  // Addresses tab states
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [newAddress, setNewAddress] = useState<Omit<SavedAddress, 'id'>>({
    title: '',
    city: '',
    district: '',
    neighborhood: '',
    street: '',
    buildingNo: '',
    floor: '',
    apartmentNo: '',
    directions: '',
    isDefault: false,
  });

  // Settings tab states
  const [settingsData, setSettingsData] = useState({
    firstName: '',
    lastName: '',
    nickName: '',
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

  // 🔓 Giriş yapmamış kullanıcı için otomatik login modalı açma
  const [autoOpenedLogin, setAutoOpenedLogin] = useState(false);

  useEffect(() => {
    if (isOpen && openRegister && !currentUser) {
      // Sidebar açıldığında ve openRegister true ise login modalını aç
      // Kullanıcı isterse oradan kayıt ol'a geçebilir
      setShowLoginModal(true);
      setAutoOpenedLogin(true); // Otomatik açıldığını işaretle
    }
  }, [isOpen, openRegister, currentUser]);

  // Login modal kapatıldığında (otomatik açıldıysa sidebar'ı da kapat)
  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    if (autoOpenedLogin) {
      setAutoOpenedLogin(false);
      onClose(); // Sidebar'ı da kapat - kullanıcı menüyü görsün
    }
  };

  // 📍 Adresleri localStorage'dan yükle
  useEffect(() => {
    if (currentUser) {
      loadSavedAddresses();
    }
  }, [currentUser]);

  const loadSavedAddresses = () => {
    const key = `savedAddresses_${currentUser?.id || 'guest'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setSavedAddresses(JSON.parse(saved));
      } catch {
        setSavedAddresses([]);
      }
    }
  };

  const saveAddressesToStorage = (addresses: SavedAddress[]) => {
    const key = `savedAddresses_${currentUser?.id || 'guest'}`;
    localStorage.setItem(key, JSON.stringify(addresses));
    setSavedAddresses(addresses);
  };

  const handleAddAddress = () => {
    if (!newAddress.title || !newAddress.city || !newAddress.district || !newAddress.neighborhood || !newAddress.street || !newAddress.buildingNo) {
      alert('Lütfen zorunlu alanları doldurun');
      return;
    }

    const address: SavedAddress = {
      ...newAddress,
      id: Date.now().toString(),
    };

    // Eğer varsayılan olarak işaretlendiyse, diğerlerini varsayılan olmaktan çıkar
    let updatedAddresses = [...savedAddresses];
    if (address.isDefault) {
      updatedAddresses = updatedAddresses.map(a => ({ ...a, isDefault: false }));
    }
    updatedAddresses.push(address);

    saveAddressesToStorage(updatedAddresses);
    setShowAddAddressModal(false);
    resetNewAddress();
  };

  const handleUpdateAddress = () => {
    if (!editingAddress) return;
    if (!newAddress.title || !newAddress.city || !newAddress.district || !newAddress.neighborhood || !newAddress.street || !newAddress.buildingNo) {
      alert('Lütfen zorunlu alanları doldurun');
      return;
    }

    let updatedAddresses = savedAddresses.map(a => {
      if (a.id === editingAddress.id) {
        return { ...newAddress, id: a.id };
      }
      // Eğer yeni adres varsayılan olarak işaretlendiyse, diğerlerini varsayılan olmaktan çıkar
      if (newAddress.isDefault) {
        return { ...a, isDefault: false };
      }
      return a;
    });

    saveAddressesToStorage(updatedAddresses);
    setEditingAddress(null);
    setShowAddAddressModal(false);
    resetNewAddress();
  };

  const handleDeleteAddress = (addressId: string) => {
    if (confirm('Bu adresi silmek istediğinize emin misiniz?')) {
      const updatedAddresses = savedAddresses.filter(a => a.id !== addressId);
      saveAddressesToStorage(updatedAddresses);
    }
  };

  const handleSetDefaultAddress = (addressId: string) => {
    const updatedAddresses = savedAddresses.map(a => ({
      ...a,
      isDefault: a.id === addressId,
    }));
    saveAddressesToStorage(updatedAddresses);
  };

  const startEditAddress = (address: SavedAddress) => {
    setEditingAddress(address);
    setNewAddress({
      title: address.title,
      city: address.city,
      district: address.district,
      neighborhood: address.neighborhood,
      street: address.street,
      buildingNo: address.buildingNo,
      floor: address.floor || '',
      apartmentNo: address.apartmentNo || '',
      directions: address.directions || '',
      isDefault: address.isDefault || false,
    });
    setShowAddAddressModal(true);
  };

  const resetNewAddress = () => {
    setNewAddress({
      title: '',
      city: '',
      district: '',
      neighborhood: '',
      street: '',
      buildingNo: '',
      floor: '',
      apartmentNo: '',
      directions: '',
      isDefault: false,
    });
  };

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

  // Google Sign-In - popup yöntemi
  const [showGooglePopup, setShowGooglePopup] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const handleGoogleAuth = async () => {
    const GOOGLE_CLIENT_ID = '225030149337-1s3p26g9odq3dle0s2en3eddrv2b7eut.apps.googleusercontent.com';

    // Google SDK yüklü mü kontrol et
    if (!window.google?.accounts) {
      alert('Google servisi şu an kullanılamıyor. Lütfen e-posta ile devam edin.');
      return;
    }

    try {
      setIsLoggingIn(true);
      setShowGooglePopup(true);

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: any) => {
          try {
            setShowGooglePopup(false);
            const apiResponse = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                credential: response.credential,
                mode: 'auto',
                customerCode: customerCode || ''
              })
            });

            const data = await apiResponse.json();

            if (data.success && data.token && data.user) {
              localStorage.setItem('userToken', data.token);
              localStorage.setItem('userData', JSON.stringify(data.user));
              localStorage.setItem('lastLoginTime', Date.now().toString());
              window.location.reload();
            } else {
              alert(data.error || 'Google ile giriş başarısız');
            }
          } catch (error) {
            console.error('Google auth error:', error);
            alert('Google ile bağlantı sırasında hata oluştu');
          } finally {
            setIsLoggingIn(false);
          }
        },
        use_fedcm_for_prompt: false
      });

      // Google butonunu hemen render et
      setTimeout(() => {
        if (googleButtonRef.current) {
          window.google?.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            width: 280,
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'center'
          });
        }
        setIsLoggingIn(false);
      }, 100);

    } catch (error) {
      console.error('Google Auth hatası:', error);
      alert('Google ile giriş şu an kullanılamıyor.');
      setIsLoggingIn(false);
      setShowGooglePopup(false);
    }
  };

  // Google butonunu render et (fallback)
  useEffect(() => {
    if (showGooglePopup && googleButtonRef.current && window.google?.accounts) {
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 300,
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'center'
      });
    }
  }, [showGooglePopup]);

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

    if (!registerData.kvkkAccepted) {
      alert('Devam etmek için KVKK metnini kabul etmeniz gerekmektedir');
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
        nickName: registerData.nickName, // ✅ Kullanıcı adı (sipariş için gerekli)
        birthDate: registerData.birthDate || undefined, // 🎂 Doğum tarihi
        sessionId: sessionId || undefined, // 🔧 Self-servis session ID
        customerCode: customerCode || undefined, // Kayıt olduğu restoran kodu
        tableCode: tableId || undefined, // Kayıt olduğu masa kodu
      });

      if (result.success) {
        // Email doğrulama modalını göster (eski yapıdaki gibi)
        setVerificationEmail(registerData.email);
        setShowRegisterModal(false);
        setShowEmailVerificationModal(true);

        // Reset form
        setRegisterData({
          firstName: '',
          lastName: '',
          email: '',
          phoneNumber: '',
          password: '',
          nickName: '',
          birthDate: '',
          kvkkAccepted: false,
        });

        // NOT: Otomatik giriş YAPMA - email doğrulanana kadar bekle
        // Email doğrulandıktan sonra kullanıcı login yapacak
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
      const token = localStorage.getItem('userToken');
      const response = await fetch(`/api/user/orders/${userId}`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
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
    // Load allergy consent status
    const savedConsent = localStorage.getItem('allergyDataConsent');
    if (savedConsent === 'true') {
      setAllergyConsentGiven(true);
    }

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
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        nickName: currentUser.nickName || '',
        email: currentUser.email || '',
        phoneNumber: currentUser.phoneNumber || '',
        birthDate: currentUser.birthDate || '',
        gender: currentUser.gender || '',
      });
    }
  };

  const handleAllergiesUpdate = async () => {
    // KVKK Md. 6 - Özel nitelikli veri için açık rıza kontrolü
    if (!allergyConsentGiven) {
      alert('Alerji bilgisi özel nitelikli kişisel veridir. Kaydetmek için açık rıza vermeniz gerekmektedir.');
      return;
    }

    const token = localStorage.getItem('userToken');

    // Combine standard allergies with "other" allergies
    const allAllergies = [...allergies];

    // Add "other" allergies if textarea has content
    if (otherAllergies && otherAllergies.trim()) {
      // Split by comma and add "Diğer: " prefix
      const otherItems = otherAllergies.split(',').map(a => `Diğer: ${a.trim()}`).filter(a => a !== 'Diğer: ');
      allAllergies.push(...otherItems);
    }

    // Save consent status
    localStorage.setItem('allergyDataConsent', 'true');
    localStorage.setItem('allergyDataConsentDate', new Date().toISOString());
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
    // Validate firstName
    if (settingsData.firstName && settingsData.firstName.trim().length < 2) {
      alert('İsim en az 2 karakter olmalıdır');
      return;
    }

    // Validate lastName
    if (settingsData.lastName && settingsData.lastName.trim().length < 2) {
      alert('Soyisim en az 2 karakter olmalıdır');
      return;
    }

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
          firstName: settingsData.firstName || null,
          lastName: settingsData.lastName || null,
          nickName: settingsData.nickName || null,
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
          firstName: settingsData.firstName || userData.firstName,
          lastName: settingsData.lastName || userData.lastName,
          nickName: settingsData.nickName || userData.nickName,
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
            gap: '4px',
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
                            logoUrl = `https://apicanlimenu.online/Uploads/${cleanPath}`;
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
                                background: (() => {
                                  switch (order.status) {
                                    case 'Processed':
                                    case 'Delivered':
                                    case 'Confirmed':
                                      return '#d4edda'; // Yeşil
                                    case 'Rejected':
                                    case 'Cancelled':
                                      return '#f8d7da'; // Kırmızı
                                    case 'Preparing':
                                      return '#cce5ff'; // Mavi
                                    default:
                                      return '#fff3cd'; // Sarı (Pending vs.)
                                  }
                                })(),
                                color: (() => {
                                  switch (order.status) {
                                    case 'Processed':
                                    case 'Delivered':
                                    case 'Confirmed':
                                      return '#155724'; // Yeşil
                                    case 'Rejected':
                                    case 'Cancelled':
                                      return '#721c24'; // Kırmızı
                                    case 'Preparing':
                                      return '#004085'; // Mavi
                                    default:
                                      return '#856404'; // Sarı
                                  }
                                })(),
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 600
                              }}>
                                {(() => {
                                  switch (order.status) {
                                    case 'Pending': return '⏳ Beklemede';
                                    case 'Confirmed': return '✓ Onaylandı';
                                    case 'Preparing': return '👨‍🍳 Hazırlanıyor';
                                    case 'Processed': return '✓ Tamamlandı';
                                    case 'Delivered': return '✓ Teslim Edildi';
                                    case 'Rejected': return '✗ Reddedildi';
                                    case 'Cancelled': return '✗ İptal Edildi';
                                    default: return order.status || 'Bilinmiyor';
                                  }
                                })()}
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

{/* Masa kodu gizlendi - güvenlik için gösterilmiyor */}

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
                      {tokens.restaurants.map((restaurant: any, idx: number) => {
                        // Handle logo URL
                        let logoUrl = '';
                        if (restaurant.restaurantLogo) {
                          if (restaurant.restaurantLogo.startsWith('http://') || restaurant.restaurantLogo.startsWith('https://')) {
                            logoUrl = restaurant.restaurantLogo.replace('http://', 'https://');
                          } else {
                            const cleanPath = restaurant.restaurantLogo.replace(/^\/+/, '').replace('Uploads/', '');
                            logoUrl = `https://apicanlimenu.online/Uploads/${cleanPath}`;
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
                <div style={{ padding: '15px', paddingBottom: '100px' }}>
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

                  {/* KVKK Md. 6 - Özel Nitelikli Veri İçin Açık Rıza */}
                  <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
                    border: '2px solid rgba(102, 126, 234, 0.3)',
                    borderRadius: '12px',
                  }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#333',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <span style={{ fontSize: '16px' }}>⚖️</span>
                      KVKK Md. 6 - Özel Nitelikli Kişisel Veri
                    </div>
                    <p style={{ fontSize: '12px', color: '#555', marginBottom: '12px', lineHeight: '1.5' }}>
                      Alerji bilgileriniz, KVKK kapsamında <strong>"sağlık verisi"</strong> olarak özel nitelikli
                      kişisel veri kategorisindedir. Bu bilgilerin işlenmesi için açık rızanız gerekmektedir.
                    </p>
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#333',
                      lineHeight: '1.4',
                    }}>
                      <input
                        type="checkbox"
                        checked={allergyConsentGiven}
                        onChange={(e) => setAllergyConsentGiven(e.target.checked)}
                        style={{
                          width: '18px',
                          height: '18px',
                          marginTop: '2px',
                          cursor: 'pointer',
                          accentColor: '#667eea',
                        }}
                      />
                      <span>
                        Alerji bilgilerimin, bana daha iyi hizmet sunulması ve sağlığımın korunması amacıyla
                        işlenmesine{' '}
                        <a
                          href="/kvkk"
                          target="_blank"
                          style={{ color: '#667eea', textDecoration: 'underline' }}
                        >
                          KVKK Aydınlatma Metni
                        </a>
                        {' '}kapsamında <strong>açık rıza</strong> veriyorum.
                      </span>
                    </label>
                  </div>

                  <button
                    onClick={handleAllergiesUpdate}
                    disabled={!allergyConsentGiven && (allergies.length > 0 || otherAllergies.trim().length > 0)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: (!allergyConsentGiven && (allergies.length > 0 || otherAllergies.trim().length > 0))
                        ? '#ccc'
                        : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: (!allergyConsentGiven && (allergies.length > 0 || otherAllergies.trim().length > 0))
                        ? 'not-allowed'
                        : 'pointer',
                      marginTop: '15px',
                    }}
                  >
                    <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                    Kaydet
                  </button>

                  {!allergyConsentGiven && (allergies.length > 0 || otherAllergies.trim().length > 0) && (
                    <div style={{
                      marginTop: '10px',
                      fontSize: '11px',
                      color: '#dc3545',
                      textAlign: 'center',
                    }}>
                      Kaydetmek için yukarıdaki açık rıza kutucuğunu işaretlemeniz gerekmektedir.
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'addresses' && isDeliveryMode && (
                <div style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', color: '#333' }}>📍 Adreslerim</h4>
                    <button
                      onClick={() => {
                        setEditingAddress(null);
                        resetNewAddress();
                        setShowAddAddressModal(true);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <i className="fas fa-plus"></i> Yeni Adres
                    </button>
                  </div>

                  {savedAddresses.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: '#6c757d',
                    }}>
                      <i className="fas fa-map-marker-alt" style={{ fontSize: '40px', marginBottom: '15px', opacity: 0.3 }}></i>
                      <p style={{ margin: 0 }}>Henüz kayıtlı adresiniz yok.</p>
                      <p style={{ margin: '10px 0 0 0', fontSize: '13px' }}>Paket servis siparişlerinizde kullanmak için adres ekleyin.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {savedAddresses.map((address) => (
                        <div
                          key={address.id}
                          style={{
                            background: 'white',
                            borderRadius: '10px',
                            padding: '12px 15px',
                            border: address.isDefault ? '2px solid #667eea' : '1px solid #e9ecef',
                            position: 'relative',
                          }}
                        >
                          {address.isDefault && (
                            <span style={{
                              position: 'absolute',
                              top: '-8px',
                              right: '10px',
                              background: '#667eea',
                              color: 'white',
                              fontSize: '10px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}>
                              Varsayılan
                            </span>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '14px', color: '#333', marginBottom: '5px' }}>
                                <i className="fas fa-home" style={{ marginRight: '6px', color: '#667eea' }}></i>
                                {address.title}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.5 }}>
                                {address.neighborhood} Mah. {address.street} No:{address.buildingNo}
                                {address.floor && ` Kat:${address.floor}`}
                                {address.apartmentNo && ` Daire:${address.apartmentNo}`}
                                <br />
                                {address.district}/{address.city}
                              </div>
                              {address.directions && (
                                <div style={{ fontSize: '11px', color: '#888', marginTop: '5px', fontStyle: 'italic' }}>
                                  📝 {address.directions}
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
                            {!address.isDefault && (
                              <button
                                onClick={() => handleSetDefaultAddress(address.id)}
                                style={{
                                  background: '#f8f9fa',
                                  border: '1px solid #dee2e6',
                                  borderRadius: '6px',
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  color: '#495057',
                                }}
                              >
                                Varsayılan Yap
                              </button>
                            )}
                            <button
                              onClick={() => startEditAddress(address)}
                              style={{
                                background: '#e7f1ff',
                                border: '1px solid #b6d4fe',
                                borderRadius: '6px',
                                padding: '5px 10px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                color: '#0d6efd',
                              }}
                            >
                              <i className="fas fa-edit"></i> Düzenle
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(address.id)}
                              style={{
                                background: '#f8d7da',
                                border: '1px solid #f5c2c7',
                                borderRadius: '6px',
                                padding: '5px 10px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                color: '#842029',
                              }}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'settings' && (
                <div style={{ padding: '15px', paddingBottom: '100px' }}>
                  <h4 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#333' }}>⚙️ Hesap Ayarları</h4>

                  {/* Profile Form */}
                  <div style={{
                    background: 'white',
                    padding: '15px',
                    borderRadius: '10px',
                    marginBottom: '15px',
                    border: '1px solid #e9ecef'
                  }}>
                    {/* İsim */}
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: '#333'
                      }}>
                        👤 İsim
                      </label>
                      <input
                        type="text"
                        value={settingsData.firstName}
                        onChange={(e) => setSettingsData({ ...settingsData, firstName: e.target.value })}
                        placeholder="İsminiz"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    {/* Soyisim */}
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: '#333'
                      }}>
                        👤 Soyisim
                      </label>
                      <input
                        type="text"
                        value={settingsData.lastName}
                        onChange={(e) => setSettingsData({ ...settingsData, lastName: e.target.value })}
                        placeholder="Soyisminiz"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    {/* Kullanıcı Adı (Nickname) */}
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: '#333'
                      }}>
                        🏷️ Kullanıcı Adı
                      </label>
                      <input
                        type="text"
                        value={settingsData.nickName}
                        onChange={(e) => setSettingsData({ ...settingsData, nickName: e.target.value })}
                        placeholder="Kullanıcı adınız"
                        disabled={currentUser.nickNameChanged || !currentUser.googleId}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '13px',
                          background: (currentUser.nickNameChanged || !currentUser.googleId) ? '#f8f9fa' : '#ffffff',
                          cursor: (currentUser.nickNameChanged || !currentUser.googleId) ? 'not-allowed' : 'text',
                          opacity: (currentUser.nickNameChanged || !currentUser.googleId) ? 0.7 : 1,
                        }}
                      />
                      <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>
                        {currentUser.googleId ? (
                          currentUser.nickNameChanged ? (
                            <span>✓ Kullanıcı adı değiştirilmiş, tekrar değiştirilemez.</span>
                          ) : (
                            <span style={{ color: '#ff6b6b' }}>⚠️ Sadece 1 kere değiştirebilirsiniz.</span>
                          )
                        ) : (
                          <span>Kullanıcı adı değiştirilemez.</span>
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <div style={{ marginBottom: '15px', display: currentUser.email ? 'none' : 'block' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: '#333'
                      }}>
                        📧 Email Adresi
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
                    {currentUser.email && (
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: 600,
                          marginBottom: '6px',
                          color: '#333'
                        }}>
                          📧 Email Adresi
                        </label>
                        <div style={{
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '13px',
                          background: '#f8f9fa',
                          color: '#495057'
                        }}>
                          {currentUser.email}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>
                          ✓ Email adresi kayıtlı
                        </div>
                      </div>
                    )}

                    {/* Telefon Numarası */}
                    <div style={{ marginBottom: '15px', display: (currentUser.phoneNumber && !currentUser.phoneNumber.startsWith('TEMP_')) ? 'none' : 'block' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: '#333'
                      }}>
                        📱 Telefon Numarası
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
                    {currentUser.phoneNumber && !currentUser.phoneNumber.startsWith('TEMP_') && (
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: 600,
                          marginBottom: '6px',
                          color: '#333'
                        }}>
                          📱 Telefon Numarası
                        </label>
                        <div style={{
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '13px',
                          background: '#f8f9fa',
                          color: '#495057'
                        }}>
                          {currentUser.phoneNumber}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>
                          ✓ Telefon numarası kayıtlı
                        </div>
                      </div>
                    )}

                    {/* Doğum Tarihi */}
                    {!currentUser.birthDate ? (
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
                          max={new Date().toISOString().split('T')[0]}
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
                    ) : (
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
                        <div style={{
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '13px',
                          background: '#f8f9fa',
                          color: '#495057'
                        }}>
                          {new Date(currentUser.birthDate).toLocaleDateString('tr-TR')}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>
                          ✓ Doğum gününüz kayıtlı, değiştirilemez.
                        </div>
                      </div>
                    )}

                    {/* Cinsiyet */}
                    {!currentUser.gender ? (
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: 600,
                          marginBottom: '6px',
                          color: '#333'
                        }}>
                          ⚧ Cinsiyet
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
                    ) : (
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: 600,
                          marginBottom: '6px',
                          color: '#333'
                        }}>
                          ⚧ Cinsiyet
                        </label>
                        <div style={{
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '13px',
                          background: '#f8f9fa',
                          color: '#495057'
                        }}>
                          {currentUser.gender === 'Male' ? 'Erkek' : currentUser.gender === 'Female' ? 'Kadın' : 'Diğer'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>
                          ✓ Cinsiyet bilginiz kayıtlı, değiştirilemez.
                        </div>
                      </div>
                    )}

                    {/* Update Button */}
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
                      }}
                    >
                      <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                      {isUpdatingProfile ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
                    </button>
                  </div>

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
          onClick={handleCloseLoginModal}
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
              onClick={handleCloseLoginModal}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: '#f0f0f0',
                border: 'none',
                fontSize: '20px',
                color: '#666',
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
              }}
            >
              ×
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
              onClick={handleGoogleAuth}
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
              {isLoggingIn ? 'İşleniyor...' : 'Google ile Devam Et'}
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
                background: '#f0f0f0',
                border: 'none',
                fontSize: '20px',
                color: '#666',
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
              }}
            >
              ×
            </button>

            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 600, color: '#333' }}>
                🎉 Kayıt Ol
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                Hemen üye ol, avantajlardan faydalan!
              </p>
            </div>

            {/* Google ile Devam Et */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              style={{
                width: '100%',
                padding: '12px 20px',
                marginBottom: '20px',
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#333',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.3s ease',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google ile Devam Et
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '20px 0',
              color: '#999',
              fontSize: '12px'
            }}>
              <div style={{ flex: 1, height: '1px', background: '#ddd' }}></div>
              <span style={{ padding: '0 15px' }}>veya</span>
              <div style={{ flex: 1, height: '1px', background: '#ddd' }}></div>
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

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#333', fontWeight: 500 }}>
                  Doğum Tarihi (Opsiyonel)
                </label>
                <input
                  type="date"
                  value={registerData.birthDate}
                  onChange={(e) => setRegisterData({ ...registerData, birthDate: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '10px',
                    fontSize: '14px',
                  }}
                />
                <small style={{ color: '#888', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  Doğum gününüzde size özel sürprizler hazırlarız!
                </small>
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

              {/* KVKK Onay Checkbox */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#555',
                  lineHeight: '1.4',
                }}>
                  <input
                    type="checkbox"
                    checked={registerData.kvkkAccepted}
                    onChange={(e) => setRegisterData({ ...registerData, kvkkAccepted: e.target.checked })}
                    style={{
                      width: '18px',
                      height: '18px',
                      marginTop: '2px',
                      cursor: 'pointer',
                      accentColor: '#667eea',
                    }}
                  />
                  <span>
                    <a
                      href="/kvkk"
                      target="_blank"
                      style={{ color: '#667eea', textDecoration: 'underline' }}
                    >
                      KVKK Aydınlatma Metni
                    </a>
                    {`'ni, `}
                    <a
                      href="/kullanim-kosullari"
                      target="_blank"
                      style={{ color: '#667eea', textDecoration: 'underline' }}
                    >
                      Kullanım Koşulları
                    </a>
                    {`'nı ve `}
                    <a
                      href="/cerez-politikasi"
                      target="_blank"
                      style={{ color: '#667eea', textDecoration: 'underline' }}
                    >
                      Çerez Politikası
                    </a>
                    {`'nı okudum, kabul ediyorum.`}
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn || !registerData.kvkkAccepted}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: (isLoggingIn || !registerData.kvkkAccepted)
                    ? '#ccc'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: (isLoggingIn || !registerData.kvkkAccepted) ? 'not-allowed' : 'pointer',
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

      {/* Email Verification Modal */}
      {showEmailVerificationModal && (
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
          onClick={() => setShowEmailVerificationModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              width: '90%',
              maxWidth: '450px',
              textAlign: 'center',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowEmailVerificationModal(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#999',
                cursor: 'pointer',
              }}
            >
              <i className="fas fa-times"></i>
            </button>

            {/* Success Icon */}
            <div
              style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
                boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)',
              }}
            >
              <i className="fas fa-envelope" style={{ fontSize: '36px', color: 'white' }}></i>
            </div>

            <h2 style={{ margin: '0 0 15px 0', fontSize: '22px', fontWeight: 600, color: '#333' }}>
              📧 Email Doğrulama Gerekli
            </h2>

            <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666', lineHeight: 1.6 }}>
              Kayıt işleminiz başarıyla tamamlandı!
            </p>

            <div
              style={{
                background: '#f8f9fa',
                borderRadius: '10px',
                padding: '15px',
                margin: '15px 0',
                border: '1px solid #e9ecef',
              }}
            >
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6c757d' }}>
                Doğrulama linki gönderilen adres:
              </p>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#333' }}>
                {verificationEmail}
              </p>
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 152, 0, 0.1))',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                borderRadius: '10px',
                padding: '15px',
                margin: '15px 0',
              }}
            >
              <p style={{ margin: 0, fontSize: '13px', color: '#856404', lineHeight: 1.6 }}>
                <strong>⚠️ Önemli:</strong> Lütfen email kutunuzu kontrol edin ve doğrulama linkine tıklayın.
                Spam/Gereksiz klasörünü de kontrol etmeyi unutmayın.
              </p>
            </div>

            <button
              onClick={() => {
                setShowEmailVerificationModal(false);
                setShowLoginModal(true);
              }}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                marginTop: '10px',
              }}
            >
              <i className="fas fa-sign-in-alt" style={{ marginRight: '8px' }}></i>
              Doğruladım, Giriş Yap
            </button>

            <p style={{ margin: '15px 0 0 0', fontSize: '12px', color: '#999' }}>
              Email gelmedi mi?{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Yeni doğrulama emaili gönderildi!');
                }}
                style={{ color: '#667eea', textDecoration: 'none' }}
              >
                Tekrar gönder
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Google Sign-In Popup - Giriş modalıyla aynı konumda */}
      {showGooglePopup && (
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
          onClick={() => setShowGooglePopup(false)}
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
              textAlign: 'center',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowGooglePopup(false)}
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

            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 600, color: '#333' }}>
              Google ile Devam Et
            </h3>

            <div
              ref={googleButtonRef}
              style={{
                display: 'flex',
                justifyContent: 'center',
                minHeight: '44px'
              }}
            />

            <p style={{ margin: '15px 0 0 0', fontSize: '12px', color: '#999' }}>
              Hesabınızı seçin veya oluşturun
            </p>
          </div>
        </div>
      )}
    </>
  );
}
