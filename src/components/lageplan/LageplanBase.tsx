import { HALL_AREAS, HALL_FLOORS, HALL_FRAME, HALL_OVERHANGS } from '../../lib/areas'
import { MAP_STYLE } from '../../lib/mapStyle'

/**
 * Der Grundriss des Lageplans. Rendert bewusst nur <g>-Inhalt, keinen
 * <svg>-Root – der gehört LageplanMap, das die viewBox besitzt.
 *
 * Geometrie aus src/lib/areas.ts, Farben aus src/lib/mapStyle.ts. Ebenen von unten
 * nach oben: Laufflächen, Wände (= Bereiche), Überhänge, Hallenrahmen, Filter-Tönung.
 * Welche Ebenen gezeichnet werden, entscheidet der Stil – der App-Look ('chalk')
 * kennt z.B. nur die schraffierten Wände. Die Schraffur liegt namensraumgeschützt
 * in den <defs> von LageplanMap.
 */
export default function LageplanBase({
  idPrefix,
  highlightedAreaIds,
}: {
  idPrefix: string
  // Bereiche, die durch einen aktiven Filter hervorgehoben werden. Die Flächen
  // selbst sind nicht antippbar – das Tönen ist die einzige Rückmeldung der Karte
  // auf den Bereichsfilter.
  highlightedAreaIds?: Set<string>
}) {
  const style = MAP_STYLE
  const highlighted = HALL_AREAS.filter((a) => highlightedAreaIds?.has(a.id))
  const wallFill = style.wall === 'hatch' ? `url(#${idPrefix}-hatch)` : style.wall

  return (
    <g>
      {style.floor && HALL_FLOORS.map((d, i) => <path key={`floor-${i}`} d={d} fill={style.floor!} />)}

      {HALL_AREAS.map((area) => (
        <path
          key={area.id}
          id={`${idPrefix}-area-${area.id}`}
          d={area.d}
          fill={wallFill}
          stroke={style.wallStroke}
          strokeWidth={style.wallStrokeWidth}
          strokeLinejoin="round"
        />
      ))}

      {style.overhang &&
        HALL_OVERHANGS.map((d, i) => (
          <path
            key={`overhang-${i}`}
            d={d}
            fill="none"
            stroke={style.overhang!}
            strokeWidth={1.5}
            strokeDasharray="5 5"
            strokeLinecap="round"
          />
        ))}

      {style.frame && (
        <path d={HALL_FRAME} fill="none" stroke={style.frame} strokeWidth={1.3} strokeLinejoin="miter" />
      )}

      {/* Nach den Grundflächen gezeichnet, damit die Tönung obenauf liegt. */}
      {highlighted.map((area) => (
        <path
          key={`hl-${area.id}`}
          d={area.d}
          fill="var(--accent-soft)"
          stroke="var(--accent)"
          strokeWidth={4}
          strokeLinejoin="round"
        />
      ))}
    </g>
  )
}
