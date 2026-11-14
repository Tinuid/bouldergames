// Gerätelokaler Session-Verlauf (ohne Accounts).
// Speichert, an welchen Sessions dieses Gerät teilgenommen hat, damit man
// sie auf der Startseite wiederfindet und erneut betreten kann.

import type { GameMode } from '../types'

const KEY = 'boulder.history.v1'

export interface HistoryEntry {
  sessionId: string
  code: string
  name: string
  displayName: string
  // Spielmodus fürs Badge in „Zuletzt gespielt“. Optional: ältere Einträge haben ihn
  // nicht und bekommen ihn beim nächsten Öffnen der Session (SessionView).
  gameMode?: GameMode
  // Zeitpunkt des Spielendes (sessions.ends_at), aktualisiert beim Öffnen der Session.
  // Optional wie gameMode: ältere Einträge haben ihn nicht.
  endedAt?: string | null
  lastVisited: number
}

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HistoryEntry[]
    return parsed.sort((a, b) => b.lastVisited - a.lastVisited)
  } catch {
    return []
  }
}

export function rememberSession(entry: Omit<HistoryEntry, 'lastVisited'>): void {
  const now = Date.now()
  const existing = getHistory().filter((e) => e.sessionId !== entry.sessionId)
  const next = [{ ...entry, lastVisited: now }, ...existing].slice(0, 30)
  localStorage.setItem(KEY, JSON.stringify(next))
}

export function forgetSession(sessionId: string): void {
  const next = getHistory().filter((e) => e.sessionId !== sessionId)
  localStorage.setItem(KEY, JSON.stringify(next))
}
