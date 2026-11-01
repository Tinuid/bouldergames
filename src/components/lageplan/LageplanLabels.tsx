import { memo } from 'react'
import { HALL_AREAS, LABEL_LINE_HEIGHT } from '../../lib/areas'
import { labelOpacity, labelSize } from '../../lib/mapGeometry'
import { MAP_STYLE } from '../../lib/mapStyle'

/**
 * Bereichsnamen auf dem Lageplan.
 *
 * Die Beschriftungen werden gegenskaliert wie Ortsnamen auf einer Landkarte:
 * ohne das wäre ein Label bei Zoom 8 gut hundert Pixel hoch und läge über allen
 * Punkten. Zusätzlich blenden sie beim Hineinzoomen ab – wer so nah dran ist, weiß,
 * wo er steht, und der gefilterte Bereich ist ohnehin getönt.
 *
 * Schrift, Farbe, Halo und Drehung kommen aus dem Kartenstil (src/lib/mapStyle.ts);
 * Positionen und Winkel aus src/lib/areas.ts. Gedreht wird um den Ankerpunkt, damit
 * das Gegenskalieren die Schrift nicht von ihrer Stelle schiebt.
 *
 * Memoisiert und nur vom gequantelten Zoom abhängig: Pannen darf sie nicht anfassen.
 */
function LageplanLabels({ zoomQ }: { zoomQ: number }) {
  const style = MAP_STYLE.label
  const size = labelSize(zoomQ, style.baseSize)
  const opacity = labelOpacity(zoomQ)
  if (opacity <= 0) return null

  return (
    <g
      opacity={opacity}
      fill={style.fill}
      fontFamily={style.fontFamily}
      fontWeight={style.fontWeight}
      {...(style.halo
        ? {
            stroke: style.halo,
            strokeWidth: size * 0.22,
            strokeLinejoin: 'round' as const,
            paintOrder: 'stroke fill',
          }
        : {})}
      pointerEvents="none"
      aria-hidden
    >
      {HALL_AREAS.map((area) => {
        const { x, y } = area.labelAt
        const rotate = style.rotate && area.labelRotate ? `rotate(${area.labelRotate} ${x} ${y})` : undefined
        return (
          <g key={area.id} transform={rotate}>
            {area.lines.map((line, i) => (
              <text
                key={i}
                x={x}
                y={y + i * size * LABEL_LINE_HEIGHT}
                fontSize={size}
                textAnchor={area.labelAnchor ?? 'middle'}
              >
                {line}
              </text>
            ))}
          </g>
        )
      })}
    </g>
  )
}

export default memo(LageplanLabels)
