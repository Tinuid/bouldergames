// Hallen-Bereiche und die Geometrie des Lageplans – einzige Quelle der Wahrheit
// (analog zu colors.ts / difficulty.ts).
//
// Grundlage ist der handgezeichnete Plan src/assets/lageplan.svg (Zeichenfläche
// 1120×1080). Die Datei bleibt als Referenz-Original liegen; gerendert wird ab hier
// aus diesen Listen, damit die Geometrie nicht doppelt existiert. Die Pfade des
// Originals sind relativ (m/l); hier stehen sie einmalig in absolute M/L/Z umgerechnet
// und auf 0,1 gerundet. Der Vorgänger-Plan liegt nur noch in der Git-History.
//
// `id` ist der in gym_boulders.area persistierte Wert. Das Vokabular ist zusätzlich
// als CHECK-Constraint gespiegelt (zuletzt supabase/migrations/0018_lageplan_v2.sql) –
// neue Bereiche brauchen also beides: einen Eintrag hier UND eine Migration.
//
// Die Pfade sind reine M/L/Z-Polygonzüge (keine Kurven), darum reicht für
// Punkt-in-Polygon ein exakter Even-Odd-Ray-Cast über die geparsten Punktlisten.
// Ein Bereich darf aus MEHREREN Teilflächen bestehen (mehrere `M … Z` in einem `d`):
// Kreide-Heide ist ein L aus zwei Wandstücken, das Abenteuerland ein U-Band plus der
// Block in seiner Mitte.

export interface HallArea {
  // Persistierter Wert in gym_boulders.area.
  id: string
  // Anzeigename (Filter-Chips, Boulder-Detail).
  label: string
  // Renderzeilen der Beschriftung auf der Karte. Im handgezeichneten Plan einzeilig;
  // mehrere Zeilen setzt der Renderer untereinander.
  lines: string[]
  // Ankerpunkt der ERSTEN Beschriftungszeile im SVG-User-Space, aus den
  // Text-Transformationen des Originals berechnet.
  labelAt: { x: number; y: number }
  labelAnchor?: 'start' | 'middle'
  // Drehung der Beschriftung in Grad um labelAt (die Handschrift steht leicht schräg).
  labelRotate?: number
  // SVG-Pfaddaten, ggf. mit mehreren Teilflächen.
  d: string
}

// Kennung dieses Grundrisses in gyms.map_key. Die Migration 0018 rechnet die
// gespeicherten Positionen auf diesen Plan um und setzt den Wert danach. Solange die
// Datenbank noch einen anderen Wert meldet, liegen die Koordinaten im alten System –
// die Karte sperrt dann den Bearbeitungsmodus (sonst würde eine neu gesetzte Position
// von der Migration ein zweites Mal umgerechnet).
export const LAGEPLAN_MAP_KEY = 'lageplan-v2'

// Ausschnitt des Grundrisses: der Hallenrahmen plus etwas Luft. Basis für die viewBox
// der Karte und für alle Zoom-/Pan-Grenzen (siehe src/lib/mapGeometry.ts).
export const LAGEPLAN_VIEWBOX = { x: 15, y: 30, w: 1110, h: 1040 } as const

// Zeilenabstand der Beschriftung, relativ zur Schriftgröße.
export const LABEL_LINE_HEIGHT = 0.94

