// Wertung des Session-Leaderboards – EINE Quelle der Wahrheit für alle Ansichten
// (kompakter Streifen in der Challenge, Ranglisten-Seite, „Dein Platz“, Spieler-Vergleich,
// Rangliste eines Boulders, Endstand).
//
// Einstieg ist scoreSession(): es liefert die fertigen Zeilen (Score, Rang, Tiebreak) und
// je Ergebnis die Punkte, die tatsächlich zählen. Komponenten summieren NICHT selbst
// `results.points`, sondern bekommen diese Werte gereicht – so kann ein künftiger Modus mit
// relativer Wertung (Beste N, Seltenheit …) hier eingreifen, ohne jede Ansicht anzufassen.
//
// Für die heutigen Modi (Standard, Nur Flash) zählt einfach `results.points` (geschrieben
// von computePoints in scoring.ts). Flashes zählen wie bisher als Tops mit.

import type { Boulder, Participant, Result, Session } from '../types'

export interface LeaderboardRow {
  participant: Participant
  // Wertungszahl der Zeile – heute die Summe der zählenden Punkte. Ein Modus kann später
  // etwas anderes hineinlegen (z.B. Anzahl Bereiche); Anzeigen nennen sie trotzdem „Punkte“.
  score: number
  // Inklusive der Flashes (ein Flash ist ein Top).
  tops: number
  flashes: number
  // Hat die Challenge verlassen (participants.left_at, Migration 0023): bleibt mit
  // seinen Ergebnissen in der Wertung, wird aber ausgegraut und ist nie „du“.
  inactive: boolean
  // Weitere Rangkriterien nach dem Score, absteigend verglichen (höher = besser). Gleicher
  // Score UND gleicher Tiebreak teilen sich den Platz. Heute leer.
  tiebreak: number[]
  // Platzierung, 1-basiert. Gleiche Wertung teilt sich den Platz (1, 2, 2, 4 …) –
  // dieselbe Konvention wie in der Rangliste eines einzelnen Boulders (BoulderRanking).
  rank: number
}

export interface SessionScore {
  rows: LeaderboardRow[]
  // Zählende Punkte je Ergebnis (results.id). Ansichten lesen Punkte nur hier.
  pointsByResult: Map<string, number>
}

// Medaillenfarben für die ersten drei Plätze (Tokens --gold/--silver/--bronze).
// Index 0 = Platz 1. Von RankMedal (Liste + „Dein Platz“-Leiste) und LeaderboardSummary
// gemeinsam benutzt.
export const RANK_CLASSES = [
  'bg-gold text-[#3a2a06]',
  'bg-silver text-[#2a2d33]',
  'bg-bronze text-[#2e1a0c]',
]

// Klassen des Rang-Chips für eine Platzierung (1-basiert); ab Platz 4 neutral.
export function rankClass(rank: number): string {
  return RANK_CLASSES[rank - 1] ?? 'bg-surface-3 text-ink'
}

// Dieselbe Farbe noch einmal als CSS-Wert: das Bändchen der Medaille mischt daraus
// seinen dunkleren Ton, und dafür taugt eine Tailwind-Klasse nicht.
// null ab Platz 4 – dort gibt es keine Medaille.
const RANK_TOKENS = ['var(--gold)', 'var(--silver)', 'var(--bronze)']

export function rankToken(rank: number): string | null {
  return RANK_TOKENS[rank - 1] ?? null
}

/**
 * Wertet eine ganze Challenge aus. Bekommt bewusst die ganze Session (nicht nur die
 * Punkteregeln), damit spätere Modus-Parameter ohne neue Signatur ankommen.
 *
 * Erweiterungspunkt: Ein Modus mit relativer Wertung setzt hier eigene zählende Punkte
 * (pointsByResult) und ggf. einen Tiebreak je Zeile. Für Standard und Nur Flash zählen
 * die gespeicherten `results.points` unverändert.
 */
export function scoreSession(input: {
  session: Pick<Session, 'game_mode'> | null
  participants: Participant[]
  boulders: Boulder[]
  results: Result[]
}): SessionScore {
  const { participants, results } = input
  // switch (input.session?.game_mode) { … } – künftige Modi mit eigener Wertung.
  const pointsByResult = new Map(results.map((r) => [r.id, r.points]))
  return { rows: computeLeaderboardRows(participants, results, pointsByResult), pointsByResult }
}

// Höher ist besser: positiv, wenn a vor b gehört.
function compareTiebreak(a: number[], b: number[]): number {
  const n = Math.max(a.length, b.length)
  for (let i = 0; i < n; i++) {
    const d = (b[i] ?? 0) - (a[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

// Gleiche Wertung (Score und Tiebreak) ⇒ gleicher Platz.
function sameStanding(a: LeaderboardRow, b: LeaderboardRow): boolean {
  return a.score === b.score && compareTiebreak(a.tiebreak, b.tiebreak) === 0
}

/**
 * Alle Teilnehmer, absteigend nach Score. Teilnehmer ohne Ergebnis stehen mit 0
 * Punkten am Ende. Sortierung: Score, Tiebreak, dann Tops, dann Name – Tops und Name
 * ordnen nur die Anzeige, der Platz wird bei gleichem Score und Tiebreak geteilt.
 * `pointsByResult` = zählende Punkte je Ergebnis (Standard: results.points).
 */
export function computeLeaderboardRows(
  participants: Participant[],
  results: Result[],
  pointsByResult?: Map<string, number>,
): LeaderboardRow[] {
  const byParticipant = new Map<string, Omit<LeaderboardRow, 'rank'>>()
  for (const p of participants) {
    byParticipant.set(p.id, {
      participant: p,
      score: 0,
      tops: 0,
      flashes: 0,
      inactive: p.left_at != null,
      tiebreak: [],
    })
  }
  for (const r of results) {
    const row = byParticipant.get(r.participant_id)
    if (!row) continue
    row.score += pointsByResult?.get(r.id) ?? r.points
    if (r.status === 'flash') {
      row.flashes += 1
      row.tops += 1
    } else if (r.status === 'top') {
      row.tops += 1
    }
  }

  const sorted = [...byParticipant.values()].sort(
    (a, b) =>
      b.score - a.score ||
      compareTiebreak(a.tiebreak, b.tiebreak) ||
      b.tops - a.tops ||
      a.participant.display_name.localeCompare(b.participant.display_name),
  )

  // Platz nur bei gleicher Wertung teilen – die Zahl neben dem Platz soll ihn erklären.
  // Der nächste Platz überspringt die geteilten (1, 2, 2, 4).
  const ranked: LeaderboardRow[] = []
  sorted.forEach((row, i) => {
    const prev = ranked[i - 1]
    const candidate = { ...row, rank: i + 1 }
    ranked.push(
      prev && sameStanding(prev, candidate) ? { ...candidate, rank: prev.rank } : candidate,
    )
  })
  return ranked
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
      : (rows.find((r) => !r.inactive && r.participant.user_id === currentUserId) ?? null)

  let gapToNext: number | null = null
  let nextRank: number | null = null
  let leadOverNext: number | null = null
  if (me) {
    const i = rows.indexOf(me)
    // Nächstbesserer = erster Eintrag davor mit MEHR Punkten (bei Gleichstand nicht "nach oben").
    for (let j = i - 1; j >= 0; j--) {
      if (rows[j].score > me.score) {
        gapToNext = rows[j].score - me.score
        nextRank = rows[j].rank
        break
      }
    }
    for (let j = i + 1; j < rows.length; j++) {
      if (rows[j].score < me.score) {
        leadOverNext = me.score - rows[j].score
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
