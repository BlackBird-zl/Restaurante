-- =====================================================================
-- restaurant-os · 0100 · Foundation schema (Arquitetura §1.2, §7)
-- Business tables live in app_private (never exposed by the Data API).
-- =====================================================================

create schema if not exists app_private;
revoke all on schema app_private from public;
revoke all on schema app_private from anon, authenticated;
grant usage on schema app_private to service_role;

-- Functions are never executable by default (Supabase grants broad defaults).
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
alter default privileges in schema app_private revoke execute on functions from public;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- ---------------------------------------------------------------------
-- Generic helpers used by constraints
-- ---------------------------------------------------------------------
create or replace function app_private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function app_private.valid_allergens(codes text[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(codes <@ array['gluten','crustaceos','ovos','peixe','amendoins','soja','leite',
    'frutos_casca_rija','aipo','mostarda','sesamo','sulfitos','tremoco','moluscos']::text[], true)
$$;

-- ---------------------------------------------------------------------
-- 7.2 Identity, tenants and configuration
-- ---------------------------------------------------------------------
create table app_private.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$'
      and slug not in ('app','api','admin','op','www','d','internal-sites','r','mesa','categoria','reservas')),
  name text not null check (char_length(name) between 1 and 80),
  status text not null default 'active' check (status in ('active','suspended')),
  owner_user_id uuid not null references auth.users(id),
  locale text not null default 'pt-PT' check (locale = 'pt-PT'),
  currency text not null default 'EUR' check (currency = 'EUR'),
  timezone text not null default 'Europe/Lisbon' check (timezone = 'Europe/Lisbon'),
  business_day_start time not null default '05:00',
  is_demo boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger restaurants_touch before update on app_private.restaurants
  for each row execute function app_private.touch_updated_at();

create table app_private.restaurant_domains (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references app_private.restaurants(id),
  hostname text not null unique check (hostname = lower(hostname) and hostname ~ '^[a-z0-9.-]{1,253}$'),
  kind text not null check (kind in ('platform','custom')),
  status text not null default 'pending' check (status in ('pending','verified','active','disabled')),
  verified_at timestamptz,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, id),
  check (status not in ('verified','active') or verified_at is not null)
);
create unique index restaurant_domains_one_primary on app_private.restaurant_domains(restaurant_id)
  where is_primary and status = 'active';
create trigger restaurant_domains_touch before update on app_private.restaurant_domains
  for each row execute function app_private.touch_updated_at();

create table app_private.restaurant_settings (
  restaurant_id uuid primary key references app_private.restaurants(id),
  ordering_mode text not null default 'open' check (ordering_mode in ('open','paused','closed')),
  max_items_per_order integer not null default 20 check (max_items_per_order between 1 and 50),
  max_units_per_order integer not null default 30 check (max_units_per_order between 1 and 100),
  max_order_cents integer not null default 50000 check (max_order_cents between 100 and 10000000),
  public_contacts jsonb not null default '{}'::jsonb check (jsonb_typeof(public_contacts) = 'object'),
  weekly_hours jsonb not null default '{}'::jsonb check (jsonb_typeof(weekly_hours) = 'object'),
  reservation_rules jsonb not null default '{}'::jsonb check (jsonb_typeof(reservation_rules) = 'object'),
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
create trigger restaurant_settings_touch before update on app_private.restaurant_settings
  for each row execute function app_private.touch_updated_at();

create table app_private.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app_private.restaurant_members (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references app_private.restaurants(id),
  user_id uuid references auth.users(id),
  invite_email text check (invite_email is null or (invite_email = lower(invite_email) and invite_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  display_name text not null check (char_length(display_name) between 1 and 80),
  status text not null default 'invited' check (status in ('invited','active','suspended')),
  invited_by_member_id uuid,
  accepted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, id),
  check (status = 'invited' or user_id is not null),
  check (user_id is not null or invite_email is not null),
  foreign key (restaurant_id, invited_by_member_id) references app_private.restaurant_members(restaurant_id, id)
);
create unique index restaurant_members_user on app_private.restaurant_members(restaurant_id, user_id) where user_id is not null;
create unique index restaurant_members_pending_email on app_private.restaurant_members(restaurant_id, invite_email) where status = 'invited';
create index restaurant_members_user_status on app_private.restaurant_members(user_id, status, restaurant_id);
create trigger restaurant_members_touch before update on app_private.restaurant_members
  for each row execute function app_private.touch_updated_at();

create table app_private.member_roles (
  restaurant_id uuid not null,
  member_id uuid not null,
  role text not null check (role in ('admin','floor','kitchen','bar','cashier')),
  created_at timestamptz not null default now(),
  primary key (restaurant_id, member_id, role),
  foreign key (restaurant_id, member_id) references app_private.restaurant_members(restaurant_id, id) on delete cascade
);

create table app_private.stations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references app_private.restaurants(id),
  code text not null check (code ~ '^[A-Z0-9]{2,8}$'),
  name text not null check (char_length(name) between 1 and 40),
  kind text not null check (kind in ('kitchen','bar')),
  sort_order integer not null default 0,
  active boolean not null default true,
  target_minutes integer not null default 15 check (target_minutes between 1 and 120),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, id),
  unique (restaurant_id, code)
);
create trigger stations_touch before update on app_private.stations
  for each row execute function app_private.touch_updated_at();

