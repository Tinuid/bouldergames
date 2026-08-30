import { useEffect, useMemo, useRef, useState } from 'react'
import { computeLeaderboardRows, rankClass } from '../lib/leaderboard'
import type { Participant, Result } from '../types'

/**
 * Vollständige Leaderboard-Liste. Steht seit der kompakten Kopfzeile in der Challenge
 * (LeaderboardSummary) nur noch auf der Ranglisten-Seite – dort unterhalb des Treppchens,
 * daher `skipTop`, das die bereits im Treppchen gezeigten Zeilen auslässt.
 *
 * Punkte kommen fertig aus `results.points`; gerechnet wird nur in lib/leaderboard.ts.
 */
export default function Leaderboard({
  participants,
  results,
  currentUserId,
  onSelectPlayer,
  skipTop = 0,
  title = 'Leaderboard',
}: {
  participants: Participant[]
  results: Result[]
  currentUserId: string | null
  // Optional: Klick auf eine Zeile öffnet die Detailansicht des Spielers.
  onSelectPlayer?: (participant: Participant) => void
  // Die ersten n Zeilen auslassen (die Ranglisten-Seite zeigt sie im Treppchen).
  skipTop?: number
  title?: string
}) {
  const rows = useMemo(() => computeLeaderboardRows(participants, results), [participants, results])
  const visible = useMemo(() => rows.slice(skipTop), [rows, skipTop])

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
      <h2 className="section-label px-3 pb-2.5 pt-3.5">{title}</h2>
      <ol className="flex flex-col gap-1">
        {visible.map((row) => {
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
                  className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full font-num text-[14px] font-bold ${rankClass(
                    row.rank,
                  )}`}
                >
                  {row.rank}
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
        {visible.length === 0 && (
          <li className="px-3 py-2 text-muted">
            {rows.length === 0 ? 'Noch keine Teilnehmer.' : 'Keine weiteren Teilnehmer.'}
          </li>
        )}
      </ol>
    </div>
  )
}
