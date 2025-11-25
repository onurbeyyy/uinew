/**
 * Get localized title from object
 * Works with products, categories, portions, properties
 */
export function getTitle(
  item: {
    title?: string;
    Title?: string;
    titleEn?: string;
    TitleEn?: string;
    titleEnglish?: string;
    TitleEnglish?: string;
    name?: string;
    nameEn?: string;
  },
  language: 'tr' | 'en'
): string {
  if (language === 'en') {
    // Try English versions first (API uses titleEnglish, TitleEnglish)
    const enTitle =
      item.titleEnglish ||
      item.TitleEnglish ||
      item.titleEn ||
      item.TitleEn ||
      item.nameEn ||
      item.title ||
      item.Title ||
      item.name ||
      '';

    // If English version exists and is not empty, use it
    if (enTitle && enTitle.trim() !== '') {
      return enTitle;
    }
  }

  // Fallback to Turkish
  return item.title || item.Title || item.name || '';
}

/**
 * Get localized description from product
 */
export function getDescription(
  item: {
    description?: string;
    Description?: string;
    descriptionEn?: string;
    DescriptionEn?: string;
    descriptionEnglish?: string;
    DescriptionEnglish?: string;
    detail?: string;
    Detail?: string;
    detailEn?: string;
    DetailEn?: string;
    detailEnglish?: string;
    DetailEnglish?: string;
  },
  language: 'tr' | 'en'
): string {
  if (language === 'en') {
    // Try English versions first (API uses detailEnglish, descriptionEnglish)
    const enDesc =
      item.detailEnglish ||
      item.DetailEnglish ||
      item.detailEn ||
      item.DetailEn ||
      item.descriptionEnglish ||
      item.DescriptionEnglish ||
      item.descriptionEn ||
      item.DescriptionEn ||
      item.detail ||
      item.Detail ||
      item.description ||
      item.Description ||
      '';

    // If English version exists and is not empty, use it
    if (enDesc && enDesc.trim() !== '') {
      return enDesc;
    }
  }

  // Fallback to Turkish
  return item.detail || item.Detail || item.description || item.Description || '';
}
