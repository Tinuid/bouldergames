import { HALL_AREAS } from '../../lib/areas'

/**
 * Die Hallenflächen des Lageplans. Rendert bewusst nur <g>-Inhalt, keinen
 * <svg>-Root – der gehört LageplanMap, das die viewBox besitzt.
 *
 * Die Geometrie kommt aus src/lib/areas.ts (Original: src/assets/lageplan.svg).
 * Der interne <style>-Block und die Schraffur-id des Originals sind hier bewusst
 * aufgelöst: beim Inlinen würden Klassennamen und ids global – die Schraffur liegt
 * darum namensraumgeschützt in den <defs> von LageplanMap, alles andere steht als
 * Attribut am Pfad und bindet an die Chalk-Tokens.
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
  const highlighted = HALL_AREAS.filter((a) => highlightedAreaIds?.has(a.id))

  return (
    <g>
      {HALL_AREAS.map((area) => (
        <path
          key={area.id}
          id={`${idPrefix}-area-${area.id}`}
          d={area.d}
          fill={`url(#${idPrefix}-hatch)`}
          stroke="var(--border-strong)"
          strokeWidth={4}
          strokeLinejoin="round"
        />
      ))}

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
