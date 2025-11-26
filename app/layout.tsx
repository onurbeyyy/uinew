import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { CartProvider } from '@/contexts/CartContext';
import { MenuProvider } from '@/contexts/MenuContext';
import { UserProvider } from '@/contexts/UserContext';
import { TableProvider } from '@/contexts/TableContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'Canlı Menü - Dijital Menü Sistemi',
  description: 'QR kod ile erişilebilen dijital menü platformu',
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
      <body>
        <LanguageProvider>
          <UserProvider>
            <TableProvider>
              <MenuProvider>
                <CartProvider>
                  <ToastProvider>{children}</ToastProvider>
                </CartProvider>
              </MenuProvider>
            </TableProvider>
          </UserProvider>
        </LanguageProvider>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
