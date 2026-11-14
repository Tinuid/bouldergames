// Inline-SVG-Icon-Set (Chalk-Design). Strichstärke ~1.8–2.4, 24×24-Viewbox,
// stroke="currentColor" – Größe via font-size (width/height = 1em) und Farbe
// über die Textfarbe der Umgebung steuerbar. Kein Icon-Font, keine Emojis.
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  'aria-hidden': true,
} as const

export function Bolt(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Gefüllter Stern – Kennzeichen des Boulders der Woche.
export function Star(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path
        d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Check(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path
        d="m4 12 5 6L20 5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function X(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ChevronLeft(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path
        d="m15 5-7 7 7 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ChevronRight(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path
        d="m9 5 7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Plus(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export function Minus(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export function Edit(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path
        d="M14.5 5.5 18.5 9.5M4 20l4-1L19 8a2 2 0 0 0 0-2.8L18.8 5A2 2 0 0 0 16 5L5 16l-1 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Share(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path
        d="M12 15V4m0 0L8 8m4-4 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Up(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path
        d="m6 14 6-6 6 6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Down(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path
        d="m6 10 6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Users(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 19a5.5 5.5 0 0 1 11 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16 5.2a3.2 3.2 0 0 1 0 6M17.5 19a5.5 5.5 0 0 0-2.2-4.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Camera(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path
        d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export function Picture(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <rect x="3.5" y="5" width="17" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8.5" cy="10" r="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="m5 17 4.5-4 3 2.5L16 11l3 3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function More(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function GripVertical(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <circle cx="9" cy="6" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function Trash(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path
        d="M5 7h14M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Flag(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path
        d="M6 21V4m0 0 8.5 1.8a1 1 0 0 1 .3 1.8L11 10l3.8 2.4a1 1 0 0 1-.3 1.8L6 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Absichtlich nicht "Map": das würde beim Importieren den eingebauten
// Map-Konstruktor überschatten und `new Map(...)` in derselben Datei kaputtmachen.
export function Plan(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path
        d="m3 6.5 6-2.5v13l-6 2.5v-13Zm6-2.5 6 2.5v13L9 17m6-10.5 6-2.5v13l-6 2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Crosshair(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v3.5M12 18v3.5M2.5 12H6m12 0h3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Stoppuhr – angekündigter Modus „Time Attack“.
export function Timer(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="13.5" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 13.5V9.5M9.5 2.5h5M18.5 6.5l1.5-1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ─── Icons der angekündigten Spielmodi (Moduswahl, „Bald verfügbar“) ───
const line = {
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

// Farb-Challenge
export function Palette(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path
        d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.3-1.7-.4-1 .2-2.3 1.4-2.3H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10Z"
        {...line}
      />
      <circle cx="7.5" cy="11.5" r="1.3" fill="currentColor" />
      <circle cx="9.5" cy="7.5" r="1.3" fill="currentColor" />
      <circle cx="14.5" cy="7.5" r="1.3" fill="currentColor" />
    </svg>
  )
}

// Last Man Standing
export function Crown(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M3.5 8 8 12l4-6 4 6 4.5-4-2 10h-13l-2-10Z" {...line} />
    </svg>
  )
}

// Wetten
export function Coins(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <ellipse cx="12" cy="6" rx="7" ry="2.5" {...line} />
      <path
        d="M5 6v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 10v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4M5 14v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4"
        {...line}
      />
    </svg>
  )
}

// Wenige Griffe
export function Hand(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path
        d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-6.5V4a1.5 1.5 0 0 1 3 0v7m0-5.5a1.5 1.5 0 0 1 3 0V13a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L3.6 15a1.5 1.5 0 0 1 2.3-1.9L8 15"
        {...line}
      />
    </svg>
  )
}

// X Griffe
export function Hash(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M10 4 8 20M16 4l-2 16M4.5 9h15M4.5 15h15" {...line} />
    </svg>
  )
}

// Beste N
export function Trophy(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path
        d="M8 4h8v5a4 4 0 0 1-8 0V4Zm0 2H5a3 3 0 0 0 3 3.5M16 6h3a3 3 0 0 1-3 3.5M12 13v4m-4 3h8m-6-3h4"
        {...line}
      />
    </svg>
  )
}

// Seltenheit
export function Diamond(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M6 4h12l3 5-9 11L3 9l3-5ZM3 9h18M9.5 4 8 9l4 11 4-11-1.5-5" {...line} />
    </svg>
  )
}

// Handicap
export function Scale(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path
        d="M12 4v16m-6 0h12M5 7h14M5 7l-2.5 6a2.5 2.5 0 0 0 5 0L5 7Zm14 0-2.5 6a2.5 2.5 0 0 0 5 0L19 7Z"
        {...line}
      />
    </svg>
  )
}

// Hallen-Bingo
export function Grid(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <rect x="4" y="4" width="16" height="16" rx="2" {...line} />
      <path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16" {...line} />
    </svg>
  )
}

// Pyramide
export function Pyramid(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M12 3.5 21 20H3l9-16.5ZM7.4 12h9.2M5.1 16.2h13.8" {...line} />
    </svg>
  )
}

// H-O-R-S-E (nachklettern, im Kreis)
export function Repeat(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path
        d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5"
        {...line}
      />
    </svg>
  )
}

// Zufalls-Boulder
export function Dice(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <rect x="4" y="4" width="16" height="16" rx="3" {...line} />
      <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" />
    </svg>
  )
}