create table app_private.member_stations (
  restaurant_id uuid not null,
  member_id uuid not null,
  station_id uuid not null,
  primary key (restaurant_id, member_id, station_id),
  foreign key (restaurant_id, member_id) references app_private.restaurant_members(restaurant_id, id) on delete cascade,
  foreign key (restaurant_id, station_id) references app_private.stations(restaurant_id, id)
);
create index member_stations_station on app_private.member_stations(restaurant_id, station_id);

create table app_private.restaurant_themes (
  restaurant_id uuid primary key references app_private.restaurants(id),
  preset text not null check (preset in ('casa-editorial','balcao-claro','noite-grafica')),
  schema_version integer not null default 1 check (schema_version = 1),
  draft_tokens jsonb not null default '{}'::jsonb,
  published_tokens jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7.3 Menu, content and media
-- ---------------------------------------------------------------------
create table app_private.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references app_private.restaurants(id),
  slug text not null check (slug ~ '^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$' and slug not in ('categoria','mesa','api','admin','op','reservas')),
  name text not null check (char_length(name) between 1 and 60),
  description text not null default '' check (char_length(description) <= 300),
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, id),
  unique (restaurant_id, slug)
);
create trigger categories_touch before update on app_private.categories
  for each row execute function app_private.touch_updated_at();

create table app_private.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references app_private.restaurants(id),
  category_id uuid not null,
  station_id uuid not null,
  slug text not null check (slug ~ '^[a-z0-9]([a-z0-9-]{0,78}[a-z0-9])?$' and slug not in ('categoria','mesa','api','admin','op','reservas')),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  ingredients_text text not null default '' check (char_length(ingredients_text) <= 500),
  allergen_codes text[] not null default '{}' check (app_private.valid_allergens(allergen_codes)),
  is_vegetarian boolean not null default false,
  contains_alcohol boolean not null default false,
  price_cents integer not null check (price_cents between 1 and 100000),
  is_visible boolean not null default true,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  archived_at timestamptz,
  published_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, id),
  unique (restaurant_id, slug),
  foreign key (restaurant_id, category_id) references app_private.categories(restaurant_id, id),
  foreign key (restaurant_id, station_id) references app_private.stations(restaurant_id, id)
);
create index menu_items_category on app_private.menu_items(restaurant_id, category_id, is_visible, sort_order);
create index menu_items_station on app_private.menu_items(restaurant_id, station_id);
create trigger menu_items_touch before update on app_private.menu_items
  for each row execute function app_private.touch_updated_at();

