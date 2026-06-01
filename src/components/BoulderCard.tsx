import ResultEditor from './ResultEditor'
import type { Boulder, Result, ResultStatus, ScoringConfig } from '../types'

// Häufige Hallen-Farben -> CSS. Unbekannte Farben werden nur als Text gezeigt.
const COLOR_MAP: Record<string, string> = {
  rot: '#ef4444',
  blau: '#3b82f6',
  grün: '#22c55e',
  gruen: '#22c55e',
  gelb: '#eab308',
  grün2: '#22c55e',
  orange: '#f97316',
  lila: '#a855f7',
  violett: '#a855f7',
  pink: '#ec4899',
  schwarz: '#0f172a',
  weiß: '#f8fafc',
  weiss: '#f8fafc',
  türkis: '#14b8a6',
  tuerkis: '#14b8a6',
  grau: '#94a3b8',
  braun: '#92400e',
}

export default function BoulderCard({
  boulder,
  myResult,
  allResults,
  scoring,
  onSaveResult,
}: {
  boulder: Boulder
  myResult: Result | undefined
  allResults: Result[]
  scoring: ScoringConfig
  onSaveResult: (status: ResultStatus, attempts: number) => void
}) {
  const tops = allResults.filter((r) => r.status === 'top' || r.status === 'flash').length
  const flashes = allResults.filter((r) => r.status === 'flash').length
  const dot = boulder.color ? COLOR_MAP[boulder.color.trim().toLowerCase()] : undefined

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm font-bold">
          {boulder.seq}
        </span>
        <div className="flex-1">
          <div className="font-semibold">
            {boulder.difficulty != null ? `Grad ${boulder.difficulty}` : `Boulder ${boulder.seq}`}
          </div>
          {boulder.color && (
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              {dot && (
                <span
                  className="inline-block h-3 w-3 rounded-full ring-1 ring-slate-600"
                  style={{ backgroundColor: dot }}
                />
              )}
              {boulder.color}
            </div>
          )}
        </div>
        {(tops > 0 || flashes > 0) && (
          <div className="text-right text-xs text-slate-400">
            {tops} Tops
            {flashes > 0 && <> · {flashes} ⚡</>}
          </div>
        )}
      </div>

      <ResultEditor result={myResult} scoring={scoring} onSave={onSaveResult} />
    </div>
  )
}
