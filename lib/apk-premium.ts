export type ApkPremiumVariant = {
  id: string;
  title: string;
  duration: string;
  price: number;
  stock: number;
  badge?: string;
};

export type ApkPremiumProduct = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  category: string;
  stock: number;
  sold: number;
  rating: string;
  delivery: string;
  accent: 'cyan' | 'amber' | 'emerald' | 'violet';
  note: string;
  guarantee: string;
  variants: ApkPremiumVariant[];
};

export const apkPremiumProducts: ApkPremiumProduct[] = [
  {
    id: 'canva',
    title: 'Canva Pro',
    subtitle: 'Desain premium untuk creator dan seller',
    category: 'Produktivitas',
    stock: 37,
    sold: 214,
    rating: '4.9/5',
    delivery: 'Auto kirim akun',
    accent: 'cyan',
    note: 'Cocok untuk desain feed, story, katalog jualan, dan kebutuhan branding cepat dari HP.',
    guarantee: 'Garansi aktif sesuai masa paket dan aturan toko.',
    variants: [
      { id: 'canva-month', title: 'Canva Member', duration: '1 Bulan', price: 7000, stock: 15, badge: 'BEST' },
      { id: 'canva-team', title: 'Canva Team Slot', duration: '30 Hari', price: 12000, stock: 12 },
      { id: 'canva-year', title: 'Canva Private', duration: '1 Tahun', price: 54000, stock: 10, badge: 'PREMIUM' },
    ],
  },
  {
    id: 'netflix',
    title: 'Netflix',
    subtitle: 'Streaming film dan series lebih hemat',
    category: 'Streaming',
    stock: 29,
    sold: 188,
    rating: '4.8/5',
    delivery: 'Auto kirim akun',
    accent: 'amber',
    note: 'Pilihan untuk pelanggan yang ingin akun sharing atau private dengan proses cepat.',
    guarantee: 'Garansi sesuai catatan produk dan penggantian mengikuti stok tersedia.',
    variants: [
      { id: 'netflix-sharing', title: 'Netflix Sharing', duration: '1 Bulan', price: 18000, stock: 16, badge: 'HOT' },
      { id: 'netflix-private', title: 'Netflix Private', duration: '1 Bulan', price: 42000, stock: 8 },
      { id: 'netflix-family', title: 'Netflix Family', duration: '1 Bulan', price: 52000, stock: 5 },
    ],
  },
  {
    id: 'yt-premium',
    title: 'YouTube Premium',
    subtitle: 'Nonton tanpa iklan dan YouTube Music',
    category: 'Streaming',
    stock: 42,
    sold: 267,
    rating: '4.9/5',
    delivery: 'Auto invite / akun',
    accent: 'emerald',
    note: 'Pilihan paket family dan invite cocok untuk pelanggan yang suka proses cepat dan minim chat ulang.',
    guarantee: 'Garansi selama masa aktif paket sesuai deskripsi varian.',
    variants: [
      { id: 'yt-invite', title: 'YT Premium Invite', duration: '1 Bulan', price: 6000, stock: 18, badge: 'FAST' },
      { id: 'yt-family', title: 'YT Premium Family', duration: '2 Bulan', price: 13000, stock: 14 },
      { id: 'yt-private', title: 'YT Premium Private', duration: '1 Bulan', price: 35000, stock: 10 },
    ],
  },
  {
    id: 'capcut',
    title: 'CapCut Pro',
    subtitle: 'Editing video premium untuk jualan dan konten',
    category: 'Editing',
    stock: 24,
    sold: 156,
    rating: '4.8/5',
    delivery: 'Auto kirim akun',
    accent: 'violet',
    note: 'Cocok untuk seller, editor mobile, dan kebutuhan template video cepat.',
    guarantee: 'Garansi mengikuti masa aktif dan stabilitas akun pengganti.',
    variants: [
      { id: 'capcut-month', title: 'CapCut Sharing', duration: '1 Bulan', price: 9000, stock: 11 },
      { id: 'capcut-private', title: 'CapCut Private', duration: '1 Bulan', price: 27000, stock: 7, badge: 'TOP' },
      { id: 'capcut-year', title: 'CapCut Private', duration: '1 Tahun', price: 99000, stock: 6 },
    ],
  },
  {
    id: 'spotify',
    title: 'Spotify Premium',
    subtitle: 'Musik premium untuk daily listener',
    category: 'Streaming',
    stock: 33,
    sold: 205,
    rating: '4.7/5',
    delivery: 'Auto invite',
    accent: 'emerald',
    note: 'Varian family dan duo disusun untuk kebutuhan personal maupun berdua.',
    guarantee: 'Garansi sesuai masa aktif paket dan syarat toko.',
    variants: [
      { id: 'spotify-invite', title: 'Spotify Invite', duration: '1 Bulan', price: 5000, stock: 16, badge: 'BEST' },
      { id: 'spotify-duo', title: 'Spotify Duo', duration: '1 Bulan', price: 9500, stock: 10 },
      { id: 'spotify-private', title: 'Spotify Private', duration: '1 Bulan', price: 22000, stock: 7 },
    ],
  },
  {
    id: 'chatgpt',
    title: 'ChatGPT Plus',
    subtitle: 'AI premium untuk kerja dan eksperimen',
    category: 'AI Tools',
    stock: 14,
    sold: 91,
    rating: '4.9/5',
    delivery: 'Manual assist + cepat',
    accent: 'cyan',
    note: 'Paket AI cocok untuk buyer yang ingin akun aktif untuk writing, coding, dan riset.',
    guarantee: 'Garansi sesuai masa aktif dan detail akses yang disepakati.',
    variants: [
      { id: 'chatgpt-slot', title: 'ChatGPT Sharing', duration: '1 Bulan', price: 39000, stock: 7 },
      { id: 'chatgpt-private', title: 'ChatGPT Private', duration: '1 Bulan', price: 149000, stock: 4, badge: 'LIMITED' },
      { id: 'chatgpt-team', title: 'ChatGPT Workspace', duration: '1 Bulan', price: 89000, stock: 3 },
    ],
  },
];

export function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID').format(value);
}
