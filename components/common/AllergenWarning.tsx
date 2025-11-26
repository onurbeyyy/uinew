'use client';

import { useEffect, useState } from 'react';
import { checkProductAllergens, getUserAllergies } from '@/utils/allergens';

interface AllergenWarningProps {
  productAllergens?: string;
  className?: string;
}

export default function AllergenWarning({ productAllergens, className = '' }: AllergenWarningProps) {
  const [warning, setWarning] = useState<{ allergens: string[]; icons: string; text: string } | null>(null);

  useEffect(() => {
    const userAllergies = getUserAllergies();
    const result = checkProductAllergens(productAllergens, userAllergies);
    setWarning(result);
  }, [productAllergens]);

  if (!warning) return null;

  return (
    <span
      className={`allergen-warning ${className}`}
      title={`⚠️ Alerjen: ${warning.text}`}
    >
      {warning.icons}
    </span>
  );
}
