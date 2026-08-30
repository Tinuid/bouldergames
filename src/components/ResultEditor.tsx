import { useEffect, useState } from 'react'
import { computePoints, normalizeResult } from '../lib/scoring'
import type { Result, ResultStatus, ScoringConfig } from '../types'
import { Bolt, Check, Minus, Plus } from './icons'

// Nur noch die beiden Erfolgs-Zustände haben einen eigenen Knopf. "Nicht geschafft"
// ergibt sich aus gezählten Fehlversuchen ohne Top – siehe Zähl-Control unten.
const OPTIONS: {
  status: Extract<ResultStatus, 'flash' | 'top'>
  label: string
  icon: React.ReactNode
  // aktive Variante (inaktiv = neutral)
  activeCls: string
}[] = [
  {
    status: 'flash',
    label: 'Flash',
    icon: <Bolt />,
    activeCls: 'border-accent bg-accent text-accent-ink',
  },
  { status: 'top', label: 'Top', icon: <Check />, activeCls: 'border-ok bg-ok text-white' },
]

// Fehlversuche aus dem gespeicherten Ergebnis: `attempts` sind die GESAMTversuche
// inklusive des erfolgreichen Zugs, ein Flash hat definitionsgemäß keinen Fehlversuch.
function missesOf(status: ResultStatus, attempts: number): number {
  if (status === 'flash' || status === 'open') return 0
  return status === 'top' ? Math.max(0, attempts - 1) : Math.max(0, attempts)
}

