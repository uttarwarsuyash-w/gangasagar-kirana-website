-- Gangasagar Kirana Stores: row-level security and grants.
-- Principle: the browser can read public catalogue/content, read and edit its own rows,
-- and call functions. Anything involving money, stock or order status goes through functions.

-- ---------------------------------------------------------------- start from nothing
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on schema private from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

alter table public.settings enable row level security;
alter table public.content enable row level security;
alter table public.admins enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.stock_movements enable row level security;
alter table public.carts enable row level security;
alter table public.wishlist enable row level security;
alter table public.quotations enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.enquiries enable row level security;
alter table public.reviews enable row level security;
alter table public.offers enable row level security;
alter table public.gallery_items enable row level security;
alter table public.posts enable row level security;
alter table public.faqs enable row level security;
alter table public.activity_log enable row level security;

-- ---------------------------------------------------------------- settings / content / admins
create policy settings_public_read on public.settings for select to anon, authenticated using (is_public or public.is_admin());
create policy settings_admin_write on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.settings to anon, authenticated;
grant insert, update, delete on public.settings to authenticated;

create policy content_public_read on public.content for select to anon, authenticated using (true);
create policy content_admin_write on public.content for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.content to anon, authenticated;
grant insert, update, delete on public.content to authenticated;

create policy admins_admin_read on public.admins for select to authenticated using (public.is_admin());
grant select on public.admins to authenticated;

-- ---------------------------------------------------------------- customers
create policy profiles_own_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
grant select on public.profiles to authenticated;
-- profile edits go through update_profile()

create policy addresses_own on public.addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy addresses_admin_read on public.addresses for select to authenticated using (public.is_admin());
grant select, insert, update, delete on public.addresses to authenticated;

create policy carts_own on public.carts for select to authenticated using (user_id = auth.uid());
grant select on public.carts to authenticated;

create policy wishlist_own on public.wishlist for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, delete on public.wishlist to authenticated;

-- ---------------------------------------------------------------- catalogue
create policy categories_read on public.categories for select to anon, authenticated using (not is_hidden or public.is_admin());
create policy categories_admin on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

create policy products_read on public.products for select to anon, authenticated using (not is_hidden or public.is_admin());
create policy products_admin on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

-- Variants: stock counts are never readable from the browser (admins read them via admin_inventory()).
create policy variants_read on public.variants for select to anon, authenticated using (not is_hidden or public.is_admin());
create policy variants_admin on public.variants for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select (id, product_id, label_en, label_hi, is_loose, unit_weight_g, price, sale_price, price_is_sample, is_hidden, sort, updated_at)
  on public.variants to anon, authenticated;
grant insert (id, product_id, label_en, label_hi, is_loose, unit_weight_g, price, sale_price, price_is_sample, is_hidden, sort)
  on public.variants to authenticated;
grant update (label_en, label_hi, is_loose, unit_weight_g, price, sale_price, price_is_sample, is_hidden, sort)
  on public.variants to authenticated;
grant delete on public.variants to authenticated;

create policy stock_movements_admin on public.stock_movements for select to authenticated using (public.is_admin());
grant select on public.stock_movements to authenticated;

-- ---------------------------------------------------------------- orders and quotations (read only; writes via functions)
create policy orders_read on public.orders for select to authenticated using (user_id = auth.uid() or public.is_admin());
grant select on public.orders to authenticated;

