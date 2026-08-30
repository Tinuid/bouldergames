import { useEffect, useMemo, useRef, useState } from 'react'
import { computeLeaderboardRows, rankClass, summarizeLeaderboard } from '../lib/leaderboard'
import type { Participant, Result } from '../types'
import { ChevronRight } from './icons'

/**
 * Kompakter Leaderboard-Streifen für den Kopf der Challenge: eigener Platz, eigene Punkte
 * und wer führt. Ersetzt die vollständige Liste an dieser Stelle – die steht jetzt auf der
 * eigenen Ranglisten-Seite, die ein Tipp hier öffnet (onOpen).
 *
 * Punkte kommen fertig aus `results.points`; gerechnet wird nur in lib/leaderboard.ts.
 */
export default function LeaderboardSummary({
  participants,
  results,
  currentUserId,
  onOpen,
}: {
  participants: Participant[]
  results: Result[]
  currentUserId: string | null
  onOpen: () => void
}) {
  const { me, leader, leaderShared, total, gapToNext, nextRank, leadOverNext } = useMemo(
    () => summarizeLeaderboard(computeLeaderboardRows(participants, results), currentUserId),
    [participants, results, currentUserId],
  )

  // Kurzer Puls, wenn sich die eigene Punktzahl ändert (wie zuvor in der Liste).
  const prevScore = useRef<number | null>(null)
  const [bump, setBump] = useState(false)
  useEffect(() => {
    const score = me?.points ?? null
    if (prevScore.current !== null && score !== null && score !== prevScore.current) {
      setBump(true)
      const t = setTimeout(() => setBump(false), 650)
      prevScore.current = score
      return () => clearTimeout(t)
    }
    prevScore.current = score
  }, [me])

  const iAmLeader = me != null && leader != null && me.participant.id === leader.participant.id

  // Zweite Zeile: die Einordnung. Wer selbst führt, sieht seinen Vorsprung.
  let hint: string
  if (leader == null) {
    hint = 'Noch keine Teilnehmer'
  } else if (iAmLeader) {
    if (leaderShared) hint = `Gleichauf an der Spitze mit ${leader.points}`
    else if (leadOverNext != null) hint = `Du führst mit ${leadOverNext} Punkten Vorsprung`
    else hint = 'Du führst'
  } else if (gapToNext != null && nextRank != null) {
    hint = `${leader.participant.display_name} führt mit ${leader.points} · ${gapToNext} bis Platz ${nextRank}`
  } else {
    hint = `${leader.participant.display_name} führt mit ${leader.points}`
  }

  const label = me
    ? `Leaderboard öffnen – Platz ${me.rank} von ${total}, ${me.points} Punkte`
    : 'Leaderboard öffnen'

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      className={`card w-full !p-0 text-left transition active:scale-[0.99] hover:border-border-strong ${
        bump ? 'animate-bump' : ''
      }`}
    >
      <div className="px-[14px] pb-[14px] pt-3">
        <div className="mb-[9px] flex items-center justify-between">
          <span className="section-label">{me ? 'Dein Stand' : 'Leaderboard'}</span>
          <ChevronRight className="text-[18px] text-faint" />
        </div>

        {me ? (
          <div className="flex items-center gap-3">
            <span
              className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full font-num text-[19px] font-bold tabular-nums ${rankClass(
                me.rank,
              )}`}
            >
              {me.rank}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-display text-[17px] font-bold tracking-[-0.01em]">
                <span>
                  Platz {me.rank} von {total}
                </span>
                <span className="rounded-md bg-ok-soft px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-ok">
                  du
                </span>
              </div>
              <div className="mt-0.5 truncate text-[12.5px] text-muted">{hint}</div>
            </div>
            <div className="flex shrink-0 flex-col items-end">
              <span className="font-num text-[30px] font-bold leading-none tracking-[-0.02em] tabular-nums">
                {me.points}
              </span>
              <span className="mt-[3px] text-[11.5px] text-faint">Punkte</span>
            </div>
          </div>
        ) : (
          // Session über einen geteilten Link geöffnet, noch nicht beigetreten.
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-display text-[17px] font-bold tracking-[-0.01em]">
                {total === 1 ? '1 Teilnehmer' : `${total} Teilnehmer`}
              </div>
              <div className="mt-0.5 truncate text-[12.5px] text-muted">
                {leader ? `${leader.participant.display_name} führt mit ${leader.points}` : hint}
              </div>
            </div>
            {leader && (
              <span className="font-num text-[30px] font-bold leading-none tracking-[-0.02em] tabular-nums text-faint">
                {leader.points}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
