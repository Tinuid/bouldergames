import { useEffect, useMemo, useState } from 'react'
import { colorSwatch } from '../lib/colors'
import { difficultyLabel } from '../lib/difficulty'
import { STATUS_LABELS } from '../lib/scoring'
import type { Boulder, Participant, Result, ResultStatus, ScoringConfig } from '../types'
import { Check, X } from './icons'

/**
 * Vollbild-Overlay mit den Boulder-Ergebnissen eines Spielers (per Klick im Leaderboard
 * geöffnet). Listet alle Boulder mit nicht-`open`-Ergebnis (inkl. "nicht geschafft").
 * Der "Vergleichen"-Toggle stellt – sofern man selbst Teilnehmer und nicht der gezeigte
 * Spieler ist – alle Boulder der Challenge Spieler vs. eigene Ergebnisse gegenüber.
 *
 * Punkte kommen fertig aus `results.points`; hier wird nichts neu gerechnet.
 * Schließt per X oder Escape (Body-Scroll wird währenddessen gesperrt, wie ImageLightbox).
 */

// Status -> Anzeige-Label + Badge-Klassen. 'open' kommt hier nicht vor (wird ausgefiltert).
const STATUS_META: Record<Exclude<ResultStatus, 'open'>, { label: string; cls: string }> = {
  flash: { label: STATUS_LABELS.flash, cls: 'bg-accent-soft text-accent' },
  top: { label: STATUS_LABELS.top, cls: 'bg-ok-soft text-ok' },
  fail: { label: STATUS_LABELS.fail, cls: 'bg-bad-soft text-bad' },
}