create table app_private.media_assets (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references app_private.restaurants(id),
  storage_key text not null unique check (char_length(storage_key) <= 300),
  visibility text not null check (visibility in ('private','public')),
  purpose text not null check (purpose in ('product','hero','ambience','editorial','logo','other')),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/avif','image/svg+xml')),
  bytes integer not null check (bytes between 1 and 10485760),
  width integer not null check (width between 1 and 12000),
  height integer not null check (height between 1 and 12000),
  alt_text text not null default '' check (char_length(alt_text) <= 160),
  source_type text not null check (source_type in ('generated','uploaded','licensed','placeholder')),
  source_note text not null default '' check (char_length(source_note) <= 500),
  approved_at timestamptz,
  approved_by_member_id uuid,
  focal_x numeric(4,3) not null default 0.5 check (focal_x between 0 and 1),
  focal_y numeric(4,3) not null default 0.5 check (focal_y between 0 and 1),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (restaurant_id, id),
  foreign key (restaurant_id, approved_by_member_id) references app_private.restaurant_members(restaurant_id, id)
);

create table app_private.media_variants (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  media_id uuid not null,
  role text not null check (role in ('hero_desktop','hero_mobile','card','detail','thumb','original')),
  storage_key text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/avif','image/svg+xml')),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  bytes integer not null check (bytes > 0),
  unique (restaurant_id, media_id, role, mime_type),
  foreign key (restaurant_id, media_id) references app_private.media_assets(restaurant_id, id) on delete cascade
);

create table app_private.menu_item_media (
  restaurant_id uuid not null,
  menu_item_id uuid not null,
  media_id uuid not null,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  primary key (restaurant_id, menu_item_id, media_id),
  foreign key (restaurant_id, menu_item_id) references app_private.menu_items(restaurant_id, id),
  foreign key (restaurant_id, media_id) references app_private.media_assets(restaurant_id, id)
);
create unique index menu_item_media_one_cover on app_private.menu_item_media(restaurant_id, menu_item_id) where is_cover;
create index menu_item_media_media on app_private.menu_item_media(restaurant_id, media_id);

create table app_private.site_pages (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references app_private.restaurants(id),
  page_key text not null check (page_key in ('home','about','ambience','contact','privacy','reservations')),
  schema_version integer not null default 1 check (schema_version = 1),
  draft jsonb not null default '{}'::jsonb check (jsonb_typeof(draft) = 'object' and octet_length(draft::text) <= 65536),
  published jsonb check (published is null or (jsonb_typeof(published) = 'object' and octet_length(published::text) <= 65536)),
  published_at timestamptz,
  published_by_member_id uuid,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  unique (restaurant_id, page_key),
  unique (restaurant_id, id),
  foreign key (restaurant_id, published_by_member_id) references app_private.restaurant_members(restaurant_id, id)
);

-- ---------------------------------------------------------------------
-- 7.4 Tables, QR and sessions
-- ---------------------------------------------------------------------
create table app_private.dining_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references app_private.restaurants(id),
  label text not null check (label ~ '^[A-Za-z0-9]{1,8}$'),
  public_slug text not null check (public_slug ~ '^[a-z0-9]{1,8}$'),
  zone text not null default 'Sala' check (char_length(zone) between 1 and 30),
  seats integer not null check (seats between 1 and 30),
  sort_order integer not null default 0,
  active boolean not null default true,
  archived_at timestamptz,
  first_qr_issued_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, id),
  unique (restaurant_id, label),
  unique (restaurant_id, public_slug)
);
create trigger dining_tables_touch before update on app_private.dining_tables
  for each row execute function app_private.touch_updated_at();

create table app_private.qr_codes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  table_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  token_ciphertext text not null,
  token_key_version integer not null check (token_key_version >= 1),
  status text not null default 'active' check (status in ('active','revoked')),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  rotated_from_id uuid,
  unique (restaurant_id, id),
  unique (restaurant_id, id, table_id),
  foreign key (restaurant_id, table_id) references app_private.dining_tables(restaurant_id, id),
  foreign key (restaurant_id, rotated_from_id) references app_private.qr_codes(restaurant_id, id),
  check ((status = 'revoked') = (revoked_at is not null))
);
create unique index qr_codes_one_active on app_private.qr_codes(restaurant_id, table_id) where status = 'active';

