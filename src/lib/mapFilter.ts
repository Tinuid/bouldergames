// Filterzustand der Hallenkarte.
//
// Bewusst ein einfaches, serialisierbares Objekt (Arrays statt Sets): so lässt es
// sich gerätelokal merken und später in die URL legen. Gefiltert wird komplett
// client-seitig über das einmal geladene Boulder-Array – bei ein paar hundert
// Zeilen braucht das keine Datenbank-Abfrage.

import type { GymTickState } from '../types'

export interface MapFilter {
  difficulties: number[]
  areas: string[]
  colors: string[]
  // Ein 3-Wege-Segment statt zweier unabhängiger Schalter: die echten Fragen sind
  // "was fehlt mir noch", "was habe ich geschafft" und "meine Projekte". Zwei
  // Tri-States ergäben neun Kombinationen, von denen mehrere strukturell leer sind
  // (erledigt löscht das Projekt).
  tick: 'alle' | 'offen' | 'erledigt'
  onlyProjects: boolean
}

// Leere Auswahl heißt "alle" – das ist eindeutig und macht Zurücksetzen trivial.
export const EMPTY_FILTER: MapFilter = {
  difficulties: [],
  areas: [],
  colors: [],
  tick: 'alle',
  onlyProjects: false,
}

export function isFiltering(f: MapFilter): boolean {
  return (
    f.difficulties.length > 0 ||
    f.areas.length > 0 ||
    f.colors.length > 0 ||
    f.tick !== 'alle' ||
    f.onlyProjects
  )
}

export function activeFilterCount(f: MapFilter): number {
  return (
    f.difficulties.length +
    f.areas.length +
    f.colors.length +
    (f.tick !== 'alle' ? 1 : 0) +
    (f.onlyProjects ? 1 : 0)
  )
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
  if (f.onlyProjects && tick !== 'project') return false
  if (f.tick === 'erledigt' && tick !== 'done') return false
  if (f.tick === 'offen' && tick === 'done') return false
  return true
}
