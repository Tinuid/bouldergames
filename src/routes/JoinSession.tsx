import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getSessionByCode, joinSession } from '../lib/api'
import { rememberSession } from '../lib/localHistory'
import { normalizeJoinCode } from '../lib/codes'

export default function JoinSession() {
  const { userId } = useAuth()
  const navigate = useNavigate()
  const params = useParams()

  const [code, setCode] = useState(params.code ? normalizeJoinCode(params.code) : '')
  const [displayName, setDisplayName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || submitting) return
    if (!displayName.trim()) {
      setError('Bitte gib deinen Namen ein.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const session = await getSessionByCode(code)
      if (!session) {
        setError('Keine Challenge mit diesem Code gefunden.')
        setSubmitting(false)
        return
      }
      await joinSession(session.id, userId, displayName)
      rememberSession({
        sessionId: session.id,
        code: session.join_code,
        name: session.name,
        displayName: displayName.trim(),
      })
      navigate(`/s/${session.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Beitreten fehlgeschlagen.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-5 p-5">
      <Link to="/" className="text-sm text-slate-400 hover:text-slate-200">
        ← Zurück
      </Link>
      <h1 className="text-2xl font-bold">Challenge beitreten</h1>

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div>
          <label className="label" htmlFor="code">
            Beitritts-Code
          </label>
          <input
            id="code"
            className="input text-center text-2xl font-bold uppercase tracking-[0.3em]"
            placeholder="ABC123"
            value={code}
            maxLength={8}
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(e) => setCode(normalizeJoinCode(e.target.value))}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="name">
            Dein Name
          </label>
          <input
            id="name"
            className="input"
            placeholder="z.B. Sam"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" className="btn-primary text-lg" disabled={submitting}>
          {submitting ? 'Trete bei …' : 'Beitreten'}
        </button>
      </form>
    </div>
  )
}
