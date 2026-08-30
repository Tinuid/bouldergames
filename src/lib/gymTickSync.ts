// Abgleich Challenge → Hallenkarte: Was du in einer Challenge geflasht oder getoppt
// hast, gilt auf der Karte als "erledigt" (gym_ticks.state = 'done').
//
// Warum das rein client-seitig läuft: gym_ticks ist per RLS strikt privat
// (user_id = auth.uid() auf allen vier Verben, Migration 0015). Nur das eigene Gerät
// darf die eigenen Marken schreiben – ein Abgleich beim Öffnen der Challenge bleibt
// damit innerhalb der bestehenden Policies und braucht weder Trigger noch RPC. Nettes
// Nebenergebnis: trägt bei shared_scoring jemand anderes mein Ergebnis ein, setzt
// trotzdem mein Gerät die Marke, sobald ich die Challenge das nächste Mal öffne.
//
// "Genau einmal setzen": pro Session merkt sich das Gerät, welche Karten-Boulder es
// schon automatisch markiert hat. Entfernt man eine Marke später von Hand auf der
// Karte, kommt sie nicht zurück – die Hand-Korrektur gewinnt. Aus demselben Grund
// bleibt die Marke stehen, wenn ein Top nachträglich auf open/fail korrigiert wird:
// das Löschen einer Marke gehört auf die Karte.

import type { Boulder, Result } from '../types'

// Namensschema wie bg:hideOthers:<sessionId> in SessionView.
const keyFor = (sessionId: string) => `bg:gymTicks:${sessionId}`

// Karten-Boulder, für die die Marke noch zu setzen ist: eigenes Ergebnis flash/top,
// Boulder stammt von der Karte, und noch nicht abgeglichen. Pur und damit testbar.
export function pendingDoneTicks(
  boulders: Boulder[],
  myResults: Map<string, Result>,
  synced: string[],
): string[] {
  const done = new Set(synced)
  const out = new Set<string>()
  for (const b of boulders) {
    if (b.gym_boulder_id == null || done.has(b.gym_boulder_id)) continue
    const status = myResults.get(b.id)?.status
    if (status === 'flash' || status === 'top') out.add(b.gym_boulder_id)
  }
  return [...out]
}

// try/catch wie in localHistory.ts: im Privatmodus mancher Browser wirft schon der
// Zugriff auf localStorage. Der Abgleich ist eine Bequemlichkeit – er darf die
// Challenge nie beschädigen.
export function readSyncedTicks(sessionId: string): string[] {
  try {
    const raw = localStorage.getItem(keyFor(sessionId))
    return raw ? raw.split(',').filter(Boolean) : []
  } catch {
    return []
  }
}

export function writeSyncedTicks(sessionId: string, ids: string[]): void {
  try {
    localStorage.setItem(keyFor(sessionId), ids.join(','))
  } catch {
    /* ohne Gedächtnis weiter – dann wird beim nächsten Öffnen erneut abgeglichen */
  }
}
