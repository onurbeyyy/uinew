'use client';

import type { Advertisement, CampaignData } from '@/types/api';

interface CampaignTabProps {
  tab: Advertisement;
}

export default function CampaignTab({ tab }: CampaignTabProps) {
  // Parse campaign text (can be JSON or plain text)
  const parseCampaignText = (campaignText?: string): CampaignData => {
    if (!campaignText) return { title: '', subtitle: '', ctaText: '' };

    try {
      const parsed = JSON.parse(campaignText);
      return {
        title: parsed.title || parsed.Title || '',
        subtitle: parsed.subtitle || parsed.Subtitle || '',
        ctaText: parsed.ctaText || parsed.CtaText || '',
      };
    } catch {
      // Plain text - use as title
      return {
        title: campaignText,
        subtitle: '',
        ctaText: '',
      };
    }
  };

  const campaign = parseCampaignText(tab.campaignText);

  const scrollToCategories = (e: React.MouseEvent) => {
    e.preventDefault();
    const categoriesGrid = document.querySelector('.categories-grid');
    if (categoriesGrid) {
      categoriesGrid.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="header-content-campaign">
      {campaign.title && <div className="header-campaign-title">{campaign.title}</div>}
      {campaign.subtitle && <div className="header-campaign-subtitle">{campaign.subtitle}</div>}
      {campaign.ctaText && (
        <a href="#categories" className="header-campaign-cta" onClick={scrollToCategories}>
          {campaign.ctaText}
        </a>
      )}
    </div>
  );
}