create table app_private.table_visits (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  table_id uuid not null,
  status text not null default 'open' check (status in ('open','billing','closed')),
  opened_at timestamptz not null default now(),
  opened_by_member_id uuid not null,
  guest_count integer check (guest_count is null or guest_count between 1 and 60),
  closed_at timestamptz,
  closed_by_member_id uuid,
  join_code_digest text not null check (join_code_digest ~ '^[0-9a-f]{64}$'),
  join_code_generation integer not null default 1,
  join_code_expires_at timestamptz not null,
  revision bigint not null default 1,
  unique (restaurant_id, id),
  unique (restaurant_id, id, table_id),
  foreign key (restaurant_id, table_id) references app_private.dining_tables(restaurant_id, id),
  foreign key (restaurant_id, opened_by_member_id) references app_private.restaurant_members(restaurant_id, id),
  foreign key (restaurant_id, closed_by_member_id) references app_private.restaurant_members(restaurant_id, id),
  check ((status = 'closed') = (closed_at is not null))
);
create unique index table_visits_one_active on app_private.table_visits(restaurant_id, table_id)
  where status in ('open','billing');
create index table_visits_status on app_private.table_visits(restaurant_id, status, opened_at desc);

create table app_private.guest_sessions (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid(),
  restaurant_id uuid not null,
  visit_id uuid not null,
  qr_code_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz,
  unique (restaurant_id, id),
  unique (restaurant_id, id, visit_id),
  foreign key (restaurant_id, visit_id) references app_private.table_visits(restaurant_id, id),
  foreign key (restaurant_id, qr_code_id) references app_private.qr_codes(restaurant_id, id),
  check (expires_at <= created_at + interval '12 hours')
);
create index guest_sessions_visit on app_private.guest_sessions(restaurant_id, visit_id);
create index guest_sessions_qr on app_private.guest_sessions(restaurant_id, qr_code_id);

-- ---------------------------------------------------------------------
-- 7.5 Orders, calls, bills
-- ---------------------------------------------------------------------
create table app_private.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  visit_id uuid not null,
  guest_session_id uuid,
  created_by_member_id uuid,
  source text not null check (source in ('guest','staff')),
  order_number bigint not null check (order_number > 0),
  submitted_at timestamptz not null default now(),
  business_date date not null,
  assisted_reason text check (assisted_reason is null or char_length(assisted_reason) <= 160),
  unique (restaurant_id, id),
  unique (restaurant_id, id, visit_id),
  unique (restaurant_id, order_number),
  foreign key (restaurant_id, visit_id) references app_private.table_visits(restaurant_id, id),
  foreign key (restaurant_id, guest_session_id, visit_id) references app_private.guest_sessions(restaurant_id, id, visit_id),
  foreign key (restaurant_id, created_by_member_id) references app_private.restaurant_members(restaurant_id, id),
  check ((source = 'guest' and guest_session_id is not null and created_by_member_id is null)
      or (source = 'staff' and created_by_member_id is not null and guest_session_id is null))
);
create index orders_visit on app_private.orders(restaurant_id, visit_id, submitted_at);
create index orders_business_date on app_private.orders(restaurant_id, business_date, submitted_at);
create index orders_session on app_private.orders(restaurant_id, guest_session_id);

create table app_private.station_tickets (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  order_id uuid not null,
  station_id uuid not null,
  created_at timestamptz not null default now(),
  unique (restaurant_id, id),
  unique (restaurant_id, order_id, station_id),
  unique (restaurant_id, id, order_id, station_id),
  foreign key (restaurant_id, order_id) references app_private.orders(restaurant_id, id),
  foreign key (restaurant_id, station_id) references app_private.stations(restaurant_id, id)
);
create index station_tickets_station on app_private.station_tickets(restaurant_id, station_id, created_at);

