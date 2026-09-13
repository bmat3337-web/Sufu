-- ============================================================================
-- SUFU Seed v1 — reproduces the mock dataset from src/data.ts
--   categories + cities/suburbs + 17 providers + 19 listings + services +
--   portfolio + reviews + a demo conversation + a saved listing.
--
-- Seeded identities are dormant auth rows (no password, unconfirmed email) so
-- the profiles.id FK to auth.users holds without publishing reusable
-- credentials in versioned SQL.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Categories (26)
-- ---------------------------------------------------------------------------
insert into public.categories (name, "group", slug) values
  ('Plumbing', 'services', 'plumbing'),
  ('Electrical', 'services', 'electrical'),
  ('Auto repair', 'services', 'auto-repair'),
  ('Cleaning', 'services', 'cleaning'),
  ('Tutoring', 'services', 'tutoring'),
  ('Photography', 'services', 'photography'),
  ('Graphic design', 'services', 'graphic-design'),
  ('Catering', 'services', 'catering'),
  ('Barber & beauty', 'services', 'barber-beauty'),
  ('Appliance repair', 'services', 'appliance-repair'),
  ('IT & computer repair', 'services', 'it-computer-repair'),
  ('Building & construction', 'services', 'building-construction'),
  ('Phones & tablets', 'marketplace', 'phones-tablets'),
  ('Computers', 'marketplace', 'computers'),
  ('Furniture', 'marketplace', 'furniture'),
  ('Vehicles', 'marketplace', 'vehicles'),
  ('Clothing', 'marketplace', 'clothing'),
  ('Electronics', 'marketplace', 'electronics'),
  ('Appliances', 'marketplace', 'appliances'),
  ('Tools & equipment', 'marketplace', 'tools-equipment'),
  ('Full-time', 'jobs', 'full-time'),
  ('Part-time', 'jobs', 'part-time'),
  ('Casual', 'jobs', 'casual'),
  ('Freelance', 'jobs', 'freelance'),
  ('Contract', 'jobs', 'contract'),
  ('Gig', 'jobs', 'gig');

-- ---------------------------------------------------------------------------
-- 2. Cities + suburbs
-- ---------------------------------------------------------------------------
insert into public.cities (id, name) values
  (md5('sufu:city:harare')::uuid, 'Harare'),
  (md5('sufu:city:bulawayo')::uuid, 'Bulawayo'),
  (md5('sufu:city:mutare')::uuid, 'Mutare'),
  (md5('sufu:city:gweru')::uuid, 'Gweru'),
  (md5('sufu:city:kwekwe')::uuid, 'Kwekwe');

insert into public.suburbs (city_id, name) values
  (md5('sufu:city:harare')::uuid, 'Avondale'),
  (md5('sufu:city:harare')::uuid, 'Borrowdale'),
  (md5('sufu:city:harare')::uuid, 'CBD'),
  (md5('sufu:city:harare')::uuid, 'Mabelreign'),
  (md5('sufu:city:harare')::uuid, 'Mt Pleasant'),
  (md5('sufu:city:harare')::uuid, 'Hatfield'),
  (md5('sufu:city:harare')::uuid, 'Chisipite'),
  (md5('sufu:city:harare')::uuid, 'Eastlea'),
  (md5('sufu:city:harare')::uuid, 'Belvedere'),
  (md5('sufu:city:harare')::uuid, 'Glen View'),
  (md5('sufu:city:bulawayo')::uuid, 'CBD'),
  (md5('sufu:city:bulawayo')::uuid, 'Hillside'),
  (md5('sufu:city:bulawayo')::uuid, 'Khumalo'),
  (md5('sufu:city:bulawayo')::uuid, 'Northend'),
  (md5('sufu:city:bulawayo')::uuid, 'Suburbs'),
  (md5('sufu:city:mutare')::uuid, 'CBD'),
  (md5('sufu:city:mutare')::uuid, 'Murambi'),
  (md5('sufu:city:mutare')::uuid, 'Fairbridge Park'),
  (md5('sufu:city:gweru')::uuid, 'CBD'),
  (md5('sufu:city:gweru')::uuid, 'Woodlands Park'),
  (md5('sufu:city:kwekwe')::uuid, 'CBD'),
  (md5('sufu:city:kwekwe')::uuid, 'Mbizo');

