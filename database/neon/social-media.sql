create table if not exists smm_services_cache (
  id text primary key,
  category text not null,
  name text not null,
  note text not null default '',
  min integer not null default 0,
  max integer not null default 0,
  price integer not null default 0,
  menu_type text not null default '1',
  logo_type text not null default 'General',
  speed text not null default '-',
  last_synced_at timestamptz not null default now()
);

create table if not exists smm_orders (
  id bigserial primary key,
  provider_order_id text,
  service_id text not null,
  service_name text not null,
  category text not null,
  target_data text not null,
  quantity integer,
  unit_price integer not null default 0,
  total_price integer not null default 0,
  username text,
  comments text,
  order_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_smm_orders_status on smm_orders(order_status, created_at desc);