// Reihenfolge = Zeichenreihenfolge. Die Wandstücke überlappen sich nicht; areaAt()
// iteriert trotzdem rückwärts, damit bei künftigen Überlappungen die oben liegende
// Fläche gewinnt.
export const HALL_AREAS: HallArea[] = [
  {
    id: 'moor-door',
    label: 'Moor-Door',
    lines: ['Moor-Door'],
    labelAt: { x: 691.8, y: 164.7 },
    labelAnchor: 'start',
    labelRotate: -4.4,
    d: 'M 450.6 167.4 L 445.1 197.2 L 434.7 200.6 L 430.8 142.9 L 471.3 105.2 L 617.4 123.2 L 957.5 101.4 L 1068.6 191.5 L 1043.7 331.2 L 997.0 338.6 L 986.4 265.5 L 929.8 202.0 L 852.3 187.6 L 820.1 193.1 L 808.2 220.4 L 773.4 260.1 L 673.7 252.1 L 638.4 176.7 L 583.8 184.6 L 450.6 167.4 Z',
  },
  {
    id: 'kreide-heide',
    label: 'Kreide-Heide',
    lines: ['Kreide-Heide'],
    labelAt: { x: 139, y: 533 },
    labelAnchor: 'start',
    labelRotate: -4.4,
    // Waagerechtes Band + senkrechter Streifen am linken Rand.
    d: 'M 101.7 583.8 L 69.9 551.6 L 100.7 541.6 L 129.7 554.7 L 217.4 551.1 L 256.4 563.8 L 436.6 541.6 L 478.0 554.6 L 461.0 593.1 L 321.9 589.0 L 201.0 599.2 L 101.7 583.8 Z M 69.9 551.7 L 74.7 465.8 L 58.7 345.9 L 100.0 328.3 L 117.4 374.5 L 121.3 402.8 L 101.5 446.4 L 109.9 489.6 L 100.4 541.6 L 69.9 551.7 Z',
  },
  {
    id: 'feiner-findling',
    label: 'feiner Findling',
    lines: ['feiner Findling'],
    labelAt: { x: 291.9, y: 411 },
    labelAnchor: 'start',
    labelRotate: -4.4,
    d: 'M 263.3 414.1 L 272.3 379.3 L 323.7 374.5 L 409.4 349.4 L 435.6 334.0 L 460.3 327.6 L 471.9 352.3 L 450.5 384.7 L 388.2 434.9 L 331.7 449.3 L 286.3 440.3 L 263.3 414.1 Z',
  },
  {
    id: 'pulverturm',
    label: 'Pulverturm',
    lines: ['Pulverturm'],
    labelAt: { x: 719.4, y: 526.4 },
    labelAnchor: 'start',
    labelRotate: -4.4,
    d: 'M 817.5 674.6 L 856.3 624.2 L 814.4 471.4 L 828.4 436.5 L 788.8 345.8 L 719.8 350.4 L 667.1 386.1 L 647.7 455.1 L 696.6 524.9 L 709.0 601.7 L 743.9 676.2 L 817.5 674.6 Z',
  },
  {
    id: 'ems-arena',
    label: 'Ems-Arena',
    lines: ['Ems-Arena'],
    labelAt: { x: 950.6, y: 540.8 },
    labelAnchor: 'start',
    labelRotate: -5.1,
    d: 'M 997.0 338.5 L 1043.8 331.2 L 1082.7 432.1 L 1057.3 692.0 L 1023.6 688.1 L 1028.4 587.5 L 1018.5 508.7 L 1024.9 430.3 L 999.4 372.5 L 997.0 338.5 Z',
  },
  {
    id: 'torf-terrasse',
    label: 'Torf-Terrasse',
    lines: ['Torf-Terrasse'],
    labelAt: { x: 526.3, y: 754.6 },
    labelAnchor: 'start',
    labelRotate: -6.5,
    d: 'M 461.0 592.9 L 478.0 554.6 L 520.4 665.0 L 547.2 709.7 L 525.2 800.9 L 510.6 820.6 L 449.3 842.8 L 445.5 821.5 L 504.9 794.8 L 519.7 723.0 L 506.7 672.2 L 461.0 592.9 Z',
  },
  {
    id: 'abenteuerland',
    label: 'Abenteuerland',
    lines: ['Abenteuerland'],
    // Wie in der Zeichnung auf dem Mittelblock.
    labelAt: { x: 291.5, y: 748.9 },
    labelAnchor: 'start',
    labelRotate: -4.4,
    // U-förmiges Band + der Block in seiner Mitte (im Vorgänger-Plan "Abenteuerfels").
    d: 'M 205.3 731.8 L 201.6 599.2 L 321.9 589.1 L 461.0 592.9 L 506.7 672.2 L 519.7 723.0 L 504.9 795.0 L 445.5 821.5 L 448.9 804.3 L 475.9 791.6 L 499.4 732.2 L 495.9 692.8 L 452.7 627.4 L 371.4 627.0 L 356.2 634.7 L 337.1 635.0 L 313.0 629.6 L 234.2 639.1 L 218.6 668.0 L 220.8 722.0 L 205.3 731.8 Z M 255.5 728.7 L 301.2 690.9 L 386.6 696.5 L 409.9 688.5 L 434.7 719.3 L 429.2 759.5 L 392.5 783.3 L 292.2 780.8 L 255.5 728.7 Z',
  },
]