-- ---------------------------------------------------------------------------
-- 3. Auth rows for every seeded profile (FK support)
--    Dormant: no password, unconfirmed email -> cannot sign in.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select
  '00000000-0000-0000-0000-000000000000', v.id, 'authenticated', 'authenticated', v.email, null, null,
  '{"provider":"email","providers":["email"]}', jsonb_build_object('display_name', v.display_name), now(), now()
from (values
  (md5('sufu:tariro-electrical')::uuid,  'tariro-electrical@seeded.sufu.co.zw',  'Tariro Electricals'),
  (md5('sufu:farai-auto')::uuid,         'farai-auto@seeded.sufu.co.zw',         'Farai Auto Care'),
  (md5('sufu:nyasha-design')::uuid,      'nyasha-design@seeded.sufu.co.zw',      'Nyasha Design Studio'),
  (md5('sufu:kudzai-cleaning')::uuid,    'kudzai-cleaning@seeded.sufu.co.zw',    'Kudzai Cleaning Co'),
  (md5('sufu:chipo-beauty')::uuid,       'chipo-beauty@seeded.sufu.co.zw',       'Chipo Beauty Studio'),
  (md5('sufu:tatenda-tech')::uuid,       'tatenda-tech@seeded.sufu.co.zw',       'Tatenda Tech Repairs'),
  (md5('sufu:harare-auto-centre')::uuid, 'harare-auto-centre@seeded.sufu.co.zw', 'Harare Auto Centre'),
  (md5('sufu:tendai-moyo')::uuid,        'tendai-moyo@seeded.sufu.co.zw',        'Tendai Moyo'),
  (md5('sufu:rumbi-chikore')::uuid,      'rumbi-chikore@seeded.sufu.co.zw',      'Rumbi Chikore'),
  (md5('sufu:tapiwa-marufu')::uuid,      'tapiwa-marufu@seeded.sufu.co.zw',      'Tapiwa Marufu'),
  (md5('sufu:loveness-kuda')::uuid,      'loveness-kuda@seeded.sufu.co.zw',      'Loveness Kuda'),
  (md5('sufu:brian-sibanda')::uuid,      'brian-sibanda@seeded.sufu.co.zw',      'Brian Sibanda'),
  (md5('sufu:swift-deliveries')::uuid,   'swift-deliveries@seeded.sufu.co.zw',   'Swift Deliveries'),
  (md5('sufu:mediahub-zw')::uuid,        'mediahub-zw@seeded.sufu.co.zw',        'MediaHub Zimbabwe'),
  (md5('sufu:nyaradzo-holdings')::uuid,  'nyaradzo-holdings@seeded.sufu.co.zw',  'Nyaradzo Holdings'),
  (md5('sufu:mbare-coop')::uuid,         'mbare-coop@seeded.sufu.co.zw',         'Mbare Traders Co-op'),
  (md5('sufu:bless-plumbing')::uuid,     'demo.provider@sufu.co.zw',             'Blessing Plumbing Services'),
  (md5('sufu:demo.customer')::uuid,      'demo.customer@sufu.co.zw',             'Demo Customer'),
  (md5('sufu:rudo-s')::uuid,             'rudo-s@seeded.sufu.co.zw',             'Rudo S.'),
  (md5('sufu:farai-a')::uuid,            'farai-a@seeded.sufu.co.zw',            'Farai A.')
) as v(id, email, display_name);

