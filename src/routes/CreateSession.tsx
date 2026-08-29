import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { addBouldersFromGym, createSession, listGymBouldersByIds } from '../lib/api'
import { rememberSession } from '../lib/localHistory'
import { DEFAULT_SCORING, type GymBoulder } from '../types'
import { ChevronLeft, Plan } from '../components/icons'
import SessionSettingsFields, {
  type SessionSettingsValues,
} from '../components/SessionSettingsFields'

export default function CreateSession() {
  const { userId } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Vorauswahl von der Hallenkarte. Bewusst über den Router-State und nicht über
  // die URL: die Auswahl ist flüchtig und muss einen Reload nicht überleben – dann
  // entsteht eben eine leere Challenge.
  const gymBoulderIds = (location.state as { gymBoulderIds?: string[] } | null)?.gymBoulderIds
  const [gymBoulders, setGymBoulders] = useState<GymBoulder[]>([])

  useEffect(() => {
    if (!gymBoulderIds || gymBoulderIds.length === 0) return
    let cancelled = false
    listGymBouldersByIds(gymBoulderIds)
      .then((rows) => {
        if (cancelled) return
        // Auswahlreihenfolge wiederherstellen – daraus wird die Nummerierung.
        const byId = new Map(rows.map((r) => [r.id, r]))
        setGymBoulders(
          gymBoulderIds.map((id) => byId.get(id)).filter((b): b is GymBoulder => b != null),
        )
      })
      .catch(() => {
        /* ohne Vorauswahl weitermachen; der Hinweis unten bleibt dann aus */
      })
    return () => {
      cancelled = true
    }
    // gymBoulderIds kommt aus dem Router-State und ändert sich während des Screens nicht.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [settings, setSettings] = useState<SessionSettingsValues>({
    name: '',
    mode: DEFAULT_SCORING.mode,
    flashPoints: DEFAULT_SCORING.flashPoints,
    topPoints: DEFAULT_SCORING.topPoints,
    attemptCost: DEFAULT_SCORING.attemptCost,
    penaltyMode: DEFAULT_SCORING.penaltyMode,
    sharedScoring: false,
    isPublic: false,
  })
  const [hostName, setHostName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patch = (p: Partial<SessionSettingsValues>) => setSettings((s) => ({ ...s, ...p }))

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
        name: settings.name,
        hostId: userId,
        hostName,
        scoring: {
          mode: settings.mode,
          flashPoints: settings.flashPoints,
          topPoints: settings.topPoints,
          attemptCost: settings.attemptCost,
          penaltyMode: settings.penaltyMode,
        },
        sharedScoring: settings.sharedScoring,
        isPublic: settings.isPublic,
      })
      // Boulder von der Karte übernehmen, solange wir noch im try-Block sind: ein
      // Fehler landet damit in derselben Meldung und die Challenge bleibt bestehen.
      if (gymBoulders.length > 0) {
        await addBouldersFromGym({ sessionId: session.id, userId, boulders: gymBoulders })
      }
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

  const canSubmit = !!settings.name.trim() && !!hostName.trim()

  return (
    <div className="animate-screen-in mx-auto flex min-h-full max-w-md flex-col px-5 pb-11 pt-14">
      <div className="mb-3.5">
        <Link
          to="/"
          className="inline-flex items-center gap-0.5 text-[15px] font-semibold text-muted hover:text-ink"
        >
          <ChevronLeft className="text-[18px]" />
          Zurück
        </Link>
      </div>
      <h1 className="mb-5 font-display text-[34px] font-extrabold leading-none tracking-[-0.025em]">
        Neue Challenge
      </h1>

      <form className="flex flex-col" onSubmit={handleSubmit}>
        <SessionSettingsFields values={settings} onChange={patch} />

        {gymBoulders.length > 0 && (
          <div className="mb-[18px] flex items-center gap-2.5 rounded-card border border-border bg-surface-2 px-4 py-3 text-[14px]">
            <Plan className="shrink-0 text-[18px] text-faint" />
            <span>
              <strong className="font-display font-bold">{gymBoulders.length} Boulder</strong> vom
              Lageplan werden übernommen.
            </span>
          </div>
        )}

        <div className="mb-[18px]">
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

        {error && <p className="mb-3 text-sm text-bad">{error}</p>}

        <button type="submit" className="btn-primary mt-1.5" disabled={submitting || !canSubmit}>
          {submitting ? 'Erstelle …' : 'Challenge erstellen'}
        </button>
      </form>
    </div>
  )
}
