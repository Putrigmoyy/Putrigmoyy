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

create table if not exists apk_orders (
  id bigserial primary key,
  order_code text not null unique,
  product_id text not null references apk_products(id),
  product_title text not null,
  variant_id text not null references apk_product_variants(id),
  variant_title text not null,
  customer_name text not null,
  customer_contact text not null,
  quantity integer not null default 1,
  unit_price integer not null default 0,
  total_price integer not null default 0,
  order_note text not null default '',
  order_status text not null default 'pending',
  payment_status text not null default 'awaiting-payment',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists owner_notification_queue (
  id bigserial primary key,
  source text not null default 'apk-premium',
  event_type text not null,
  order_code text,
  payload jsonb not null default '{}'::jsonb,
  queue_status text not null default 'pending',
  delivered_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_apk_products_active on apk_products(is_active, sort_order, title);
create index if not exists idx_apk_variants_product on apk_product_variants(product_id, is_active, sort_order, title);
create index if not exists idx_apk_orders_status on apk_orders(order_status, payment_status, created_at desc);
create index if not exists idx_owner_notification_queue_status on owner_notification_queue(queue_status, created_at asc);
