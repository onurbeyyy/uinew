/**
 * Locale Helpers - API verilerini locale çevirileriyle birleştir
 * Bu fonksiyonlar API'den gelen verileri seçili dile göre çevirir
 */

import type { Locale } from './i18n';
import type {
  Product,
  Category,
  MenuListDto,
  ProductPortion,
  ProductProperty,
  CategoryDto
} from '@/types/api';

/**
 * Ürün başlığını locale'e göre döndür
 * Öncelik: locale'deki title > API'den gelen titleEn > varsayılan title
 */
export function getProductTitle(product: Product, locale: Locale): string {
  if (locale === 'en') {
    return product.titleEn || product.TitleEn || product.title || product.Title || '';
  }
  return product.title || product.Title || '';
}

/**
 * Ürün açıklamasını locale'e göre döndür
 */
export function getProductDescription(product: Product, locale: Locale): string {
  if (locale === 'en') {
    return product.descriptionEn || product.DescriptionEn || product.description || product.Description || product.detail || product.Detail || '';
  }
  return product.description || product.Description || product.detail || product.Detail || '';
}

/**
 * Kategori başlığını locale'e göre döndür
 */
export function getCategoryTitle(category: Category | MenuListDto, locale: Locale): string {
  if (locale === 'en') {
    return (category as any).titleEn || (category as any).titleEnglish || category.title || '';
  }
  return category.title || '';
}

/**
 * Porsiyon ismini locale'e göre döndür
 */
export function getPortionName(portion: ProductPortion, locale: Locale): string {
  if (locale === 'en') {
    return portion.nameEn || portion.name;
  }
  return portion.name;
}

/**
 * Özellik ismini locale'e göre döndür
 */
export function getPropertyName(property: ProductProperty, locale: Locale): string {
  if (locale === 'en') {
    return property.nameEn || property.name;
  }
  return property.name;
}

/**
 * Tüm ürünleri locale'e göre dönüştür (immutable)
 * API'den gelen Product array'ini locale versiyonuyla döndürür
 */
export function localizeProducts(products: Product[], locale: Locale): Product[] {
  return products.map(product => ({
    ...product,
    title: getProductTitle(product, locale),
    description: getProductDescription(product, locale),
    portions: product.portions?.map(portion => ({
      ...portion,
      name: getPortionName(portion, locale)
    })),
    properties: product.properties?.map(property => ({
      ...property,
      name: getPropertyName(property, locale)
    }))
  }));
}

/**
 * Kategorileri locale'e göre dönüştür
 */
export function localizeCategories(categories: Category[], locale: Locale): Category[] {
  return categories.map(category => ({
    ...category,
    title: getCategoryTitle(category, locale),
    products: localizeProducts(category.products, locale)
  }));
}

/**
 * MenuListDto array'ini locale'e göre dönüştür
 */
export function localizeMenuList(menuList: MenuListDto[], locale: Locale): MenuListDto[] {
  return menuList.map(menu => ({
    ...menu,
    title: getCategoryTitle(menu, locale),
    products: localizeProducts(menu.products, locale)
  }));
}

/**
 * CategoryDto array'ini locale'e göre dönüştür
 */
export function localizeCategoryDtos(categoryDtos: CategoryDto[], locale: Locale): CategoryDto[] {
  return categoryDtos.map(dto => ({
    ...dto,
    category: {
      ...dto.category,
      title: locale === 'en' ? (dto.category.titleEnglish || dto.category.title) : dto.category.title
    },
    products: dto.products ? localizeProducts(dto.products, locale) : undefined
  }));
}

/**
 * Fiyatı formatlı string olarak döndür
 */
export function formatPrice(price: number, locale: Locale): string {
  const currency = locale === 'en' ? '$' : '₺';
  return `${price.toFixed(2)} ${currency}`;
}

/**
 * Alerjen listesini parse et
 * API'den gelen allergens field'ı string veya JSON array olabilir
 */
export function parseAllergens(allergens?: string): string[] {
  if (!allergens) return [];

  try {
    // JSON array ise parse et
    const parsed = JSON.parse(allergens);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Virgülle ayrılmış string ise split et
    return allergens.split(',').map(a => a.trim()).filter(Boolean);
  }
}