create table app_private.order_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  order_id uuid not null,
  ticket_id uuid not null,
  menu_item_id uuid not null,
  station_id_snapshot uuid not null,
  product_name_snapshot text not null check (char_length(product_name_snapshot) between 1 and 80),
  unit_price_cents integer not null check (unit_price_cents between 1 and 100000),
  quantity integer not null check (quantity between 1 and 10),
  customer_note text check (customer_note is null or char_length(customer_note) <= 160),
  allergen_codes_snapshot text[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending','preparing','ready','delivering','delivered','cancelled')),
  created_at timestamptz not null default now(),
  prepared_started_at timestamptz,
  ready_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by_member_id uuid,
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) between 3 and 200),
  delivery_member_id uuid,
  version integer not null default 1,
  unique (restaurant_id, id),
  foreign key (restaurant_id, order_id) references app_private.orders(restaurant_id, id),
  foreign key (restaurant_id, ticket_id, order_id, station_id_snapshot)
    references app_private.station_tickets(restaurant_id, id, order_id, station_id),
  foreign key (restaurant_id, menu_item_id) references app_private.menu_items(restaurant_id, id),
  foreign key (restaurant_id, station_id_snapshot) references app_private.stations(restaurant_id, id),
  foreign key (restaurant_id, cancelled_by_member_id) references app_private.restaurant_members(restaurant_id, id),
  foreign key (restaurant_id, delivery_member_id) references app_private.restaurant_members(restaurant_id, id),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  check (status <> 'cancelled' or (cancel_reason is not null)),
  check (status not in ('preparing','ready','delivering','delivered') or prepared_started_at is not null),
  check (status not in ('ready','delivering','delivered') or ready_at is not null),
  check (status not in ('delivering','delivered') or (picked_up_at is not null and delivery_member_id is not null)),
  check (status <> 'delivered' or delivered_at is not null),
  check (ready_at is null or prepared_started_at is null or ready_at >= prepared_started_at),
  check (picked_up_at is null or ready_at is null or picked_up_at >= ready_at),
  check (delivered_at is null or picked_up_at is null or delivered_at >= picked_up_at)
);
create index order_items_station_status on app_private.order_items(restaurant_id, station_id_snapshot, status, created_at);
create index order_items_order on app_private.order_items(restaurant_id, order_id);
create index order_items_delivery on app_private.order_items(restaurant_id, delivery_member_id, status);
create index order_items_ticket on app_private.order_items(restaurant_id, ticket_id);
create index order_items_menu_item on app_private.order_items(restaurant_id, menu_item_id);

create table app_private.service_calls (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  visit_id uuid not null,
  type text not null check (type in ('service','cutlery','help','bill')),
  status text not null default 'new' check (status in ('new','claimed','completed','cancelled')),
  created_by_guest_id uuid,
  created_by_member_id uuid,
  claimed_by_member_id uuid,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 200),
  bill_request_cycle integer,
  version integer not null default 1,
  unique (restaurant_id, id),
  foreign key (restaurant_id, visit_id) references app_private.table_visits(restaurant_id, id),
  foreign key (restaurant_id, created_by_guest_id, visit_id) references app_private.guest_sessions(restaurant_id, id, visit_id),
  foreign key (restaurant_id, created_by_member_id) references app_private.restaurant_members(restaurant_id, id),
  foreign key (restaurant_id, claimed_by_member_id) references app_private.restaurant_members(restaurant_id, id),
  check ((type = 'bill') = (bill_request_cycle is not null)),
  check (status not in ('claimed','completed') or claimed_by_member_id is not null or status = 'completed'),
  check (status <> 'claimed' or (claimed_at is not null and claimed_by_member_id is not null)),
  check ((status = 'completed') = (completed_at is not null)),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  check (claimed_at is null or claimed_at >= created_at)
);
create unique index service_calls_one_active on app_private.service_calls(restaurant_id, visit_id, type)
  where status in ('new','claimed');
create unique index service_calls_bill_cycle on app_private.service_calls(restaurant_id, visit_id, bill_request_cycle)
  where type = 'bill';
create index service_calls_status on app_private.service_calls(restaurant_id, status, created_at);
create index service_calls_claimed on app_private.service_calls(restaurant_id, claimed_by_member_id, status);

