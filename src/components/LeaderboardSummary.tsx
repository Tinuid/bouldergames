import { useEffect, useMemo, useRef, useState } from 'react'
import { rankClass, summarizeLeaderboard, type LeaderboardRow } from '../lib/leaderboard'
import { ChevronRight } from './icons'

/**
 * Kompakter Leaderboard-Streifen für den Kopf der Challenge: eigener Platz, eigene Punkte
 * und wer führt. Ersetzt die vollständige Liste an dieser Stelle – die steht jetzt auf der
 * eigenen Ranglisten-Seite, die ein Tipp hier öffnet (onOpen).
 *
 * Bekommt die fertigen Zeilen aus scoreSession (lib/leaderboard.ts) – hier wird nichts gerechnet.
 */
export default function LeaderboardSummary({
  rows,
  currentUserId,
  onOpen,
}: {
  rows: LeaderboardRow[]
  currentUserId: string | null
  onOpen: () => void
}) {
  const { me, leader, leaderShared, total, leadOverNext } = useMemo(
    () => summarizeLeaderboard(rows, currentUserId),
    [rows, currentUserId],
  )

  // Kurzer Puls, wenn sich die eigene Punktzahl ändert (wie zuvor in der Liste).
  const prevScore = useRef<number | null>(null)
  const [bump, setBump] = useState(false)
  useEffect(() => {
    const score = me?.score ?? null
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
    if (leaderShared) hint = `Gleichauf an der Spitze mit ${leader.score}`
    else if (leadOverNext != null) hint = `Du führst mit ${leadOverNext} Punkten Vorsprung`
    else hint = 'Du führst'
  } else {
    // Bewusst ohne den Abstand zum nächsten Platz – die Zahl brauchte hier niemand.
    // Auf der Ranglisten-Seite steht sie weiterhin in der „Dein Platz“-Leiste.
    hint = `${leader.participant.display_name} führt mit ${leader.score}`
  }

  const label = me
    ? `Leaderboard öffnen – Platz ${me.rank} von ${total}, ${me.score} Punkte`
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
          <span className="section-label">Leaderboard</span>
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
                {me.score}
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
                {leader ? `${leader.participant.display_name} führt mit ${leader.score}` : hint}
              </div>
            </div>
            {leader && (
              <span className="font-num text-[30px] font-bold leading-none tracking-[-0.02em] tabular-nums text-faint">
                {leader.score}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
