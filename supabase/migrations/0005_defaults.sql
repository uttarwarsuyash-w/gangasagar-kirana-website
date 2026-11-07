-- Gangasagar Kirana Stores: default settings, admins and examples.
-- Business facts here come only from the verified brief (section 2). Everything is editable in Admin > Settings.

insert into public.admins (email, name) values
  ('uttarwarsuyash@gmail.com', 'Suyash'),
  ('lguttarwar1974.11@gmail.com', 'Laxmikant ji')
on conflict (email) do nothing;

insert into public.settings (key, value, is_public) values
  ('store_mode', '"preview"', true),
  ('business', '{"name_en":"Gangasagar Kirana Stores","name_hi":"गंगासागर किराणा स्टोअर्स","tagline_en":"Built on Trust, Serving Every Need.","tagline_hi":"विश्वास की नींव, हर ज़रूरत की सेवा।","established":2005}', true),
  ('address', '{"line_en":"Gokul Nagar, Nanded, Maharashtra 431602, India","line_hi":"गोकुल नगर, नांदेड़, महाराष्ट्र 431602, भारत","pincode":"431602","maps_url":"https://maps.app.goo.gl/mzZXA5a35tAJ3oyj6","maps_embed_query":"Gangasagar Kirana Stores, Gokul Nagar, Nanded 431602"}', true),
  ('hours', '{"open":"08:00","close":"20:00","days_en":"Every day","days_hi":"हर दिन","weekly_off":null}', true),
  ('phones', '{"main":"9403951524","main_name_en":"Laxmikant ji","main_name_hi":"लक्ष्मीकांत जी","support":"9372188080","owner":"9272103080","owner_name_en":"Gangadhar ji","owner_name_hi":"गंगाधर जी"}', true),
  ('emails', '["uttarwarsuyash@gmail.com","lguttarwar1974.11@gmail.com"]', true),
  ('social', '{"instagram":"https://www.instagram.com/gangasagar_kirana_stores"}', true),
  ('google_reviews', '{"read_url":"https://maps.app.goo.gl/mzZXA5a35tAJ3oyj6","write_url":"https://maps.app.goo.gl/mzZXA5a35tAJ3oyj6"}', true),
  ('upi', '{"id":"","payee":"Gangasagar Kirana Stores","qr_url":""}', true),
  ('delivery_pincodes', '["431602"]', true),
  ('free_delivery_min_value', '499', true),
  ('heavy_weight_g', '2000', true),
  ('fee_heavy', '49', true),
  ('fee_light', '89', true),
  ('outside_flat_fee', '179', true),
  ('bulk_threshold_g', '20000', true),
  ('loose_min_g', '250', true),
  ('loose_step_g', '250', true),
  ('custom_min_g', '500', true),
  ('invoice', '{"name":"Gangasagar Kirana Stores","fssai":null,"footer_en":"Thank you for shopping with us.","footer_hi":"हमसे ख़रीदारी के लिए धन्यवाद।"}', true),
  ('sections', '{"offers":true,"reviews":true,"instagram":true,"journey":true,"leadership":true,"gallery":true,"blog":true}', true),
  ('turnstile_required', 'false', false)
on conflict (key) do nothing;

-- One unpublished example of each content type, so the owners can see how they work.
insert into public.offers (kind, title_en, title_hi, body_en, body_hi, is_published)
values ('festival', 'Example: festival combo (not published)', 'उदाहरण: त्योहार कॉम्बो (प्रकाशित नहीं)',
  'This is an example offer. Edit the text, add dates and a photo, then publish it. Delete it if you do not need it.',
  'यह एक उदाहरण ऑफ़र है। टेक्स्ट बदलें, तारीख़ें और फ़ोटो जोड़ें, फिर प्रकाशित करें। ज़रूरत न हो तो हटा दें।', false);

insert into public.posts (slug, title_en, title_hi, excerpt_en, excerpt_hi, body_en, body_hi, is_published)
values ('example-post', 'Example: how to write a post (not published)', 'उदाहरण: पोस्ट कैसे लिखें (प्रकाशित नहीं)',
  'A short summary shown on the blog list.', 'ब्लॉग सूची में दिखने वाला छोटा सारांश।',
  E'Write the article here. Use a blank line between paragraphs.\n\n## A heading\n\nStart a line with ## to make a heading.',
  E'लेख यहाँ लिखें। पैराग्राफ़ के बीच एक ख़ाली लाइन छोड़ें।\n\n## एक शीर्षक\n\nशीर्षक के लिए लाइन ## से शुरू करें।', false);

insert into public.faqs (topic, q_en, q_hi, a_en, a_hi, keywords, is_published)
values ('general', 'Example question (not published)', 'उदाहरण प्रश्न (प्रकाशित नहीं)',
  'Write the answer here, then publish. The help pop-up uses published answers.',
  'उत्तर यहाँ लिखें, फिर प्रकाशित करें। हेल्प पॉप-अप प्रकाशित उत्तरों का उपयोग करता है।', '{example}', false);