function StatusBadge({ status }: { status: ResultStatus }) {
  if (status === 'open') return null
  const meta = STATUS_META[status]
  return (
    <span
      className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] ${meta.cls}`}
    >
      {meta.label}
    </span>
  )
}

// Kompakte Boulder-Kennung (Nummer + Grad + Farbklecks) für die linke Spalte.
function BoulderTag({ boulder }: { boulder: Boulder }) {
  const dot = colorSwatch(boulder.color)
  const grade = difficultyLabel(boulder.difficulty)
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-surface-3 font-num text-[13px] font-bold">
        {boulder.seq}
      </span>
      <div className="min-w-0">
        <div className="font-display text-[14px] font-bold leading-tight">
          {grade != null ? `Grad ${grade}` : 'Boulder'}
        </div>
        {boulder.color && (
          <div className="mt-0.5 flex items-center gap-1 text-[11.5px] text-muted">
            {dot && (
              <span
                className="inline-block h-[9px] w-[9px] rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
                style={{ background: dot }}
              />
            )}
            <span className="truncate">{boulder.color}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Eine Ergebnis-Zelle (Status + Versuche + Punkte) für den Vergleich. `highlight` hebt
// die jeweils bessere Punktzahl hervor.
function ResultCell({ result, highlight }: { result: Result | undefined; highlight: boolean }) {
  if (!result || result.status === 'open') {
    return <div className="flex items-center justify-center text-[15px] text-faint">–</div>
  }
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <StatusBadge status={result.status} />
      <span
        className={`font-num text-[18px] font-bold tabular-nums ${highlight ? 'text-ok' : 'text-ink'}`}
      >
        {result.points}
      </span>
      {result.status !== 'flash' && result.attempts > 1 && (
        <span className="text-[11px] text-muted">{result.attempts} Versuche</span>
      )}
    </div>
  )
}

export default function PlayerDetail({
  participant,
  meParticipant,
  boulders,
  results,
  onClose,
}: {
  participant: Participant
  meParticipant: Participant | null
  boulders: Boulder[]
  results: Result[]
  scoring: ScoringConfig
  onClose: () => void
}) {
  const [compare, setCompare] = useState(false)

  // Escape schließt, Body-Scroll währenddessen sperren (wie ImageLightbox).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  // Vergleich nur sinnvoll, wenn man selbst Teilnehmer und nicht der gezeigte Spieler ist.
  const canCompare = meParticipant != null && meParticipant.id !== participant.id

  const { theirByBoulder, myByBoulder, theirStats, myTotal } = useMemo(() => {
    const theirByBoulder = new Map<string, Result>()
    const myByBoulder = new Map<string, Result>()
    const theirStats = { points: 0, tops: 0, flashes: 0 }
    let myTotal = 0
    for (const r of results) {
      if (r.participant_id === participant.id) {
        theirByBoulder.set(r.boulder_id, r)
        theirStats.points += r.points
        if (r.status === 'flash') {
          theirStats.flashes += 1
          theirStats.tops += 1
        } else if (r.status === 'top') {
          theirStats.tops += 1
        }
      }
      if (meParticipant && r.participant_id === meParticipant.id) {
        myByBoulder.set(r.boulder_id, r)
        myTotal += r.points
      }
    }
    return { theirByBoulder, myByBoulder, theirStats, myTotal }
  }, [results, participant.id, meParticipant])

  // Normal-Modus: nur Boulder mit einem (nicht-open) Ergebnis des Spielers, nach seq.
  const playedBoulders = useMemo(
    () =>
      boulders.filter((b) => {
        const r = theirByBoulder.get(b.id)
        return r != null && r.status !== 'open'
      }),
    [boulders, theirByBoulder],
  )

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-bg" role="dialog" aria-modal="true">
      <div className="animate-screen-in mx-auto flex min-h-full max-w-md flex-col px-5 pb-11 pt-6">
        <header className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-[-0.02em]">
                {participant.display_name}
              </h1>
              <div className="mt-1 text-[13px] text-muted">
                {theirStats.tops} Tops · {theirStats.flashes} Flashes ·{' '}
                <span className="font-num font-bold text-ink">{theirStats.points}</span> Punkte
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

          {canCompare && (
            <button
              type="button"
              className={`chip mt-3.5 flex-row items-center justify-center gap-2 py-2.5 text-[13px] font-semibold ${compare ? 'is-active' : ''}`}
              onClick={() => setCompare((v) => !v)}
              aria-pressed={compare}
            >
              {compare && <Check className="text-[15px]" />}
              Vergleichen
            </button>
          )}
        </header>

        {compare ? (
          // Vergleichs-Modus: alle Boulder der Challenge, Spieler vs. eigene Ergebnisse.
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-1">
              <span className="section-label">Boulder ({boulders.length})</span>
              <span className="w-[88px] truncate text-center text-[12px] font-bold text-muted">
                {participant.display_name}
              </span>
              <span className="w-[88px] text-center text-[12px] font-bold text-muted">Du</span>
            </div>
            {boulders.map((b) => {
              const their = theirByBoulder.get(b.id)
              const mine = myByBoulder.get(b.id)
              const tp = their && their.status !== 'open' ? their.points : null
              const mp = mine && mine.status !== 'open' ? mine.points : null
              const theirWins = tp != null && (mp == null || tp > mp)
              const iWin = mp != null && (tp == null || mp > tp)
              return (
                <div
                  key={b.id}
                  className="card grid grid-cols-[1fr_auto_auto] items-center gap-2 !px-3 !py-2.5"
                >
                  <BoulderTag boulder={b} />
                  <div className="w-[88px]">
                    <ResultCell result={their} highlight={theirWins} />
                  </div>
                  <div className="w-[88px]">
                    <ResultCell result={mine} highlight={iWin} />
                  </div>
                </div>
              )
            })}
            {/* Summen-Zeile */}
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-3 pt-1.5">
              <span className="section-label">Gesamt</span>
              <span
                className={`w-[88px] text-center font-num text-[20px] font-bold tabular-nums ${theirStats.points > myTotal ? 'text-ok' : 'text-ink'}`}
              >
                {theirStats.points}
              </span>
              <span
                className={`w-[88px] text-center font-num text-[20px] font-bold tabular-nums ${myTotal > theirStats.points ? 'text-ok' : 'text-ink'}`}
              >
                {myTotal}
              </span>
            </div>
            {boulders.length === 0 && (
              <p className="px-1 py-2 text-[14px] text-muted">Noch keine Boulder in dieser Challenge.</p>
            )}
          </div>
        ) : (
          // Normal-Modus: nur die vom Spieler versuchten Boulder.
          <div className="flex flex-col gap-2">
            <h2 className="section-label px-1">
              Ergebnisse ({playedBoulders.length})
            </h2>
            {playedBoulders.map((b) => {
              const r = theirByBoulder.get(b.id)!
              return (
                <div key={b.id} className="card flex items-center gap-3 !px-3 !py-2.5">
                  <div className="min-w-0 flex-1">
                    <BoulderTag boulder={b} />
                  </div>
                  <StatusBadge status={r.status} />
                  {r.status !== 'flash' && r.attempts > 1 && (
                    <span className="whitespace-nowrap text-[11.5px] text-muted">
                      {r.attempts} Vers.
                    </span>
                  )}
                  <span className="w-[44px] text-right font-num text-[20px] font-bold tabular-nums">
                    {r.points}
                  </span>
                </div>
              )
            })}
            {playedBoulders.length === 0 && (
              <p className="px-1 py-2 text-[14px] text-muted">
                {participant.display_name} hat noch keine Boulder eingetragen.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
