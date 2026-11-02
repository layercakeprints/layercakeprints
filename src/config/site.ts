/**
 * Site-wide config. Change the shop name, tagline and small bits of copy here.
 * Keep this free of any personal info about the seller (no name, school, town, etc.).
 */
export const site = {
  /** Shop name. Change this one line to rebrand. */
  name: 'Layer Cake Prints',
  /** Short tagline shown under the name in the hero. */
  tagline: 'Tiny prints, big personality',
  /** Longer one-liner for meta description / hero sub-copy. */
  blurb: 'Made-to-order 3D prints. Pick your colours, order, pay cash when you collect.',

  /** Currency. Only GBP for now, but kept here so it is easy to change. */
  currency: {
    code: 'GBP',
    symbol: '£',
    /** Intl locale used when formatting prices. */
    locale: 'en-GB',
  },

  /** Payment. Cash-only for now; built so Stripe can be added later. */
  payment: {
    /** Default payment method stored on every order. */
    defaultMethod: 'cash_on_collection' as const,
    /** Short label shown at checkout / on the order page. */
    label: 'Pay cash when you collect',
  },

  /** Order codes look like PLA-7K3Q. Prefix is cosmetic only. */
  orderCodePrefix: 'PLA',

  /** How long we keep order data after collection/cancellation. Keep in sync with the pg_cron job. */
  dataRetentionDays: 30,

  /** Limits mirrored in the DB and in validation.ts - keep all three in sync. */
  limits: {
    nicknameMax: 30,
    noteMax: 200,
    quantityMin: 1,
    quantityMax: 10,
    /** Max open (new/printing/ready) orders per nickname - simple anti-spam. */
    openOrdersPerNickname: 5,
  },
} as const;

export type Site = typeof site;
