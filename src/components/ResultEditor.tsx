import { useEffect, useState } from 'react'
import { computePoints, normalizeResult } from '../lib/scoring'
import type { Result, ResultStatus, ScoringConfig } from '../types'

const OPTIONS: { status: ResultStatus; label: string; cls: string }[] = [
  { status: 'flash', label: '⚡ Flash', cls: 'bg-yellow-500 text-slate-950' },
  { status: 'top', label: '✓ Top', cls: 'bg-brand text-slate-950' },
  { status: 'fail', label: '✕ Nicht', cls: 'bg-red-500 text-slate-950' },
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
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.status}
            onClick={() => selectStatus(o.status)}
            className={`rounded-xl py-2 text-sm font-bold transition ${
              status === o.status ? o.cls : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {showStepper && (
        <div className="flex items-center justify-between rounded-xl bg-slate-900/60 px-3 py-2">
          <span className="text-sm text-slate-400">Fehlversuche</span>
          <div className="flex items-center gap-3">
            <button
              className="h-8 w-8 rounded-lg bg-slate-700 text-lg font-bold hover:bg-slate-600"
              onClick={() => apply(status, Math.max(minAttempts, attempts - 1))}
              aria-label="Weniger Fehlversuche"
            >
              −
            </button>
            <span className="w-6 text-center text-lg font-bold tabular-nums">{misses}</span>
            <button
              className="h-8 w-8 rounded-lg bg-slate-700 text-lg font-bold hover:bg-slate-600"
              onClick={() => apply(status, attempts + 1)}
              aria-label="Mehr Fehlversuche"
            >
              +
            </button>
          </div>
        </div>
      )}

      {status !== 'open' && (
        <div className="text-right text-sm text-slate-400">
          Punkte:{' '}
          <span className={`font-bold ${preview >= 0 ? 'text-brand' : 'text-red-400'}`}>
            {preview}
          </span>
        </div>
      )}
    </div>
  )
}
