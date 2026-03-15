-- =============================================================
-- Trackage Scheme — Production Database Schema
-- Generated: 2026-03-15
-- Apply in: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =============================================================
-- ORGANISERS
-- =============================================================
create table if not exists organisers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  name         text,
  email        text,
  phone        text,
  vat_number   text,
  vat_rate     numeric(5,4),          -- e.g. 0.18 for 18%
  bank_iban    text,
  status       text not null default 'active'
                 check (status in ('active','suspended','pending')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists organisers_user_id_idx on organisers(user_id);
create index if not exists organisers_email_idx   on organisers(email);

alter table organisers enable row level security;

-- =============================================================
-- EVENTS
-- =============================================================
create table if not exists events (
  id               uuid primary key default gen_random_uuid(),
  organiser_id     uuid references organisers(id) on delete cascade,
  name             text not null,
  slug             text unique,
  description      text,
  start_time       timestamptz,
  end_time         timestamptz,
  venue_name       text,
  venue_maps_url   text,
  thumbnail_url    text,
  poster_url       text,
  organiser_vat    text,
  platform_vat     text,
  vat_permit       text,
  booking_fee_pct  numeric(5,4) not null default 0,  -- e.g. 0.05 for 5%
  status           text not null default 'draft'
                     check (status in ('draft','published','sold_out','cancelled','ended')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists events_organiser_id_idx on events(organiser_id);
create index if not exists events_status_idx       on events(status);
create index if not exists events_slug_idx         on events(slug);

alter table events enable row level security;

-- =============================================================
-- EVENT DAYS
-- =============================================================
create table if not exists event_days (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  name        text not null,
  date        date,
  capacity    integer,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists event_days_event_id_idx on event_days(event_id);

alter table event_days enable row level security;

-- =============================================================
-- TICKETS (ticket types)
-- =============================================================
create table if not exists tickets (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references events(id) on delete cascade,
  event_day_id     uuid references event_days(id) on delete set null,
  name             text not null default 'General Admission',
  price            numeric(10,2) not null default 0,
  booking_fee_pct  numeric(5,4) not null default 0,
  inventory        integer,                        -- null = unlimited
  sold             integer not null default 0,
  sale_start       timestamptz,
  sale_end         timestamptz,
  disclaimer       text,
  footer_image_url text,
  status           text not null default 'active'
                     check (status in ('active','inactive','sold_out')),
  created_at       timestamptz not null default now()
);

create index if not exists tickets_event_id_idx     on tickets(event_id);
create index if not exists tickets_event_day_id_idx on tickets(event_day_id);

alter table tickets enable row level security;

-- =============================================================
-- COUPONS
-- =============================================================
create table if not exists coupons (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null unique,
  description          text,
  discount_type        text not null default 'percent'
                         check (discount_type in ('percent','fixed')),
  discount_value       numeric(10,2) not null,
  applies_to           text not null default 'cart'
                         check (applies_to in ('cart','tickets')),
  event_ids            uuid[],                     -- empty/null = global (admin only)
  usage_limit          integer,                    -- null = unlimited
  usage_limit_per_user integer,
  usage_count          integer not null default 0,
  expires_at           timestamptz,
  status               text not null default 'active'
                         check (status in ('active','inactive','expired')),
  created_at           timestamptz not null default now()
);

create index if not exists coupons_code_idx   on coupons(code);
create index if not exists coupons_status_idx on coupons(status);

alter table coupons enable row level security;

-- =============================================================
-- ORDERS
-- =============================================================
create table if not exists orders (
  id                    uuid primary key default gen_random_uuid(),
  event_id              uuid references events(id) on delete set null,
  organiser_id          uuid references organisers(id) on delete set null,
  status                text not null default 'pending_payment'
                           check (status in ('pending_payment','completed','failed','cancelled','refunded')),
  total                 numeric(10,2) not null default 0,
  booking_fee           numeric(10,2) not null default 0,
  discount              numeric(10,2) not null default 0,
  coupon_id             uuid references coupons(id) on delete set null,
  coupon_code           text,
  customer_name         text,
  customer_email        text,
  customer_phone        text,
  marketing_consent     boolean not null default false,
  qr_token              uuid unique default gen_random_uuid(),  -- legacy single-QR
  stripe_session_id     text unique,
  stripe_payment_intent text unique,
  checked_in_at         timestamptz,                           -- legacy single check-in
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists orders_event_id_idx           on orders(event_id);
create index if not exists orders_organiser_id_idx       on orders(organiser_id);
create index if not exists orders_status_idx             on orders(status);
create index if not exists orders_customer_email_idx     on orders(customer_email);
create index if not exists orders_stripe_session_id_idx  on orders(stripe_session_id);
create index if not exists orders_qr_token_idx           on orders(qr_token);

alter table orders enable row level security;

-- =============================================================
-- ORDER ITEMS
-- =============================================================
create table if not exists order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  ticket_id    uuid references tickets(id) on delete set null,
  ticket_name  text not null,
  quantity     integer not null default 1,
  unit_price   numeric(10,2) not null,
  created_at   timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on order_items(order_id);

alter table order_items enable row level security;

-- =============================================================
-- ORDER ATTENDEES (per-ticket QR codes)
-- =============================================================
create table if not exists order_attendees (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  ticket_id     uuid references tickets(id) on delete set null,
  ticket_name   text not null,
  qr_token      uuid not null unique default gen_random_uuid(),
  checked_in_at timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists order_attendees_order_id_idx  on order_attendees(order_id);
create index if not exists order_attendees_qr_token_idx  on order_attendees(qr_token);

alter table order_attendees enable row level security;

-- =============================================================
-- SETTINGS (key-value store for platform config)
-- =============================================================
create table if not exists settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table settings enable row level security;

-- =============================================================
-- UPDATED_AT TRIGGER (auto-update updated_at on row change)
-- =============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_organisers') then
    create trigger set_updated_at_organisers
      before update on organisers
      for each row execute function set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_events') then
    create trigger set_updated_at_events
      before update on events
      for each row execute function set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_orders') then
    create trigger set_updated_at_orders
      before update on orders
      for each row execute function set_updated_at();
  end if;
end $$;

-- =============================================================
-- ROW LEVEL SECURITY POLICIES
-- (API routes use service_role key which bypasses RLS.
--  These policies guard direct anon/authenticated access.)
-- =============================================================

-- organisers: users can read/update their own record
create policy "organisers: own record"
  on organisers for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- events: public can read active events
create policy "events: public read active"
  on events for select
  using (status = 'active');

-- events: organisers can manage their own events
create policy "events: organiser manage own"
  on events for all
  using  (organiser_id in (select id from organisers where user_id = auth.uid()))
  with check (organiser_id in (select id from organisers where user_id = auth.uid()));

-- tickets: public can read tickets for active events
create policy "tickets: public read"
  on tickets for select
  using (event_id in (select id from events where status = 'active'));

-- tickets: organisers can manage tickets on their events
create policy "tickets: organiser manage"
  on tickets for all
  using  (event_id in (select id from events where organiser_id in (select id from organisers where user_id = auth.uid())))
  with check (event_id in (select id from events where organiser_id in (select id from organisers where user_id = auth.uid())));

-- event_days: same as tickets
create policy "event_days: public read"
  on event_days for select
  using (event_id in (select id from events where status = 'active'));

create policy "event_days: organiser manage"
  on event_days for all
  using  (event_id in (select id from events where organiser_id in (select id from organisers where user_id = auth.uid())))
  with check (event_id in (select id from events where organiser_id in (select id from organisers where user_id = auth.uid())));

-- orders: service_role only (checkout + webhooks use service role)
-- No anon/authenticated policies needed here.

-- settings: no public access; service_role only
-- (no policies = no access for anon/authenticated)

-- =============================================================
-- SEED: Default settings row
-- =============================================================
insert into settings (key, value) values
  ('stripe', '{"publishable_key": "", "secret_key": "", "webhook_secret": ""}'::jsonb)
on conflict (key) do nothing;

-- =============================================================
-- DONE
-- =============================================================
