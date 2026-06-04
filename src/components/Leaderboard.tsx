import { useEffect, useMemo, useRef, useState } from 'react'
import type { Participant, Result } from '../types'

interface Row {
  participant: Participant
  points: number
  tops: number
  flashes: number
}

const RANK_CLASSES = [
  'bg-gold text-[#3a2a06]',
  'bg-silver text-[#2a2d33]',
  'bg-bronze text-[#2e1a0c]',
]

export default function Leaderboard({
  participants,
  results,
  currentUserId,
  onSelectPlayer,
}: {
  participants: Participant[]
  results: Result[]
  currentUserId: string | null
  // Optional: Klick auf eine Zeile öffnet die Detailansicht des Spielers.
  onSelectPlayer?: (participant: Participant) => void
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
      (a, b) =>
        b.points - a.points ||
        b.tops - a.tops ||
        a.participant.display_name.localeCompare(b.participant.display_name),
    )
  }, [participants, results])

  // Kurzer Puls auf der eigenen Zeile, wenn sich die eigene Punktzahl ändert.
  const myRow = useMemo(
    () => rows.find((r) => currentUserId !== null && r.participant.user_id === currentUserId),
    [rows, currentUserId],
  )
  const prevScore = useRef<number | null>(null)
  const [bump, setBump] = useState(false)
  useEffect(() => {
    const score = myRow?.points ?? null
    if (prevScore.current !== null && score !== null && score !== prevScore.current) {
      setBump(true)
      const t = setTimeout(() => setBump(false), 650)
      prevScore.current = score
      return () => clearTimeout(t)
    }
    prevScore.current = score
  }, [myRow])

  return (
    <div className="card !p-1.5">
      <h2 className="section-label px-3 pb-2.5 pt-3.5">Leaderboard</h2>
      <ol className="flex flex-col gap-1">
        {rows.map((row, i) => {
          const isMe = currentUserId !== null && row.participant.user_id === currentUserId
          return (
            <li
              key={row.participant.id}
              className={`rounded-sm2 ${
                isMe
                  ? 'bg-ok-soft shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--ok)_40%,transparent)]'
                  : ''
              } ${isMe && bump ? 'animate-bump' : ''}`}
            >
              <button
                type="button"
                disabled={!onSelectPlayer}
                onClick={() => onSelectPlayer?.(row.participant)}
                aria-label={`Details zu ${row.participant.display_name}`}
                className="flex w-full items-center gap-3 rounded-sm2 px-3 py-2.5 text-left transition enabled:hover:bg-surface-2"
              >
                <span
                  className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full font-num text-[14px] font-bold ${
                    RANK_CLASSES[i] ?? 'bg-surface-3 text-ink'
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-display text-[17px] font-bold">
                    <span className="truncate">{row.participant.display_name}</span>
                    {isMe && (
                      <span className="rounded-md bg-ok-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ok">
                        du
                      </span>
                    )}
                  </div>
                  <div className="text-[12.5px] text-muted">
                    {row.tops} Tops · {row.flashes} Flashes
                  </div>
                </div>
                <span className="font-num text-[30px] font-bold leading-none tracking-[-0.02em] tabular-nums">
                  {row.points}
                </span>
              </button>
            </li>
          )
        })}
        {rows.length === 0 && <li className="px-3 py-2 text-muted">Noch keine Teilnehmer.</li>}
      </ol>
    </div>
  )
}
