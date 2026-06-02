// Verfügbare Hallen-Farben für die Boulder-Auswahl (eine Quelle der Wahrheit).
// `name` ist der in der DB persistierte Wert (kleingeschrieben), `swatch` der
// CSS-Hintergrund des Farbklecks – bei Zweiton-Farben ein 50/50-Verlauf.
export interface BoulderColor {
  name: string
  swatch: string
}

// swatch-Hex aus dem Chalk-Design (HOLD_LIST). `name` bleibt unverändert –
// das ist der in der DB persistierte Wert.
export const BOULDER_COLORS: BoulderColor[] = [
  { name: 'blau', swatch: '#2F6BEB' },
  { name: 'grün-blau', swatch: 'linear-gradient(135deg, #27B24A 0 50%, #2F6BEB 50% 100%)' },
  { name: 'gelb', swatch: '#E6B017' },
  { name: 'schwarz', swatch: '#1B2130' },
  { name: 'rot', swatch: '#E5484D' },
  { name: 'weiß', swatch: '#F4F2EC' },
  { name: 'mint', swatch: '#57E0A1' },
  { name: 'lila', swatch: '#A855F7' },
  { name: 'orange', swatch: '#F97316' },
  { name: 'grau', swatch: '#9AA1AC' },
  { name: 'hellblau', swatch: '#84CDF5' },
  { name: 'orange-schwarz', swatch: 'linear-gradient(135deg, #F97316 0 50%, #1B2130 50% 100%)' },
  { name: 'grün', swatch: '#27B24A' },
]

// CSS-Hintergrund zu einem gespeicherten Farbnamen (oder undefined, wenn unbekannt).
export function colorSwatch(name: string | null | undefined): string | undefined {
  if (!name) return undefined
  return BOULDER_COLORS.find((c) => c.name === name.trim().toLowerCase())?.swatch
}
