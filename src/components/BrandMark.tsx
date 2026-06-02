// Brand-Marke „The Hold" – ein auf 135° geteilter Zweiton-Kreis (ink oben-links,
// vermilion unten-rechts). Referenziert die farbigen Boulder-Griff-Punkte der UI,
// sodass Marke und Produkt eine visuelle Sprache teilen. Größe über width/height
// bzw. className steuern; Default 1em (skaliert mit font-size).
//
// Die beiden Hälften hängen bewusst an den Chalk-Theme-Tokens (--accent/--ink),
// damit die Marke konsistent zur App bleibt. Auf dunklen Flächen `reverse` setzen –
// dann wird die ink-Hälfte zu Papier (--surface), analog logo-mark-reverse.svg.
import type { SVGProps } from 'react'

type BrandMarkProps = SVGProps<SVGSVGElement> & { reverse?: boolean }

export default function BrandMark({ reverse = false, ...props }: BrandMarkProps) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 100 100"
      role="img"
      aria-label="Boulder Challenges"
      {...props}
    >
      <circle cx="50" cy="50" r="50" fill="var(--accent)" />
      <path
        d="M85.355 14.645 A50 50 0 0 0 14.645 85.355 Z"
        fill={reverse ? 'var(--surface)' : 'var(--ink)'}
      />
    </svg>
  )
}