-- ---------------------------------------------------------------------------
-- 4. Profiles (the handle_new_user trigger created minimal rows; enrich them)
-- ---------------------------------------------------------------------------
insert into public.profiles (
  id, display_name, is_business, category, tagline, bio, city, suburb, member_since,
  languages, hours, employees, response_time,
  verified_phone, verified_email, verified_identity, verified_business
)
values
  (md5('sufu:bless-plumbing')::uuid, 'Blessing Plumbing Services', true, 'Plumbing',
   'Fast, tidy plumbing for homes and offices across Harare.',
   'Licensed plumber with 8 years on the tools. From a dripping tap to a full re-pipe, I quote honestly, arrive on time and leave the site clean.',
   'Harare', 'Avondale', '2022-01-01', array['English','Shona'], 'Mon–Sat · 7:00–18:00', null, '~20 min', true, true, true, true),
  (md5('sufu:tariro-electrical')::uuid, 'Tariro Electricals', true, 'Electrical',
   'Certified electrician — safe wiring, lights and backup power.',
   'Qualified electrician serving Harare''s eastern suburbs. I specialise in fault finding, rewires and solar backup installs — done to code, with receipts.',
   'Harare', 'Eastlea', '2023-01-01', array['English','Shona'], null, null, '~30 min', true, false, true, false),
  (md5('sufu:farai-auto')::uuid, 'Farai Auto Care', true, 'Auto repair',
   'Honest garage work — servicing, diagnostics and brakes.',
   'Family-run garage in Hatfield. We''ve kept Harare''s cars moving for 10 years. You only pay for what your car actually needs.',
   'Harare', 'Hatfield', '2021-01-01', array['English','Shona'], null, null, '~1 hour', true, true, true, false),
  (md5('sufu:nyasha-design')::uuid, 'Nyasha Design Studio', false, 'Graphic design',
   'Logos, brand kits and social packs — delivered fast, priced fairly.',
   'Graphic designer helping Zimbabwean businesses look world-class. Clean files, honest timelines, unlimited minor revisions.',
   'Harare', 'CBD', '2023-01-01', array['English','Shona'], null, null, '~2 hours', true, false, true, false),
  (md5('sufu:kudzai-cleaning')::uuid, 'Kudzai Cleaning Co', true, 'Cleaning',
   'Spotless homes and offices, on a schedule that suits you.',
   'Trusted cleaning team for Borrowdale and surrounds. Weekly office cleans, move-out deep cleans and one-off refreshes with our own equipment.',
   'Harare', 'Borrowdale', '2022-01-01', array['English','Shona','Ndebele'], null, null, '~45 min', true, true, true, true),
  (md5('sufu:chipo-beauty')::uuid, 'Chipo Beauty Studio', true, 'Barber & beauty',
   'Braids, manicures, makeup and barber cuts — Mt Pleasant.',
   'Full-service beauty studio. Walk in for a cut or book ahead for bridal makeup — every appointment leaves you camera-ready.',
   'Harare', 'Mt Pleasant', '2023-01-01', array['English','Shona'], null, null, '~25 min', true, false, true, false),
  (md5('sufu:tatenda-tech')::uuid, 'Tatenda Tech Repairs', false, 'IT & computer repair',
   'Phones, laptops and fridges — repaired for a fair price.',
   'Ex-Apple technician repairing everything from screens to fridges. Genuine parts, before-and-after photos, and a 30-day guarantee on repairs.',
   'Harare', 'Mabelreign', '2024-01-01', array['English','Shona'], null, null, '~1 hour', true, false, true, false),
  (md5('sufu:harare-auto-centre')::uuid, 'Harare Auto Centre', true, 'Auto repair',
   'Servicing, diagnostics, tyres and repairs — plus jobs on offer.',
   'Full-service garage in Avondale. Vehicle servicing, diagnostics, tyres and mechanical repairs, run by a team of 12 with 20+ years combined experience.',
   'Harare', 'Avondale', '2019-01-01', array['English','Shona'], 'Mon–Sat · 7:30–17:00', '12 staff', '~45 min', true, true, true, true),
  (md5('sufu:tendai-moyo')::uuid, 'Tendai Moyo', false, 'Photography',
   'Weddings, portraits and product shoots across Harare.',
   'One account, many hats: I buy, I sell, I shoot. When I''m not photographing weddings, I''m flipping phones on the marketplace.',
   'Harare', 'Avondale', '2023-01-01', array['English','Shona'], null, null, '~1 hour', true, false, true, false),
  (md5('sufu:rumbi-chikore')::uuid, 'Rumbi Chikore', false, 'Seller',
   'Selling quality second-hand appliances from a smoke-free home.',
   'Just a neighbour selling a few good things. Honest condition notes and fair prices.',
   'Harare', 'Borrowdale', '2024-01-01', array['English'], null, null, '~2 hours', true, false, false, false),
  (md5('sufu:tapiwa-marufu')::uuid, 'Tapiwa Marufu', false, 'Seller',
   'Furniture from a well-kept home — view before you buy.',
   'Selling a few pieces as we redecorate. Happy to share measurements and extra photos.',
   'Harare', 'Borrowdale', '2024-01-01', array['English','Shona'], null, null, '~3 hours', true, false, false, false),
  (md5('sufu:loveness-kuda')::uuid, 'Loveness Kuda', false, 'Seller',
   'Genuine laptops and accessories, tested before listing.',
   'I resell well-priced tech for work-from-home setups. Every device is tested and comes with a short warranty.',
   'Harare', 'Hatfield', '2025-01-01', array['English','Shona'], null, null, '~1 hour', true, false, false, false),
  (md5('sufu:brian-sibanda')::uuid, 'Brian Sibanda', false, 'Seller',
   'One-owner cars with full service history.',
   'Selling my own vehicles only — no middlemen. Open to a test drive in Glen View.',
   'Harare', 'Glen View', '2023-01-01', array['English','Shona','Ndebele'], null, null, '~4 hours', true, false, true, false),
  (md5('sufu:swift-deliveries')::uuid, 'Swift Deliveries', true, 'Delivery',
   'Same-day courier and delivery across Harare.',
   'Fast, tracked deliveries across the city, every day. We also hire riders for evening and weekend shifts.',
   'Harare', 'CBD', '2021-01-01', array['English','Shona','Ndebele'], '24/7', null, '~30 min', true, true, true, true),
  (md5('sufu:mediahub-zw')::uuid, 'MediaHub Zimbabwe', true, 'Media & marketing',
   'Content, campaigns and creative for growing brands.',
   'Zimbabwean media house helping local brands tell better stories across print and digital.',
   'Harare', 'CBD', '2022-01-01', array['English'], null, null, '~3 hours', true, true, true, false),
  (md5('sufu:nyaradzo-holdings')::uuid, 'Nyaradzo Holdings', true, 'Admin & office',
   'Harare office — hiring reception and admin roles.',
   'Established office in Avondale hiring friendly, organised people. Equal-opportunity employer.',
   'Harare', 'Avondale', '2018-01-01', array['English','Shona'], null, null, '~1 day', true, true, false, false),
  (md5('sufu:mbare-coop')::uuid, 'Mbare Traders Co-op', true, 'Retail',
   'Market co-op — fresh produce and casual weekend work.',
   'A cooperative of market traders. We sell produce and occasionally hire helpers for busy weekends.',
   'Harare', 'CBD', '2020-01-01', array['English','Shona'], null, null, '~6 hours', true, false, true, false),
  (md5('sufu:demo.customer')::uuid, 'Demo Customer', false, null,
   null, null, 'Harare', 'Avondale', '2026-01-01', array['English'], null, null, null, false, false, false, false),
  (md5('sufu:rudo-s')::uuid, 'Rudo S.', false, null,
   null, null, 'Harare', 'CBD', '2026-01-01', array['English'], null, null, null, false, false, false, false),
  (md5('sufu:farai-a')::uuid, 'Farai A.', false, null,
   null, null, 'Harare', 'Hatfield', '2026-01-01', array['English'], null, null, null, false, false, false, false)
