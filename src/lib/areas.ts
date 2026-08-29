// Hallen-Bereiche und die Geometrie des Lageplans – einzige Quelle der Wahrheit
// (analog zu colors.ts / difficulty.ts).
//
// `id` ist der in gym_boulders.area persistierte Wert und zugleich die Pfad-id im
// ursprünglichen Grundriss src/assets/lageplan.svg (die Datei bleibt als Referenz-
// Original liegen; gerendert wird ab hier aus dieser Liste, damit die Geometrie
// nicht doppelt existiert). Das Vokabular ist zusätzlich als CHECK-Constraint in
// supabase/migrations/0015_gym_map.sql gespiegelt – neue Bereiche brauchen also
// beides: einen Eintrag hier UND eine Migration.
//
// Die Pfade sind reine M/L/Z-Polygonzüge (keine Kurven), darum reicht für
// Punkt-in-Polygon ein exakter Even-Odd-Ray-Cast über die geparsten Punktlisten.

export interface HallArea {
  // Pfad-id = persistierter Wert in gym_boulders.area.
  id: string
  // Anzeigename (Filter-Chips, Boulder-Detail).
  label: string
  // Renderzeilen der Beschriftung auf der Karte – die Umbrüche sind Design,
  // nicht aus `label` ableitbar.
  lines: string[]
  // Ankerpunkt der ERSTEN Beschriftungszeile im SVG-User-Space. Weitere Zeilen
  // setzt der Renderer darunter. Die Positionen stammen 1:1 aus dem Original-SVG
  // und werden später in einem eigenen Durchgang nachjustiert.
  labelAt: { x: number; y: number }
  labelAnchor?: 'start' | 'middle'
  // SVG-Pfaddaten, unverändert aus dem Original.
  d: string
}

// Ausschnitt des Grundrisses. Basis für die viewBox der Karte und für alle
// Zoom-/Pan-Grenzen (siehe src/lib/mapGeometry.ts).
export const LAGEPLAN_VIEWBOX = { x: 90, y: 10, w: 960, h: 880 } as const

// Zeilenabstand der Beschriftung, relativ zur Schriftgröße (im Original 30/32).
export const LABEL_LINE_HEIGHT = 0.94

