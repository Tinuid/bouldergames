// Filterzustand der Hallenkarte.
//
// Bewusst ein einfaches, serialisierbares Objekt (Arrays statt Sets): so lässt es
// sich gerätelokal merken und später in die URL legen. Gefiltert wird komplett
// client-seitig über das einmal geladene Boulder-Array – bei ein paar hundert
// Zeilen braucht das keine Datenbank-Abfrage.

import type { GymTickState } from '../types'

export interface MapFilter {
  difficulties: number[]
  // Bereichsfilter: im UI derzeit nicht angeboten (die Karte zeigt ohnehin, wo
  // etwas hängt), im Modell aber erhalten – so lässt er sich ohne Migration
  // gespeicherter Filter wieder einblenden.
  areas: string[]
  colors: string[]
  // Eine einzige Auswahl statt Segment plus Extra-Schalter: "Projekte" ist keine
  // eigene Achse, sondern eine der Antworten auf dieselbe Frage. Das spart eine
  // Zeile und schließt sinnlose Kombinationen aus ("nur erledigt" + "nur Projekte").
  // "Offen" heißt: alles, was nicht erledigt ist – Projekte also eingeschlossen.
  tick: 'alle' | 'offen' | 'erledigt' | 'projekte'
}

// Leere Auswahl heißt "alle" – das ist eindeutig und macht Zurücksetzen trivial.
export const EMPTY_FILTER: MapFilter = {
  difficulties: [],
  areas: [],
  colors: [],
  tick: 'alle',
}

export function isFiltering(f: MapFilter): boolean {
  return f.difficulties.length > 0 || f.areas.length > 0 || f.colors.length > 0 || f.tick !== 'alle'
}

export function activeFilterCount(f: MapFilter): number {
  return f.difficulties.length + f.areas.length + f.colors.length + (f.tick !== 'alle' ? 1 : 0)
}

export function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export function matchesFilter(
  f: MapFilter,
  b: { difficulty: number; color: string; area: string | null },
  tick: GymTickState | null,
): boolean {
  if (f.difficulties.length > 0 && !f.difficulties.includes(b.difficulty)) return false
  if (f.colors.length > 0 && !f.colors.includes(b.color)) return false
  if (f.areas.length > 0 && (b.area == null || !f.areas.includes(b.area))) return false
  if (f.tick === 'erledigt' && tick !== 'done') return false
  if (f.tick === 'projekte' && tick !== 'project') return false
  if (f.tick === 'offen' && tick === 'done') return false
  return true
}
