import { useId, type KeyboardEventHandler, type PointerEventHandler, type RefObject } from 'react'
import LageplanBase from './LageplanBase'
import LageplanLabels from './LageplanLabels'
import MapDots, { type MapDotVM } from './MapDots'
import { ColorDefs } from './MapDot'
import { dotRadius } from '../../lib/mapGeometry'

interface Props {
  svgRef: RefObject<SVGSVGElement>
  bind: {
    onPointerDown: PointerEventHandler<SVGSVGElement>
    onPointerMove: PointerEventHandler<SVGSVGElement>
    onPointerUp: PointerEventHandler<SVGSVGElement>
    onPointerCancel: PointerEventHandler<SVGSVGElement>
  }
  dots: MapDotVM[]
  zoomQ: number
  fitScale: number
  selectedId?: string | null
  highlightedAreaIds?: Set<string>
  // Vorschau-Punkt beim Setzen/Verschieben im Bearbeitungsmodus.
  ghost?: { x: number; y: number } | null
  // Tastatur-Weg: Pfeile pannen, +/- zoomen, 0 passt ein.
  onKeyDown?: KeyboardEventHandler<SVGSVGElement>
}

/**
 * Der <svg>-Root der Hallenkarte: Namensraum für alle ids, Ebenen-Komposition und
 * Gesten-Anbindung.
 *
 * Die viewBox wird NICHT hier gesetzt, sondern von useSvgPanZoom imperativ
 * geschrieben. Stünde sie als React-Attribut hier, würde jedes Re-Rendering
 * während einer Geste den Ausschnitt auf den veralteten State zurückwerfen.
 */
export default function LageplanMap({
  svgRef,
  bind,
  dots,
  zoomQ,
  fitScale,
  selectedId,
  highlightedAreaIds,
  ghost,
  onKeyDown,
}: Props) {
  // Alle ids (Schraffur, Farbverläufe) brauchen einen Namensraum, sonst würden
  // zwei gleichzeitig gemountete Karten ihre Füllungen kreuzweise auflösen.
  // Die Doppelpunkte aus useId (":r0:") müssen weg – in url(#…) und CSS sind sie
  // eine unnötige Fehlerquelle.
  const idPrefix = `lp${useId().replace(/:/g, '')}`
  const ghostR = dotRadius(zoomQ)

  return (
    // touch-action MUSS auch auf einem umschließenden HTML-Element stehen: auf
    // inline-SVG wird es (vor allem in WebKit) ignoriert, und dann fängt der
    // Browser die Geste als Seiten-Scroll/-Zoom ab und schickt uns ein sofortiges
    // pointercancel – die Karte ließe sich weder verschieben noch zoomen.
    <div className="h-full w-full touch-none overscroll-contain">
      <svg
        ref={svgRef}
        {...bind}
        onKeyDown={onKeyDown}
        className="h-full w-full touch-none select-none overscroll-contain"
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Hallenplan"
        tabIndex={0}
      >
        <defs>
          {/* Schraffur des Originals, aber in Chalk-Tönen und namensraumgeschützt. */}
          <pattern
            id={`${idPrefix}-hatch`}
            width="15"
            height="15"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <rect width="15" height="15" fill="var(--surface-2)" />
            <line x1="0" y1="0" x2="0" y2="15" stroke="var(--border-strong)" strokeWidth="2" />
          </pattern>
          <ColorDefs idPrefix={idPrefix} />
        </defs>

        <LageplanBase idPrefix={idPrefix} highlightedAreaIds={highlightedAreaIds} />
        <LageplanLabels zoomQ={zoomQ} />
        <MapDots
          dots={dots}
          zoomQ={zoomQ}
          fitScale={fitScale}
          idPrefix={idPrefix}
          selectedId={selectedId}
        />

        {ghost && (
          <circle
            cx={ghost.x}
            cy={ghost.y}
            r={ghostR}
            fill="var(--accent-soft)"
            stroke="var(--accent)"
            strokeWidth={ghostR * 0.18}
            strokeDasharray={`${ghostR * 0.5} ${ghostR * 0.35}`}
            pointerEvents="none"
            className="animate-bump"
          />
        )}
      </svg>
    </div>
  )
}
