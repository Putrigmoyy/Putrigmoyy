create table if not exists apk_products (
  id text primary key,
  title text not null,
  subtitle text not null default '',
  category text not null,
  stock integer not null default 0,
  sold integer not null default 0,
  rating text not null default '0/5',
  delivery text not null default 'Auto kirim akun',
  accent text not null default 'cyan',
  note text not null default '',
  guarantee text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists apk_product_variants (
  id text primary key,
  product_id text not null references apk_products(id) on delete cascade,
  title text not null,
  duration text not null default '',
  price integer not null default 0,
  stock integer not null default 0,
  badge text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_apk_products_active on apk_products(is_active, sort_order, title);
create index if not exists idx_apk_variants_product on apk_product_variants(product_id, is_active, sort_order, title);