// Laufflächen (grün im Original). Reine Deko – kein Bereich, kein Treffer-Test.
export const HALL_FLOORS: string[] = [
  'M 437.6 147.9 L 435.6 228.8 L 567.8 246.5 L 632.3 325.5 L 597.6 383.3 L 583.3 434.8 L 642.9 566.4 L 641.0 655.7 L 680.7 719.0 L 812.9 756.8 L 912.2 648.3 L 914.0 568.2 L 890.4 490.7 L 892.3 388.3 L 865.0 354.8 L 814.7 325.0 L 835.2 288.4 L 896.6 306.4 L 962.4 437.9 L 975.4 599.2 L 969.9 717.1 L 1024.5 714.7 L 1024.4 687.4 L 1044.3 560.2 L 1041.8 459.0 L 1043.3 331.2 L 1042.5 326.8 L 1018.3 260.1 L 1019.6 187.5 L 942.0 149.0 L 782.5 152.8 L 579.6 147.8 L 474.8 136.6 L 437.6 147.9 Z',
  'M 322.9 351.3 L 417.8 303.6 L 469.5 304.4 L 520.7 366.8 L 412.3 476.8 L 319.0 488.7 L 228.4 447.8 L 214.5 418.8 L 232.8 375.5 L 268.1 351.3 L 322.9 351.3 Z',
  'M 97.7 329.5 L 158.0 334.6 L 177.7 397.8 L 165.0 466.8 L 168.2 520.4 L 254.3 527.1 L 288.0 540.8 L 400.7 504.5 L 505.6 506.9 L 563.1 549.0 L 570.8 675.3 L 605.4 742.4 L 591.9 850.4 L 563.7 882.5 L 443.0 916.3 L 408.4 865.1 L 255.5 856.3 L 207.1 761.8 L 207.1 728.1 L 203.9 604.2 L 200.7 582.7 L 69.9 552.0 L 69.9 549.6 L 89.0 389.9 L 97.7 329.5 Z',
]

// Überhänge (gestrichelt im Original) – teils offene Linienzüge, darum ohne Füllung
// zu zeichnen.
export const HALL_OVERHANGS: string[] = [
  'M 494.8 173.2 L 584.3 177.3 L 642.9 168.2 L 679.2 206.7 L 742.0 220.6 L 799.7 214.9 L 811.8 152.9 L 884.2 143.7 L 951.8 158.8 L 970.9 213.0 L 997.5 262.6 L 997.1 338.6',
  'M 667.5 444.2 L 706.0 413.1 L 768.0 404.5 L 789.8 446.7 L 787.3 478.3 L 753.8 485.1 L 685.5 467.7 L 667.5 444.2 Z',
  'M 732.5 570.3 L 770.6 553.9 L 821.0 564.0 L 841.5 617.5 L 814.8 644.7 L 789.8 657.5 L 757.4 654.8 L 732.5 570.3 Z',
  'M 458.8 549.0 L 380.0 560.4 L 256.1 563.6',
]

// Außenkontur der Halle.
export const HALL_FRAME =
  'M 64.3 463.7 L 40.6 860.2 L 148.5 1055.3 L 570.2 945.0 L 889.6 1007.6 L 1043.0 964.4 L 1098.7 429.1 L 1056.6 331.2 L 1110.7 151.2 L 970.1 47.0 L 621.1 88.2 L 293.9 44.6 L 323.0 133.1 L 28.5 151.2 L 64.3 463.7 Z'

const BY_ID = new Map(HALL_AREAS.map((a) => [a.id, a]))

