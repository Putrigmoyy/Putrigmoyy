create table if not exists temp_mail_inboxes (
  id text primary key,
  local_part text not null,
  domain text not null,
  email_address text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists temp_mail_messages (
  id text primary key,
  inbox_id text not null references temp_mail_inboxes(id) on delete cascade,
  fingerprint text not null unique,
  message_id text,
  from_name text,
  from_address text not null,
  to_address text not null,
  subject text not null default 'Tanpa subjek',
  text_body text,
  html_body text,
  snippet text not null default '',
  headers jsonb,
  attachments jsonb not null default '[]'::jsonb,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists temp_mail_inboxes_created_idx
on temp_mail_inboxes(created_at desc);

create index if not exists temp_mail_messages_inbox_received_idx
on temp_mail_messages(inbox_id, received_at desc);

create index if not exists temp_mail_messages_to_address_idx
on temp_mail_messages(to_address, received_at desc);
