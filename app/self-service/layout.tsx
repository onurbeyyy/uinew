import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'Self-Servis QR Sistemi',
  description: 'Self-servis QR kod ekranı - Tablet/TV için',
};

export default function SelfServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