// Anzeigename zu einer gespeicherten Bereichs-Id. null ⇒ null (Boulder außerhalb
// aller Flächen), unbekannte Ids fallen defensiv auf die Id zurück.
export function areaLabel(id: string | null | undefined): string | null {
  if (!id) return null
  return BY_ID.get(id)?.label ?? id
}

// Pfaddaten → Teilflächen. Die Pfade bestehen ausschließlich aus absoluten M/L/Z;
// jedes M beginnt eine neue Teilfläche (Ring).
export type Ring = [number, number][]

export function parseRings(d: string): Ring[] {
  const rings: Ring[] = []
  for (const part of d.split(/(?=M)/)) {
    const nums = part.match(/-?\d+(?:\.\d+)?/g)
    if (!nums) continue
    const ring: Ring = []
    for (let i = 0; i + 1 < nums.length; i += 2) ring.push([+nums[i], +nums[i + 1]])
    rings.push(ring)
  }
  return rings
}

const AREA_RINGS = HALL_AREAS.map((a) => parseRings(a.d))

// Wie weit ein Punkt außerhalb einer Fläche liegen darf, um ihr trotzdem zugeordnet
// zu werden (SVG-User-Einheiten, gut eine Punktbreite).
//
// Ohne diese Toleranz ist die Zuordnung praktisch unbrauchbar: Boulder hängen AN der
// Wand, also genau auf der Polygonkante – und die Bereiche sind schmale Bänder. Zwei
// Punkte wenige Einheiten auseinander landen dann mal drinnen, mal draußen, und der
// Bereichsfilter verliert die Hälfte.
export const AREA_SNAP_TOLERANCE = 30

// Even-Odd-Ray-Cast (horizontaler Strahl nach rechts).
function pointInRing(pts: Ring, x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// Kürzester Abstand eines Punktes zu einer Strecke.
function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const vx = bx - ax
  const vy = by - ay
  const len2 = vx * vx + vy * vy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len2))
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy))
}

// Die Teilflächen eines Bereichs überlappen sich nicht – "in irgendeiner" reicht.
function pointInRings(rings: Ring[], x: number, y: number): boolean {
  return rings.some((r) => pointInRing(r, x, y))
}

// Kürzester Abstand eines Punktes zum Rand eines Bereichs (über alle Teilflächen).
function distanceToRings(rings: Ring[], x: number, y: number): number {
  let min = Infinity
  for (const pts of rings) {
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      min = Math.min(min, distanceToSegment(x, y, pts[j][0], pts[j][1], pts[i][0], pts[i][1]))
    }
  }
  return min
}

// Bereich an einer Position im SVG-User-Space – oder null, wenn weit weg von allem
// (Gang/Rand ist ausdrücklich erlaubt).
//
// Zwei Stufen: erst der exakte Drinnen-Test, rückwärts iteriert, damit die zuletzt
// gezeichnete – also oben liegende – Fläche gewinnt. Trifft nichts, gewinnt die
// Fläche mit dem kürzesten Randabstand, sofern der unter AREA_SNAP_TOLERANCE liegt.
//
// ACHTUNG: weiterhin nur als VORBELEGUNG beim Setzen gedacht. Die Flächen sind
// nicht-konvexe Bänder; in ihrer Konkavität meldet der Drinnen-Test fälschlich
// "drinnen", und der Nachbar kann näher liegen als der richtige Bereich. Darum ist
// gym_boulders.area eine gespeicherte, im Dialog änderbare Spalte und wird NIE zur
// Renderzeit abgeleitet.
export function areaAt(x: number, y: number, tolerance = AREA_SNAP_TOLERANCE): string | null {
  for (let i = HALL_AREAS.length - 1; i >= 0; i--) {
    if (pointInRings(AREA_RINGS[i], x, y)) return HALL_AREAS[i].id
  }

  let best: string | null = null
  let bestDistance = tolerance
  for (let i = HALL_AREAS.length - 1; i >= 0; i--) {
    const d = distanceToRings(AREA_RINGS[i], x, y)
    if (d < bestDistance) {
      bestDistance = d
      best = HALL_AREAS[i].id
    }
  }
  return best
}
