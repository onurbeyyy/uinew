import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CartProvider } from '@/contexts/CartContext';
import { MenuProvider } from '@/contexts/MenuContext';
import { UserProvider } from '@/contexts/UserContext';
import { TableProvider } from '@/contexts/TableContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/components/ui/Toast';
import CookieConsent from '@/components/common/CookieConsent';

export const metadata: Metadata = {
  title: '15 Gün ÜCRETSİZ QR Menü Sistemi | 500+ Restoran Kullanıyor | Canlı Menü 2025',
  description: '15 GÜN ÜCRETSİZ DENEYİN! Türkiye\'nin 1 numaralı QR menü sistemi. AI asistan, müşteri sadakat, oyunlar, SambaPOS entegrasyonu. 500+ restoran kullanıyor. 0542 674 32 69',
  keywords: 'qr menü, qr menü sistemi, dijital menü, restoran menü sistemi, qr kod menü, qr menü fiyatları, en iyi qr menü, restaurant qr menu, ai menü asistanı, müşteri sadakat programı, restoran sadakat uygulaması, doğum günü kampanyası, restoran oyunları, pos entegrasyonu, sambapos entegrasyonu, mobil menü, temassız menü, dijital restoran menüsü',
  authors: [{ name: 'Canlı Menü' }],
  creator: 'Canlı Menü',
  publisher: 'Canlı Menü',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: 'https://canlimenu.com',
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: 'https://canlimenu.com',
    siteName: 'Canlı Menü',
    title: '15 Gün ÜCRETSİZ QR Menü Sistemi | Canlı Menü',
    description: '15 GÜN ÜCRETSİZ DENEYİN! 500+ restoran kullanıyor. AI asistan, müşteri sadakat, oyunlar, SambaPOS entegrasyonu. Türkiye\'nin en iyi QR menü sistemi.',
    images: [
      {
        url: 'https://canlimenu.com/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Canlı Menü - QR Menü Sistemi',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '15 Gün ÜCRETSİZ QR Menü Sistemi | Canlı Menü',
    description: '15 GÜN ÜCRETSİZ DENEYİN! 500+ restoran kullanıyor. AI asistan, müşteri sadakat, oyunlar, SambaPOS entegrasyonu.',
    images: ['https://canlimenu.com/images/twitter-card.jpg'],
    site: '@canlimenu',
  },
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
  },
  other: {
    'geo.region': 'TR',
    'geo.placename': 'Türkiye',
    'language': 'Turkish',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <head>
        {/* Google Sign-In SDK - doğrudan head'e eklendi */}
        <script src="https://accounts.google.com/gsi/client" async defer></script>
        {/* PWA - iOS için tam ekran desteği */}
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Font Awesome */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Canlı Menü" />
      </head>
      <body>
        <LanguageProvider>
          <UserProvider>
            <TableProvider>
              <MenuProvider>
                <CartProvider>
                  <ToastProvider>
                    {children}
                    <CookieConsent />
                  </ToastProvider>
                </CartProvider>
              </MenuProvider>
            </TableProvider>
          </UserProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
