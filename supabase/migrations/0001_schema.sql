-- Gangasagar Kirana Stores: schema
-- Money is numeric(10,2) rupees. Weight is integer grams. Loose items: price is per kg, quantity is grams.

create schema if not exists private;

-- ---------------------------------------------------------------- settings and content
create table public.settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.admins (
  email text primary key check (email = lower(email)),
  name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- customers
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text check (full_name is null or length(full_name) <= 80),
  phone text check (phone is null or phone ~ '^[6-9][0-9]{9}$'),
  whatsapp_opt_in boolean not null default false,
  whatsapp_opt_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text check (label is null or length(label) <= 30),
  name text not null check (length(name) between 2 and 80),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  line1 text not null check (length(line1) between 3 and 200),
  line2 text check (line2 is null or length(line2) <= 200),
  landmark text check (landmark is null or length(landmark) <= 120),
  city text not null check (length(city) between 2 and 60),
  state text not null default 'Maharashtra' check (length(state) between 2 and 60),
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);

-- ---------------------------------------------------------------- catalogue
create table public.categories (
  id text primary key check (id ~ '^[a-z0-9-]{2,60}$'),
  name_en text not null check (length(name_en) between 2 and 80),
  name_hi text not null check (length(name_hi) between 1 and 80),
  description_en text,
  description_hi text,
  pour_kind text,
  colour text check (colour is null or colour ~ '^#[0-9A-Fa-f]{6}$'),
  image_url text,
  image_source text not null default 'illustration' check (image_source in ('store', 'generated', 'stock', 'render', 'illustration')),
  image_is_placeholder boolean not null default true,
  sort int not null default 0,
  is_hidden boolean not null default false,
  seo_title_en text, seo_title_hi text, seo_description_en text, seo_description_hi text,
  updated_at timestamptz not null default now()
);

create table public.products (
  id text primary key check (id ~ '^[a-z0-9-]{2,80}$'),
  category_id text not null references public.categories (id) on update cascade,
  name_en text not null check (length(name_en) between 2 and 100),
  name_hi text not null check (length(name_hi) between 1 and 100),
  synonyms text[] not null default '{}',
  description_en text check (description_en is null or length(description_en) <= 2000),
  description_hi text check (description_hi is null or length(description_hi) <= 2000),
  sell_type text not null check (sell_type in ('loose', 'packed', 'litre', 'piece')),
  min_qty_g int check (min_qty_g is null or min_qty_g > 0),
  step_g int check (step_g is null or step_g > 0),
  max_qty_g int check (max_qty_g is null or max_qty_g > 0),
  pack_sizes_g int[] not null default '{}',
  limited_stock_level int not null default 5 check (limited_stock_level >= 0),
  is_special boolean not null default false,
  pour_kind text,
  image_url text,
  image_source text not null default 'illustration' check (image_source in ('store', 'generated', 'stock', 'render', 'illustration')),
  image_is_placeholder boolean not null default true,
  extra_images text[] not null default '{}',
  frequently_bought text[] not null default '{}',
  recommended text[] not null default '{}',
  seo_title_en text, seo_title_hi text, seo_description_en text, seo_description_hi text,
  is_hidden boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);

