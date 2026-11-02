-- PLAyground - sample data
--
-- Safe to run on a fresh project to see the shop populated. Everything here is
-- removable from the admin panel ("Sample data - delete before going live") or
-- by calling select public.delete_sample_data();
--
-- Sample rows use recognisable UUID prefixes (colours 1111..., products 2222...,
-- orders 3333...). model_license is "Example - replace before selling".
--
-- Re-runnable: it clears existing sample rows first.

delete from public.orders          where id::text like '33333333-%';
delete from public.products        where id::text like '22222222-%';
delete from public.filament_colors where id::text like '11111111-%';

-- ---------------------------------------------------------------------------
-- Filament colours (12)
-- ---------------------------------------------------------------------------
insert into public.filament_colors (id, name, hex, finish, in_stock, sort_order) values
  ('11111111-1111-1111-1111-000000000001', 'Jet Black',      '#0B0B0F', 'matte',       true,  10),
  ('11111111-1111-1111-1111-000000000002', 'Snow White',     '#F8FAFC', 'matte',       true,  20),
  ('11111111-1111-1111-1111-000000000003', 'Galaxy Purple',  '#6D28D9', 'silk',        true,  30),
  ('11111111-1111-1111-1111-000000000004', 'Ocean Blue',     '#2563EB', 'matte',       true,  40),
  ('11111111-1111-1111-1111-000000000005', 'Lime Pop',       '#84CC16', 'matte',       true,  50),
  ('11111111-1111-1111-1111-000000000006', 'Sunset Orange',  '#F97316', 'matte',       true,  60),
  ('11111111-1111-1111-1111-000000000007', 'Bubblegum Pink', '#EC4899', 'matte',       true,  70),
  ('11111111-1111-1111-1111-000000000008', 'Glow Green',     '#4ADE80', 'glow',        true,  80),
  ('11111111-1111-1111-1111-000000000009', 'Silk Gold',      '#D4AF37', 'silk',        true,  90),
  ('11111111-1111-1111-1111-000000000010', 'Silk Silver',    '#C0C0C0', 'silk',        false, 100),
  ('11111111-1111-1111-1111-000000000011', 'Clear Ice',      '#A5F3FC', 'transparent', true,  110),
  ('11111111-1111-1111-1111-000000000012', 'Rainbow',        '#FF2D95', 'multicolor',  true,  120);

-- ---------------------------------------------------------------------------
-- Products (10). Prices £2-£12. model_license marks them as sample data.
-- ---------------------------------------------------------------------------
insert into public.products
  (id, slug, name, short_description, description, price_gbp, lead_time_days,
   color_slots, slot_labels, category, active, featured, model_source, model_license, sort_order)
values
  ('22222222-2222-2222-2222-000000000001', 'articulated-dragon', 'Articulated Dragon',
   'Wiggly printed-in-place dragon.',
   'A fully articulated dragon that flexes along its whole body - no assembly, it prints in one piece. Pick a body colour and a contrasting colour for the eyes.',
   9.50, 4, 2, '{"Body","Eyes"}', 'Toys', true, true, '', 'Example - replace before selling', 10),

  ('22222222-2222-2222-2222-000000000002', 'flexi-octopus', 'Flexi Octopus',
   'Squishy-looking flexi octopus.',
   'A bendy octopus with eight articulated legs. Fidget-friendly and pocket-sized.',
   6.50, 3, 1, '{"Colour"}', 'Toys', true, false, '', 'Example - replace before selling', 20),

  ('22222222-2222-2222-2222-000000000003', 'phone-stand', 'Phone Stand',
   'Chunky desk phone stand.',
   'A sturdy angled stand that fits most phones with or without a case. Great for watching videos on your desk.',
   5.00, 2, 1, '{"Colour"}', 'Desk', true, false, '', 'Example - replace before selling', 30),

  ('22222222-2222-2222-2222-000000000004', 'name-keyring', 'Name Keyring',
   'Personalised name keyring.',
   'A chunky keyring tag. Add the name you want in the order note and we will print it.',
   3.00, 3, 1, '{"Colour"}', 'Accessories', true, false, '', 'Example - replace before selling', 40),

  ('22222222-2222-2222-2222-000000000005', 'desk-tidy', 'Desk Tidy',
   'Little organiser for pens and bits.',
   'A compact desk organiser with slots for pens, erasers and odds and ends.',
   7.50, 4, 1, '{"Colour"}', 'Desk', true, false, '', 'Example - replace before selling', 50),

  ('22222222-2222-2222-2222-000000000006', 'mini-planter', 'Mini Planter',
   'Tiny pot for a tiny plant.',
   'A small planter with a drainage dish, perfect for a succulent or cactus.',
   4.50, 3, 1, '{"Colour"}', 'Home', true, false, '', 'Example - replace before selling', 60),

  ('22222222-2222-2222-2222-000000000007', 'cable-clips', 'Cable Clips (set of 4)',
   'Keep your charging cables tidy.',
   'A set of four stick-on clips that keep charging and headphone cables from falling behind your desk.',
   2.50, 2, 1, '{"Colour"}', 'Desk', true, false, '', 'Example - replace before selling', 70),

  ('22222222-2222-2222-2222-000000000008', 'bookmark', 'Bookmark',
   'Slim corner bookmark.',
   'A slim flexible bookmark that hugs the corner of the page. Dozens of colours to match your books.',
   2.00, 2, 1, '{"Colour"}', 'Accessories', true, false, '', 'Example - replace before selling', 80),

  ('22222222-2222-2222-2222-000000000009', 'headphone-hook', 'Headphone Hook',
   'Under-desk headphone hanger.',
   'A hook that clamps under your desk or shelf to hang headphones out of the way.',
   4.00, 3, 1, '{"Colour"}', 'Desk', true, false, '', 'Example - replace before selling', 90),

  ('22222222-2222-2222-2222-000000000010', 'fidget-spinner', 'Fidget Spinner',
   'Classic three-arm spinner.',
   'A smooth three-arm fidget spinner. Choose a body colour and a colour for the centre accents.',
   6.00, 3, 2, '{"Body","Accents"}', 'Toys', true, true, '', 'Example - replace before selling', 100);

