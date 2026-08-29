import { HALL_AREAS, LAGEPLAN_VIEWBOX } from '../../lib/areas'

/**
 * Briefmarken-Grundriss mit einem Punkt: zeigt in der Boulder-Liste auf einen Blick,
 * wo in der Halle der Boulder hängt.
 *
 * Bewusst nicht LageplanBase wiederverwendet: die Schraffur bräuchte eigene <defs>
 * je Vorkommen, und bei dieser Größe wäre das Muster ohnehin nur Grieß. Hier reichen
 * flache Flächen mit kräftiger Kontur.
 *
 * Der Punkt ist absichtlich viel zu groß für den Maßstab – er soll als Ortsmarke
 * sofort ins Auge fallen, nicht die Position auf den Meter genau angeben.
 */
export default function MiniMap({
  x,
  y,
  className,
}: {
  x: number
  y: number
  className?: string
}) {
  const { x: vx, y: vy, w, h } = LAGEPLAN_VIEWBOX

  return (
    <svg
      viewBox={`${vx} ${vy} ${w} ${h}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {HALL_AREAS.map((area) => (
        <path
          key={area.id}
          d={area.d}
          fill="var(--surface-2)"
          stroke="var(--border-strong)"
          strokeWidth={10}
          strokeLinejoin="round"
        />
      ))}
      <circle cx={x} cy={y} r={95} fill="var(--surface)" />
      <circle cx={x} cy={y} r={72} fill="var(--accent)" />
    </svg>
  )
}
