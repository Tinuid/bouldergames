import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getSessionByCode, joinSession } from '../lib/api'
import { rememberSession } from '../lib/localHistory'
import { normalizeJoinCode } from '../lib/codes'
import { ChevronLeft } from '../components/icons'

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

  const valid = code.trim().length >= 4 && displayName.trim().length >= 1

  return (
    <div className="animate-screen-in mx-auto flex min-h-full max-w-md flex-col px-5 pb-11 pt-14">
      <div className="mb-3.5">
        <Link to="/" className="inline-flex items-center gap-0.5 text-[15px] font-semibold text-muted hover:text-ink">
          <ChevronLeft className="text-[18px]" />
          Zurück
        </Link>
      </div>
      <h1 className="mb-3 font-display text-[34px] font-extrabold leading-none tracking-[-0.025em]">
        Challenge beitreten
      </h1>
      <p className="mb-[22px] text-[15px] leading-relaxed text-muted">
        Gib den 6-stelligen Code ein, den du von deiner Crew bekommen hast.
      </p>

      <form className="flex flex-col" onSubmit={handleSubmit}>
        <div className="mb-[18px]">
          <label className="label" htmlFor="code">
            Challenge-Code
          </label>
          <input
            id="code"
            className="input font-num text-[22px] font-bold uppercase tracking-[0.3em]"
            placeholder="z.B. 5ZUKMJ"
            value={code}
            maxLength={8}
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(e) => setCode(normalizeJoinCode(e.target.value))}
            required
          />
        </div>

        <div className="mb-[18px]">
          <label className="label" htmlFor="name">
            Dein Name
          </label>
          <input
            id="name"
            className="input"
            placeholder="z.B. Alex"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>

        {error && <p className="mb-3 text-sm text-bad">{error}</p>}

        <button type="submit" className="btn-primary mt-1.5" disabled={submitting || !valid}>
          {submitting ? 'Trete bei …' : 'Beitreten'}
        </button>
      </form>
    </div>
  )
}