export default function ResultEditor({
  result,
  scoring,
  difficulty = null,
  onSave,
  label,
  compact = false,
}: {
  result: Result | undefined
  scoring: ScoringConfig
  // Schwierigkeitsgrad des Boulders – im Multiplikator-Modus der Punkte-Faktor.
  difficulty?: number | null
  onSave: (status: ResultStatus, attempts: number) => void
  // Kompakte Variante für Fremd-Zeilen (Ergebnis für andere eintragen): Name links,
  // platzsparende Icon-Buttons rechts, ohne Punkte-Vorschau.
  label?: string
  compact?: boolean
}) {
  const [status, setStatus] = useState<ResultStatus>(result?.status ?? 'open')
  const [attempts, setAttempts] = useState<number>(result?.attempts ?? 1)

  // Mit Realtime-Updates synchronisieren (z.B. Host-Korrektur, anderes Gerät).
  useEffect(() => {
    setStatus(result?.status ?? 'open')
    setAttempts(result?.attempts ?? 1)
  }, [result?.id, result?.status, result?.attempts])

  function apply(nextStatus: ResultStatus, nextAttempts: number) {
    const norm = normalizeResult(nextStatus, nextAttempts)
    setStatus(norm.status)
    setAttempts(norm.attempts)
    onSave(norm.status, norm.attempts)
  }

  const misses = missesOf(status, attempts)

  function selectStatus(s: 'flash' | 'top') {
    // Toggle: nochmaliges Tippen nimmt den Erfolg zurück. Die gezählten Fehlversuche
    // bleiben dabei stehen – sonst wäre ein Fehlgriff auf "Top" nicht zu korrigieren.
    if (s === status) {
      apply(misses > 0 ? 'fail' : 'open', misses)
    } else if (s === 'flash') {
      apply('flash', 1)
    } else {
      // Die bereits gezählten Fehlversuche bleiben stehen, der erfolgreiche Zug kommt dazu.
      // Ein Top hat mindestens 1 Fehlversuch (0 Fehlversuche wäre ein Flash) ⇒ attempts ≥ 2.
      apply('top', Math.max(2, misses + 1))
    }
  }

  function addMiss() {
    if (status === 'top') apply('top', attempts + 1)
    // Ein Flash verträgt keinen Fehlversuch – der Zähler löst ihn auf.
    else if (status === 'flash') apply('fail', 1)
    else apply('fail', misses + 1)
  }

  function removeMiss() {
    if (status === 'top') apply('top', Math.max(2, attempts - 1))
    else if (misses <= 1) apply('open', 0)
    else apply('fail', misses - 1)
  }

  const preview = computePoints(status, attempts, scoring, difficulty)
  // Kosten Fehlversuche keine Punkte, gibt es nichts zu zählen – dann fällt der Knopf weg.
  const showCounter = scoring.attemptCost > 0
  // Ein Top braucht seinen einen Fehlversuch; darunter geht der Zähler nicht.
  const minusDisabled = status === 'top' && misses <= 1
  const counterCls =
    misses > 0 ? 'border-bad bg-bad-soft text-bad' : 'border-border-strong bg-surface-2 text-ink'
  // Trennlinie im geteilten Knopf: Tailwind-Opacity greift auf den var(--…)-Tokens nicht.
  const dividerStyle = { borderRight: '1px solid color-mix(in srgb, var(--bad) 30%, transparent)' }

  if (compact) {
    return (
      <div className="flex items-center gap-2 border-t border-border py-2.5">
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{label}</span>
        <div className="flex gap-1.5">
          {OPTIONS.map((o) => {
            const active = status === o.status
            return (
              <button
                key={o.status}
                onClick={() => selectStatus(o.status)}
                aria-label={o.label}
                title={o.label}
                aria-pressed={active}
                className={`flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border text-[16px] transition ${
                  active ? o.activeCls : 'border-border-strong bg-surface-2 text-ink'
                }`}
              >
                {o.icon}
              </button>
            )
          })}

          {showCounter && (
            <div
              className={`flex h-[34px] items-stretch overflow-hidden rounded-[10px] border transition ${counterCls}`}
            >
              {misses > 0 && (
                <button
                  onClick={removeMiss}
                  disabled={minusDisabled}
                  aria-label="Ein Versuch weniger"
                  title="Ein Versuch weniger"
                  className="flex w-7 shrink-0 items-center justify-center transition disabled:opacity-35"
                  style={dividerStyle}
                >
                  <Minus className="text-[15px]" />
                </button>
              )}
              <button
                onClick={addMiss}
                aria-label="Ein Versuch mehr"
                title="Ein Versuch mehr"
                className="flex min-w-[34px] items-center justify-center px-1.5"
              >
                {misses > 0 ? (
                  <span className="font-num text-[15px] font-bold tabular-nums">{misses}</span>
                ) : (
                  <Plus className="text-[16px]" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className={`grid gap-2 ${showCounter ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {OPTIONS.map((o) => {
          const active = status === o.status
          return (
            <button
              key={o.status}
              onClick={() => selectStatus(o.status)}
              aria-pressed={active}
              className={`flex items-center justify-center gap-1.5 rounded-sm2 border px-1.5 py-2.5 font-display text-[14px] font-bold transition ${
                active ? o.activeCls : 'border-border-strong bg-surface-2 text-ink'
              }`}
            >
              <span className="text-[16px]">{o.icon}</span>
              {o.label}
            </button>
          )
        })}

        {showCounter && (
          // Zweigeteilt, optisch weiter ein Knopf im Raster: schmales Minus zum Korrigieren
          // (erst ab dem ersten Versuch), breite Plus-Hälfte als Hauptaktion.
          <div
            className={`flex items-stretch overflow-hidden rounded-sm2 border font-display text-[14px] font-bold transition ${counterCls}`}
          >
            {misses > 0 && (
              <button
                onClick={removeMiss}
                disabled={minusDisabled}
                aria-label="Ein Versuch weniger"
                title="Ein Versuch weniger"
                className="flex w-10 shrink-0 items-center justify-center transition disabled:opacity-35"
                style={dividerStyle}
              >
                <Minus className="text-[16px]" />
              </button>
            )}
            <button
              onClick={addMiss}
              aria-label="Ein Versuch mehr"
              title="Ein Versuch mehr"
              className="flex min-w-0 flex-1 items-center justify-center gap-1.5 px-1.5 py-2.5"
            >
              {misses > 0 ? (
                <span className="font-num text-lg font-bold tabular-nums">{misses}</span>
              ) : (
                <>
                  <span className="text-[16px]">
                    <Plus />
                  </span>
                  Versuch
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {status !== 'open' && (
        <div className="mt-2.5 text-right font-display text-[14px] font-semibold text-muted">
          Punkte:{' '}
          <span className={`ml-1 font-num font-bold ${preview < 0 ? 'text-bad' : 'text-ok'}`}>
            {preview}
          </span>
        </div>
      )}
    </div>
  )
}
