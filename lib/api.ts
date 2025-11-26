import type { MenuDto, CustomerInfoResponse, Advertisement, WaiterCallRequest, OrderRequest, CategoryDto, TableEntity, ProductTokenSettingsResponse, UserTokenBalance } from '@/types/api';
import { t, loadLocale } from './i18n';

// Server-side: direkt backend URL, Client-side: /backend-api proxy
const API_BASE_URL = typeof window === 'undefined'
  ? (process.env.API_URL || 'https://canlimenu.online')
  : '/backend-api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public translationKey?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const locale = loadLocale();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': locale,
          ...options?.headers,
        },
      });

      if (!response.ok) {
        // HTTP status koduna göre uygun çeviri anahtarını belirle
        let translationKey = 'api.errors.general';

        if (response.status === 404) {
          translationKey = 'api.errors.notFound';
        } else if (response.status === 401 || response.status === 403) {
          translationKey = 'api.errors.unauthorized';
        } else if (response.status >= 500) {
          translationKey = 'api.errors.serverError';
        }

        const errorMessage = t(locale, translationKey);
        throw new ApiError(errorMessage, response.status, response.statusText, translationKey);
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Network hatası veya diğer hatalar
      const errorMessage = t(locale, 'api.errors.network');
      throw new ApiError(errorMessage, 0, 'Network Error', 'api.errors.network');
    }
  }

  // Customer API
  async getCustomer(customerCode: string): Promise<CustomerInfoResponse> {
    return this.request<CustomerInfoResponse>(`/api/Customer/CustomerInfoByCode?code=${customerCode}`);
  }

  // Menu API
  async getMenu(customerCode: string, screenCode?: string): Promise<MenuDto> {
    const params = new URLSearchParams({ code: customerCode });
    if (screenCode) params.append('screenCode', screenCode);

    return this.request<MenuDto>(`/api/Menu/GetMenuDto?${params.toString()}`);
  }

  // Categories API (with pictures)
  async getCategoriesByCode(customerCode: string): Promise<CategoryDto[]> {
    return this.request<CategoryDto[]>(`/api/Menu/GetCategoriesByCode?code=${customerCode}`);
  }

  // Tables API
  async getTablesByCustomerId(customerId: number): Promise<TableEntity[]> {
    return this.request<TableEntity[]>(`/api/Menu/GetTables?customerId=${customerId}`);
  }

  // Advertisements API
  async getActiveTabs(customerCode: string): Promise<Advertisement[]> {
    return this.request<Advertisement[]>(
      `/api/Advertisements/GetActiveTabs?customerCode=${customerCode}`
    );
  }

  // Waiter Call API
  async callWaiter(request: WaiterCallRequest): Promise<void> {
    return this.request<void>('/api/WaiterCall', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Order API
  async createOrder(request: OrderRequest): Promise<void> {
    return this.request<void>('/api/Order', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Token APIs
  async getProductTokenSettings(customerCode: string): Promise<ProductTokenSettingsResponse> {
    return this.request<ProductTokenSettingsResponse>(`/api/ProductTokenSettings/by-code/${customerCode}`);
  }

  async getUserTokenBalance(userId: number, customerCode: string): Promise<{ balance: UserTokenBalance }> {
    return this.request<{ balance: UserTokenBalance }>(`/api/UserTokens/by-code?userId=${userId}&customerCode=${customerCode}`);
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);

// Export for server-side usage with internal URL
export function createServerApiClient() {
  const internalUrl = process.env.INTERNAL_API_URL || API_BASE_URL;
  return new ApiClient(internalUrl);
}
