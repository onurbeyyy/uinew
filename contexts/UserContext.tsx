'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface UserData {
  id?: number;
  userId?: number;
  Id?: number; // Backend might use capital I
  firstName?: string;
  lastName?: string;
  name?: string;
  surname?: string;
  email: string;
  phoneNumber?: string;
  phoneNumberCompleted?: boolean;
  loyaltyPoints?: number;
  tokenBalance?: number;
  registerDate?: string;
  allergies?: string; // Alerji bilgileri (JSON array veya virgülle ayrılmış)
  [key: string]: any; // Allow any other fields from backend
}

interface UserContextType {
  currentUser: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUserProfile: () => Promise<void>;
  updateTokenBalance: (newBalance: number) => void;
}

interface RegisterData {
  name: string;
  surname: string;
  email: string;
  password: string;
  phoneNumber?: string;
  sessionId?: string; // 🔧 Self-servis session ID
  customerCode?: string; // Kayıt olduğu restoran kodu
  tableCode?: string; // Kayıt olduğu masa kodu
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to extract user from nested response
  const extractUser = (data: any): UserData | null => {
    if (!data) return null;

    // If data has success and user properties (wrong format), extract user
    if (data.success && data.user) {
      return data.user;
    }

    // Otherwise return as-is
    return data;
  };

  // Auto-login: Check for existing session on mount
  useEffect(() => {
    checkUserSession();
  }, []);

  /**
   * Check if user has an active session
   */
  const checkUserSession = useCallback(async () => {
    try {
      const token = localStorage.getItem('userToken');
      const userData = localStorage.getItem('userData');

      if (!token) {
        setIsLoading(false);
        return;
      }

      // If we have token and userData, restore session immediately
      if (userData) {
        try {
          let parsedUser = JSON.parse(userData);

          // Extract user if in wrong format
          const cleanUser = extractUser(parsedUser);

          // Update localStorage with correct format
          if (cleanUser && cleanUser !== parsedUser) {
            localStorage.setItem('userData', JSON.stringify(cleanUser));
          }

          setCurrentUser(cleanUser);

          // Validate token in background
          validateToken(token).catch(() => {
            logout();
          });
        } catch (e) {
          console.error('❌ Failed to parse user data:', e);
          localStorage.removeItem('userData');
        }
      } else if (token) {
        // We have token but no userData, fetch from API
        await validateToken(token);
      }
    } catch (error) {
      console.error('❌ Session check error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Validate token and fetch user profile
   */
  const validateToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Token validation failed');
      }

      const userData = await response.json();
      const cleanUser = extractUser(userData);
      setCurrentUser(cleanUser);
      localStorage.setItem('userData', JSON.stringify(cleanUser));
      return true;
    } catch (error) {
      console.error('❌ Token validation error:', error);
      logout();
      return false;
    }
  };

  /**
   * Login user
   */
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneOrEmail: email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.'
        };
      }

      const cleanUser = extractUser(data);

      localStorage.setItem('userToken', data.token);
      localStorage.setItem('userData', JSON.stringify(cleanUser));
      localStorage.setItem('lastLoginTime', Date.now().toString());

      setCurrentUser(cleanUser);

      return { success: true };
    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        success: false,
        error: 'Bağlantı hatası. Lütfen tekrar deneyin.'
      };
    }
  };

  /**
   * Register new user
   */
  const register = async (registerData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: registerData.name,
          lastName: registerData.surname,
          email: registerData.email,
          password: registerData.password,
          phoneNumber: registerData.phoneNumber,
          sessionId: registerData.sessionId, // 🔧 Self-servis session ID
          customerCode: registerData.customerCode, // Kayıt olduğu restoran kodu
          tableCode: registerData.tableCode, // Kayıt olduğu masa kodu
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.message || 'Kayıt başarısız. Lütfen bilgilerinizi kontrol edin.'
        };
      }

      // Auto-login after registration
      if (data.token && data.user) {
        const cleanUser = extractUser(data);
        localStorage.setItem('userToken', data.token);
        localStorage.setItem('userData', JSON.stringify(cleanUser));
        localStorage.setItem('lastLoginTime', Date.now().toString());
        setCurrentUser(cleanUser);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Registration error:', error);
      return {
        success: false,
        error: 'Bağlantı hatası. Lütfen tekrar deneyin.'
      };
    }
  };

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('lastLoginTime');
    setCurrentUser(null);
  }, []);

  /**
   * Refresh user profile from API
   */
  const refreshUserProfile = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        const cleanUser = extractUser(userData);
        setCurrentUser(cleanUser);
        localStorage.setItem('userData', JSON.stringify(cleanUser));
      }
    } catch (error) {
      console.error('❌ Profile refresh error:', error);
    }
  };

  /**
   * Update token balance (called by SignalR or after token transaction)
   */
  const updateTokenBalance = useCallback((newBalance: number) => {
    setCurrentUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, tokenBalance: newBalance };
      localStorage.setItem('userData', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value: UserContextType = {
    currentUser,
    isAuthenticated: !!currentUser,
    isLoading,
    login,
    register,
    logout,
    refreshUserProfile,
    updateTokenBalance,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useAuth() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a UserProvider');
  }
  return context;
}