create table app_private.bills (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  visit_id uuid not null,
  status text not null default 'open' check (status in ('open','requested','settled','void')),
  request_cycle integer not null default 0 check (request_cycle >= 0),
  requested_at timestamptz,
  settled_at timestamptz,
  closed_by_member_id uuid,
  total_cents_snapshot integer check (total_cents_snapshot is null or total_cents_snapshot between 0 and 10000000),
  void_reason text check (void_reason is null or char_length(void_reason) between 3 and 200),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  unique (restaurant_id, id),
  unique (restaurant_id, visit_id),
  unique (restaurant_id, id, visit_id),
  foreign key (restaurant_id, visit_id) references app_private.table_visits(restaurant_id, id),
  foreign key (restaurant_id, closed_by_member_id) references app_private.restaurant_members(restaurant_id, id),
  check (status <> 'settled' or (total_cents_snapshot is not null and total_cents_snapshot > 0 and settled_at is not null)),
  check (status <> 'void' or (void_reason is not null and coalesce(total_cents_snapshot, 0) = 0)),
  check (status <> 'requested' or requested_at is not null)
);
create index bills_status on app_private.bills(restaurant_id, status, requested_at);
create index bills_settled on app_private.bills(restaurant_id, settled_at);

create table app_private.bill_lines (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  bill_id uuid not null,
  order_item_id uuid not null,
  product_name_snapshot text not null,
  quantity integer not null check (quantity between 1 and 10),
  unit_price_cents integer not null check (unit_price_cents between 1 and 100000),
  line_total_cents integer not null check (line_total_cents >= 0),
  cancelled_at_snapshot timestamptz,
  unique (restaurant_id, bill_id, order_item_id),
  foreign key (restaurant_id, bill_id) references app_private.bills(restaurant_id, id),
  foreign key (restaurant_id, order_item_id) references app_private.order_items(restaurant_id, id),
  check ((cancelled_at_snapshot is null and line_total_cents = quantity * unit_price_cents)
      or (cancelled_at_snapshot is not null and line_total_cents = 0))
);
create index bill_lines_item on app_private.bill_lines(restaurant_id, order_item_id);

create table app_private.payment_records (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  bill_id uuid not null,
  method text not null check (method in ('cash','external_card','external_mbway')),
  amount_cents integer not null check (amount_cents > 0 and amount_cents <= 10000000),
  recorded_by_member_id uuid not null,
  recorded_at timestamptz not null default now(),
  idempotency_key uuid not null,
  note text check (note is null or char_length(note) <= 200),
  unique (restaurant_id, bill_id),
  foreign key (restaurant_id, bill_id) references app_private.bills(restaurant_id, id),
  foreign key (restaurant_id, recorded_by_member_id) references app_private.restaurant_members(restaurant_id, id)
);
create index payment_records_recorded on app_private.payment_records(restaurant_id, recorded_at);

create table app_private.reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references app_private.restaurants(id),
  reference text not null check (reference ~ '^[A-Z0-9]{8}$'),
  name text check (name is null or char_length(name) between 2 and 80),
  email text check (email is null or char_length(email) <= 160),
  phone text check (phone is null or phone ~ '^\+?[0-9]{6,15}$'),
  party_size integer not null check (party_size between 1 and 12),
  requested_at_local timestamp not null,
  scheduled_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','declined','cancelled','completed','no_show')),
  note text check (note is null or char_length(note) <= 300),
  internal_note text check (internal_note is null or char_length(internal_note) <= 300),
  contacted_at timestamptz,
  handled_by_member_id uuid,
  anonymized_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, id),
  unique (restaurant_id, reference),
  foreign key (restaurant_id, handled_by_member_id) references app_private.restaurant_members(restaurant_id, id),
  check (anonymized_at is not null or name is not null),
  check (anonymized_at is not null or email is not null or phone is not null),
  check (status <> 'confirmed' or contacted_at is not null)
);
create index reservations_status on app_private.reservations(restaurant_id, status, scheduled_at);
create trigger reservations_touch before update on app_private.reservations
  for each row execute function app_private.touch_updated_at();