create table public.variants (
  id text primary key check (id ~ '^[a-z0-9-]{2,120}$'),
  product_id text not null references public.products (id) on delete cascade on update cascade,
  label_en text not null check (length(label_en) between 1 and 60),
  label_hi text not null check (length(label_hi) between 1 and 60),
  is_loose boolean not null default false,
  unit_weight_g int not null check (unit_weight_g > 0),
  price numeric(10, 2) not null check (price >= 0),
  sale_price numeric(10, 2) check (sale_price is null or (sale_price >= 0 and sale_price < price)),
  price_is_sample boolean not null default true,
  stock int not null default 0,
  stock_is_sample boolean not null default true,
  is_hidden boolean not null default false,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
create index variants_product_idx on public.variants (product_id);

create table public.stock_movements (
  id bigint generated always as identity primary key,
  variant_id text not null references public.variants (id) on delete cascade on update cascade,
  delta int not null,
  stock_after int not null,
  reason text not null check (reason in ('sale', 'cancel_return', 'incoming', 'damaged', 'expired', 'adjust', 'import')),
  note text,
  order_id uuid,
  actor text,
  created_at timestamptz not null default now()
);
create index stock_movements_variant_idx on public.stock_movements (variant_id, created_at desc);

-- ---------------------------------------------------------------- carts and wishlist
create table public.carts (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  items jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table public.wishlist (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id text not null references public.products (id) on delete cascade on update cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------------------------------------------------------------- orders
create sequence public.order_number_seq start 1001;
create sequence public.quotation_number_seq start 101;

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  user_id uuid not null references auth.users (id),
  status text not null default 'requested' check (status in ('requested', 'quoted', 'accepted', 'declined', 'expired', 'cancelled')),
  zone text not null check (zone in ('nanded', 'outside')),
  method text not null check (method in ('delivery', 'pickup', 'courier', 'transport')),
  customer_name text not null,
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  address jsonb,
  notes text check (notes is null or length(notes) <= 1000),
  requested_items jsonb not null,
  total_weight_g int not null,
  quoted_items jsonb,
  shipping numeric(10, 2),
  total numeric(10, 2),
  valid_until date,
  admin_note text,
  order_id uuid,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  user_id uuid not null references auth.users (id),
  status text not null default 'Order Placed' check (status in ('Order Placed', 'Order Confirmed', 'Processing', 'Dispatched', 'Out for Delivery', 'Delivered', 'Cancelled')),
  zone text not null check (zone in ('nanded', 'outside')),
  method text not null check (method in ('delivery', 'pickup', 'courier', 'transport')),
  payment_method text not null check (payment_method in ('cash', 'upi_on_delivery', 'upi_prepaid')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending_verification', 'paid')),
  upi_ref text check (upi_ref is null or upi_ref ~ '^[A-Za-z0-9]{6,35}$'),
  paid_at timestamptz,
  paid_marked_by text,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  delivery_fee numeric(10, 2) not null check (delivery_fee >= 0),
  total numeric(10, 2) not null check (total >= 0),
  total_weight_g int not null,
  customer_name text not null,
  phone text not null,
  email text,
  address jsonb,
  notes text check (notes is null or length(notes) <= 1000),
  is_test boolean not null default false,
  quotation_id uuid references public.quotations (id),
  cancel_requested_at timestamptz,
  cancel_reason text check (cancel_reason is null or length(cancel_reason) <= 500),
  cancel_decision text check (cancel_decision in ('approved', 'rejected')),
  cancel_decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id text,
  variant_id text,
  name_en text not null,
  name_hi text not null,
  variant_en text not null,
  variant_hi text not null,
  is_loose boolean not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(10, 2) not null,
  line_total numeric(10, 2) not null,
  weight_g int not null
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  note text,
  actor text,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

-- ---------------------------------------------------------------- enquiries and reviews
create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contact', 'product', 'custom_quantity', 'wholesale')),
  name text not null check (length(name) between 2 and 80),
  phone text check (phone is null or phone ~ '^[6-9][0-9]{9}$'),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message text check (message is null or length(message) <= 2000),
  product_id text references public.products (id) on delete set null on update cascade,
  quantity_g int check (quantity_g is null or quantity_g > 0),
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  admin_note text,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (phone is not null or email is not null)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products (id) on delete cascade on update cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  body text check (body is null or length(body) <= 1500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  verified_purchase boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

-- ---------------------------------------------------------------- content types
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'general' check (kind in ('festival', 'combo', 'bulk', 'general')),
  title_en text not null, title_hi text not null,
  body_en text, body_hi text,
  image_url text,
  link_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_published boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  album text not null default 'store',
  image_url text not null,
  width int, height int,
  caption_en text, caption_hi text,
  source text not null default 'store' check (source in ('store', 'generated', 'stock', 'render', 'illustration')),
  is_placeholder boolean not null default false,
  is_published boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  title_en text not null, title_hi text not null,
  excerpt_en text, excerpt_hi text,
  body_en text, body_hi text,
  cover_url text,
  seo_title_en text, seo_title_hi text, seo_description_en text, seo_description_hi text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  topic text not null default 'general' check (topic in ('orders', 'delivery', 'payment', 'wholesale', 'products', 'account', 'general')),
  q_en text not null, q_hi text not null,
  a_en text not null, a_hi text not null,
  keywords text[] not null default '{}',
  is_published boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- audit and rate limits
create table public.activity_log (
  id bigint generated always as identity primary key,
  actor text,
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index activity_log_created_idx on public.activity_log (created_at desc);

create table private.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);
