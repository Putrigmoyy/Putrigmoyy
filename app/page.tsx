import { DashboardHome } from './dashboard-home';

export default function HomePage() {
  return (
    <DashboardHome
      items={[
        {
          title: 'Aplikasi Premium',
          description: 'Masuk ke katalog akun premium dan checkout website.',
          href: '/apk-premium',
          image: '/dashboard-apk-premium.png',
          external: false,
          imagePosition: 'center center',
        },
        {
          title: 'Kebutuhan Social Media',
          description: 'Masuk ke katalog layanan SMM dan panel order provider.',
          href: '/social-media',
          image: '/dashboard-social-media.jpg',
          external: false,
          imagePosition: 'center center',
        },
        {
          title: 'OTP Nokos All Country',
          description: 'Buka website OTP dan nokos dari dashboard utama.',
          href: process.env.NEXT_PUBLIC_OTP_URL || '#',
          image: '/dashboard-otp-nokos.png',
          external: true,
          imagePosition: 'center center',
        },
        {
          title: 'Sewa Bot Premium',
          description: 'Landing khusus untuk penyewaan bot premium.',
          href: process.env.NEXT_PUBLIC_BOT_RENTAL_URL || '#',
          image: '/dashboard-bot-rental.jpg',
          external: true,
          imagePosition: 'center center',
        },
      ]}
    />
  );
}
