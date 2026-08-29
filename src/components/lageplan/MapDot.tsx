import { memo } from 'react'
import { BOULDER_COLORS, colorInk, colorInkHalo, colorSlug, colorSvgFill } from '../../lib/colors'
import type { GymTickState } from '../../types'

// Verlaufs-Definitionen für alle Zweiton-Farben. x1/y1 → x2/y2 entspricht dem
// 135deg des CSS-Pendants; gradientUnits bleibt objectBoundingBox, damit derselbe
// Verlauf für jede Punktgröße stimmt.
export function ColorDefs({ idPrefix }: { idPrefix: string }) {
  return (
    <>
      {BOULDER_COLORS.filter((c) => c.hex2).map((c) => (
        <linearGradient
          key={c.name}
          id={`${idPrefix}-c-${colorSlug(c.name)}`}
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop offset="50%" stopColor={c.hex} />
          <stop offset="50%" stopColor={c.hex2} />
        </linearGradient>
      ))}
    </>
  )
}

interface Props {
  x: number
  y: number
  // Radius in SVG-User-Einheiten (skaliert gedämpft mit dem Zoom, siehe dotRadius).
  r: number
  color: string
  // Anzeige-Label des Grades ("1"…"7", "?", "!").
  label: string
  tick: GymTickState | null
  idPrefix: string
  selected?: boolean
  // Vom Filter ausgeschlossen: bleibt als Ortsmarke sichtbar, ist aber nicht
  // antippbar (der Treffer-Test überspringt solche Punkte).
  dimmed?: boolean
  // Symbol im Marken-Badge zeigen. Unterhalb einer gewissen Bildschirmgröße wäre
  // es nur noch Matsch – dann trägt die Farbe allein die Information.
  showBadgeGlyph?: boolean
  ariaLabel?: string
}

function MapDot({
  x,
  y,
  r,
  color,
  label,
  tick,
  idPrefix,
  selected = false,
  dimmed = false,
  showBadgeGlyph = true,
  ariaLabel,
}: Props) {
  const badgeR = r * 0.46
  const badgeX = x + r * 0.78
  const badgeY = y - r * 0.78

  return (
    <g opacity={dimmed ? 0.18 : 1} role="img" aria-label={ariaLabel}>
      {/* Trennring in Papierfarbe: lässt sich überlappende Punkte als getrennte
          Scheiben lesen, ohne dass wir clustern müssten. */}
      <circle cx={x} cy={y} r={r + r * 0.09} fill="var(--bg)" />
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={colorSvgFill(color, idPrefix)}
        stroke="rgba(0,0,0,0.18)"
        strokeWidth={r * 0.09}
      />

      {selected && (
        <>
          <circle cx={x} cy={y} r={r + r * 0.2} fill="none" stroke="var(--surface)" strokeWidth={r * 0.16} />
          <circle cx={x} cy={y} r={r + r * 0.32} fill="none" stroke="var(--accent)" strokeWidth={r * 0.16} />
        </>
      )}

      {!dimmed && (
        <text
          x={x}
          y={y}
          dy=".34em"
          className="font-num"
          fontSize={r * 1.15}
          fontWeight={700}
          textAnchor="middle"
          fill={colorInk(color)}
          stroke={colorInkHalo(color)}
          strokeWidth={r * 0.18}
          paintOrder="stroke fill"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {label}
        </text>
      )}

      {!dimmed && tick && (
        <g>
          <circle
            cx={badgeX}
            cy={badgeY}
            r={badgeR}
            fill={tick === 'done' ? 'var(--ok)' : 'var(--accent)'}
            stroke="var(--bg)"
            strokeWidth={r * 0.12}
          />
          {showBadgeGlyph && (
            // Die 24×24-Geometrie aus icons.tsx ohne verschachteltes <svg>
            // wiederverwenden: verschieben und auf den Badge-Durchmesser skalieren.
            <g
              transform={`translate(${badgeX - badgeR} ${badgeY - badgeR}) scale(${(2 * badgeR) / 24})`}
              stroke="#ffffff"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            >
              {tick === 'done' ? (
                <path d="m4 12 5 6L20 5" />
              ) : (
                <path d="M6 21V4m0 0 8.5 1.8a1 1 0 0 1 .3 1.8L11 10l3.8 2.4a1 1 0 0 1-.3 1.8L6 16" />
              )}
            </g>
          )}
        </g>
      )}
    </g>
  )
}

export default memo(MapDot)
