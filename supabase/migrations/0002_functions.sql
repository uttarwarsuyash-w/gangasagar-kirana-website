-- Gangasagar Kirana Stores: business rules.
-- Every price, fee, total, stock change and status change happens here.
-- Public functions take one jsonb argument `p` (ids and quantities only) and return jsonb.
-- Errors are raised with a short code as the message (for example 'not_enough_stock') and the
-- affected id in DETAIL; the website turns codes into friendly English/Hindi text.

-- ================================================================ helpers (private schema)
create or replace function private.uid() returns uuid
language sql stable as $$ select auth.uid() $$;

create or replace function private.email() returns text
language sql stable as $$ select lower(nullif(auth.jwt() ->> 'email', '')) $$;

create or replace function private.jwt_role() returns text
language sql stable as $$ select coalesce(auth.jwt() ->> 'role', 'anon') $$;

create or replace function private.setting(k text) returns jsonb
language sql stable security definer set search_path = public, private as $$
  select value from public.settings where key = k
$$;

create or replace function private.num(k text, fallback numeric) returns numeric
language sql stable security definer set search_path = public, private as $$
  select coalesce((select (value #>> '{}')::numeric from public.settings where key = k), fallback)
$$;

create or replace function private.txt(k text, fallback text) returns text
language sql stable security definer set search_path = public, private as $$
  select coalesce((select value #>> '{}' from public.settings where key = k), fallback)
$$;

create or replace function private.client_ip() returns text
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb ->> 'cf-connecting-ip',
    split_part(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-forwarded-for', ',', 1),
    'unknown')
$$;

create or replace function private.fail(code text, detail text default null) returns void
language plpgsql as $$
begin
  raise exception using message = code, detail = coalesce(detail, ''), errcode = 'P0001';
end $$;

-- Fixed-window rate limit. Raises 'rate_limited' when exceeded.
create or replace function private.hit_rate_limit(k text, max_hits int, window_seconds int) returns void
language plpgsql security definer set search_path = public, private as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  n int;
begin
  insert into private.rate_limits (key, window_start, hits) values (k, w, 1)
  on conflict (key, window_start) do update set hits = private.rate_limits.hits + 1
  returning hits into n;
  if n > max_hits then
    perform private.fail('rate_limited', k);
  end if;
  delete from private.rate_limits where window_start < now() - interval '2 days';
end $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, private as $$
  select exists (select 1 from public.admins a where a.email = private.email())
$$;

create or replace function private.require_admin() returns void
language plpgsql stable security definer set search_path = public, private as $$
begin
  if not public.is_admin() then
    perform private.fail('not_admin');
  end if;
end $$;

create or replace function private.require_user() returns uuid
language plpgsql stable as $$
declare u uuid := auth.uid();
begin
  if u is null then perform private.fail('sign_in_required'); end if;
  return u;
end $$;

create or replace function private.store_mode() returns text
language sql stable security definer set search_path = public, private as $$
  select private.txt('store_mode', 'preview')
$$;

create or replace function private.log(action text, entity text, entity_id text, detail jsonb default null) returns void
language sql security definer set search_path = public, private as $$
  insert into public.activity_log (actor, action, entity, entity_id, detail)
  values (coalesce(private.email(), 'system'), action, entity, entity_id, detail)
$$;

create or replace function private.valid_phone(ph text) returns boolean
language sql immutable as $$ select ph ~ '^[6-9][0-9]{9}$' $$;

-- ================================================================ triggers
create or replace function private.touch() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;

create trigger t_touch before update on public.products for each row execute function private.touch();
create trigger t_touch before update on public.variants for each row execute function private.touch();
create trigger t_touch before update on public.categories for each row execute function private.touch();
create trigger t_touch before update on public.orders for each row execute function private.touch();
create trigger t_touch before update on public.quotations for each row execute function private.touch();
create trigger t_touch before update on public.profiles for each row execute function private.touch();
create trigger t_touch before update on public.posts for each row execute function private.touch();
create trigger t_touch before update on public.settings for each row execute function private.touch();
create trigger t_touch before update on public.content for each row execute function private.touch();

-- Generic audit trail for admin-edited tables.
create or replace function private.audit() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare
  rec jsonb := to_jsonb(coalesce(new, old));
  changed text[];
begin
  if tg_op = 'UPDATE' then
    select array_agg(n.key order by n.key) into changed
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value and n.key not in ('updated_at');
    if changed is null then return new; end if;
  end if;
  insert into public.activity_log (actor, action, entity, entity_id, detail)
  values (coalesce(private.email(), 'system'), lower(tg_op), tg_table_name,
          coalesce(rec ->> 'id', rec ->> 'key'),
          case when tg_op = 'UPDATE' then jsonb_build_object('changed', changed)
               else jsonb_build_object('name', coalesce(rec ->> 'name_en', rec ->> 'title_en', rec ->> 'q_en', rec ->> 'label_en', rec ->> 'name')) end);
  return coalesce(new, old);
end $$;

create trigger t_audit after insert or update or delete on public.products for each row execute function private.audit();
create trigger t_audit after insert or update or delete on public.variants for each row execute function private.audit();
create trigger t_audit after insert or update or delete on public.categories for each row execute function private.audit();
create trigger t_audit after insert or update or delete on public.settings for each row execute function private.audit();
create trigger t_audit after insert or update or delete on public.content for each row execute function private.audit();
create trigger t_audit after insert or update or delete on public.offers for each row execute function private.audit();
create trigger t_audit after insert or update or delete on public.posts for each row execute function private.audit();
create trigger t_audit after insert or update or delete on public.faqs for each row execute function private.audit();
create trigger t_audit after insert or update or delete on public.gallery_items for each row execute function private.audit();
create trigger t_audit after update or delete on public.reviews for each row execute function private.audit();

-- New Google sign-in -> profile row.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email),
          left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 80))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

-- Only one default address per user.
create or replace function private.one_default_address() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if new.is_default then
    update public.addresses set is_default = false where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end $$;
create trigger t_one_default after insert or update of is_default on public.addresses
for each row execute function private.one_default_address();

-- ================================================================ catalogue rules
create or replace function private.availability(v public.variants, pr public.products) returns text
language sql stable as $$
  select case
    when v.is_loose and v.stock < coalesce(pr.min_qty_g, 250) then 'out'
    when not v.is_loose and v.stock <= 0 then 'out'
    when v.stock <= pr.limited_stock_level then 'limited'
    else 'available' end
$$;

create or replace function private.unit_price(v public.variants) returns numeric
language sql stable as $$ select coalesce(v.sale_price, v.price) $$;

-- Live prices and availability for every visible variant. Never exposes stock counts.
create or replace function public.live_catalogue(p jsonb default '{}') returns jsonb
language sql stable security definer set search_path = public, private as $$
  select jsonb_build_object(
    'store_mode', private.store_mode(),
    'prices', coalesce(jsonb_object_agg(v.id, jsonb_build_array(v.price, v.sale_price, private.availability(v, pr))), '{}'::jsonb),
    'at', now())
  from public.variants v
  join public.products pr on pr.id = v.product_id
  join public.categories c on c.id = pr.category_id
  where not v.is_hidden and not pr.is_hidden and not c.is_hidden
$$;

create or replace function public.public_settings(p jsonb default '{}') returns jsonb
language sql stable security definer set search_path = public, private as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from public.settings where is_public
$$;


-- ================================================================ quoting a cart
-- items: [{variant_id, quantity}]  (quantity = grams for loose items, count otherwise)
create or replace function private.quote(items jsonb, zone text, method text, pincode text, check_stock boolean)
returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare
  it record;
  v public.variants;
  pr public.products;
  c public.categories;
  lines jsonb := '[]'::jsonb;
  errors jsonb := '[]'::jsonb;
  subtotal numeric(12, 2) := 0;
  weight bigint := 0;
  qty int;
  mn int; st int; mx int;
  unit numeric(10, 2);
  line_total numeric(12, 2);
  line_w bigint;
  avail text;
  err text;
  free_min numeric := private.num('free_delivery_min_value', 499);
  heavy_g int := private.num('heavy_weight_g', 2000);
  heavy_fee numeric := private.num('fee_heavy', 49);
  light_fee numeric := private.num('fee_light', 89);
  outside_fee numeric := private.num('outside_flat_fee', 179);
  bulk_g int := private.num('bulk_threshold_g', 20000);
  pins jsonb := coalesce(private.setting('delivery_pincodes'), '["431602"]'::jsonb);
  pin_ok boolean;
  options jsonb;
  delivery_fee numeric;
  chosen jsonb;
begin
  if items is null or jsonb_typeof(items) <> 'array' then
    perform private.fail('bad_items');
  end if;
  if jsonb_array_length(items) > 100 then
    perform private.fail('too_many_items');
  end if;
  if zone is null or zone not in ('nanded', 'outside') then
    perform private.fail('bad_zone');
  end if;

  for it in
    select x.value ->> 'variant_id' as variant_id,
           sum(case when jsonb_typeof(x.value -> 'quantity') = 'number' then (x.value ->> 'quantity')::numeric end) as quantity,
           bool_or(jsonb_typeof(x.value -> 'quantity') is distinct from 'number') as bad,
           min(x.n) as pos
    from jsonb_array_elements(items) with ordinality as x(value, n)
    group by 1
    order by 4
  loop
    err := null;
    select * into v from public.variants where id = it.variant_id;
    if not found then
      errors := errors || jsonb_build_object('variant_id', it.variant_id, 'code', 'not_found');
      continue;
    end if;
    select * into pr from public.products where id = v.product_id;
    select * into c from public.categories where id = pr.category_id;

    if v.is_hidden or pr.is_hidden or c.is_hidden then
      err := 'unavailable';
    end if;
    if it.bad or it.quantity is null or it.quantity <= 0 or it.quantity <> trunc(it.quantity) or it.quantity > 10000000 then
      err := coalesce(err, 'bad_quantity');
      qty := 0;
    else
      qty := it.quantity::int;
    end if;

    if err is null then
      if v.is_loose then
        mn := coalesce(pr.min_qty_g, private.num('loose_min_g', 250)::int);
        st := coalesce(pr.step_g, private.num('loose_step_g', 250)::int);
        mx := coalesce(pr.max_qty_g, 100000);
        if qty < mn then err := 'below_minimum';
        elsif qty > mx then err := 'above_maximum';
        elsif (qty - mn) % st <> 0 then err := 'bad_step';
        end if;
      elsif qty > 999 then
        err := 'above_maximum';
      end if;
    end if;

    avail := private.availability(v, pr);
    if err is null and check_stock and (avail = 'out' or qty > v.stock) then
      err := 'not_enough_stock';
    end if;

    unit := private.unit_price(v);
    if v.is_loose then
      line_total := round(unit * qty / 1000.0, 2);
      line_w := qty;
    else
      line_total := unit * qty;
      line_w := v.unit_weight_g::bigint * qty;
    end if;

    lines := lines || jsonb_build_object(
      'variant_id', v.id, 'product_id', pr.id,
      'name_en', pr.name_en, 'name_hi', pr.name_hi,
      'variant_en', v.label_en, 'variant_hi', v.label_hi,
      'is_loose', v.is_loose, 'quantity', qty,
      'unit_price', unit, 'list_price', v.price,
      'line_total', line_total, 'weight_g', line_w,
      'availability', avail, 'price_is_sample', v.price_is_sample,
      'error', err);

    if err is null then
      subtotal := subtotal + line_total;
      weight := weight + line_w;
    else
      errors := errors || jsonb_build_object('variant_id', v.id, 'code', err);
    end if;
  end loop;

  if zone = 'nanded' then
    pin_ok := pincode is null or pins ? pincode;
    delivery_fee := case when subtotal >= free_min then 0 when weight >= heavy_g then heavy_fee else light_fee end;
    options := jsonb_build_array(
      jsonb_build_object('method', 'delivery', 'fee', delivery_fee, 'available', pin_ok,
                         'reason', case when not pin_ok then 'pincode_not_served' end),
      jsonb_build_object('method', 'pickup', 'fee', 0, 'available', true, 'reason', null));
  else
    options := jsonb_build_array(
      jsonb_build_object('method', 'courier', 'fee', outside_fee, 'available', weight < bulk_g,
                         'reason', case when weight >= bulk_g then 'needs_quotation' end),
      jsonb_build_object('method', 'transport', 'fee', outside_fee, 'available', weight < bulk_g,
                         'reason', case when weight >= bulk_g then 'needs_quotation' end));
  end if;
  select o into chosen from jsonb_array_elements(options) o where o ->> 'method' = method;

  return jsonb_build_object(
    'lines', lines,
    'errors', errors,
    'subtotal', subtotal,
    'total_weight_g', weight,
    'zone', zone,
    'method', chosen ->> 'method',
    'options', options,
    'delivery_fee', case when chosen is null then null else (chosen ->> 'fee')::numeric end,
    'total', subtotal + coalesce((chosen ->> 'fee')::numeric, 0),
    'bulk', weight >= bulk_g,
    'needs_quotation', zone = 'outside' and weight >= bulk_g,
    'meter', jsonb_build_object(
      'free_min', free_min, 'to_free', greatest(0, free_min - subtotal),
      'heavy_g', heavy_g, 'to_heavy_g', greatest(0, heavy_g - weight),
      'heavy_fee', heavy_fee, 'light_fee', light_fee, 'bulk_g', bulk_g, 'outside_fee', outside_fee),
    'store_mode', private.store_mode());
end $$;

create or replace function public.quote_cart(p jsonb) returns jsonb
language sql stable security definer set search_path = public, private as $$
  select private.quote(
    coalesce(p -> 'items', '[]'::jsonb),
    coalesce(p ->> 'zone', 'nanded'),
    coalesce(p ->> 'method', case when coalesce(p ->> 'zone', 'nanded') = 'nanded' then 'delivery' else 'courier' end),
    nullif(p ->> 'pincode', ''),
    true)
$$;

-- ================================================================ addresses and contact helpers
create or replace function private.address_from(p jsonb, u uuid) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare a public.addresses; addr jsonb;
begin
  if p ? 'address_id' and nullif(p ->> 'address_id', '') is not null then
    select * into a from public.addresses where id = (p ->> 'address_id')::uuid and user_id = u;
    if not found then perform private.fail('address_not_found'); end if;
    return jsonb_build_object('name', a.name, 'phone', a.phone, 'line1', a.line1, 'line2', a.line2,
      'landmark', a.landmark, 'city', a.city, 'state', a.state, 'pincode', a.pincode);
  end if;
  addr := p -> 'address';
  if addr is null
     or length(coalesce(addr ->> 'name', '')) not between 2 and 80
     or not private.valid_phone(coalesce(addr ->> 'phone', ''))
     or length(coalesce(addr ->> 'line1', '')) not between 3 and 200
     or length(coalesce(addr ->> 'city', '')) not between 2 and 60
     or coalesce(addr ->> 'pincode', '') !~ '^[1-9][0-9]{5}$' then
    perform private.fail('bad_address');
  end if;
  return jsonb_build_object('name', addr ->> 'name', 'phone', addr ->> 'phone', 'line1', addr ->> 'line1',
    'line2', left(addr ->> 'line2', 200), 'landmark', left(addr ->> 'landmark', 120), 'city', addr ->> 'city',
    'state', coalesce(nullif(addr ->> 'state', ''), 'Maharashtra'), 'pincode', addr ->> 'pincode');
end $$;

-- ================================================================ placing an order
create or replace function public.place_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  u uuid := private.require_user();
  zone text := p ->> 'zone';
  method text := p ->> 'method';
  pay text := p ->> 'payment_method';
  q jsonb;
  addr jsonb;
  cname text;
  cphone text;
  o public.orders;
  line jsonb;
  opt jsonb;
  left_stock int;
  upi text := nullif(trim(p ->> 'upi_ref'), '');
begin
  perform private.hit_rate_limit('order:' || u, 10, 3600);
  if coalesce((p ->> 'accept_terms')::boolean, false) is not true then perform private.fail('terms_not_accepted'); end if;
  if zone is null or zone not in ('nanded', 'outside') then perform private.fail('bad_zone'); end if;
  if (zone = 'nanded' and method not in ('delivery', 'pickup')) or (zone = 'outside' and method not in ('courier', 'transport')) or method is null then
    perform private.fail('bad_method');
  end if;
  if (zone = 'nanded' and coalesce(pay, '') not in ('cash', 'upi_on_delivery')) or (zone = 'outside' and coalesce(pay, '') <> 'upi_prepaid') then
    perform private.fail('bad_payment_method');
  end if;
  if upi is not null and (pay <> 'upi_prepaid' or upi !~ '^[A-Za-z0-9]{6,35}$') then
    perform private.fail('bad_upi_ref');
  end if;

  if method = 'pickup' then
    cname := trim(p -> 'contact' ->> 'name');
    cphone := trim(p -> 'contact' ->> 'phone');
  else
    addr := private.address_from(p, u);
    cname := addr ->> 'name';
    cphone := addr ->> 'phone';
  end if;
  if length(coalesce(cname, '')) not between 2 and 80 or not private.valid_phone(coalesce(cphone, '')) then
    perform private.fail('bad_contact');
  end if;

  q := private.quote(p -> 'items', zone, method, case when method = 'delivery' then addr ->> 'pincode' end, true);
  if jsonb_array_length(q -> 'lines') = 0 then perform private.fail('empty_cart'); end if;
  if jsonb_array_length(q -> 'errors') > 0 then
    perform private.fail(q -> 'errors' -> 0 ->> 'code', q -> 'errors' -> 0 ->> 'variant_id');
  end if;
  if (q ->> 'needs_quotation')::boolean then perform private.fail('needs_quotation'); end if;
  select x into opt from jsonb_array_elements(q -> 'options') x where x ->> 'method' = method;
  if not (opt ->> 'available')::boolean then perform private.fail(coalesce(opt ->> 'reason', 'method_unavailable')); end if;

  insert into public.orders (number, user_id, zone, method, payment_method, payment_status, upi_ref,
    subtotal, delivery_fee, total, total_weight_g, customer_name, phone, email, address, notes, is_test)
  values (
    'GS' || to_char(now() at time zone 'Asia/Kolkata', 'YY') || '-' || nextval('public.order_number_seq'),
    u, zone, method, pay, case when upi is not null then 'pending_verification' else 'unpaid' end, upi,
    (q ->> 'subtotal')::numeric, (opt ->> 'fee')::numeric, (q ->> 'subtotal')::numeric + (opt ->> 'fee')::numeric,
    (q ->> 'total_weight_g')::int, cname, cphone, private.email(), addr,
    left(nullif(trim(p ->> 'notes'), ''), 1000), private.store_mode() = 'preview')
  returning * into o;

  for line in select x from jsonb_array_elements(q -> 'lines') x loop
    insert into public.order_items (order_id, product_id, variant_id, name_en, name_hi, variant_en, variant_hi,
      is_loose, quantity, unit_price, line_total, weight_g)
    values (o.id, line ->> 'product_id', line ->> 'variant_id', line ->> 'name_en', line ->> 'name_hi',
      line ->> 'variant_en', line ->> 'variant_hi', (line ->> 'is_loose')::boolean, (line ->> 'quantity')::int,
      (line ->> 'unit_price')::numeric, (line ->> 'line_total')::numeric, (line ->> 'weight_g')::int);
    update public.variants set stock = stock - (line ->> 'quantity')::int
    where id = line ->> 'variant_id' and stock >= (line ->> 'quantity')::int
    returning stock into left_stock;
    if not found then perform private.fail('not_enough_stock', line ->> 'variant_id'); end if;
    insert into public.stock_movements (variant_id, delta, stock_after, reason, order_id, actor)
    values (line ->> 'variant_id', -(line ->> 'quantity')::int, left_stock, 'sale', o.id, 'order ' || o.number);
  end loop;

  insert into public.order_events (order_id, status, actor) values (o.id, 'Order Placed', 'customer');

  update public.profiles set
    phone = coalesce(phone, cphone),
    full_name = coalesce(full_name, cname),
    whatsapp_opt_in = case when p ? 'whatsapp_opt_in' then (p ->> 'whatsapp_opt_in')::boolean else whatsapp_opt_in end,
    whatsapp_opt_in_at = case when (p ->> 'whatsapp_opt_in')::boolean then now() else whatsapp_opt_in_at end
  where id = u;
  update public.carts set items = '[]'::jsonb, updated_at = now() where user_id = u;

  return jsonb_build_object('id', o.id, 'number', o.number, 'total', o.total, 'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee, 'payment_method', o.payment_method, 'payment_status', o.payment_status,
    'method', o.method, 'zone', o.zone, 'is_test', o.is_test);
end $$;

-- ================================================================ customer: orders
create or replace function private.order_json(o public.orders, with_detail boolean) returns jsonb
language sql stable security definer set search_path = public, private as $$
  select to_jsonb(o) - 'user_id'
    || jsonb_build_object('item_count', (select count(*) from public.order_items i where i.order_id = o.id))
    || case when with_detail then jsonb_build_object(
         'items', coalesce((select jsonb_agg(to_jsonb(i) - 'order_id' order by i.id) from public.order_items i where i.order_id = o.id), '[]'),
         'events', coalesce((select jsonb_agg(jsonb_build_object('status', e.status, 'note', e.note, 'at', e.created_at) order by e.id) from public.order_events e where e.order_id = o.id), '[]'))
       else '{}'::jsonb end
$$;

create or replace function public.my_orders(p jsonb default '{}') returns jsonb
language sql stable security definer set search_path = public, private as $$
  select coalesce(jsonb_agg(private.order_json(o, false) order by o.created_at desc), '[]')
  from public.orders o where o.user_id = private.require_user()
$$;

create or replace function public.my_order(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare u uuid := private.require_user(); o public.orders;
begin
  select * into o from public.orders where (id::text = p ->> 'id' or number = p ->> 'id') and user_id = u;
  if not found then perform private.fail('order_not_found'); end if;
  return private.order_json(o, true);
end $$;

create or replace function public.request_cancellation(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); o public.orders;
begin
  perform private.hit_rate_limit('cancel:' || u, 10, 3600);
  select * into o from public.orders where id = (p ->> 'order_id')::uuid and user_id = u for update;
  if not found then perform private.fail('order_not_found'); end if;
  if o.status not in ('Order Placed', 'Order Confirmed', 'Processing') then perform private.fail('cannot_cancel_now'); end if;
  if o.cancel_requested_at is not null and o.cancel_decision is null then perform private.fail('cancel_already_requested'); end if;
  update public.orders set cancel_requested_at = now(), cancel_reason = left(nullif(trim(p ->> 'reason'), ''), 500),
    cancel_decision = null, cancel_decided_at = null where id = o.id;
  insert into public.order_events (order_id, status, note, actor) values (o.id, o.status, 'Cancellation requested', 'customer');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.submit_upi_ref(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); o public.orders; ref text := trim(p ->> 'upi_ref');
begin
  perform private.hit_rate_limit('upi:' || u, 20, 3600);
  if ref is null or ref !~ '^[A-Za-z0-9]{6,35}$' then perform private.fail('bad_upi_ref'); end if;
  select * into o from public.orders where id = (p ->> 'order_id')::uuid and user_id = u for update;
  if not found then perform private.fail('order_not_found'); end if;
  if o.payment_status = 'paid' or o.status = 'Cancelled' then perform private.fail('payment_not_needed'); end if;
  update public.orders set upi_ref = ref, payment_status = 'pending_verification' where id = o.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.reorder_items(p jsonb) returns jsonb
language sql stable security definer set search_path = public, private as $$
  select jsonb_build_object(
    'items', coalesce(jsonb_agg(jsonb_build_object('variant_id', i.variant_id, 'quantity', i.quantity))
                      filter (where v.id is not null and not v.is_hidden and not pr.is_hidden), '[]'),
    'missing', coalesce(jsonb_agg(jsonb_build_object('name_en', i.name_en, 'name_hi', i.name_hi))
                      filter (where v.id is null or v.is_hidden or pr.is_hidden), '[]'))
  from public.order_items i
  join public.orders o on o.id = i.order_id
  left join public.variants v on v.id = i.variant_id
  left join public.products pr on pr.id = v.product_id
  where o.id = (p ->> 'order_id')::uuid and o.user_id = private.require_user()
$$;

create or replace function public.update_profile(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); r public.profiles;
begin
  if p ? 'phone' and nullif(p ->> 'phone', '') is not null and not private.valid_phone(p ->> 'phone') then
    perform private.fail('bad_phone');
  end if;
  update public.profiles set
    full_name = case when p ? 'full_name' then left(nullif(trim(p ->> 'full_name'), ''), 80) else full_name end,
    phone = case when p ? 'phone' then nullif(p ->> 'phone', '') else phone end,
    whatsapp_opt_in = case when p ? 'whatsapp_opt_in' then (p ->> 'whatsapp_opt_in')::boolean else whatsapp_opt_in end,
    whatsapp_opt_in_at = case when p ? 'whatsapp_opt_in' and (p ->> 'whatsapp_opt_in')::boolean then now()
                              when p ? 'whatsapp_opt_in' then null else whatsapp_opt_in_at end
  where id = u returning * into r;
  if not found then
    insert into public.profiles (id, email, full_name, phone) values (u, private.email(), left(p ->> 'full_name', 80), nullif(p ->> 'phone', ''))
    returning * into r;
  end if;
  return to_jsonb(r);
end $$;

create or replace function public.my_profile(p jsonb default '{}') returns jsonb
language sql stable security definer set search_path = public, private as $$
  select coalesce(to_jsonb(pf), jsonb_build_object('id', private.require_user(), 'email', private.email()))
         || jsonb_build_object('is_admin', public.is_admin())
  from (select 1) one left join public.profiles pf on pf.id = private.require_user()
$$;

-- ================================================================ customer: cart sync
create or replace function private.clean_items(items jsonb) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_agg(jsonb_build_object('variant_id', x ->> 'variant_id', 'quantity', (x ->> 'quantity')::int)), '[]')
  from jsonb_array_elements(case when jsonb_typeof(items) = 'array' then items else '[]' end) x
  where x ->> 'variant_id' ~ '^[a-z0-9-]{2,120}$' and jsonb_typeof(x -> 'quantity') = 'number'
    and (x ->> 'quantity')::numeric between 1 and 1000000
$$;

create or replace function public.merge_cart(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); merged jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('variant_id', variant_id, 'quantity', qty)), '[]') into merged
  from (
    select x ->> 'variant_id' as variant_id, max((x ->> 'quantity')::int) as qty
    from jsonb_array_elements(
      coalesce((select items from public.carts where user_id = u), '[]') || private.clean_items(p -> 'items')) x
    join public.variants v on v.id = x ->> 'variant_id'
    group by 1
    limit 100
  ) s;
  insert into public.carts (user_id, items) values (u, merged)
  on conflict (user_id) do update set items = excluded.items, updated_at = now();
  return merged;
