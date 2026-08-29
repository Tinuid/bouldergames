// Verfügbare Hallen-Farben für die Boulder-Auswahl (eine Quelle der Wahrheit).
// `name` ist der in der DB persistierte Wert (kleingeschrieben), `hex` (+ optional
// `hex2` für Zweiton-Farben) die eigentliche Farbe. Der CSS-Hintergrund `swatch`
// wird daraus abgeleitet – bei Zweiton-Farben ein 50/50-Verlauf.
//
// Warum die Hexes und nicht nur der fertige CSS-String: der Lageplan zeichnet die
// Boulder als SVG-Punkte, und ein `linear-gradient(...)` ist als SVG-`fill` ungültig.
// Der Karten-Code braucht die reinen Stops (colorStops) und baut daraus einen
// <linearGradient>. Den CSS-String zur Laufzeit zu parsen wäre brüchig.
//
// Neue Farben NUR hier ergänzen.
export interface BoulderColor {
  name: string
  hex: string
  // Zweite Hälfte bei Zweiton-Farben (Verlauf 135°, harte 50/50-Kante).
  hex2?: string
  // Abgeleiteter CSS-Hintergrund (background), z.B. für den Farbklecks im HTML.
  swatch: string
}

// CSS-Hintergrund aus den Stops – exakt das Template, das bisher als Literal in
// der Liste stand (Ausgabe unverändert, damit alle bestehenden Ansichten gleich
// aussehen).
function toSwatch(hex: string, hex2?: string): string {
  return hex2 ? `linear-gradient(135deg, ${hex} 0 50%, ${hex2} 50% 100%)` : hex
}

function color(name: string, hex: string, hex2?: string): BoulderColor {
  return { name, hex, hex2, swatch: toSwatch(hex, hex2) }
}

// Hexes aus dem Chalk-Design (HOLD_LIST). `name` bleibt unverändert –
// das ist der in der DB persistierte Wert.
export const BOULDER_COLORS: BoulderColor[] = [
  color('blau', '#2F6BEB'),
  color('grün-blau', '#27B24A', '#2F6BEB'),
  color('gelb', '#E6B017'),
  color('schwarz', '#1B2130'),
  color('rot', '#E5484D'),
  color('weiß', '#F4F2EC'),
  color('mint', '#57E0A1'),
  color('lila', '#A855F7'),
  color('orange', '#F97316'),
  color('grau', '#9AA1AC'),
  color('hellblau', '#84CDF5'),
  color('orange-schwarz', '#F97316', '#1B2130'),
  color('grün', '#27B24A'),
]

const BY_NAME = new Map(BOULDER_COLORS.map((c) => [c.name, c]))

function lookup(name: string | null | undefined): BoulderColor | undefined {
  if (!name) return undefined
  return BY_NAME.get(name.trim().toLowerCase())
}

// CSS-Hintergrund zu einem gespeicherten Farbnamen (oder undefined, wenn unbekannt).
export function colorSwatch(name: string | null | undefined): string | undefined {
  return lookup(name)?.swatch
}

// Reine Farb-Stops für SVG-Füllungen: ein Eintrag = Vollton, zwei = Zweiton-Verlauf.
// Unbekannte Namen fallen auf einen neutralen Grauton zurück, damit ein Punkt auf
// der Karte nie unsichtbar wird.
export function colorStops(name: string | null | undefined): [string] | [string, string] {
  const c = lookup(name)
  if (!c) return ['#9AA1AC']
  return c.hex2 ? [c.hex, c.hex2] : [c.hex]
}

// SVG-id-taugliche Variante des Farbnamens ('grün-blau' → 'gruen-blau').
// SVG-ids vertragen zwar Umlaute, aber in url(#…)-Referenzen und CSS-Selektoren
// sind sie eine unnötige Fehlerquelle.
export function colorSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
}

// Relative Helligkeit (0–1) eines Hex-Farbwerts, gewichtet nach sRGB-Wahrnehmung.
function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return 0.299 * r + 0.587 * g + 0.114 * b
}

// Textfarbe für Beschriftungen AUF einem Farbpunkt (Grad-Zahl auf dem Karten-Dot).
// Bei Zweiton zählt der Mittelwert beider Hälften, weil die Zahl über beiden liegt.
export function colorInk(name: string | null | undefined): string {
  const stops = colorStops(name)
  const avg = stops.reduce((sum, s) => sum + luminance(s), 0) / stops.length
  return avg > 0.62 ? 'var(--ink)' : '#ffffff'
}

// Gegenfarbe zu colorInk – für den Halo (paint-order: stroke fill) unter der Zahl.
export function colorInkHalo(name: string | null | undefined): string {
  return colorInk(name) === 'var(--ink)' ? '#ffffff' : 'rgba(0,0,0,0.35)'
}

// SVG-Füllung für einen Farbpunkt: Vollton direkt als Hex, Zweiton als Verweis auf
// einen der in ColorDefs erzeugten Verläufe. Ein linear-gradient(...)-String wäre
// als SVG-fill ungültig – darum diese Umsetzung statt colorSwatch().
export function colorSvgFill(name: string | null | undefined, idPrefix: string): string {
  const stops = colorStops(name)
  return stops.length === 2 ? `url(#${idPrefix}-c-${colorSlug(name ?? '')})` : stops[0]
}
