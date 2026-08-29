import { memo, useMemo } from 'react'
import MapDot from './MapDot'
import { dotRadius } from '../../lib/mapGeometry'
import type { GymTickState } from '../../types'

export interface MapDotVM {
  id: string
  x: number
  y: number
  color: string
  // Anzeige-Label des Grades ("1"…"7", "?", "!").
  label: string
  tick: GymTickState | null
  // Vom Filter ausgeschlossen.
  dimmed: boolean
  // Gehört nicht zur geöffneten Challenge – nur zurückgenommen dargestellt.
  faded?: boolean
  aria: string
}

// Unterhalb dieses Bildschirmradius (px) wird im Marken-Badge nur noch die farbige
// Scheibe gezeigt – ein Häkchen oder Fähnchen wäre dort nicht mehr lesbar.
const BADGE_GLYPH_MIN_PX = 6

/**
 * Die Punkt-Ebene der Karte.
 *
 * Hängt bewusst nur vom GEQUANTELTEN Zoom ab, nicht vom Ausschnitt: die Punkte
 * liegen im User-Space, ein Pan verschiebt sie also ohne jedes Re-Rendering. Nur
 * ihr Radius folgt dem Zoom – und der in groben Stufen.
 *
 * Die ganze Ebene ist pointer-events: none. Getroffen wird über nearestDot() im
 * Screen, damit (a) ein Pan, der zufällig auf einem Punkt endet, keinen Klick
 * auslöst und (b) der Treffer auf einem Touchscreen etwas Slop bekommt.
 */
function MapDots({
  dots,
  zoomQ,
  fitScale,
  idPrefix,
  selectedIds,
}: {
  dots: MapDotVM[]
  zoomQ: number
  fitScale: number
  idPrefix: string
  selectedIds: Set<string>
}) {
  const r = dotRadius(zoomQ)
  const showBadgeGlyph = r * 0.46 * fitScale * zoomQ >= BADGE_GLYPH_MIN_PX

  // Zeichenreihenfolge: ausgegraut ganz nach hinten, markiert nach vorn,
  // ausgewählt zuletzt. Damit gewinnt bei Überlappung immer das Wichtigere.
  const ordered = useMemo(() => {
    const rank = (d: MapDotVM) =>
      selectedIds.has(d.id) ? 4 : d.dimmed ? 0 : d.faded ? 1 : d.tick ? 3 : 2
    return [...dots].sort((a, b) => rank(a) - rank(b))
  }, [dots, selectedIds])

  return (
    <g pointerEvents="none">
      {ordered.map((d) => (
        <MapDot
          key={d.id}
          x={d.x}
          y={d.y}
          r={r}
          color={d.color}
          label={d.label}
          tick={d.tick}
          dimmed={d.dimmed}
          faded={d.faded}
          selected={selectedIds.has(d.id)}
          showBadgeGlyph={showBadgeGlyph}
          idPrefix={idPrefix}
          ariaLabel={d.aria}
        />
      ))}
    </g>
  )
}

export default memo(MapDots)
