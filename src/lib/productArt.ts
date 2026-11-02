/**
 * Original product illustrations as SVG inner markup (0 0 200 200).
 * No copied artwork, no known characters or logos. Primary shapes fill from
 * --slot-0 and secondary details from --slot-1 so the colour configurator can
 * recolour them live. Shared by ProductArt.astro and the Preact configurator.
 */
export const INK = '#17141c';

const art: Record<string, string> = {
  'articulated-dragon': `
    <g fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M40 150 Q55 110 80 120 Q105 130 120 105 Q135 80 158 92" fill="none"/>
    </g>
    <g stroke="${INK}" stroke-width="4">
      <circle cx="44" cy="150" r="13" style="fill:var(--slot-0,#6d28d9)"/>
      <circle cx="74" cy="124" r="15" style="fill:var(--slot-0,#6d28d9)"/>
      <circle cx="104" cy="118" r="16" style="fill:var(--slot-0,#6d28d9)"/>
      <circle cx="128" cy="100" r="15" style="fill:var(--slot-0,#6d28d9)"/>
      <path d="M150 74 q22 -6 30 10 q-14 4 -18 18 q-18 -4 -22 -16 q4 -10 10 -12Z" style="fill:var(--slot-0,#6d28d9)"/>
      <circle cx="166" cy="88" r="5" style="fill:var(--slot-1,#4ade80)"/>
      <path d="M150 70 l10 -14 l6 16Z" style="fill:var(--slot-1,#4ade80)"/>
    </g>`,
  'flexi-octopus': `
    <g stroke="${INK}" stroke-width="4" stroke-linecap="round">
      <path d="M60 120 q-20 20 -34 10" fill="none"/>
      <path d="M72 132 q-14 28 -32 26" fill="none"/>
      <path d="M100 138 q0 30 -14 36" fill="none"/>
      <path d="M128 132 q14 28 32 26" fill="none"/>
      <path d="M140 120 q20 20 34 10" fill="none"/>
      <path d="M58 104 a42 42 0 0 1 84 0 v16 a42 42 0 0 1 -84 0Z" style="fill:var(--slot-0,#6d28d9)"/>
      <circle cx="84" cy="98" r="8" fill="#fff"/>
      <circle cx="116" cy="98" r="8" fill="#fff"/>
      <circle cx="84" cy="99" r="3.5" fill="${INK}"/>
      <circle cx="116" cy="99" r="3.5" fill="${INK}"/>
    </g>`,
  'phone-stand': `
    <g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
      <path d="M40 150 h120 l-18 -30 h-70Z" style="fill:var(--slot-0,#6d28d9)"/>
      <rect x="78" y="48" width="54" height="86" rx="8" transform="rotate(12 105 91)" style="fill:var(--slot-0,#6d28d9)"/>
      <rect x="86" y="58" width="38" height="62" rx="4" transform="rotate(12 105 89)" fill="#fff" opacity="0.85"/>
    </g>`,
  'name-keyring': `
    <g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
      <rect x="46" y="72" width="108" height="56" rx="26" style="fill:var(--slot-0,#6d28d9)"/>
      <circle cx="64" cy="100" r="10" fill="#fff"/>
      <circle cx="64" cy="100" r="4" fill="${INK}"/>
      <circle cx="150" cy="70" r="14" fill="none"/>
      <text x="104" y="107" text-anchor="middle" font-family="Space Mono, monospace" font-size="22" font-weight="700" fill="#fff">ABC</text>
    </g>`,
  'desk-tidy': `
    <g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
      <path d="M52 86 h96 l-8 64 h-80Z" style="fill:var(--slot-0,#6d28d9)"/>
      <rect x="52" y="78" width="96" height="14" rx="6" style="fill:var(--slot-0,#6d28d9)"/>
      <rect x="86" y="40" width="8" height="44" rx="4" fill="${INK}"/>
      <rect x="104" y="50" width="8" height="34" rx="4" fill="${INK}"/>
      <circle cx="90" cy="40" r="7" fill="#ec4899"/>
      <circle cx="108" cy="50" r="7" fill="#f97316"/>
    </g>`,
  'mini-planter': `
    <g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
      <path d="M70 108 q30 -46 60 0 q-6 -34 -30 -30 q-24 -4 -30 30Z" fill="#4ade80"/>
      <path d="M100 110 q-30 -30 -14 -58 q22 10 14 58Z" fill="#74b816"/>
      <path d="M62 112 h76 l-10 42 h-56Z" style="fill:var(--slot-0,#6d28d9)"/>
      <rect x="58" y="104" width="84" height="14" rx="6" style="fill:var(--slot-0,#6d28d9)"/>
    </g>`,
  'cable-clips': `
    <g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
      <path d="M60 70 h26 a14 14 0 0 1 0 28 h-10 a8 8 0 0 0 0 16 h14" fill="none"/>
      <rect x="44" y="62" width="34" height="44" rx="10" style="fill:var(--slot-0,#6d28d9)"/>
      <path d="M118 96 h26 a14 14 0 0 1 0 28 h-10 a8 8 0 0 0 0 16 h14" fill="none"/>
      <rect x="102" y="88" width="34" height="44" rx="10" style="fill:var(--slot-0,#6d28d9)"/>
    </g>`,
  'bookmark': `
    <g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
      <path d="M70 48 h60 a6 6 0 0 1 6 6 v98 l-36 -24 l-36 24 v-98 a6 6 0 0 1 6 -6Z" style="fill:var(--slot-0,#6d28d9)"/>
      <circle cx="106" cy="86" r="14" fill="#fff" opacity="0.9"/>
    </g>`,
  'headphone-hook': `
    <g stroke="${INK}" stroke-width="4" stroke-linejoin="round" fill="none">
      <rect x="50" y="52" width="100" height="16" rx="6" fill="${INK}"/>
      <path d="M96 68 v26 a24 24 0 0 0 48 0" stroke-width="10" style="stroke:var(--slot-0,#6d28d9)"/>
      <path d="M70 120 a30 30 0 0 1 30 -30" stroke-width="8" style="stroke:var(--slot-0,#6d28d9)"/>
      <rect x="58" y="112" width="20" height="30" rx="8" style="fill:var(--slot-0,#6d28d9)" stroke="${INK}"/>
    </g>`,
  'fidget-spinner': `
    <g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
      <g style="fill:var(--slot-0,#6d28d9)">
        <circle cx="100" cy="64" r="26"/>
        <circle cx="69" cy="118" r="26"/>
        <circle cx="131" cy="118" r="26"/>
        <circle cx="100" cy="100" r="30"/>
      </g>
      <circle cx="100" cy="100" r="15" style="fill:var(--slot-1,#ec4899)"/>
      <circle cx="100" cy="64" r="8" style="fill:var(--slot-1,#ec4899)"/>
      <circle cx="69" cy="118" r="8" style="fill:var(--slot-1,#ec4899)"/>
      <circle cx="131" cy="118" r="8" style="fill:var(--slot-1,#ec4899)"/>
    </g>`,
};

export function getArtInner(slug: string): string {
  return (
    art[slug] ??
    `<circle cx="100" cy="100" r="54" style="fill:var(--slot-0,#6d28d9)" stroke="${INK}" stroke-width="4"/>
     <text x="100" y="108" text-anchor="middle" font-family="Space Mono, monospace" font-size="20" fill="#fff">3D</text>`
  );
}
