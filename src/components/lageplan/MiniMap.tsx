import { useId } from 'react'
import { HALL_AREAS, HALL_FLOORS, HALL_FRAME, LAGEPLAN_VIEWBOX } from '../../lib/areas'
import { colorStops, colorSvgFill } from '../../lib/colors'
import { MAP_STYLE } from '../../lib/mapStyle'
import { ColorDefs } from './MapDot'

/**
 * Briefmarken-Grundriss mit einem Punkt: zeigt in der Boulder-Liste auf einen Blick,
 * wo in der Halle der Boulder hängt.
 *
 * Bewusst nicht LageplanBase wiederverwendet: die Schraffur bräuchte eigene <defs>
 * je Vorkommen, und bei dieser Größe wären Muster, Überhänge und Rahmenlinie ohnehin
 * nur Grieß. Hier reichen flache Flächen mit kräftiger Kontur in den Mini-Farben des
 * Kartenstils (MAP_STYLE.mini).
 *
 * Der Punkt trägt die Farbe des Boulders (wie auf der großen Karte) – genau die hilft
 * beim Wiederfinden in der Halle. Zweiton-Farben brauchen dafür einen <linearGradient>,
 * also doch eigene <defs> je Vorkommen; bei Volltonfarben (der Normalfall) entfallen sie.
 *
 * Der Punkt ist absichtlich viel zu groß für den Maßstab – er soll als Ortsmarke
 * sofort ins Auge fallen, nicht die Position auf den Meter genau angeben.
 */
export default function MiniMap({
  x,
  y,
  color,
  className,
}: {
  x: number
  y: number
  // Gespeicherter Farbname des Boulders (wie in boulders.color). Unbekannt/leer ⇒
  // Grau-Fallback aus colorStops, damit der Punkt nie unsichtbar wird.
  color?: string | null
  className?: string
}) {
  const { x: vx, y: vy, w, h } = LAGEPLAN_VIEWBOX
  // Instanz-eigenes id-Präfix wie in LageplanMap – die Liste zeigt viele Mini-Karten,
  // deren Verlaufs-ids sich sonst gegenseitig überschrieben.
  const idPrefix = `mm${useId().replace(/:/g, '')}`
  const twoTone = colorStops(color).length === 2
  const mini = MAP_STYLE.mini

  return (
    <svg
      viewBox={`${vx} ${vy} ${w} ${h}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {twoTone && (
        <defs>
          <ColorDefs idPrefix={idPrefix} />
        </defs>
      )}
      {mini.background && <path d={HALL_FRAME} fill={mini.background} />}
      {mini.floor && HALL_FLOORS.map((d, i) => <path key={`floor-${i}`} d={d} fill={mini.floor!} />)}
      {HALL_AREAS.map((area) => (
        <path
          key={area.id}
          d={area.d}
          fill={mini.wall}
          stroke={mini.wallStroke}
          strokeWidth={10}
          strokeLinejoin="round"
        />
      ))}
      <circle cx={x} cy={y} r={95} fill="var(--surface)" />
      <circle
        cx={x}
        cy={y}
        r={72}
        fill={colorSvgFill(color, idPrefix)}
        stroke="rgba(0,0,0,0.18)"
        strokeWidth={7}
      />
    </svg>
  )
}