-- ---------------------------------------------------------------------------
-- Allowed colours: every sample product can use every sample colour.
-- ---------------------------------------------------------------------------
insert into public.product_allowed_colors (product_id, color_id)
select p.id, c.id
from public.products p
cross join public.filament_colors c
where p.id::text like '22222222-%'
  and c.id::text like '11111111-%';

-- ---------------------------------------------------------------------------
-- Orders (6) in various statuses, with made-up nicknames.
-- ---------------------------------------------------------------------------
insert into public.orders
  (id, code, nickname, note, status, paid, payment_method, total_gbp, created_at, updated_at, collected_at)
values
  ('33333333-3333-3333-3333-000000000001', 'PLA-7K3Q', 'zoe_zap', 'Purple please!', 'new',       false, 'cash_on_collection', 12.50, now() - interval '2 hours',  now() - interval '2 hours',  null),
  ('33333333-3333-3333-3333-000000000002', 'PLA-9M2T', 'pixelcat', null,             'printing',  false, 'cash_on_collection', 13.00, now() - interval '1 day',    now() - interval '3 hours',  null),
  ('33333333-3333-3333-3333-000000000003', 'PLA-4RBX', 'blitz',    'For my sister',  'ready',     false, 'cash_on_collection',  9.00, now() - interval '2 days',   now() - interval '5 hours',  null),
  ('33333333-3333-3333-3333-000000000004', 'PLA-Q8WD', 'minty',    null,             'collected', true,  'cash_on_collection',  6.00, now() - interval '6 days',   now() - interval '4 days',   now() - interval '4 days'),
  ('33333333-3333-3333-3333-000000000005', 'PLA-H5YN', 'nova99',   'changed my mind','cancelled', false, 'cash_on_collection',  4.50, now() - interval '8 days',   now() - interval '7 days',   null),
  ('33333333-3333-3333-3333-000000000006', 'PLA-K2JP', 'zoe_zap',  null,             'new',       false, 'cash_on_collection', 10.00, now() - interval '30 minutes', now() - interval '30 minutes', null);

insert into public.order_items
  (order_id, product_id, product_name_snapshot, unit_price_snapshot, quantity, chosen_colors)
values
  -- Order 1: dragon (purple body, glow-green eyes) + keyring (pink)
  ('33333333-3333-3333-3333-000000000001', '22222222-2222-2222-2222-000000000001', 'Articulated Dragon', 9.50, 1,
   '{"0":"11111111-1111-1111-1111-000000000003","1":"11111111-1111-1111-1111-000000000008"}'),
  ('33333333-3333-3333-3333-000000000001', '22222222-2222-2222-2222-000000000004', 'Name Keyring',       3.00, 1,
   '{"0":"11111111-1111-1111-1111-000000000007"}'),

  -- Order 2: octopus x2 (ocean blue)
  ('33333333-3333-3333-3333-000000000002', '22222222-2222-2222-2222-000000000002', 'Flexi Octopus',      6.50, 2,
   '{"0":"11111111-1111-1111-1111-000000000004"}'),

  -- Order 3: phone stand (black) + bookmark x2 (pink)
  ('33333333-3333-3333-3333-000000000003', '22222222-2222-2222-2222-000000000003', 'Phone Stand',        5.00, 1,
   '{"0":"11111111-1111-1111-1111-000000000001"}'),
  ('33333333-3333-3333-3333-000000000003', '22222222-2222-2222-2222-000000000008', 'Bookmark',           2.00, 2,
   '{"0":"11111111-1111-1111-1111-000000000007"}'),

  -- Order 4: fidget spinner (lime body, black accents)
  ('33333333-3333-3333-3333-000000000004', '22222222-2222-2222-2222-000000000010', 'Fidget Spinner',     6.00, 1,
   '{"0":"11111111-1111-1111-1111-000000000005","1":"11111111-1111-1111-1111-000000000001"}'),

  -- Order 5: mini planter (lime)
  ('33333333-3333-3333-3333-000000000005', '22222222-2222-2222-2222-000000000006', 'Mini Planter',       4.50, 1,
   '{"0":"11111111-1111-1111-1111-000000000005"}'),

  -- Order 6: cable clips (white) + desk tidy (ocean blue)
  ('33333333-3333-3333-3333-000000000006', '22222222-2222-2222-2222-000000000007', 'Cable Clips (set of 4)', 2.50, 1,
   '{"0":"11111111-1111-1111-1111-000000000002"}'),
  ('33333333-3333-3333-3333-000000000006', '22222222-2222-2222-2222-000000000005', 'Desk Tidy',          7.50, 1,
   '{"0":"11111111-1111-1111-1111-000000000004"}');