-- ---------------------------------------------------------------------
-- 7.6 Transactional infrastructure
-- ---------------------------------------------------------------------
create table app_private.domain_events (
  id bigint generated always as identity primary key,
  restaurant_id uuid not null references app_private.restaurants(id),
  aggregate_type text not null check (aggregate_type in
    ('order','order_item','visit','bill','service_call','reservation','menu_item','category','station',
     'table','qr','member','site','theme','settings','media')),
  aggregate_id uuid not null,
  order_id uuid,
  visit_id uuid,
  event_type text not null check (char_length(event_type) <= 60),
  actor_kind text not null check (actor_kind in ('member','guest','system')),
  actor_member_id uuid,
  actor_guest_id uuid,
  occurred_at timestamptz not null default now(),
  from_state text,
  to_state text,
  reason text check (reason is null or char_length(reason) <= 200),
  metadata jsonb not null default '{}'::jsonb check (octet_length(metadata::text) <= 4096),
  foreign key (restaurant_id, order_id) references app_private.orders(restaurant_id, id),
  foreign key (restaurant_id, visit_id) references app_private.table_visits(restaurant_id, id),
  foreign key (restaurant_id, actor_member_id) references app_private.restaurant_members(restaurant_id, id),
  foreign key (restaurant_id, actor_guest_id) references app_private.guest_sessions(restaurant_id, id),
  check ((actor_kind = 'member') = (actor_member_id is not null)),
  check ((actor_kind = 'guest') = (actor_guest_id is not null))
);
create index domain_events_aggregate on app_private.domain_events(restaurant_id, aggregate_type, aggregate_id, occurred_at);
create index domain_events_visit on app_private.domain_events(restaurant_id, visit_id, occurred_at);
create index domain_events_order on app_private.domain_events(restaurant_id, order_id);

-- Append-only: block UPDATE/DELETE outside maintenance (retention job uses session flag).
create or replace function app_private.block_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_setting('app.maintenance', true) = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  raise exception using errcode = 'P0001', message = 'IMMUTABLE',
    detail = format('%s is append-only', tg_table_name);
end $$;
create trigger domain_events_append_only before update or delete on app_private.domain_events
  for each row execute function app_private.block_mutation();
create trigger payment_records_immutable before update or delete on app_private.payment_records
  for each row execute function app_private.block_mutation();
create trigger bill_lines_immutable before update or delete on app_private.bill_lines
  for each row execute function app_private.block_mutation();

create table app_private.idempotency_requests (
  restaurant_id uuid not null references app_private.restaurants(id),
  actor_scope text not null check (char_length(actor_scope) <= 120),
  operation text not null check (char_length(operation) <= 60),
  idempotency_key uuid not null,
  request_hash text not null,
  resource_id uuid,
  response_code integer not null,
  response_body jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '48 hours',
  primary key (restaurant_id, actor_scope, operation, idempotency_key)
);
create index idempotency_expires on app_private.idempotency_requests(expires_at);

create table app_private.tenant_counters (
  restaurant_id uuid not null references app_private.restaurants(id),
  counter_key text not null,
  value bigint not null default 0,
  primary key (restaurant_id, counter_key)
);

create table app_private.rate_limit_buckets (
  bucket_key_hash text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  expires_at timestamptz not null,
  primary key (bucket_key_hash, window_start)
);
create index rate_limit_expires on app_private.rate_limit_buckets(expires_at);

-- Minimal realtime invalidation table (only public table).
create table public.staff_invalidations (
  id bigint generated always as identity primary key,
  restaurant_id uuid not null,
  recipient_member_id uuid not null,
  scope text not null check (scope in ('orders','calls','tables','bills','menu','membership','reservations')),
  created_at timestamptz not null default now()
);
create index staff_invalidations_recipient on public.staff_invalidations(recipient_member_id, id);
create index staff_invalidations_created on public.staff_invalidations(created_at);

-- ---------------------------------------------------------------------
-- RLS: enabled everywhere, default deny (no policies on private tables).
-- ---------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'app_private' loop
    execute format('alter table app_private.%I enable row level security', t.tablename);
    execute format('alter table app_private.%I force row level security', t.tablename);
    execute format('revoke all on app_private.%I from public, anon, authenticated', t.tablename);
  end loop;
end $$;
-- FORCE RLS would also apply to the owner (postgres); SECURITY DEFINER functions run as
-- the owner, so we keep FORCE off for the owner and rely on no grants + no policies.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'app_private' loop
    execute format('alter table app_private.%I no force row level security', t.tablename);
  end loop;
end $$;

alter table public.staff_invalidations enable row level security;
revoke all on public.staff_invalidations from public, anon, authenticated, service_role;
grant select on public.staff_invalidations to authenticated;
grant select, insert, delete on public.staff_invalidations to service_role;
