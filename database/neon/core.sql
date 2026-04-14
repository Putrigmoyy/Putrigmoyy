create table if not exists core_wallet_accounts (
  id bigserial primary key,
  display_name text not null,
  contact text not null unique,
  pin_hash text not null,
  balance integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists core_transaction_history (
  id bigserial primary key,
  account_contact text not null references core_wallet_accounts(contact) on delete cascade,
  kind text not null,
  title text not null,
  subject_name text not null default '',
  amount integer not null default 0,
  status_label text not null,
  status text not null default 'pending',
  detail text not null default '',
  method_label text not null default '',
  reference text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_core_wallet_contact on core_wallet_accounts(contact);
create index if not exists idx_core_history_contact on core_transaction_history(account_contact, created_at desc);
create index if not exists idx_core_history_kind on core_transaction_history(kind, status, created_at desc);
