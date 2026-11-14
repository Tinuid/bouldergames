import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { addBouldersFromGym, createSession, listGymBouldersByIds } from '../lib/api'
import { rememberSession } from '../lib/localHistory'
import { gameModeInfo, isGameMode } from '../lib/gameModes'
import { DEFAULT_SCORING, type GameMode, type GymBoulder } from '../types'
import { ChevronLeft, Plan } from '../components/icons'
import GameModePicker from '../components/GameModePicker'
import SessionSettingsFields, {
  type SessionSettingsValues,
} from '../components/SessionSettingsFields'

// Router-State von /create: Vorauswahl von der Karte und – nach Schritt 1 – das
// Kennzeichen, dass der Verlauf einen Schritt zurück zur Moduswahl führt.
type CreateState = { gymBoulderIds?: string[]; fromModeStep?: boolean } | null

export default function CreateSession() {
  const { userId } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const routerState = location.state as CreateState

  // Zwei Schritte: erst den Spielmodus wählen (/create), dann die Einstellungen
  // (/create?modus=…). Der Schritt liegt bewusst in der URL, damit der Zurück-Button
  // des Handys von den Einstellungen zur Moduswahl führt statt zur Startseite.
  // Unbekannte Werte landen wieder in Schritt 1.
  const [searchParams] = useSearchParams()
  const modusParam = searchParams.get('modus')
  const chosenMode: GameMode | null = isGameMode(modusParam) ? modusParam : null
  const [pickedMode, setPickedMode] = useState<GameMode>(chosenMode ?? DEFAULT_SCORING.gameMode)

  function goToSettings() {
    // Router-State mitgeben, sonst ginge die Vorauswahl von der Karte verloren.
    navigate({ search: `?modus=${pickedMode}` }, { state: { ...routerState, fromModeStep: true } })
  }

  function backToModeStep() {
    if (chosenMode) setPickedMode(chosenMode)
    // Kamen wir aus Schritt 1, ist das ein echter Schritt zurück im Verlauf; nach
    // einem Reload oder Direktaufruf gibt es den nicht – dann ersetzen.
    if (routerState?.fromModeStep) navigate(-1)
    else navigate({ search: '' }, { replace: true, state: routerState })
  }

  // Vorauswahl von der Hallenkarte. Bewusst über den Router-State und nicht über
  // die URL: die Auswahl ist flüchtig und muss einen Reload nicht überleben – dann
  // entsteht eben eine leere Challenge.
  const gymBoulderIds = routerState?.gymBoulderIds
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

  // Der Spielmodus kommt aus der URL (siehe oben); `gameMode` hier ist nur der
  // Startwert und wird beim Rendern/Absenden durch `chosenMode` überschrieben.
  const [settings, setSettings] = useState<SessionSettingsValues>({
    name: '',
    gameMode: DEFAULT_SCORING.gameMode,
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
          gameMode: chosenMode ?? DEFAULT_SCORING.gameMode,
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
        gameMode: session.game_mode,
      })
      navigate(`/s/${session.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erstellen fehlgeschlagen.')
      setSubmitting(false)
    }
  }

  const canSubmit = !!settings.name.trim() && !!hostName.trim()

  if (!chosenMode) {
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
        <h1 className="mb-2 font-display text-[34px] font-extrabold leading-none tracking-[-0.025em]">
          Neue Challenge
        </h1>
        <p className="mb-5 text-[15px] text-muted">Welcher Spielmodus?</p>

        <GameModePicker value={pickedMode} onChange={setPickedMode} />

        <button type="button" className="btn-primary mt-6" onClick={goToSettings}>
          Weiter
        </button>
      </div>
    )
  }

  return (
    <div className="animate-screen-in mx-auto flex min-h-full max-w-md flex-col px-5 pb-11 pt-14">
      <div className="mb-3.5">
        <button
          type="button"
          onClick={backToModeStep}
          className="inline-flex items-center gap-0.5 text-[15px] font-semibold text-muted hover:text-ink"
        >
          <ChevronLeft className="text-[18px]" />
          Zurück
        </button>
      </div>
      <h1 className="mb-2 font-display text-[34px] font-extrabold leading-none tracking-[-0.025em]">
        Neue Challenge
      </h1>
      <p className="mb-5 text-[15px] text-muted">
        Spielmodus:{' '}
        <strong className="font-semibold text-ink">{gameModeInfo(chosenMode).title}</strong>
        {' · '}
        <button type="button" onClick={backToModeStep} className="font-semibold text-accent">
          ändern
        </button>
      </p>

      <form className="flex flex-col" onSubmit={handleSubmit}>
        <SessionSettingsFields values={{ ...settings, gameMode: chosenMode }} onChange={patch} />

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
