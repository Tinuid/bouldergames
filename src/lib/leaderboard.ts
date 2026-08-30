// Wertung des Session-Leaderboards – eine Quelle der Wahrheit für alle drei Ansichten
// (kompakter Streifen in der Challenge, Treppchen und Liste auf der Ranglisten-Seite).
//
// Punkte werden hier NICHT gerechnet: sie stehen fertig in `results.points` (geschrieben
// von computePoints in scoring.ts) und werden nur aufsummiert. Flashes zählen wie bisher
// als Tops mit.

import type { Participant, Result } from '../types'

export interface LeaderboardRow {
  participant: Participant
  points: number
  // Inklusive der Flashes (ein Flash ist ein Top).
  tops: number
  flashes: number
  // Platzierung, 1-basiert. Gleiche PUNKTZAHL teilt sich den Platz (1, 2, 2, 4 …) –
  // dieselbe Konvention wie in der Rangliste eines einzelnen Boulders (BoulderRanking).
  rank: number
}

// Medaillenfarben für die ersten drei Plätze (Tokens --gold/--silver/--bronze).
// Index 0 = Platz 1. Von Leaderboard, LeaderboardSummary und Podium gemeinsam benutzt.
export const RANK_CLASSES = [
  'bg-gold text-[#3a2a06]',
  'bg-silver text-[#2a2d33]',
  'bg-bronze text-[#2e1a0c]',
]

// Klassen des Rang-Chips für eine Platzierung (1-basiert); ab Platz 4 neutral.
export function rankClass(rank: number): string {
  return RANK_CLASSES[rank - 1] ?? 'bg-surface-3 text-ink'
}

/**
 * Alle Teilnehmer, absteigend nach Punkten. Teilnehmer ohne Ergebnis stehen mit 0
 * Punkten am Ende. Sortierung wie bisher: Punkte, dann Tops, dann Name.
 */
export function computeLeaderboardRows(
  participants: Participant[],
  results: Result[],
): LeaderboardRow[] {
  const byParticipant = new Map<string, Omit<LeaderboardRow, 'rank'>>()
  for (const p of participants) {
    byParticipant.set(p.id, { participant: p, points: 0, tops: 0, flashes: 0 })
  }
  for (const r of results) {
    const row = byParticipant.get(r.participant_id)
    if (!row) continue
    row.points += r.points
    if (r.status === 'flash') {
      row.flashes += 1
      row.tops += 1
    } else if (r.status === 'top') {
      row.tops += 1
    }
  }

  const sorted = [...byParticipant.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.tops - a.tops ||
      a.participant.display_name.localeCompare(b.participant.display_name),
  )

  // Platz nur bei gleicher Punktzahl teilen – die Zahl neben dem Platz soll ihn erklären.
  // Der nächste Platz überspringt die geteilten (1, 2, 2, 4).
  let rank = 0
  let prevPoints: number | null = null
  return sorted.map((row, i) => {
    if (prevPoints === null || row.points !== prevPoints) {
      rank = i + 1
      prevPoints = row.points
    }
    return { ...row, rank }
  })
}

export interface LeaderboardSummaryData {
  // Eigene Zeile – null, wenn man (noch) nicht Teilnehmer ist.
  me: LeaderboardRow | null
  // Führende Zeile (Platz 1) – null bei leerer Session.
  leader: LeaderboardRow | null
  // Teilt man sich Platz 1 mit anderen?
  leaderShared: boolean
  total: number
  // Punkte-Abstand zum nächstbesseren Platz (null, wenn man führt oder nicht dabei ist).
  gapToNext: number | null
  // Der nächstbessere Platz selbst – wegen geteilter Plätze nicht immer `me.rank - 1`.
  nextRank: number | null
  // Punkte-Vorsprung auf den nächstschlechteren Platz (null, wenn niemand dahinter ist).
  leadOverNext: number | null
}

/**
 * Verdichtet die Zeilen auf das, was der kompakte Streifen und die angeheftete
 * "Dein Platz"-Leiste anzeigen.
 */
export function summarizeLeaderboard(
  rows: LeaderboardRow[],
  currentUserId: string | null,
): LeaderboardSummaryData {
  const leader = rows[0] ?? null
  const me =
    currentUserId === null
      ? null
      : (rows.find((r) => r.participant.user_id === currentUserId) ?? null)

  let gapToNext: number | null = null
  let nextRank: number | null = null
  let leadOverNext: number | null = null
  if (me) {
    const i = rows.indexOf(me)
    // Nächstbesserer = erster Eintrag davor mit MEHR Punkten (bei Gleichstand nicht "nach oben").
    for (let j = i - 1; j >= 0; j--) {
      if (rows[j].points > me.points) {
        gapToNext = rows[j].points - me.points
        nextRank = rows[j].rank
        break
      }
    }
    for (let j = i + 1; j < rows.length; j++) {
      if (rows[j].points < me.points) {
        leadOverNext = me.points - rows[j].points
        break
      }
    }
  }

  return {
    me,
    leader,
    leaderShared: leader != null && rows.filter((r) => r.rank === 1).length > 1,
    total: rows.length,
    gapToNext,
    nextRank,
    leadOverNext,
  }
}
