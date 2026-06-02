// Verfügbare Hallen-Farben für die Boulder-Auswahl (eine Quelle der Wahrheit).
// `name` ist der in der DB persistierte Wert (kleingeschrieben), `swatch` der
// CSS-Hintergrund des Farbklecks – bei Zweiton-Farben ein 50/50-Verlauf.
export interface BoulderColor {
  name: string
  swatch: string
}

export const BOULDER_COLORS: BoulderColor[] = [
  { name: 'blau', swatch: '#3b82f6' },
  { name: 'grün-blau', swatch: 'linear-gradient(135deg, #22c55e 0 50%, #3b82f6 50% 100%)' },
  { name: 'gelb', swatch: '#eab308' },
  { name: 'schwarz', swatch: '#0f172a' },
  { name: 'rot', swatch: '#ef4444' },
  { name: 'weiß', swatch: '#f8fafc' },
  { name: 'mint', swatch: '#6ee7b7' },
  { name: 'lila', swatch: '#a855f7' },
  { name: 'orange', swatch: '#f97316' },
  { name: 'grau', swatch: '#94a3b8' },
  { name: 'hellblau', swatch: '#7dd3fc' },
  { name: 'orange-schwarz', swatch: 'linear-gradient(135deg, #f97316 0 50%, #0f172a 50% 100%)' },
  { name: 'grün', swatch: '#22c55e' },
]

// CSS-Hintergrund zu einem gespeicherten Farbnamen (oder undefined, wenn unbekannt).
export function colorSwatch(name: string | null | undefined): string | undefined {
  if (!name) return undefined
  return BOULDER_COLORS.find((c) => c.name === name.trim().toLowerCase())?.swatch
}
