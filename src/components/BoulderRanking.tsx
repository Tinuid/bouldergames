import { useMemo } from 'react'
import { colorSwatch } from '../lib/colors'
import { difficultyLabel } from '../lib/difficulty'
import { STATUS_LABELS } from '../lib/scoring'
import type { Boulder, Participant, Result, ResultStatus } from '../types'
import { X } from './icons'
import { useDialogEscape } from '../hooks/useDialogEscape'

/**
 * Vollbild-Overlay mit der Rangliste eines einzelnen Boulders (per Klick auf den Boulder-Kopf
 * in BoulderCard geöffnet). Zeigt alle Teilnehmer, absteigend nach ihren Punkten an diesem
 * Boulder sortiert. Gleiche Punktzahl teilt sich den Platz (1, 2, 2, 4 …). Teilnehmer ohne
 * (gewertetes) Ergebnis stehen ohne Platzierung am Ende ("noch nicht versucht").
 *
 * Punkte kommen fertig aus `results.points`; hier wird nichts neu gerechnet.
 * Schließt per X oder Escape (Body-Scroll wird währenddessen gesperrt, wie ImageLightbox).
 */

const RANK_CLASSES = [
  'bg-gold text-[#3a2a06]',
  'bg-silver text-[#2a2d33]',
  'bg-bronze text-[#2e1a0c]',
]

// Status -> Anzeige-Label + Badge-Klassen. 'open' kommt hier nicht vor (wird ausgefiltert).
const STATUS_META: Record<Exclude<ResultStatus, 'open'>, { label: string; cls: string }> = {
  flash: { label: STATUS_LABELS.flash, cls: 'bg-accent-soft text-accent' },
  top: { label: STATUS_LABELS.top, cls: 'bg-ok-soft text-ok' },
  fail: { label: STATUS_LABELS.fail, cls: 'bg-bad-soft text-bad' },
}

function StatusBadge({ status }: { status: Exclude<ResultStatus, 'open'> }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] ${meta.cls}`}
    >
      {meta.label}
    </span>
  )
}

interface RankRow {
  participant: Participant
  // Gewertetes Ergebnis (status !== 'open') oder undefined, wenn (noch) nicht versucht.
  result: Result | undefined
  // Platzierung (1-basiert) oder null, wenn kein gewertetes Ergebnis vorliegt.
  rank: number | null
}

export default function BoulderRanking({
  boulder,
  participants,
  resultsByParticipant,
  currentUserId,
  onClose,
}: {
  boulder: Boulder
  participants: Participant[]
  resultsByParticipant: Map<string, Result> | undefined
  currentUserId: string | null
  onClose: () => void
}) {
  // Escape schließt, Body-Scroll währenddessen sperren (wie ImageLightbox).
  useDialogEscape(onClose)

  const rows = useMemo<RankRow[]>(() => {
    type Entry = { participant: Participant; result: Result | undefined; scored: boolean }
    const entries: Entry[] = participants.map((p) => {
      const result = resultsByParticipant?.get(p.id)
      const scored = result != null && result.status !== 'open'
      return { participant: p, result: scored ? result : undefined, scored }
    })
    // Gewertete zuerst (Punkte absteigend), dann die übrigen – jeweils stabil nach Name.
    entries.sort((a, b) => {
      if (a.scored !== b.scored) return a.scored ? -1 : 1
      if (a.scored && b.scored && a.result!.points !== b.result!.points) {
        return b.result!.points - a.result!.points
      }
      return a.participant.display_name.localeCompare(b.participant.display_name)
    })
    // Standard-Wertungsrang: gleiche Punktzahl teilt den Platz, danach wird übersprungen.
    let lastPoints: number | null = null
    let lastRank = 0
    return entries.map((e, i) => {
      if (!e.scored) return { participant: e.participant, result: undefined, rank: null }
      const pts = e.result!.points
      const rank = pts === lastPoints ? lastRank : i + 1
      lastPoints = pts
      lastRank = rank
      return { participant: e.participant, result: e.result, rank }
    })
  }, [participants, resultsByParticipant])

  const grade = difficultyLabel(boulder.difficulty)
  const dot = colorSwatch(boulder.color)
  const scoredCount = rows.filter((r) => r.rank != null).length

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-bg" role="dialog" aria-modal="true">
      <div className="animate-screen-in mx-auto flex min-h-full max-w-md flex-col px-5 pb-11 pt-6">
        <header className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[12px] bg-surface-3 font-num text-[17px] font-bold">
                {boulder.seq}
              </span>
              <div className="min-w-0">
                <h1 className="font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em]">
                  {grade != null ? `Grad ${grade}` : 'Boulder'}
                </h1>
                {boulder.color && (
                  <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
                    {dot && (
                      <span
                        className="inline-block h-[11px] w-[11px] rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
                        style={{ background: dot }}
                      />
                    )}
                    {boulder.color}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              aria-label="Schließen"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xl leading-none text-muted transition hover:bg-surface-3 hover:text-ink"
              onClick={onClose}
            >
              <X />
            </button>
          </div>
        </header>

        <h2 className="section-label mb-2 px-1">Rangliste</h2>
        <ol className="flex flex-col gap-1.5">
          {rows.map((row) => {
            const isMe = currentUserId !== null && row.participant.user_id === currentUserId
            const r = row.result
            return (
              <li
                key={row.participant.id}
                className={`card flex items-center gap-3 !px-3 !py-2.5 ${
                  isMe
                    ? '!bg-ok-soft shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--ok)_40%,transparent)]'
                    : ''
                }`}
              >
                <span
                  className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full font-num text-[14px] font-bold ${
                    row.rank != null
                      ? (RANK_CLASSES[row.rank - 1] ?? 'bg-surface-3 text-ink')
                      : 'bg-surface-2 text-faint'
                  }`}
                >
                  {row.rank ?? '–'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-display text-[16px] font-bold">
                    <span className="truncate">{row.participant.display_name}</span>
                    {isMe && (
                      <span className="rounded-md bg-ok-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ok">
                        du
                      </span>
                    )}
                  </div>
                  {r ? (
                    <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
                      <StatusBadge status={r.status as Exclude<ResultStatus, 'open'>} />
                      {r.status !== 'flash' && r.attempts > 1 && <span>{r.attempts} Versuche</span>}
                    </div>
                  ) : (
                    <div className="mt-0.5 text-[12px] text-faint">noch nicht versucht</div>
                  )}
                </div>
                <span className="font-num text-[24px] font-bold leading-none tabular-nums">
                  {r ? r.points : '–'}
                </span>
              </li>
            )
          })}
          {rows.length === 0 && (
            <li className="px-1 py-2 text-[14px] text-muted">Noch keine Teilnehmer.</li>
          )}
        </ol>
        {rows.length > 0 && scoredCount === 0 && (
          <p className="mt-2 px-1 text-[13px] text-muted">
            Diesen Boulder hat noch niemand eingetragen.
          </p>
        )}
      </div>
    </div>
  )
}
