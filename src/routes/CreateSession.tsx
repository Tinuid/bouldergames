import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { createSession } from '../lib/api'
import { rememberSession } from '../lib/localHistory'
import { DEFAULT_SCORING, type ScoringMode } from '../types'

export default function CreateSession() {
  const { userId } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [hostName, setHostName] = useState('')
  const [mode, setMode] = useState<ScoringMode>(DEFAULT_SCORING.mode)
  const [flash, setFlash] = useState(DEFAULT_SCORING.flashPoints)
  const [top, setTop] = useState(DEFAULT_SCORING.topPoints)
  const [cost, setCost] = useState(DEFAULT_SCORING.attemptCost)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || submitting) return
    if (!hostName.trim()) {
      setError('Bitte gib deinen Namen ein.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const session = await createSession({
        name,
        hostId: userId,
        hostName,
        scoring: { mode, flashPoints: flash, topPoints: top, attemptCost: cost },
      })
      rememberSession({
        sessionId: session.id,
        code: session.join_code,
        name: session.name,
        displayName: hostName.trim(),
      })
      navigate(`/s/${session.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erstellen fehlgeschlagen.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-5 p-5">
      <Link to="/" className="text-sm text-slate-400 hover:text-slate-200">
        ← Zurück
      </Link>
      <h1 className="text-2xl font-bold">Neue Challenge</h1>

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div>
          <label className="label" htmlFor="name">
            Name der Challenge
          </label>
          <input
            id="name"
            className="input"
            placeholder="z.B. Alle Vierer abklettern"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="host">
            Dein Name
          </label>
          <input
            id="host"
            className="input"
            placeholder="z.B. Alex"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            required
          />
        </div>

        <fieldset className="card flex flex-col gap-3">
          <legend className="px-1 text-sm font-semibold text-slate-300">Spielmodus</legend>
          <div className="grid grid-cols-2 gap-2">
            <ModeButton
              active={mode === 'classic'}
              title="Klassisch"
              subtitle="Feste Punkte"
              onClick={() => setMode('classic')}
            />
            <ModeButton
              active={mode === 'multiplier'}
              title="Multiplikator"
              subtitle="Grad × Punkte"
              onClick={() => setMode('multiplier')}
            />
          </div>
          <p className="text-xs text-slate-500">
            {mode === 'multiplier' ? (
              <>
                Der Schwierigkeitsgrad multipliziert die Punkte. Beispiel: Flash auf Grad 1 ={' '}
                {flash}, auf Grad 4 = {flash * 4}. (Grad ist beim Anlegen eines Boulders Pflicht.)
              </>
            ) : (
              <>Feste Punkte pro Boulder; der Schwierigkeitsgrad dient nur zur Info.</>
            )}
          </p>
        </fieldset>

        <fieldset className="card flex flex-col gap-4">
          <legend className="px-1 text-sm font-semibold text-slate-300">
            {mode === 'multiplier' ? 'Punkteregeln (pro Grad)' : 'Punkteregeln'}
          </legend>
          <NumberField label="Punkte für Flash" value={flash} onChange={setFlash} />
          <NumberField label="Punkte für Top" value={top} onChange={setTop} />
          <NumberField label="Kosten pro Fehlversuch" value={cost} onChange={setCost} min={0} />

          <p className="text-xs text-slate-500">
            Nur Fehlversuche kosten Punkte – der erfolgreiche Zug ist gratis. Beispiel: Flash ={' '}
            {flash}, Top mit 1 Fehlversuch = {top} − {cost} = {top - cost}.
          </p>
        </fieldset>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" className="btn-primary text-lg" disabled={submitting}>
          {submitting ? 'Erstelle …' : 'Challenge starten'}
        </button>
      </form>
    </div>
  )
}

function ModeButton({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex flex-col items-start rounded-xl px-3 py-2 text-left transition ${
        active
          ? 'bg-brand text-slate-950'
          : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
      }`}
    >
      <span className="font-bold">{title}</span>
      <span className={`text-xs ${active ? 'text-slate-800' : 'text-slate-400'}`}>{subtitle}</span>
    </button>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  min?: number
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-slate-300">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        className="input w-24 text-right"
        value={value}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
