'use client';

import { useState, useEffect } from 'react';
import { useLocalizedApi } from '@/hooks/useLocalizedApi';
import { useTranslation } from '@/hooks/useTranslation';
import type { MenuDto } from '@/types/api';
import LanguageSwitcher from '../LanguageSwitcher';

/**
 * Locale destekli menü kullanım örneği
 * Bu component locale sisteminin nasıl çalıştığını gösterir
 */
export default function LocalizedMenuExample() {
  const { getMenu, formatPrice, locale } = useLocalizedApi();
  const { t } = useTranslation();
  const [menu, setMenu] = useState<MenuDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Örnek müşteri kodu - gerçek kullanımda props veya URL'den gelecek
  const customerCode = 'DEMO123';

  useEffect(() => {
    loadMenu();
  }, [locale]); // Locale değiştiğinde menüyü yeniden yükle

  const loadMenu = async () => {
    setLoading(true);
    setError(null);

    try {
      const menuData = await getMenu(customerCode);
      setMenu(menuData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('api.errors.general'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <p>{t('api.loading.menu')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="p-4">
        <p>{t('common.noData')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Dil değiştirici */}
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold">{t('menu.title')}</h1>
        <LanguageSwitcher />
      </div>

      {/* Müşteri bilgisi */}
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-xl font-semibold">{menu.customerTitle}</h2>
        {menu.customerLogo && (
          <img src={menu.customerLogo} alt={menu.customerTitle} className="h-16 mt-2" />
        )}
      </div>

      {/* Kategoriler ve Ürünler */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">{t('menu.categories')}</h3>

        {menu.menu.map((category) => (
          <div key={category.sambaId} className="border rounded-lg p-4">
            {/* Kategori başlığı - otomatik locale uygulanmış */}
            <h4 className="text-xl font-bold mb-4">{category.title}</h4>

            {/* Ürünler */}
            {category.products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.products.map((product) => (
                  <div key={product.id} className="border p-3 rounded hover:shadow-lg transition">
                    {/* Ürün resmi */}
                    {product.picture && (
                      <img
                        src={product.picture}
                        alt={product.title}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                    )}

                    {/* Ürün başlığı - otomatik locale uygulanmış */}
                    <h5 className="font-semibold">{product.title}</h5>

                    {/* Ürün açıklaması - otomatik locale uygulanmış */}
                    {product.description && (
                      <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                    )}

                    {/* Fiyat */}
                    <p className="text-lg font-bold mt-2 text-green-600">
                      {formatPrice(product.price, locale)}
                    </p>

                    {/* Porsiyonlar */}
                    {product.portions && product.portions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold">{t('menu.portions')}:</p>
                        <div className="flex gap-2 mt-1">
                          {product.portions.map((portion) => (
                            <span
                              key={portion.id}
                              className="text-xs bg-gray-200 px-2 py-1 rounded"
                            >
                              {portion.name} - {formatPrice(portion.price, locale)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Özellikler */}
                    {product.properties && product.properties.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold">{t('menu.properties')}:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {product.properties.map((property) => (
                            <span
                              key={property.id}
                              className="text-xs bg-blue-100 px-2 py-1 rounded"
                            >
                              {property.name} (+{formatPrice(property.price, locale)})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sepete ekle butonu */}
                    <button className="w-full mt-3 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition">
                      {t('menu.addToCart')}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">{t('menu.noProductsInCategory')}</p>
            )}
          </div>
        ))}
      </div>

      {/* Debug bilgisi */}
      <div className="mt-8 p-4 bg-gray-50 rounded text-xs">
        <p className="font-semibold">Debug Info:</p>
        <p>Current Locale: {locale}</p>
        <p>Categories: {menu.menu.length}</p>
        <p>Total Products: {menu.menu.reduce((sum, cat) => sum + cat.products.length, 0)}</p>
      </div>
    </div>
  );
}
