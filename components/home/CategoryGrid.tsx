'use client';

import Image from 'next/image';
import { useMenu } from '@/contexts/MenuContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface Category {
  id: number;
  name: string;
  nameEn?: string;
  image: string;
}

interface CategoryGridProps {
  categories: Category[];
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  const { menuData, customerData, openProductListModal } = useMenu();
  const { language } = useLanguage();

  // Font ve renk customization
  const categoryFont = customerData?.customer.categoryFont || 'Inter, serif';
  const indexTextColor = customerData?.customer.indexTextColor || '#FFFFFF';

  const handleCategoryClick = (e: React.MouseEvent<HTMLAnchorElement>, categoryId: number) => {
    e.preventDefault();

    // Find full category data from menuData
    if (menuData?.menu) {
      const fullCategory = menuData.menu.find((cat) => cat.sambaId === categoryId);
      if (fullCategory) {
        openProductListModal(fullCategory);
      }
    }
  };

  return (
    <div className="categories-grid">
      {categories.map((category, index) => {
        const displayName = language === 'en' && category.nameEn
          ? category.nameEn
          : category.name;

        return (
          <a
            key={category.id}
            href={`#${category.id}`}
            className="category-card"
            style={{
              animation: 'categoryAppear 0.6s ease-out backwards',
              animationDelay: `${0.1 + index * 0.05}s`,
            }}
            onClick={(e) => handleCategoryClick(e, category.id)}
          >
            <Image
              src={category.image}
              alt={displayName}
              width={300}
              height={300}
              className="card-image"
              priority={true}
              unoptimized
            />
            <div className="card-content">
              <h3 className="card-title" style={{ fontFamily: categoryFont, color: indexTextColor }}>
                {displayName}
              </h3>
            </div>
          </a>
        );
      })}
    </div>
  );
}