on conflict (id) do update set
  display_name = excluded.display_name,
  is_business = excluded.is_business,
  category = excluded.category,
  tagline = excluded.tagline,
  bio = excluded.bio,
  city = excluded.city,
  suburb = excluded.suburb,
  member_since = excluded.member_since,
  languages = excluded.languages,
  hours = excluded.hours,
  employees = excluded.employees,
  response_time = excluded.response_time,
  verified_phone = excluded.verified_phone,
  verified_email = excluded.verified_email,
  verified_identity = excluded.verified_identity,
  verified_business = excluded.verified_business;

-- ---------------------------------------------------------------------------
-- 5. Provider services + portfolio
-- ---------------------------------------------------------------------------
insert into public.provider_services (provider_id, name, price_from) values
  (md5('sufu:bless-plumbing')::uuid, 'Plumbing repairs', 15),
  (md5('sufu:bless-plumbing')::uuid, 'Geyser installation', 60),
  (md5('sufu:bless-plumbing')::uuid, 'Blocked drains', 20),
  (md5('sufu:bless-plumbing')::uuid, 'Pipe replacement', 35),
  (md5('sufu:tariro-electrical')::uuid, 'Wiring & rewiring', 20),
  (md5('sufu:tariro-electrical')::uuid, 'Light installation', 10),
  (md5('sufu:tariro-electrical')::uuid, 'Fault finding', 15),
  (md5('sufu:tariro-electrical')::uuid, 'Backup power', 45),
  (md5('sufu:farai-auto')::uuid, 'Full service', 40),
  (md5('sufu:farai-auto')::uuid, 'Diagnostics', 15),
  (md5('sufu:farai-auto')::uuid, 'Brake repair', 25),
  (md5('sufu:farai-auto')::uuid, 'Tyres', 20),
  (md5('sufu:nyasha-design')::uuid, 'Logo design', 25),
  (md5('sufu:nyasha-design')::uuid, 'Brand kit', 80),
  (md5('sufu:nyasha-design')::uuid, 'Social media pack', 30),
  (md5('sufu:nyasha-design')::uuid, 'Flyer design', 15),
  (md5('sufu:kudzai-cleaning')::uuid, 'Home deep clean', 30),
  (md5('sufu:kudzai-cleaning')::uuid, 'Office cleaning', 50),
  (md5('sufu:kudzai-cleaning')::uuid, 'Move-out clean', 60),
  (md5('sufu:chipo-beauty')::uuid, 'Braids', 25),
  (md5('sufu:chipo-beauty')::uuid, 'Manicure', 10),
  (md5('sufu:chipo-beauty')::uuid, 'Makeup', 30),
  (md5('sufu:chipo-beauty')::uuid, 'Barber cuts', 5),
  (md5('sufu:tatenda-tech')::uuid, 'Phone screen repair', 30),
  (md5('sufu:tatenda-tech')::uuid, 'Laptop repair', 25),
  (md5('sufu:tatenda-tech')::uuid, 'Fridge repair', 20),
  (md5('sufu:harare-auto-centre')::uuid, 'Vehicle servicing', 50),
  (md5('sufu:harare-auto-centre')::uuid, 'Diagnostics', 20),
  (md5('sufu:harare-auto-centre')::uuid, 'Tyres', 15),
  (md5('sufu:harare-auto-centre')::uuid, 'Repairs', 30),
  (md5('sufu:tendai-moyo')::uuid, 'Event photography', 40),
  (md5('sufu:tendai-moyo')::uuid, 'Portraits', 25),
  (md5('sufu:tendai-moyo')::uuid, 'Product shoots', 35);

-- Portfolio/reviews/conversation seed data was truncated in the recovered ZIP.
-- Production does not depend on seed data; restore these fixtures separately.
