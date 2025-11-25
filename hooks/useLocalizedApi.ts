'use client';

import { useCallback } from 'react';
import { useTranslation } from './useTranslation';
import { api } from '@/lib/api';
import {
  localizeProducts,
  localizeCategories,
  localizeMenuList,
  localizeCategoryDtos,
  getProductTitle,
  getProductDescription,
  getCategoryTitle,
  formatPrice
} from '@/lib/localeHelpers';
import type {
  MenuDto,
  CustomerInfoResponse,
  Advertisement,
  CategoryDto,
  TableEntity,
  ProductTokenSettingsResponse,
  UserTokenBalance
} from '@/types/api';

/**
 * Locale desteğiyle API kullanımı için hook
 * Tüm API isteklerini otomatik olarak seçili dile göre çevirir
 *
 * @example
 * const { getMenu, getCategories, locale } = useLocalizedApi();
 *
 * // Menu getir - otomatik locale uygulanır
 * const menu = await getMenu('ABC123');
 * // menu.menu array'i otomatik olarak locale'e göre çevrilmiş olarak gelir
 */
export function useLocalizedApi() {
  const { locale } = useTranslation();

  /**
   * Menü getir ve locale uygula
   */
  const getMenu = useCallback(
    async (customerCode: string, screenCode?: string): Promise<MenuDto> => {
      const menuData = await api.getMenu(customerCode, screenCode);

      return {
        ...menuData,
        menu: localizeMenuList(menuData.menu, locale)
      };
    },
    [locale]
  );

  /**
   * Kategorileri getir ve locale uygula
   */
  const getCategories = useCallback(
    async (customerCode: string): Promise<CategoryDto[]> => {
      const categories = await api.getCategoriesByCode(customerCode);
      return localizeCategoryDtos(categories, locale);
    },
    [locale]
  );

  /**
   * Müşteri bilgilerini getir (locale'den etkilenmez)
   */
  const getCustomer = useCallback(
    async (customerCode: string): Promise<CustomerInfoResponse> => {
      return api.getCustomer(customerCode);
    },
    []
  );

  /**
   * Masaları getir (locale'den etkilenmez)
   */
  const getTables = useCallback(
    async (customerId: number): Promise<TableEntity[]> => {
      return api.getTablesByCustomerId(customerId);
    },
    []
  );

  /**
   * Reklamları getir (locale'den etkilenmez)
   */
  const getActiveTabs = useCallback(
    async (customerCode: string): Promise<Advertisement[]> => {
      return api.getActiveTabs(customerCode);
    },
    []
  );

  /**
   * Token ayarlarını getir
   */
  const getProductTokenSettings = useCallback(
    async (customerCode: string): Promise<ProductTokenSettingsResponse> => {
      return api.getProductTokenSettings(customerCode);
    },
    []
  );

  /**
   * Token bakiyesini getir
   */
  const getUserTokenBalance = useCallback(
    async (userId: number, customerCode: string): Promise<{ balance: UserTokenBalance }> => {
      return api.getUserTokenBalance(userId, customerCode);
    },
    []
  );

  /**
   * Garson çağır
   */
  const callWaiter = useCallback(
    async (customerCode: string, tableName: string, message: string): Promise<void> => {
      return api.callWaiter({ customerCode, tableName, message });
    },
    []
  );

  /**
   * Sipariş oluştur
   */
  const createOrder = useCallback(
    async (orderRequest: any): Promise<void> => {
      return api.createOrder(orderRequest);
    },
    []
  );

  return {
    // API methods
    getMenu,
    getCategories,
    getCustomer,
    getTables,
    getActiveTabs,
    getProductTokenSettings,
    getUserTokenBalance,
    callWaiter,
    createOrder,

    // Helper methods
    getProductTitle,
    getProductDescription,
    getCategoryTitle,
    formatPrice,

    // Current locale
    locale,
  };
}
