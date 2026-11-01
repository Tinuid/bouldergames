// Darstellung des Lageplans – getrennt von der Geometrie (src/lib/areas.ts).
//
// Es gibt zwei Stil-Varianten für DENSELBEN Grundriss:
//   'handdrawn' – die Farben und die Handschrift der Originalzeichnung
//                 (src/assets/lageplan.svg): Creme-Grund, grüne Laufflächen, beige
//                 Wände, gestrichelte Überhänge, Hallenrahmen.
//   'chalk'     – der bisherige App-Look: schraffierte Wände in den Chalk-Tokens,
//                 Beschriftung in der Display-Schrift mit Halo. Bewusst erhalten, weil
//                 die Karte später in den App-Look migriert werden soll – dann wechselt
//                 nur MAP_STYLE.
//
// Die Kartenbausteine (LageplanBase, LageplanLabels, LageplanMap, MiniMap) lesen die
// Plan-Farben von hier. Stilunabhängig bleiben nur die Filter-Tönung (Accent-Tokens),
// die Farben der Chalk-Schraffur im <pattern> von LageplanMap und der Halo des
// Mini-Markers.

export type MapStyleId = 'handdrawn' | 'chalk'

export interface MapStyle {
  id: MapStyleId
  // Fläche hinter dem Plan; null ⇒ App-Hintergrund scheint durch.
  background: string | null
  // Laufflächen; null ⇒ nicht zeichnen.
  floor: string | null
  // Wandfüllung. 'hatch' ⇒ das Schraffur-Muster aus den <defs> von LageplanMap.
  wall: string | 'hatch'
  wallStroke: string
  wallStrokeWidth: number
  // Überhänge (gestrichelt); null ⇒ nicht zeichnen.
  overhang: string | null
  // Hallenrahmen; null ⇒ nicht zeichnen.
  frame: string | null
  label: {
    fill: string
    // Halo hinter der Schrift (Lesbarkeit über Punkten); null ⇒ ohne.
    halo: string | null
    fontFamily: string
    fontWeight: number
    // Schriftgröße bei Zoom 1 in SVG-User-Einheiten (siehe labelSize in mapGeometry).
    baseSize: number
    // Die Drehung aus der Zeichnung übernehmen (HallArea.labelRotate).
    rotate: boolean
  }
  // Flache Darstellung für die Briefmarken-Karte in der Boulder-Liste.
  mini: { background: string | null; floor: string | null; wall: string; wallStroke: string }
}

const HANDDRAWN: MapStyle = {
  id: 'handdrawn',
  background: '#fffdeb',
  floor: '#d8e0c7',
  wall: '#c6bb9e',
  wallStroke: '#f7f3e9',
  wallStrokeWidth: 1,
  overhang: '#f7f3e9',
  frame: '#c6bb9e',
  label: {
    fill: '#6d583a',
    halo: null,
    fontFamily: "'Caveat', 'Segoe Print', cursive",
    fontWeight: 600,
    baseSize: 36,
    rotate: true,
  },
  mini: { background: '#fffdeb', floor: '#d8e0c7', wall: '#b3a684', wallStroke: '#b3a684' },
}

const CHALK: MapStyle = {
  id: 'chalk',
  background: null,
  floor: null,
  wall: 'hatch',
  wallStroke: 'var(--border-strong)',
  wallStrokeWidth: 4,
  overhang: null,
  frame: null,
  label: {
    fill: 'var(--faint)',
    halo: 'var(--bg)',
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
    fontWeight: 700,
    baseSize: 32,
    rotate: false,
  },
  mini: { background: null, floor: null, wall: 'var(--surface-2)', wallStroke: 'var(--border-strong)' },
}

export const MAP_STYLES: Record<MapStyleId, MapStyle> = { handdrawn: HANDDRAWN, chalk: CHALK }

// Aktive Variante. Für den Wechsel in den App-Look nur hier umstellen.
export const MAP_STYLE: MapStyle = MAP_STYLES.handdrawn
