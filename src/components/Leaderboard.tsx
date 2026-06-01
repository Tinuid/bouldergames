import { useMemo } from 'react'
import type { Participant, Result } from '../types'

interface Row {
  participant: Participant
  points: number
  tops: number
  flashes: number
}

export default function Leaderboard({
  participants,
  results,
  currentUserId,
}: {
  participants: Participant[]
  results: Result[]
  currentUserId: string | null
}) {
  const rows = useMemo<Row[]>(() => {
    const byParticipant = new Map<string, Row>()
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
    return [...byParticipant.values()].sort(
      (a, b) => b.points - a.points || b.tops - a.tops || a.participant.display_name.localeCompare(b.participant.display_name),
    )
  }, [participants, results])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="card">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Leaderboard
      </h2>
      <ol className="flex flex-col gap-1">
        {rows.map((row, i) => {
          const isMe = currentUserId !== null && row.participant.user_id === currentUserId
          return (
            <li
              key={row.participant.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                isMe ? 'bg-brand/10 ring-1 ring-brand/40' : ''
              }`}
            >
              <span className="w-7 text-center text-lg">{medals[i] ?? i + 1}</span>
              <div className="flex-1">
                <div className="font-semibold">
                  {row.participant.display_name}
                  {isMe && <span className="ml-1 text-xs text-brand">(du)</span>}
                </div>
                <div className="text-xs text-slate-400">
                  {row.tops} Tops · {row.flashes} Flashes
                </div>
              </div>
              <span className="text-xl font-bold tabular-nums">{row.points}</span>
            </li>
          )
        })}
        {rows.length === 0 && (
          <li className="px-3 py-2 text-slate-500">Noch keine Teilnehmer.</li>
        )}
      </ol>
    </div>
  )
}