end $$;

create or replace function public.save_cart(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); items jsonb := private.clean_items(p -> 'items');
begin
  if jsonb_array_length(items) > 100 then perform private.fail('too_many_items'); end if;
  insert into public.carts (user_id, items) values (u, items)
  on conflict (user_id) do update set items = excluded.items, updated_at = now();
  return items;
end $$;

-- ================================================================ wholesale quotations
create or replace function public.request_quotation(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  u uuid := private.require_user();
  zone text := coalesce(p ->> 'zone', 'nanded');
  method text := p ->> 'method';
  q jsonb; addr jsonb; cname text; cphone text; r public.quotations;
  bulk_g int := private.num('bulk_threshold_g', 20000);
begin
  perform private.hit_rate_limit('quote:' || u, 5, 3600);
  if zone not in ('nanded', 'outside') then perform private.fail('bad_zone'); end if;
  if (zone = 'nanded' and coalesce(method, '') not in ('delivery', 'pickup')) or (zone = 'outside' and coalesce(method, '') not in ('courier', 'transport')) then
    perform private.fail('bad_method');
  end if;
  if method = 'pickup' then
    cname := trim(p -> 'contact' ->> 'name'); cphone := trim(p -> 'contact' ->> 'phone');
  else
    addr := private.address_from(p, u); cname := addr ->> 'name'; cphone := addr ->> 'phone';
  end if;
  if length(coalesce(cname, '')) not between 2 and 80 or not private.valid_phone(coalesce(cphone, '')) then
    perform private.fail('bad_contact');
  end if;
  q := private.quote(p -> 'items', zone, method, null, false);
  if jsonb_array_length(q -> 'lines') = 0 then perform private.fail('empty_cart'); end if;
  if jsonb_array_length(q -> 'errors') > 0 then
    perform private.fail(q -> 'errors' -> 0 ->> 'code', q -> 'errors' -> 0 ->> 'variant_id');
  end if;
  if (q ->> 'total_weight_g')::int < bulk_g then perform private.fail('below_bulk_weight'); end if;

  insert into public.quotations (number, user_id, zone, method, customer_name, phone, address, notes, requested_items, total_weight_g, is_test)
  values ('Q' || to_char(now() at time zone 'Asia/Kolkata', 'YY') || '-' || nextval('public.quotation_number_seq'),
    u, zone, method, cname, cphone, addr, left(nullif(trim(p ->> 'notes'), ''), 1000), q -> 'lines',
    (q ->> 'total_weight_g')::int, private.store_mode() = 'preview')
  returning * into r;
  return jsonb_build_object('id', r.id, 'number', r.number);
end $$;

create or replace function private.expire_quotations() returns void
language sql security definer set search_path = public, private as $$
  update public.quotations set status = 'expired'
  where status = 'quoted' and valid_until < (now() at time zone 'Asia/Kolkata')::date
$$;

create or replace function public.my_quotations(p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user();
begin
  perform private.expire_quotations();
  return coalesce((select jsonb_agg(to_jsonb(q) - 'user_id' - 'admin_note' order by q.created_at desc)
                   from public.quotations q where q.user_id = u), '[]');
end $$;

create or replace function public.accept_quotation(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  u uuid := private.require_user();
  q public.quotations; o public.orders; line jsonb; left_stock int;
  pay text := p ->> 'payment_method';
  subtotal numeric(12, 2);
begin
  if coalesce((p ->> 'accept_terms')::boolean, false) is not true then perform private.fail('terms_not_accepted'); end if;
  perform private.expire_quotations();
  select * into q from public.quotations where id = (p ->> 'id')::uuid and user_id = u for update;
  if not found then perform private.fail('quotation_not_found'); end if;
  if q.status <> 'quoted' then perform private.fail('quotation_not_open'); end if;
  if (q.zone = 'nanded' and coalesce(pay, '') not in ('cash', 'upi_on_delivery')) or (q.zone = 'outside' and coalesce(pay, '') <> 'upi_prepaid') then
    perform private.fail('bad_payment_method');
  end if;
  select coalesce(sum((x ->> 'line_total')::numeric), 0) into subtotal from jsonb_array_elements(q.quoted_items) x;

  insert into public.orders (number, user_id, zone, method, payment_method, subtotal, delivery_fee, total, total_weight_g,
    customer_name, phone, email, address, notes, is_test, quotation_id)
  values ('GS' || to_char(now() at time zone 'Asia/Kolkata', 'YY') || '-' || nextval('public.order_number_seq'),
    u, q.zone, q.method, pay, subtotal, coalesce(q.shipping, 0), subtotal + coalesce(q.shipping, 0), q.total_weight_g,
    q.customer_name, q.phone, private.email(), q.address, q.notes, q.is_test, q.id)
  returning * into o;

  for line in select x from jsonb_array_elements(q.quoted_items) x loop
    insert into public.order_items (order_id, product_id, variant_id, name_en, name_hi, variant_en, variant_hi, is_loose, quantity, unit_price, line_total, weight_g)
    values (o.id, line ->> 'product_id', line ->> 'variant_id', line ->> 'name_en', line ->> 'name_hi', line ->> 'variant_en', line ->> 'variant_hi',
      (line ->> 'is_loose')::boolean, (line ->> 'quantity')::int, (line ->> 'unit_price')::numeric, (line ->> 'line_total')::numeric, (line ->> 'weight_g')::int);
    update public.variants set stock = stock - (line ->> 'quantity')::int
    where id = line ->> 'variant_id' and stock >= (line ->> 'quantity')::int returning stock into left_stock;
    if not found then perform private.fail('not_enough_stock', line ->> 'variant_id'); end if;
    insert into public.stock_movements (variant_id, delta, stock_after, reason, order_id, actor)
    values (line ->> 'variant_id', -(line ->> 'quantity')::int, left_stock, 'sale', o.id, 'order ' || o.number);
  end loop;
  insert into public.order_events (order_id, status, note, actor) values (o.id, 'Order Placed', 'From quotation ' || q.number, 'customer');
  update public.quotations set status = 'accepted', order_id = o.id where id = q.id;
  return jsonb_build_object('id', o.id, 'number', o.number, 'total', o.total, 'payment_method', o.payment_method);
end $$;

create or replace function public.decline_quotation(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user();
begin
  update public.quotations set status = 'declined'
  where id = (p ->> 'id')::uuid and user_id = u and status in ('requested', 'quoted');
  if not found then perform private.fail('quotation_not_open'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- ================================================================ enquiries
create or replace function public.submit_enquiry(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  kind text := coalesce(p ->> 'kind', 'contact');
  ph text := nullif(trim(p ->> 'phone'), '');
  em text := lower(nullif(trim(p ->> 'email'), ''));
  qty int;
  r public.enquiries;
begin
  if private.txt('turnstile_required', 'false') = 'true' and private.jwt_role() <> 'service_role' then
    perform private.fail('verification_required');
  end if;
  perform private.hit_rate_limit('enq-ip:' || coalesce(nullif(p ->> 'client_ip', ''), private.client_ip()), 6, 600);
  if ph is not null then perform private.hit_rate_limit('enq-ph:' || ph, 6, 3600); end if;
  if kind not in ('contact', 'product', 'custom_quantity', 'wholesale') then perform private.fail('bad_kind'); end if;
  if length(coalesce(trim(p ->> 'name'), '')) not between 2 and 80 then perform private.fail('bad_name'); end if;
  if ph is null and em is null then perform private.fail('phone_or_email_required'); end if;
  if ph is not null and not private.valid_phone(ph) then perform private.fail('bad_phone'); end if;
  if em is not null and em !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform private.fail('bad_email'); end if;
  if jsonb_typeof(p -> 'quantity_g') = 'number' then qty := (p ->> 'quantity_g')::int; end if;
  if kind = 'custom_quantity' then
    if qty is null or qty < private.num('custom_min_g', 500) or qty > 10000000 then perform private.fail('custom_below_minimum'); end if;
    if not exists (select 1 from public.products where id = p ->> 'product_id') then perform private.fail('product_not_found'); end if;
  end if;
  insert into public.enquiries (kind, name, phone, email, message, product_id, quantity_g, user_id)
  values (kind, trim(p ->> 'name'), ph, em, left(nullif(trim(p ->> 'message'), ''), 2000),
    (select id from public.products where id = p ->> 'product_id'), qty, auth.uid())
  returning * into r;
  return jsonb_build_object('id', r.id);
end $$;

create or replace function public.my_enquiries(p jsonb default '{}') returns jsonb
language sql stable security definer set search_path = public, private as $$
  select coalesce(jsonb_agg(to_jsonb(e) - 'admin_note' - 'user_id' order by e.created_at desc), '[]')
  from public.enquiries e where e.user_id = private.require_user()
$$;

-- ================================================================ reviews
create or replace function public.submit_review(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  u uuid := private.require_user();
  rating int;
  author text;
  verified boolean;
  r public.reviews;
begin
  perform private.hit_rate_limit('review:' || u, 10, 3600);
  if jsonb_typeof(p -> 'rating') <> 'number' then perform private.fail('bad_rating'); end if;
  rating := (p ->> 'rating')::int;
  if rating not between 1 and 5 then perform private.fail('bad_rating'); end if;
  if not exists (select 1 from public.products where id = p ->> 'product_id' and not is_hidden) then perform private.fail('product_not_found'); end if;
  select coalesce(nullif(split_part(full_name, ' ', 1) || coalesce(' ' || left(nullif(split_part(full_name, ' ', 2), ''), 1) || '.', ''), ''), 'Customer')
    into author from public.profiles where id = u;
  verified := exists (select 1 from public.orders o join public.order_items i on i.order_id = o.id
                      where o.user_id = u and o.status = 'Delivered' and i.product_id = p ->> 'product_id');
  insert into public.reviews (product_id, user_id, author_name, rating, body, verified_purchase)
  values (p ->> 'product_id', u, coalesce(author, 'Customer'), rating, left(nullif(trim(p ->> 'body'), ''), 1500), verified)
  on conflict (product_id, user_id) do update set rating = excluded.rating, body = excluded.body,
    status = 'pending', verified_purchase = excluded.verified_purchase, created_at = now()
  returning * into r;
  return jsonb_build_object('id', r.id, 'status', r.status);
end $$;

create or replace function public.product_reviews(p jsonb) returns jsonb
language sql stable security definer set search_path = public, private as $$
  select jsonb_build_object(
    'count', count(*), 'average', round(avg(rating)::numeric, 1),
    'items', coalesce(jsonb_agg(jsonb_build_object('id', id, 'author', author_name, 'rating', rating, 'body', body,
      'verified', verified_purchase, 'at', created_at) order by created_at desc), '[]'))
  from public.reviews where product_id = p ->> 'product_id' and status = 'approved'
$$;

create or replace function public.my_reviews(p jsonb default '{}') returns jsonb
language sql stable security definer set search_path = public, private as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'product_id', r.product_id, 'name_en', pr.name_en, 'name_hi', pr.name_hi,
    'rating', r.rating, 'body', r.body, 'status', r.status, 'at', r.created_at) order by r.created_at desc), '[]')
  from public.reviews r join public.products pr on pr.id = r.product_id where r.user_id = private.require_user()
$$;

-- ================================================================ admin: orders
create or replace function public.admin_orders(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare res jsonb; total int;
begin
  perform private.require_admin();
  select coalesce(max(x.cnt), 0)::int, coalesce(jsonb_agg(private.order_json(x.o, false) order by (x.o).created_at desc), '[]')
    into total, res
  from (
    select o, count(*) over () as cnt from public.orders o
    where (nullif(p ->> 'status', '') is null or o.status = p ->> 'status'
           or (p ->> 'status' = 'open' and o.status not in ('Delivered', 'Cancelled')))
      and (nullif(p ->> 'payment_status', '') is null or o.payment_status = p ->> 'payment_status')
      and (nullif(p ->> 'q', '') is null or o.number ilike '%' || (p ->> 'q') || '%' or o.customer_name ilike '%' || (p ->> 'q') || '%' or o.phone like '%' || (p ->> 'q') || '%')
      and (nullif(p ->> 'from', '') is null or (o.created_at at time zone 'Asia/Kolkata')::date >= (p ->> 'from')::date)
      and (nullif(p ->> 'to', '') is null or (o.created_at at time zone 'Asia/Kolkata')::date <= (p ->> 'to')::date)
      and (not coalesce((p ->> 'cancel_requests')::boolean, false) or (o.cancel_requested_at is not null and o.cancel_decision is null))
    order by o.created_at desc
    limit least(coalesce((p ->> 'limit')::int, 50), 500) offset coalesce((p ->> 'offset')::int, 0)) x;
  return jsonb_build_object('items', res, 'total', total);
end $$;

create or replace function public.admin_order(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare o public.orders;
begin
  perform private.require_admin();
  select * into o from public.orders where id::text = p ->> 'id' or number = p ->> 'id';
  if not found then perform private.fail('order_not_found'); end if;
  return private.order_json(o, true) || jsonb_build_object('user_id', o.user_id,
    'customer', (select to_jsonb(pf) from public.profiles pf where pf.id = o.user_id),
    'customer_orders', (select count(*) from public.orders x where x.user_id = o.user_id));
end $$;

create or replace function public.admin_set_order_status(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  o public.orders;
  flow text[] := array['Order Placed', 'Order Confirmed', 'Processing', 'Dispatched', 'Out for Delivery', 'Delivered'];
  nxt text := p ->> 'status';
begin
  perform private.require_admin();
  select * into o from public.orders where id = (p ->> 'order_id')::uuid for update;
  if not found then perform private.fail('order_not_found'); end if;
  if nxt is null or not (nxt = any (flow)) then perform private.fail('bad_status'); end if;
  if o.status in ('Delivered', 'Cancelled') then perform private.fail('order_closed'); end if;
  if array_position(flow, nxt) <= array_position(flow, o.status) then perform private.fail('status_must_move_forward'); end if;
  if o.payment_method = 'upi_prepaid' and o.payment_status <> 'paid' and array_position(flow, nxt) >= 3 then
    perform private.fail('payment_not_verified');
  end if;
  update public.orders set status = nxt where id = o.id;
  insert into public.order_events (order_id, status, note, actor) values (o.id, nxt, left(nullif(p ->> 'note', ''), 300), private.email());
  return jsonb_build_object('ok', true, 'status', nxt);
end $$;

create or replace function public.admin_record_payment(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare o public.orders; ref text := nullif(trim(p ->> 'upi_ref'), '');
begin
  perform private.require_admin();
  if ref is not null and ref !~ '^[A-Za-z0-9]{6,35}$' then perform private.fail('bad_upi_ref'); end if;
  select * into o from public.orders where id = (p ->> 'order_id')::uuid for update;
  if not found then perform private.fail('order_not_found'); end if;
  if o.status = 'Cancelled' then perform private.fail('order_closed'); end if;
  update public.orders set payment_status = 'paid', paid_at = now(), paid_marked_by = private.email(),
    upi_ref = coalesce(ref, upi_ref) where id = o.id;
  insert into public.order_events (order_id, status, note, actor)
  values (o.id, o.status, 'Payment recorded' || coalesce(' (UPI ref ' || coalesce(ref, o.upi_ref) || ')', ''), private.email());
  return jsonb_build_object('ok', true);
end $$;

create or replace function private.restock_order(o public.orders, why text) returns void
language plpgsql security definer set search_path = public, private as $$
declare i public.order_items; left_stock int;
begin
  for i in select * from public.order_items where order_id = o.id loop
    update public.variants set stock = stock + i.quantity where id = i.variant_id returning stock into left_stock;
    if found then
      insert into public.stock_movements (variant_id, delta, stock_after, reason, order_id, actor, note)
      values (i.variant_id, i.quantity, left_stock, 'cancel_return', o.id, private.email(), why);
    end if;
  end loop;
end $$;

create or replace function public.admin_cancel_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare o public.orders;
begin
  perform private.require_admin();
  select * into o from public.orders where id = (p ->> 'order_id')::uuid for update;
  if not found then perform private.fail('order_not_found'); end if;
  if o.status in ('Delivered', 'Cancelled') then perform private.fail('order_closed'); end if;
  update public.orders set status = 'Cancelled',
    cancel_decision = case when cancel_requested_at is not null and cancel_decision is null then 'approved' else cancel_decision end,
    cancel_decided_at = case when cancel_requested_at is not null and cancel_decision is null then now() else cancel_decided_at end
  where id = o.id;
  perform private.restock_order(o, 'Order cancelled');
  insert into public.order_events (order_id, status, note, actor) values (o.id, 'Cancelled', left(nullif(p ->> 'note', ''), 300), private.email());
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_decide_cancellation(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare o public.orders;
begin
  perform private.require_admin();
  select * into o from public.orders where id = (p ->> 'order_id')::uuid for update;
  if not found then perform private.fail('order_not_found'); end if;
  if o.cancel_requested_at is null or o.cancel_decision is not null then perform private.fail('no_pending_request'); end if;
  if coalesce((p ->> 'approve')::boolean, false) then
    return public.admin_cancel_order(jsonb_build_object('order_id', o.id, 'note', coalesce(p ->> 'note', 'Cancellation approved')));
  end if;
  update public.orders set cancel_decision = 'rejected', cancel_decided_at = now() where id = o.id;
  insert into public.order_events (order_id, status, note, actor) values (o.id, o.status, coalesce(nullif(p ->> 'note', ''), 'Cancellation request rejected'), private.email());
  return jsonb_build_object('ok', true);
end $$;

-- ================================================================ admin: inventory
create or replace function private.stock_change(vid text, delta int, why text, note text) returns int
language plpgsql security definer set search_path = public, private as $$
declare left_stock int;
begin
  update public.variants set stock = stock + delta where id = vid returning stock into left_stock;
  if not found then perform private.fail('variant_not_found', vid); end if;
  if left_stock < 0 then perform private.fail('stock_below_zero', vid); end if;
  insert into public.stock_movements (variant_id, delta, stock_after, reason, note, actor)
  values (vid, delta, left_stock, why, left(note, 300), private.email());
  return left_stock;
end $$;

create or replace function public.admin_stock_move(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare why text := p ->> 'reason'; qty int; delta int;
begin
  perform private.require_admin();
  if why not in ('incoming', 'damaged', 'expired', 'adjust') then perform private.fail('bad_reason'); end if;
  if jsonb_typeof(p -> 'quantity') <> 'number' then perform private.fail('bad_quantity'); end if;
  qty := (p ->> 'quantity')::int;
  if why = 'adjust' then
    delta := qty;
  elsif qty <= 0 then
    perform private.fail('bad_quantity');
  else
    delta := case when why = 'incoming' then qty else -qty end;
  end if;
  return jsonb_build_object('stock', private.stock_change(p ->> 'variant_id', delta, why, p ->> 'note'));
end $$;

create or replace function public.admin_set_stock(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare cur int; target int;
begin
  perform private.require_admin();
  if jsonb_typeof(p -> 'stock') <> 'number' or (p ->> 'stock')::int < 0 then perform private.fail('bad_quantity'); end if;
  target := (p ->> 'stock')::int;
  select stock into cur from public.variants where id = p ->> 'variant_id' for update;
  if not found then perform private.fail('variant_not_found'); end if;
  if target <> cur then
    perform private.stock_change(p ->> 'variant_id', target - cur, 'adjust', coalesce(p ->> 'note', 'Stock count'));
  end if;
  if coalesce((p ->> 'counted')::boolean, true) then
    update public.variants set stock_is_sample = false where id = p ->> 'variant_id';
  end if;
  return jsonb_build_object('stock', target);
end $$;

create or replace function public.admin_inventory(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.require_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'variant_id', v.id, 'product_id', pr.id, 'category_id', pr.category_id, 'name_en', pr.name_en, 'name_hi', pr.name_hi,
      'label_en', v.label_en, 'is_loose', v.is_loose, 'stock', v.stock, 'stock_is_sample', v.stock_is_sample,
      'limited_level', pr.limited_stock_level, 'min_qty_g', pr.min_qty_g, 'availability', private.availability(v, pr),
      'hidden', v.is_hidden or pr.is_hidden, 'price', v.price, 'price_is_sample', v.price_is_sample)
      order by pr.sort, v.sort)
    from public.variants v join public.products pr on pr.id = v.product_id
    where (nullif(p ->> 'category_id', '') is null or pr.category_id = p ->> 'category_id')
      and (nullif(p ->> 'q', '') is null or pr.name_en ilike '%' || (p ->> 'q') || '%' or pr.name_hi like '%' || (p ->> 'q') || '%' or v.id ilike '%' || (p ->> 'q') || '%')
      and (nullif(p ->> 'filter', '') is null
           or (p ->> 'filter' = 'low' and private.availability(v, pr) <> 'available')
           or (p ->> 'filter' = 'out' and private.availability(v, pr) = 'out')
           or (p ->> 'filter' = 'sample' and v.stock_is_sample))
  ), '[]');
end $$;

create or replace function public.admin_stock_history(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.require_admin();
  return coalesce((select jsonb_agg(to_jsonb(m) order by m.id desc)
    from (select * from public.stock_movements where variant_id = p ->> 'variant_id' order by id desc limit 200) m), '[]');
end $$;

-- ================================================================ admin: quotations
create or replace function public.admin_quotations(p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = public, private as $$
begin
  perform private.require_admin();
  perform private.expire_quotations();
  return coalesce((select jsonb_agg(to_jsonb(q) || jsonb_build_object('email', (select email from public.profiles where id = q.user_id)) order by q.created_at desc)
    from public.quotations q where nullif(p ->> 'status', '') is null or q.status = p ->> 'status'), '[]');
end $$;

-- items: [{variant_id, quantity, unit_price}] -> admin sets the quoted unit prices (per kg for loose items).
create or replace function public.admin_quote(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  q public.quotations; it jsonb; v public.variants; pr public.products;
  quoted jsonb := '[]'; subtotal numeric(12, 2) := 0; lt numeric(12, 2); qty int; up numeric(10, 2); w bigint := 0;
  ship numeric(10, 2);
begin
  perform private.require_admin();
  select * into q from public.quotations where id = (p ->> 'id')::uuid for update;
  if not found then perform private.fail('quotation_not_found'); end if;
  if q.status not in ('requested', 'quoted', 'expired') then perform private.fail('quotation_not_open'); end if;
  if jsonb_typeof(p -> 'items') <> 'array' or jsonb_array_length(p -> 'items') = 0 then perform private.fail('bad_items'); end if;
  if jsonb_typeof(p -> 'shipping') <> 'number' or (p ->> 'shipping')::numeric < 0 then perform private.fail('bad_shipping'); end if;
  ship := (p ->> 'shipping')::numeric;
  if nullif(p ->> 'valid_until', '') is null or (p ->> 'valid_until')::date < (now() at time zone 'Asia/Kolkata')::date then
    perform private.fail('bad_valid_until');
  end if;
  for it in select x from jsonb_array_elements(p -> 'items') x loop
    select * into v from public.variants where id = it ->> 'variant_id';
    if not found then perform private.fail('variant_not_found', it ->> 'variant_id'); end if;
    select * into pr from public.products where id = v.product_id;
    if jsonb_typeof(it -> 'quantity') <> 'number' or (it ->> 'quantity')::int <= 0 then perform private.fail('bad_quantity', v.id); end if;
    if jsonb_typeof(it -> 'unit_price') <> 'number' or (it ->> 'unit_price')::numeric < 0 then perform private.fail('bad_price', v.id); end if;
    qty := (it ->> 'quantity')::int; up := (it ->> 'unit_price')::numeric;
    lt := case when v.is_loose then round(up * qty / 1000.0, 2) else up * qty end;
    subtotal := subtotal + lt;
    w := w + case when v.is_loose then qty else v.unit_weight_g::bigint * qty end;
    quoted := quoted || jsonb_build_object('variant_id', v.id, 'product_id', pr.id, 'name_en', pr.name_en, 'name_hi', pr.name_hi,
      'variant_en', v.label_en, 'variant_hi', v.label_hi, 'is_loose', v.is_loose, 'quantity', qty, 'unit_price', up,
      'line_total', lt, 'weight_g', case when v.is_loose then qty else v.unit_weight_g * qty end);
  end loop;
  update public.quotations set status = 'quoted', quoted_items = quoted, shipping = ship, total = subtotal + ship,
    valid_until = (p ->> 'valid_until')::date, admin_note = left(nullif(p ->> 'note', ''), 1000), total_weight_g = w
  where id = q.id;
  return jsonb_build_object('ok', true, 'total', subtotal + ship, 'number', q.number);
end $$;

-- ================================================================ admin: dashboard, customers, reports
create or replace function public.admin_dashboard(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare
  today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  perform private.require_admin();
  return jsonb_build_object(
    'sales_today', (select coalesce(sum(total), 0) from public.orders where not is_test and status <> 'Cancelled' and (created_at at time zone 'Asia/Kolkata')::date = today),
    'sales_week', (select coalesce(sum(total), 0) from public.orders where not is_test and status <> 'Cancelled' and (created_at at time zone 'Asia/Kolkata')::date > today - 7),
    'sales_month', (select coalesce(sum(total), 0) from public.orders where not is_test and status <> 'Cancelled' and date_trunc('month', created_at at time zone 'Asia/Kolkata') = date_trunc('month', today::timestamp)),
    'orders_today', (select count(*) from public.orders where not is_test and (created_at at time zone 'Asia/Kolkata')::date = today),
    'pending_orders', (select count(*) from public.orders where status not in ('Delivered', 'Cancelled')),
    'completed_orders', (select count(*) from public.orders where status = 'Delivered' and not is_test),
    'test_orders', (select count(*) from public.orders where is_test),
    'new_orders', (select count(*) from public.orders where status = 'Order Placed'),
    'payments_to_verify', (select count(*) from public.orders where payment_status = 'pending_verification'),
    'cancel_requests', (select count(*) from public.orders where cancel_requested_at is not null and cancel_decision is null),
    'new_enquiries', (select count(*) from public.enquiries where status = 'pending'),
    'quotation_requests', (select count(*) from public.quotations where status = 'requested'),
    'pending_reviews', (select count(*) from public.reviews where status = 'pending'),
    'sample_prices', (select count(*) from public.variants v join public.products pr on pr.id = v.product_id where v.price_is_sample and not v.is_hidden and not pr.is_hidden),
    'placeholder_photos', (select count(*) from public.products where image_is_placeholder and not is_hidden),
    'store_mode', private.store_mode(),
    'low_stock', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('variant_id', v.id, 'name_en', pr.name_en, 'label_en', v.label_en, 'availability', private.availability(v, pr), 'stock', v.stock, 'is_loose', v.is_loose) x
        from public.variants v join public.products pr on pr.id = v.product_id
        where not v.is_hidden and not pr.is_hidden and private.availability(v, pr) <> 'available'
        order by v.stock limit 12) s), '[]'),
    'recent_orders', coalesce((select jsonb_agg(private.order_json(o, false) order by o.created_at desc) from (select * from public.orders order by created_at desc limit 6) o), '[]'),
    'activity', coalesce((select jsonb_agg(to_jsonb(a) order by a.id desc) from (select * from public.activity_log order by id desc limit 12) a), '[]'),
    'series', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'total', coalesce(t, 0)) order by d) from (
        select g::date d, (select sum(total) from public.orders o where not o.is_test and o.status <> 'Cancelled' and (o.created_at at time zone 'Asia/Kolkata')::date = g::date) t
        from generate_series(today - 13, today, interval '1 day') g) s), '[]'));
end $$;

create or replace function public.admin_customers(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.require_admin();
  return coalesce((select jsonb_agg(x order by x ->> 'created_at' desc) from (
    select to_jsonb(pf) || jsonb_build_object(
      'orders', (select count(*) from public.orders o where o.user_id = pf.id and o.status <> 'Cancelled'),
      'spent', (select coalesce(sum(total), 0) from public.orders o where o.user_id = pf.id and o.status <> 'Cancelled' and not o.is_test),
      'last_order_at', (select max(created_at) from public.orders o where o.user_id = pf.id)) x
    from public.profiles pf
    where (nullif(p ->> 'q', '') is null or pf.full_name ilike '%' || (p ->> 'q') || '%' or pf.email ilike '%' || (p ->> 'q') || '%' or pf.phone like '%' || (p ->> 'q') || '%')
      and (not coalesce((p ->> 'opted_in')::boolean, false) or pf.whatsapp_opt_in)
  ) s), '[]');
end $$;

create or replace function public.admin_customer(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.require_admin();
  return (select to_jsonb(pf) || jsonb_build_object(
    'addresses', coalesce((select jsonb_agg(to_jsonb(a)) from public.addresses a where a.user_id = pf.id), '[]'),
    'orders', coalesce((select jsonb_agg(private.order_json(o, false) order by o.created_at desc) from public.orders o where o.user_id = pf.id), '[]'))
    from public.profiles pf where pf.id = (p ->> 'id')::uuid);
end $$;

create or replace function public.admin_report(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare d_from date := coalesce(nullif(p ->> 'from', '')::date, (now() at time zone 'Asia/Kolkata')::date - 29);
        d_to date := coalesce(nullif(p ->> 'to', '')::date, (now() at time zone 'Asia/Kolkata')::date);
begin
  perform private.require_admin();
  return (with o as (
      select * from public.orders
      where not is_test and status <> 'Cancelled'
        and (created_at at time zone 'Asia/Kolkata')::date between d_from and d_to)
    select jsonb_build_object(
      'from', d_from, 'to', d_to,
      'orders', (select count(*) from o),
      'revenue', (select coalesce(sum(total), 0) from o),
      'delivery_fees', (select coalesce(sum(delivery_fee), 0) from o),
      'average_order', (select coalesce(round(avg(total), 2), 0) from o),
      'customers', (select count(distinct user_id) from o),
      'new_customers', (select count(*) from public.profiles where (created_at at time zone 'Asia/Kolkata')::date between d_from and d_to),
      'cancelled', (select count(*) from public.orders where not is_test and status = 'Cancelled' and (created_at at time zone 'Asia/Kolkata')::date between d_from and d_to),
      'retail', (select jsonb_build_object('orders', count(*), 'revenue', coalesce(sum(total), 0)) from o where quotation_id is null),
      'wholesale', (select jsonb_build_object('orders', count(*), 'revenue', coalesce(sum(total), 0)) from o where quotation_id is not null),
      'by_zone', (select coalesce(jsonb_object_agg(zone, n), '{}') from (select zone, count(*) n from o group by zone) z),
      'by_payment', (select coalesce(jsonb_object_agg(payment_method, n), '{}') from (select payment_method, count(*) n from o group by payment_method) z),
      'by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'orders', n, 'revenue', r) order by d), '[]') from (
          select g::date d, count(o.id) n, coalesce(sum(o.total), 0) r
          from generate_series(d_from, d_to, interval '1 day') g
          left join o on (o.created_at at time zone 'Asia/Kolkata')::date = g::date group by 1) s),
      'top_products', (select coalesce(jsonb_agg(t order by (t ->> 'revenue')::numeric desc), '[]') from (
          select jsonb_build_object('product_id', i.product_id, 'name_en', min(i.name_en), 'revenue', sum(i.line_total), 'weight_g', sum(i.weight_g), 'lines', count(*)) t
          from public.order_items i join o on o.id = i.order_id group by i.product_id order by sum(i.line_total) desc limit 15) s),
      'inventory', (select jsonb_build_object(
          'variants', count(*), 'out', count(*) filter (where private.availability(v, pr) = 'out'),
          'limited', count(*) filter (where private.availability(v, pr) = 'limited'))
          from public.variants v join public.products pr on pr.id = v.product_id where not v.is_hidden and not pr.is_hidden)));
end $$;

-- ================================================================ admin: store mode and import
create or replace function public.admin_go_live_check(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.require_admin();
  return coalesce((select jsonb_agg(jsonb_build_object('product_id', pr.id, 'name_en', pr.name_en, 'variants', n) order by pr.sort)
    from (select product_id, count(*) n from public.variants where price_is_sample and not is_hidden group by product_id) s
    join public.products pr on pr.id = s.product_id
    join public.categories c on c.id = pr.category_id
    where not pr.is_hidden and not c.is_hidden), '[]');
end $$;

create or replace function public.admin_set_store_mode(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare mode text := p ->> 'mode';
begin
  perform private.require_admin();
  if mode not in ('preview', 'live') then perform private.fail('bad_mode'); end if;
  if mode = 'live' and jsonb_array_length(public.admin_go_live_check('{}')) > 0 then
    perform private.fail('sample_prices_remain');
  end if;
  insert into public.settings (key, value) values ('store_mode', to_jsonb(mode))
  on conflict (key) do update set value = excluded.value;
  return jsonb_build_object('store_mode', mode);
end $$;

-- rows: the admin Excel format (one row per variant). Returns a summary; never touches orders.
create or replace function public.admin_import_catalogue(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  r jsonb; n int := 0;
  created_p int := 0; updated_p int := 0; created_v int := 0; updated_v int := 0; stock_changes int := 0;
  errors jsonb := '[]'; pid text; vid text; st text; cur_stock int; new_stock int; dry boolean := coalesce((p ->> 'dry_run')::boolean, false);
  yes text[] := array['yes', 'y', 'true', '1', 'हाँ'];
begin
  perform private.require_admin();
  if jsonb_typeof(p -> 'rows') <> 'array' then perform private.fail('bad_rows'); end if;
  for r in select x from jsonb_array_elements(p -> 'rows') x loop
    n := n + 1;
    begin
      pid := lower(trim(r ->> 'product_id')); vid := lower(trim(r ->> 'variant_id'));
      st := coalesce(nullif(lower(trim(r ->> 'sell_type')), ''), 'packed');
      if pid !~ '^[a-z0-9-]{2,80}$' or vid !~ '^[a-z0-9-]{2,120}$' then perform private.fail('bad_id'); end if;
      if not exists (select 1 from public.products where id = pid) then
        insert into public.products (id, category_id, name_en, name_hi, sell_type, min_qty_g, step_g, synonyms, description_en, description_hi)
        values (pid, r ->> 'category_id', r ->> 'name_en', coalesce(nullif(r ->> 'name_hi', ''), r ->> 'name_en'), st,
                case when st = 'loose' then 250 end, case when st = 'loose' then 250 end,
                coalesce(string_to_array(nullif(trim(r ->> 'synonyms'), ''), ' '), '{}'), r ->> 'description_en', r ->> 'description_hi');
        created_p := created_p + 1;
      else
        update public.products set
          category_id = coalesce(nullif(r ->> 'category_id', ''), category_id),
          name_en = coalesce(nullif(trim(r ->> 'name_en'), ''), name_en),
          name_hi = coalesce(nullif(trim(r ->> 'name_hi'), ''), name_hi),
          synonyms = coalesce(string_to_array(nullif(trim(r ->> 'synonyms'), ''), ' '), synonyms),
          description_en = coalesce(nullif(r ->> 'description_en', ''), description_en),
          description_hi = coalesce(nullif(r ->> 'description_hi', ''), description_hi)
        where id = pid
          and (name_en, name_hi, category_id, synonyms, coalesce(description_en, ''), coalesce(description_hi, '')) is distinct from
              (coalesce(nullif(trim(r ->> 'name_en'), ''), name_en), coalesce(nullif(trim(r ->> 'name_hi'), ''), name_hi),
               coalesce(nullif(r ->> 'category_id', ''), category_id), coalesce(string_to_array(nullif(trim(r ->> 'synonyms'), ''), ' '), synonyms),
               coalesce(nullif(r ->> 'description_en', ''), description_en, ''), coalesce(nullif(r ->> 'description_hi', ''), description_hi, ''));
        if found then updated_p := updated_p + 1; end if;
      end if;

      if not exists (select 1 from public.variants where id = vid) then
        insert into public.variants (id, product_id, label_en, label_hi, is_loose, unit_weight_g, price, sale_price, price_is_sample, is_hidden)
        values (vid, pid, r ->> 'variant_en', coalesce(nullif(r ->> 'variant_hi', ''), r ->> 'variant_en'), st = 'loose',
                coalesce(nullif(r ->> 'unit_weight_g', '')::int, 1000), (r ->> 'price')::numeric, nullif(r ->> 'sale_price', '')::numeric,
                lower(coalesce(r ->> 'price_is_sample', 'no')) = any (yes), lower(coalesce(r ->> 'hidden', 'no')) = any (yes));
        created_v := created_v + 1;
      else
        update public.variants set
          label_en = coalesce(nullif(trim(r ->> 'variant_en'), ''), label_en),
          label_hi = coalesce(nullif(trim(r ->> 'variant_hi'), ''), label_hi),
          unit_weight_g = coalesce(nullif(r ->> 'unit_weight_g', '')::int, unit_weight_g),
          price = coalesce(nullif(r ->> 'price', '')::numeric, price),
          sale_price = nullif(r ->> 'sale_price', '')::numeric,
          price_is_sample = coalesce(lower(nullif(r ->> 'price_is_sample', '')) = any (yes), price_is_sample),
          is_hidden = coalesce(lower(nullif(r ->> 'hidden', '')) = any (yes), is_hidden)
        where id = vid and product_id = pid;
        if not found then perform private.fail('variant_belongs_to_other_product'); end if;
        updated_v := updated_v + 1;
      end if;

      if nullif(r ->> 'stock', '') is not null then
        new_stock := (r ->> 'stock')::numeric::int;
        select stock into cur_stock from public.variants where id = vid;
        if new_stock < 0 then perform private.fail('bad_stock'); end if;
        if new_stock <> cur_stock then
          perform private.stock_change(vid, new_stock - cur_stock, 'import', 'Excel import');
          stock_changes := stock_changes + 1;
        end if;
        update public.variants set stock_is_sample = coalesce(lower(nullif(r ->> 'stock_is_sample', '')) = any (yes), stock_is_sample) where id = vid;
      end if;
    exception when others then
      errors := errors || jsonb_build_object('row', n + 1, 'variant_id', vid, 'error', sqlerrm);
    end;
  end loop;
  if dry then
    raise exception using message = 'dry_run', detail = jsonb_build_object('created_products', created_p, 'updated_products', updated_p,
      'created_variants', created_v, 'updated_variants', updated_v, 'stock_changes', stock_changes, 'errors', errors)::text;
  end if;
  perform private.log('import', 'catalogue', null, jsonb_build_object('rows', n, 'errors', jsonb_array_length(errors)));
  return jsonb_build_object('rows', n, 'created_products', created_p, 'updated_products', updated_p,
    'created_variants', created_v, 'updated_variants', updated_v, 'stock_changes', stock_changes, 'errors', errors);
end $$;

create or replace function public.admin_mark_published(p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = public, private as $$
begin
  perform private.require_admin();
  insert into public.settings (key, value, is_public) values ('last_publish', jsonb_build_object('at', now(), 'by', private.email()), false)
  on conflict (key) do update set value = excluded.value;
  return jsonb_build_object('ok', true);
end $$;