create policy order_items_read on public.order_items for select to authenticated
  using (public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
grant select on public.order_items to authenticated;

create policy order_events_read on public.order_events for select to authenticated
  using (public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
grant select on public.order_events to authenticated;

create policy quotations_read on public.quotations for select to authenticated using (user_id = auth.uid() or public.is_admin());
grant select on public.quotations to authenticated;

-- ---------------------------------------------------------------- enquiries and reviews
create policy enquiries_admin on public.enquiries for select to authenticated using (public.is_admin());
create policy enquiries_admin_update on public.enquiries for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy enquiries_admin_delete on public.enquiries for delete to authenticated using (public.is_admin());
grant select, delete on public.enquiries to authenticated;
grant update (status, admin_note, resolved_at) on public.enquiries to authenticated;

create policy reviews_public_read on public.reviews for select to anon, authenticated
  using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy reviews_admin_update on public.reviews for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy reviews_admin_delete on public.reviews for delete to authenticated using (public.is_admin());
grant select (id, product_id, author_name, rating, body, status, verified_purchase, created_at) on public.reviews to anon, authenticated;
grant update (status) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;

-- ---------------------------------------------------------------- content types
create policy offers_read on public.offers for select to anon, authenticated
  using ((is_published and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())) or public.is_admin());
create policy offers_admin on public.offers for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.offers to anon, authenticated;
grant insert, update, delete on public.offers to authenticated;

create policy gallery_read on public.gallery_items for select to anon, authenticated using (is_published or public.is_admin());
create policy gallery_admin on public.gallery_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.gallery_items to anon, authenticated;
grant insert, update, delete on public.gallery_items to authenticated;

create policy posts_read on public.posts for select to anon, authenticated
  using ((is_published and (published_at is null or published_at <= now())) or public.is_admin());
create policy posts_admin on public.posts for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;

create policy faqs_read on public.faqs for select to anon, authenticated using (is_published or public.is_admin());
create policy faqs_admin on public.faqs for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.faqs to anon, authenticated;
grant insert, update, delete on public.faqs to authenticated;

create policy activity_admin on public.activity_log for select to authenticated using (public.is_admin());
grant select on public.activity_log to authenticated;

-- ---------------------------------------------------------------- functions
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.live_catalogue(jsonb) to anon, authenticated;
grant execute on function public.public_settings(jsonb) to anon, authenticated;
grant execute on function public.quote_cart(jsonb) to anon, authenticated;
grant execute on function public.submit_enquiry(jsonb) to anon, authenticated;
grant execute on function public.product_reviews(jsonb) to anon, authenticated;

grant execute on function public.place_order(jsonb) to authenticated;
grant execute on function public.my_orders(jsonb) to authenticated;
grant execute on function public.my_order(jsonb) to authenticated;
grant execute on function public.my_profile(jsonb) to authenticated;
grant execute on function public.update_profile(jsonb) to authenticated;
grant execute on function public.request_cancellation(jsonb) to authenticated;
grant execute on function public.submit_upi_ref(jsonb) to authenticated;
grant execute on function public.reorder_items(jsonb) to authenticated;
grant execute on function public.merge_cart(jsonb) to authenticated;
grant execute on function public.save_cart(jsonb) to authenticated;
grant execute on function public.request_quotation(jsonb) to authenticated;
grant execute on function public.my_quotations(jsonb) to authenticated;
grant execute on function public.accept_quotation(jsonb) to authenticated;
grant execute on function public.decline_quotation(jsonb) to authenticated;
grant execute on function public.my_enquiries(jsonb) to authenticated;
grant execute on function public.submit_review(jsonb) to authenticated;
grant execute on function public.my_reviews(jsonb) to authenticated;

-- admin_* functions check is_admin() themselves; granting execute only lets them run that check.
grant execute on function public.admin_orders(jsonb) to authenticated;
grant execute on function public.admin_order(jsonb) to authenticated;
grant execute on function public.admin_set_order_status(jsonb) to authenticated;
grant execute on function public.admin_record_payment(jsonb) to authenticated;
grant execute on function public.admin_cancel_order(jsonb) to authenticated;
grant execute on function public.admin_decide_cancellation(jsonb) to authenticated;
grant execute on function public.admin_stock_move(jsonb) to authenticated;
grant execute on function public.admin_set_stock(jsonb) to authenticated;
grant execute on function public.admin_inventory(jsonb) to authenticated;
grant execute on function public.admin_stock_history(jsonb) to authenticated;
grant execute on function public.admin_quotations(jsonb) to authenticated;
grant execute on function public.admin_quote(jsonb) to authenticated;
grant execute on function public.admin_dashboard(jsonb) to authenticated;
grant execute on function public.admin_customers(jsonb) to authenticated;
grant execute on function public.admin_customer(jsonb) to authenticated;
grant execute on function public.admin_report(jsonb) to authenticated;
grant execute on function public.admin_go_live_check(jsonb) to authenticated;
grant execute on function public.admin_set_store_mode(jsonb) to authenticated;
grant execute on function public.admin_import_catalogue(jsonb) to authenticated;
grant execute on function public.admin_mark_published(jsonb) to authenticated;

-- service_role (Edge Functions) may call the public form function after verifying Turnstile.
grant usage on schema public to service_role;
grant execute on function public.submit_enquiry(jsonb) to service_role;
