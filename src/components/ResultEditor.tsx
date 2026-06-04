import { useEffect, useState } from 'react'
import { computePoints, normalizeResult } from '../lib/scoring'
import type { Result, ResultStatus, ScoringConfig } from '../types'
import { Bolt, Check, Minus, Plus, X } from './icons'

const OPTIONS: {
  status: ResultStatus
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
  { status: 'fail', label: 'Nicht', icon: <X />, activeCls: 'border-bad bg-bad-soft text-bad' },
]

export default function ResultEditor({
  result,
  scoring,
  difficulty = null,
  onSave,
}: {
  result: Result | undefined
  scoring: ScoringConfig
  // Schwierigkeitsgrad des Boulders – im Multiplikator-Modus der Punkte-Faktor.
  difficulty?: number | null
  onSave: (status: ResultStatus, attempts: number) => void
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

  function selectStatus(s: ResultStatus) {
    // Toggle: nochmaliges Tippen setzt zurück auf "offen".
    if (s === status) {
      apply('open', 0)
    } else if (s === 'flash') {
      apply('flash', 1)
    } else if (s === 'top') {
      // Ein Top hat mindestens 1 Fehlversuch (0 Fehlversuche wäre ein Flash) ⇒ attempts ≥ 2.
      apply('top', Math.max(2, attempts))
    } else {
      apply('fail', Math.max(1, attempts))
    }
  }

  const preview = computePoints(status, attempts, scoring, difficulty)
  const showStepper = status === 'top' || status === 'fail'
  // Angezeigt werden Fehlversuche: beim Top zählt der erfolgreiche Zug nicht mit.
  const misses = status === 'top' ? attempts - 1 : attempts
  // Untergrenze für attempts je Status (Top braucht mind. 1 Fehlversuch).
  const minAttempts = status === 'top' ? 2 : 1

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => {
          const active = status === o.status
          return (
            <button
              key={o.status}
              onClick={() => selectStatus(o.status)}
              className={`flex items-center justify-center gap-1.5 rounded-sm2 border px-1.5 py-2.5 font-display text-[14px] font-bold transition ${
                active ? o.activeCls : 'border-border-strong bg-surface-2 text-ink'
              }`}
            >
              <span className="text-[16px]">{o.icon}</span>
              {o.label}
            </button>
          )
        })}
      </div>

      {showStepper && (
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-[14px] font-medium text-muted">Fehlversuche</span>
          <div className="flex items-center gap-1.5">
            <button
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-border-strong bg-surface-2 text-ink transition hover:border-accent hover:text-accent disabled:opacity-35 disabled:hover:border-border-strong disabled:hover:text-ink"
              onClick={() => apply(status, Math.max(minAttempts, attempts - 1))}
              disabled={misses <= 0}
              aria-label="Weniger Fehlversuche"
            >
              <Minus className="text-[16px]" />
            </button>
            <span className="min-w-[26px] text-center font-num text-lg font-bold tabular-nums">
              {misses}
            </span>
            <button
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-border-strong bg-surface-2 text-ink transition hover:border-accent hover:text-accent"
              onClick={() => apply(status, attempts + 1)}
              aria-label="Mehr Fehlversuche"
            >
              <Plus className="text-[16px]" />
            </button>
          </div>
        </div>
      )}

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