// Reihenfolge = Zeichenreihenfolge im SVG. Wichtig: `abenteuerfels` liegt
// geometrisch IN `abenteuerland` und `feiner-findling` überlappt `kreide-heide` –
// beide werden später gezeichnet und gewinnen darum optisch. areaAt() iteriert
// deshalb rückwärts.
export const HALL_AREAS: HallArea[] = [
  {
    id: 'moor-door',
    label: 'Moor-Door',
    lines: ['Moor-Door'],
    labelAt: { x: 720, y: 132 },
    d: 'M 409.4 72.2 L 482.8 39.9 L 600.5 64.7 L 665.3 57.1 L 725.2 46.1 L 777.2 62.3 L 843.1 76.3 L 904.3 91.6 L 939.8 102.9 L 965.1 142.0 L 970.4 212.6 L 981.8 244.7 L 982.8 265.3 L 982.9 281.4 L 959.0 296.0 L 907.3 282.6 L 891.6 222.0 L 891.0 189.9 L 841.7 173.3 L 775.4 145.0 L 732.3 141.9 L 699.8 137.2 L 656.5 136.2 L 600.2 136.3 L 541.4 134.1 L 497.9 135.6 L 472.7 137.3 L 449.3 139.9 L 420.1 121.3 L 404.0 110.1 L 405.7 87.5 Z',
  },
  {
    id: 'kreide-heide',
    label: 'Kreide-Heide',
    lines: ['Kreide-', 'Heide'],
    labelAt: { x: 270, y: 416 },
    d: 'M 192.9 258.8 L 230.2 274.9 L 204.7 320.0 L 201.7 373.2 L 208.5 437.0 L 227.7 457.6 L 243.2 461.4 L 256.0 461.5 L 363.9 458.1 L 431.9 460.0 L 468.7 466.0 L 497.1 469.5 L 516.0 484.5 L 504.9 507.1 L 409.5 507.9 L 349.1 507.4 L 310.6 503.4 L 279.4 503.1 L 240.1 504.6 L 212.6 503.9 L 187.7 499.6 L 167.0 490.3 L 157.5 459.4 L 138.9 391.2 L 138.8 347.9 L 147.0 311.6 L 154.9 298.2 L 154.1 283.1 L 154.9 271.4 L 168.3 266.0 L 178.9 261.3 Z',
  },
  {
    id: 'feiner-findling',
    label: 'feiner Findling',
    lines: ['feiner', 'Findling'],
    labelAt: { x: 473, y: 318 },
    d: 'M 458.0 295.0 L 517.7 256.3 L 571.8 279.4 L 574.1 321.0 L 501.0 378.6 L 414.9 382.0 L 362.1 336.9 L 386.5 287.0 L 447.1 295.4 Z',
  },
  {
    id: 'pulverturm',
    label: 'Pulverturm',
    lines: ['Pulverturm'],
    labelAt: { x: 727, y: 392 },
    d: 'M 706.0 287.6 L 715.9 298.7 L 736.3 309.4 L 766.7 329.9 L 790.4 369.1 L 795.8 385.1 L 801.0 411.6 L 804.4 433.8 L 807.0 455.1 L 810.5 478.6 L 759.2 506.7 L 716.5 484.9 L 730.6 451.1 L 706.2 424.2 L 696.5 404.4 L 689.5 374.9 L 677.9 357.0 L 658.5 346.6 L 637.1 338.0 L 633.2 303.4 L 658.3 284.6 L 670.9 282.9 L 695.2 285.0 Z',
  },
  {
    id: 'ems-arena',
    label: 'Ems-Arena',
    lines: ['Ems-', 'Arena'],
    labelAt: { x: 948, y: 582 },
    d: 'M 982.5 319.3 L 988.1 388.6 L 993.1 436.2 L 994.4 470.0 L 992.7 515.0 L 989.4 561.4 L 989.5 611.7 L 998.2 665.1 L 999.3 712.5 L 1002.3 739.3 L 1010.4 795.6 L 962.2 845.4 L 900.1 849.2 L 892.8 824.6 L 886.2 794.7 L 898.1 769.0 L 901.8 749.6 L 905.0 722.5 L 912.6 685.3 L 912.1 638.1 L 908.6 609.3 L 900.4 565.2 L 895.7 544.9 L 898.5 498.5 L 901.4 461.0 L 902.7 433.2 L 904.1 384.5 L 907.9 358.5 L 909.5 328.4 L 909.8 310.1 L 941.9 326.3 L 983.8 314.1 Z',
  },
  {
    id: 'torf-terrasse',
    label: 'Torf-Terrasse',
    lines: ['Torf-', 'Terrasse'],
    labelAt: { x: 545, y: 672 },
    d: 'M 534.6 481.2 L 590.1 512.0 L 619.5 524.6 L 631.1 548.2 L 628.6 556.7 L 651.0 595.9 L 645.5 627.1 L 641.5 662.9 L 646.5 716.9 L 642.7 758.7 L 623.8 803.8 L 623.7 830.5 L 522.5 838.3 L 520.3 805.5 L 567.2 767.8 L 585.7 702.7 L 600.0 667.7 L 601.8 652.3 L 591.9 576.5 L 564.6 549.2 L 546.0 533.9 L 533.0 521.4 L 521.0 512.4 L 530.6 487.8 Z',
  },
  {
    id: 'abenteuerland',
    label: 'Abenteuerland',
    lines: ['Abenteuerland'],
    labelAt: { x: 130, y: 782 },
    labelAnchor: 'start',
    d: 'M 134.1 716.7 L 120.9 659.4 L 163.0 539.8 L 191.8 519.3 L 253.4 514.9 L 395.3 518.7 L 511.6 528.2 L 564.4 572.4 L 575.7 606.2 L 590.2 654.7 L 569.9 710.1 L 543.5 769.6 L 502.3 801.8 L 503.6 835.5 L 453.8 842.5 L 451.6 803.0 L 480.5 763.1 L 513.1 723.3 L 534.0 686.2 L 544.2 663.2 L 518.9 585.8 L 435.2 556.5 L 263.8 554.1 L 214.9 577.7 L 192.7 664.6 L 178.6 723.1 Z',
  },
  {
    id: 'abenteuerfels',
    label: 'Abenteuerfels',
    lines: ['Abenteuerfels'],
    labelAt: { x: 372, y: 682 },
    d: 'M 301.8 658.4 L 372.3 637.7 L 401.4 618.4 L 428.4 623.4 L 440.0 629.2 L 446.3 681.3 L 389.4 714.1 L 333.8 725.4 L 286.4 694.9 L 298.1 666.9 Z',
  },
]

const BY_ID = new Map(HALL_AREAS.map((a) => [a.id, a]))

// Anzeigename zu einer gespeicherten Bereichs-Id. null ⇒ null (Boulder außerhalb
// aller Flächen), unbekannte Ids fallen defensiv auf die Id zurück.
export function areaLabel(id: string | null | undefined): string | null {
  if (!id) return null
  return BY_ID.get(id)?.label ?? id
}

// Pfaddaten → Punktliste. Die Pfade bestehen ausschließlich aus M/L/Z, also
// reichen die Zahlenpaare in Reihenfolge.
function parsePolygon(d: string): [number, number][] {
  const nums = d.match(/-?\d+(?:\.\d+)?/g)
  if (!nums) return []
  const pts: [number, number][] = []
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([+nums[i], +nums[i + 1]])
  return pts
}

const POLYGONS = HALL_AREAS.map((a) => parsePolygon(a.d))

// Even-Odd-Ray-Cast (horizontaler Strahl nach rechts).
function pointInPolygon(pts: [number, number][], x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// Bereich an einer Position im SVG-User-Space – oder null außerhalb aller Flächen
// (Gang/Rand ist ausdrücklich erlaubt).
//
// ACHTUNG: nur als VORBELEGUNG beim Setzen eines Boulders gedacht. Die Flächen sind
// nicht-konvexe Einzelumrisse ohne Löcher; in der Konkavität von `abenteuerland`
// und `ems-arena` meldet der Test fälschlich "drinnen". Darum ist gym_boulders.area
// eine gespeicherte, im Dialog änderbare Spalte und wird NIE zur Renderzeit
// abgeleitet.
//
// Rückwärts-Iteration: die zuletzt gezeichnete (oben liegende) Fläche gewinnt –
// sonst würde `abenteuerfels` von `abenteuerland` überstimmt.
export function areaAt(x: number, y: number): string | null {
  for (let i = HALL_AREAS.length - 1; i >= 0; i--) {
    if (pointInPolygon(POLYGONS[i], x, y)) return HALL_AREAS[i].id
  }
  return null
}
