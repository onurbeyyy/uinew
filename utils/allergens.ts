/**
 * Alerjen adına göre emoji/icon döndürür
 * @param allergenName - Alerjen adı
 * @returns Emoji icon
 */
export function getAllergenIcon(allergenName: string): string {
  const name = allergenName.toLowerCase().trim();

  // Gluten
  if (name.includes('gluten') || name.includes('buğday') || name.includes('wheat')) return '🌾';

  // Süt ürünleri
  if (name.includes('laktoz') || name.includes('süt') || name.includes('milk') || name.includes('dairy')) return '🥛';

  // Yumurta
  if (name.includes('yumurta') || name.includes('egg')) return '🥚';

  // Fındık/Yerfıstığı
  if (name.includes('fındık') || name.includes('fıstık') || name.includes('nut') || name.includes('hazelnut') || name.includes('peanut')) return '🥜';

  // Balık
  if (name.includes('balık') || name.includes('fish')) return '🐟';

  // Deniz ürünleri
  if (name.includes('karides') || name.includes('deniz') || name.includes('shellfish') || name.includes('seafood')) return '🦐';

  // Soya
  if (name.includes('soya') || name.includes('soy')) return '🫘';

  // Susam
  if (name.includes('susam') || name.includes('sesame')) return '🌰';

  // Kereviz
  if (name.includes('kereviz') || name.includes('celery')) return '🥬';

  // Hardal
  if (name.includes('hardal') || name.includes('mustard')) return '🌶️';

  // Default - ünlem işareti
  return '⚠️';
}

/**
 * Kullanıcının alerjanları ile ürünün alerjanlarını karşılaştırır
 * @param productAllergens - Ürünün alerjenler string'i (virgülle ayrılmış veya JSON)
 * @param userAllergies - Kullanıcının alerjileri array'i
 * @returns Alerjan uyarı objesi veya null
 */
export function checkProductAllergens(
  productAllergens: string | undefined,
  userAllergies: string[]
): { allergens: string[]; icons: string; text: string } | null {
  // Kullanıcının alerjisi yoksa kontrol etme
  if (!userAllergies || userAllergies.length === 0) {
    return null;
  }

  // Ürünün alerjanlarını al
  if (!productAllergens || productAllergens.trim() === '') {
    return null;
  }

  let productAllergensList: string[] = [];
  try {
    productAllergensList = JSON.parse(productAllergens);
  } catch (e) {
    // String olarak geldiyse virgülle ayır
    productAllergensList = productAllergens.split(',').map(a => a.trim()).filter(a => a);
  }

  // Eşleşen alerjanları bul
  const matchedAllergens = productAllergensList.filter(allergen => {
    return userAllergies.some(userAllergy => {
      // "Diğer: xyz" formatını temizle
      const cleanUserAllergy = userAllergy.replace('Diğer: ', '').toLowerCase().trim();
      const cleanProductAllergen = allergen.toLowerCase().trim();
      return cleanUserAllergy === cleanProductAllergen || cleanProductAllergen.includes(cleanUserAllergy);
    });
  });

  // Eşleşme varsa uyarı döndür
  if (matchedAllergens.length > 0) {
    const allergenText = matchedAllergens.join(', ');
    const icons = matchedAllergens.map(allergen => getAllergenIcon(allergen)).join(' ');

    return {
      allergens: matchedAllergens,
      icons,
      text: allergenText
    };
  }

  return null;
}

/**
 * Kullanıcının alerji listesini localStorage'dan al
 * @returns Alerji listesi array
 */
export function getUserAllergies(): string[] {
  try {
    const userData = localStorage.getItem('userData');
    if (!userData) return [];

    const user = JSON.parse(userData);
    if (!user.allergies) return [];

    // JSON array olarak geliyorsa
    if (Array.isArray(user.allergies)) {
      return user.allergies;
    }

    // String olarak geliyorsa parse et
    if (typeof user.allergies === 'string') {
      try {
        const parsed = JSON.parse(user.allergies);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        // Tek bir string ise array'e çevir
        return [user.allergies];
      } catch {
        // JSON değilse tek bir string olarak döndür
        return [user.allergies];
      }
    }

    return [];
  } catch (error) {
    console.error('Alerji bilgisi alınamadı:', error);
    return [];
  }
}
