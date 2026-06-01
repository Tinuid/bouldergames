import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { createSession } from '../lib/api'
import { rememberSession } from '../lib/localHistory'
import { DEFAULT_SCORING } from '../types'

export default function CreateSession() {
  const { userId } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [hostName, setHostName] = useState('')
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
        scoring: { flashPoints: flash, topPoints: top, attemptCost: cost },
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

        <fieldset className="card flex flex-col gap-4">
          <legend className="px-1 text-sm font-semibold text-slate-300">Punkteregeln</legend>
          <NumberField label="Punkte für Flash" value={flash} onChange={setFlash} />
          <NumberField label="Punkte für Top" value={top} onChange={setTop} />
          <NumberField label="Kosten pro Versuch" value={cost} onChange={setCost} min={0} />
          <p className="text-xs text-slate-500">
            Jeder Versuch kostet Punkte – auch der erfolgreiche. Beispiel: Flash = {flash} − {cost} ={' '}
            {flash - cost}.
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
