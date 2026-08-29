import { memo } from 'react'
import { HALL_AREAS, LABEL_LINE_HEIGHT } from '../../lib/areas'
import { labelOpacity, labelSize } from '../../lib/mapGeometry'

/**
 * Bereichsnamen auf dem Lageplan.
 *
 * Die Beschriftungen werden gegenskaliert wie Ortsnamen auf einer Landkarte:
 * ohne das wäre ein 32-Einheiten-Label bei Zoom 8 gut hundert Pixel hoch und läge
 * über allen Punkten. Zusätzlich blenden sie beim Hineinzoomen ab – wer so nah dran
 * ist, weiß, wo er steht, und der gefilterte Bereich ist ohnehin getönt.
 *
 * Memoisiert und nur vom gequantelten Zoom abhängig: Pannen darf sie nicht anfassen.
 *
 * Die Positionen stammen 1:1 aus dem Original-SVG und werden in einem eigenen
 * Durchgang nachjustiert (siehe labelAt in src/lib/areas.ts).
 */
function LageplanLabels({ zoomQ }: { zoomQ: number }) {
  const size = labelSize(zoomQ)
  const opacity = labelOpacity(zoomQ)
  if (opacity <= 0) return null

  return (
    <g
      className="font-display"
      opacity={opacity}
      fill="var(--faint)"
      stroke="var(--bg)"
      strokeWidth={size * 0.22}
      strokeLinejoin="round"
      paintOrder="stroke fill"
      fontWeight={700}
      pointerEvents="none"
      aria-hidden
    >
      {HALL_AREAS.map((area) =>
        area.lines.map((line, i) => (
          <text
            key={`${area.id}-${i}`}
            x={area.labelAt.x}
            y={area.labelAt.y + i * size * LABEL_LINE_HEIGHT}
            fontSize={size}
            textAnchor={area.labelAnchor ?? 'middle'}
          >
            {line}
          </text>
        )),
      )}
    </g>
  )
}

export default memo(LageplanLabels)
