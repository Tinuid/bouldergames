import { describe, it, expect } from 'vitest'
import { computeLeaderboardRows, rankClass, summarizeLeaderboard } from './leaderboard'
import type { Participant, Result, ResultStatus } from '../types'

function participant(id: string, name: string, userId = `u-${id}`): Participant {
  return {
    id,
    session_id: 's1',
    user_id: userId,
    display_name: name,
    joined_at: '2026-08-30T10:00:00Z',
  }
}

function result(
  participantId: string,
  status: ResultStatus,
  points: number,
  boulderId = `b-${participantId}-${points}-${status}`,
): Result {
  return {
    id: `r-${boulderId}`,
    session_id: 's1',
    boulder_id: boulderId,
    participant_id: participantId,
    status,
    attempts: status === 'flash' ? 1 : 2,
    points,
    updated_at: '2026-08-30T10:00:00Z',
  }
}

describe('computeLeaderboardRows', () => {
  it('summiert Punkte und sortiert absteigend', () => {
    const rows = computeLeaderboardRows(
      [participant('p1', 'Mia'), participant('p2', 'Ben')],
      [result('p1', 'top', 20), result('p1', 'flash', 30), result('p2', 'top', 25)],
    )
    expect(rows.map((r) => [r.participant.display_name, r.points])).toEqual([
      ['Mia', 50],
      ['Ben', 25],
    ])
  })

  it('zählt Flashes als Tops mit', () => {
    const rows = computeLeaderboardRows(
      [participant('p1', 'Mia')],
      [result('p1', 'flash', 30), result('p1', 'top', 20), result('p1', 'fail', -10)],
    )
    expect(rows[0].tops).toBe(2)
    expect(rows[0].flashes).toBe(1)
  })

  it('nimmt Teilnehmer ohne Ergebnis mit 0 Punkten ans Ende', () => {
    const rows = computeLeaderboardRows(
      [participant('p1', 'Mia'), participant('p2', 'Ben')],
      [result('p1', 'top', 20)],
    )
    expect(rows[1].participant.display_name).toBe('Ben')
    expect(rows[1].points).toBe(0)
    expect(rows[1].rank).toBe(2)
  })

  it('ignoriert Ergebnisse fremder Teilnehmer', () => {
    const rows = computeLeaderboardRows(
      [participant('p1', 'Mia')],
      [result('p1', 'top', 20), result('p99', 'top', 999)],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].points).toBe(20)
  })

  it('teilt bei gleicher Punktzahl den Platz und überspringt danach (1, 2, 2, 4)', () => {
    const rows = computeLeaderboardRows(
      [
        participant('p1', 'Mia'),
        participant('p2', 'Ben'),
        participant('p3', 'Chris'),
        participant('p4', 'Dana'),
      ],
      [
        result('p1', 'flash', 30),
        result('p2', 'top', 20),
        result('p3', 'top', 20),
        result('p4', 'top', 10),
      ],
    )
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 2, 4])
  })

  it('trennt bei gleichen Punkten nach Tops, teilt den Platz aber trotzdem', () => {
    // Ben hat mehr Tops und steht vorn – die Punktzahl ist gleich, also derselbe Platz.
    const rows = computeLeaderboardRows(
      [participant('p1', 'Ann'), participant('p2', 'Ben')],
      [result('p1', 'flash', 20), result('p2', 'top', 10), result('p2', 'top', 10)],
    )
    expect(rows.map((r) => r.participant.display_name)).toEqual(['Ben', 'Ann'])
    expect(rows.map((r) => r.rank)).toEqual([1, 1])
  })

  it('sortiert bei gleichen Punkten und Tops nach Namen', () => {
    const rows = computeLeaderboardRows(
      [participant('p2', 'Zoe'), participant('p1', 'Ann')],
      [result('p1', 'top', 20), result('p2', 'top', 20)],
    )
    expect(rows.map((r) => r.participant.display_name)).toEqual(['Ann', 'Zoe'])
  })

  it('liefert für eine leere Session eine leere Liste', () => {
    expect(computeLeaderboardRows([], [])).toEqual([])
  })
})

describe('summarizeLeaderboard', () => {
  const participants = [
    participant('p1', 'Mia'),
    participant('p2', 'Chris'),
    participant('p3', 'Ben'),
  ]
  const results = [result('p1', 'flash', 128), result('p2', 'top', 112), result('p3', 'top', 96)]
  const rows = computeLeaderboardRows(participants, results)

  it('findet die eigene Zeile, den Führenden und den Abstand nach oben', () => {
    const s = summarizeLeaderboard(rows, 'u-p2')
    expect(s.me?.rank).toBe(2)
    expect(s.me?.points).toBe(112)
    expect(s.leader?.participant.display_name).toBe('Mia')
    expect(s.total).toBe(3)
    expect(s.gapToNext).toBe(16)
    expect(s.leadOverNext).toBe(16)
  })

  it('meldet keinen Abstand nach oben, wenn man selbst führt', () => {
    const s = summarizeLeaderboard(rows, 'u-p1')
    expect(s.gapToNext).toBeNull()
    expect(s.leadOverNext).toBe(16)
    expect(s.leaderShared).toBe(false)
  })

  it('meldet keinen Vorsprung, wenn niemand dahinter ist', () => {
    const s = summarizeLeaderboard(rows, 'u-p3')
    expect(s.leadOverNext).toBeNull()
    expect(s.gapToNext).toBe(16)
  })

  it('liefert ohne eigenen Teilnehmer nur den Führenden', () => {
    const s = summarizeLeaderboard(rows, 'u-fremd')
    expect(s.me).toBeNull()
    expect(s.leader?.points).toBe(128)
    expect(s.gapToNext).toBeNull()
  })

  it('überspringt bei Gleichstand den geteilten Platz statt ihn als Abstand 0 zu melden', () => {
    const tied = computeLeaderboardRows(
      [participant('p1', 'Mia'), participant('p2', 'Chris'), participant('p3', 'Ben')],
      [result('p1', 'top', 50), result('p2', 'top', 50), result('p3', 'top', 20)],
    )
    const s = summarizeLeaderboard(tied, 'u-p2')
    expect(s.me?.rank).toBe(1)
    expect(s.gapToNext).toBeNull()
    expect(s.leaderShared).toBe(true)
    expect(s.leadOverNext).toBe(30)
  })

  it('kommt mit einer leeren Session klar', () => {
    const s = summarizeLeaderboard([], 'u-p1')
    expect(s.me).toBeNull()
    expect(s.leader).toBeNull()
    expect(s.total).toBe(0)
  })
})

describe('rankClass', () => {
  it('vergibt Gold/Silber/Bronze für die ersten drei und danach neutral', () => {
    expect(rankClass(1)).toContain('bg-gold')
    expect(rankClass(2)).toContain('bg-silver')
    expect(rankClass(3)).toContain('bg-bronze')
    expect(rankClass(4)).toContain('bg-surface-3')
  })
})
