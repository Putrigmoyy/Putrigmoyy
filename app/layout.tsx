import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Putri Gmoyy Store',
  description: 'Website pusat untuk social media order, APK premium, OTP nomor, dan sewa bot.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
