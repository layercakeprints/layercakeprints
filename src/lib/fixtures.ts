import type { FilamentColor, Product } from './types';

/**
 * Offline sample data, mirroring supabase/seed.sql (same ids, names, prices).
 * Used by the catalog loader when Supabase env vars are absent, so the site
 * renders for local dev / design review before the database is connected.
 */

export const fixtureColors: FilamentColor[] = [
  { id: '11111111-1111-1111-1111-000000000001', name: 'Jet Black',      hex: '#0B0B0F', finish: 'matte',       in_stock: true,  sort_order: 10 },
  { id: '11111111-1111-1111-1111-000000000002', name: 'Snow White',     hex: '#F8FAFC', finish: 'matte',       in_stock: true,  sort_order: 20 },
  { id: '11111111-1111-1111-1111-000000000003', name: 'Galaxy Purple',  hex: '#6D28D9', finish: 'silk',        in_stock: true,  sort_order: 30 },
  { id: '11111111-1111-1111-1111-000000000004', name: 'Ocean Blue',     hex: '#2563EB', finish: 'matte',       in_stock: true,  sort_order: 40 },
  { id: '11111111-1111-1111-1111-000000000005', name: 'Lime Pop',       hex: '#84CC16', finish: 'matte',       in_stock: true,  sort_order: 50 },
  { id: '11111111-1111-1111-1111-000000000006', name: 'Sunset Orange',  hex: '#F97316', finish: 'matte',       in_stock: true,  sort_order: 60 },
  { id: '11111111-1111-1111-1111-000000000007', name: 'Bubblegum Pink', hex: '#EC4899', finish: 'matte',       in_stock: true,  sort_order: 70 },
  { id: '11111111-1111-1111-1111-000000000008', name: 'Glow Green',     hex: '#4ADE80', finish: 'glow',        in_stock: true,  sort_order: 80 },
  { id: '11111111-1111-1111-1111-000000000009', name: 'Silk Gold',      hex: '#D4AF37', finish: 'silk',        in_stock: true,  sort_order: 90 },
  { id: '11111111-1111-1111-1111-000000000010', name: 'Silk Silver',    hex: '#C0C0C0', finish: 'silk',        in_stock: false, sort_order: 100 },
  { id: '11111111-1111-1111-1111-000000000011', name: 'Clear Ice',      hex: '#A5F3FC', finish: 'transparent', in_stock: true,  sort_order: 110 },
  { id: '11111111-1111-1111-1111-000000000012', name: 'Rainbow',        hex: '#FF2D95', finish: 'multicolor',  in_stock: true,  sort_order: 120 },
];

const allColorIds = fixtureColors.map((c) => c.id);

interface Seed {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  price_gbp: number;
  lead_time_days: number;
  color_slots: number;
  slot_labels: string[];
  category: string;
  featured: boolean;
  sort_order: number;
}

const seeds: Seed[] = [
  { id: '22222222-2222-2222-2222-000000000001', slug: 'articulated-dragon', name: 'Articulated Dragon', short_description: 'Wiggly printed-in-place dragon.', description: 'A fully articulated dragon that flexes along its whole body - no assembly, it prints in one piece. Pick a body colour and a contrasting colour for the eyes.', price_gbp: 9.5, lead_time_days: 4, color_slots: 2, slot_labels: ['Body', 'Eyes'], category: 'Toys', featured: true, sort_order: 10 },
  { id: '22222222-2222-2222-2222-000000000002', slug: 'flexi-octopus', name: 'Flexi Octopus', short_description: 'Squishy-looking flexi octopus.', description: 'A bendy octopus with eight articulated legs. Fidget-friendly and pocket-sized.', price_gbp: 6.5, lead_time_days: 3, color_slots: 1, slot_labels: ['Colour'], category: 'Toys', featured: false, sort_order: 20 },
  { id: '22222222-2222-2222-2222-000000000003', slug: 'phone-stand', name: 'Phone Stand', short_description: 'Chunky desk phone stand.', description: 'A sturdy angled stand that fits most phones with or without a case. Great for watching videos on your desk.', price_gbp: 5.0, lead_time_days: 2, color_slots: 1, slot_labels: ['Colour'], category: 'Desk', featured: false, sort_order: 30 },
  { id: '22222222-2222-2222-2222-000000000004', slug: 'name-keyring', name: 'Name Keyring', short_description: 'Personalised name keyring.', description: 'A chunky keyring tag. Add the name you want in the order note and we will print it.', price_gbp: 3.0, lead_time_days: 3, color_slots: 1, slot_labels: ['Colour'], category: 'Accessories', featured: false, sort_order: 40 },
  { id: '22222222-2222-2222-2222-000000000005', slug: 'desk-tidy', name: 'Desk Tidy', short_description: 'Little organiser for pens and bits.', description: 'A compact desk organiser with slots for pens, erasers and odds and ends.', price_gbp: 7.5, lead_time_days: 4, color_slots: 1, slot_labels: ['Colour'], category: 'Desk', featured: false, sort_order: 50 },
  { id: '22222222-2222-2222-2222-000000000006', slug: 'mini-planter', name: 'Mini Planter', short_description: 'Tiny pot for a tiny plant.', description: 'A small planter with a drainage dish, perfect for a succulent or cactus.', price_gbp: 4.5, lead_time_days: 3, color_slots: 1, slot_labels: ['Colour'], category: 'Home', featured: false, sort_order: 60 },
  { id: '22222222-2222-2222-2222-000000000007', slug: 'cable-clips', name: 'Cable Clips (set of 4)', short_description: 'Keep your charging cables tidy.', description: 'A set of four stick-on clips that keep charging and headphone cables from falling behind your desk.', price_gbp: 2.5, lead_time_days: 2, color_slots: 1, slot_labels: ['Colour'], category: 'Desk', featured: false, sort_order: 70 },
  { id: '22222222-2222-2222-2222-000000000008', slug: 'bookmark', name: 'Bookmark', short_description: 'Slim corner bookmark.', description: 'A slim flexible bookmark that hugs the corner of the page. Dozens of colours to match your books.', price_gbp: 2.0, lead_time_days: 2, color_slots: 1, slot_labels: ['Colour'], category: 'Accessories', featured: false, sort_order: 80 },
  { id: '22222222-2222-2222-2222-000000000009', slug: 'headphone-hook', name: 'Headphone Hook', short_description: 'Under-desk headphone hanger.', description: 'A hook that clamps under your desk or shelf to hang headphones out of the way.', price_gbp: 4.0, lead_time_days: 3, color_slots: 1, slot_labels: ['Colour'], category: 'Desk', featured: false, sort_order: 90 },
  { id: '22222222-2222-2222-2222-000000000010', slug: 'fidget-spinner', name: 'Fidget Spinner', short_description: 'Classic three-arm spinner.', description: 'A smooth three-arm fidget spinner. Choose a body colour and a colour for the centre accents.', price_gbp: 6.0, lead_time_days: 3, color_slots: 2, slot_labels: ['Body', 'Accents'], category: 'Toys', featured: true, sort_order: 100 },
];

export const fixtureProducts: Product[] = seeds.map((s) => ({
  ...s,
  images: [],
  active: true,
  model_source: '',
  model_license: 'Example - replace before selling',
  allowed_color_ids: allColorIds,
}));
