import type { HappyHourSettings, DayHappyHour } from '@/types/api';

/**
 * HappyHourJson string'ini parse eder
 */
export function parseHappyHourSettings(json?: string): HappyHourSettings | null {
  if (!json) return null;

  try {
    const settings = JSON.parse(json) as HappyHourSettings;
    return settings;
  } catch {
    return null;
  }
}

/**
 * Gün numarasına göre gün ayarını döndürür
 * @param settings Happy Hour ayarları
 * @param dayNumber 0=Pazar, 1=Pazartesi, ... 6=Cumartesi
 */
export function getDaySettings(settings: HappyHourSettings, dayNumber: number): DayHappyHour | null {
  const dayMap: Record<number, keyof Omit<HappyHourSettings, 'isActive'>> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday'
  };

  const dayKey = dayMap[dayNumber];
  if (!dayKey) return null;

  return settings[dayKey] as DayHappyHour;
}

/**
 * Bugünün HH ayarını döndürür
 */
export function getTodaySettings(settings: HappyHourSettings | null): DayHappyHour | null {
  if (!settings || !settings.isActive) return null;

  const today = new Date().getDay();
  return getDaySettings(settings, today);
}

/**
 * Şu an Happy Hour zamanı mı kontrol eder
 * @param settings Happy Hour ayarları
 * @returns true ise HH zamanı
 */
export function isCurrentlyHappyHour(settings: HappyHourSettings | null): boolean {
  if (!settings || !settings.isActive) return false;

  const now = new Date();
  const currentDay = now.getDay(); // 0=Pazar, 1=Pazartesi, ...

  const daySettings = getDaySettings(settings, currentDay);
  if (!daySettings || !daySettings.enabled) return false;

  // Saat kontrolü
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Dakika cinsinden

  const [startHour, startMin] = daySettings.startTime.split(':').map(Number);
  const [endHour, endMin] = daySettings.endTime.split(':').map(Number);

  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  // Gece yarısını geçen durumlar (örn: 22:00 - 02:00)
  if (endTime < startTime) {
    return currentTime >= startTime || currentTime < endTime;
  }

  return currentTime >= startTime && currentTime < endTime;
}

/**
 * Ürünün HH ürünü olup olmadığını kontrol eder
 * (linkedProductId varsa HH ürünüdür)
 */
export function isHappyHourProduct(product: any): boolean {
  return !!(product?.linkedProductId || product?.LinkedProductId);
}

/**
 * HH ürününün sipariş verilebilir olup olmadığını kontrol eder
 * - HH zamanıysa: sipariş verilebilir
 * - HH zamanı değilse: sipariş verilemez
 */
export function canOrderHappyHourProduct(
  product: any,
  happyHourSettings: HappyHourSettings | null
): boolean {
  // HH ürünü değilse her zaman sipariş verilebilir
  if (!isHappyHourProduct(product)) {
    return true;
  }

  // HH ürünü ise, sadece HH zamanında sipariş verilebilir
  return isCurrentlyHappyHour(happyHourSettings);
}

/**
 * Bugünün HH saat aralığını string olarak döndürür
 * Örn: "17:00 - 20:00"
 */
export function getTodayHappyHourTimeRange(settings: HappyHourSettings | null): string | null {
  const todaySettings = getTodaySettings(settings);
  if (!todaySettings || !todaySettings.enabled) return null;

  return `${todaySettings.startTime} - ${todaySettings.endTime}`;
}
