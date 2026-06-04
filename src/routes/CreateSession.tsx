import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { createSession } from '../lib/api'
import { computePoints } from '../lib/scoring'
import { rememberSession } from '../lib/localHistory'
import { DEFAULT_SCORING, type PenaltyMode, type ScoringConfig, type ScoringMode } from '../types'
import { Bolt, Check, ChevronLeft, Down, Up, X } from '../components/icons'

// Auswählbare Strafmodi beim Erstellen (siehe PenaltyMode in types.ts).
const PENALTY_MODES: { value: PenaltyMode; title: string; subtitle: string; hint: string }[] = [
  {
    value: 'top_floor',
    title: 'Top nie negativ',
    subtitle: 'Empfohlen',
    hint: 'Nur Fehlversuche kosten, und ein Top gibt nie Minuspunkte. „Nicht geschafft“ bleibt negativ.',
  },
  {
    value: 'strict',
    title: 'Strikt',
    subtitle: 'Kann negativ',
    hint: 'Jeder Versuch kostet – auch der erfolgreiche. Ein Top kann ins Minus rutschen.',
  },
  {
    value: 'misses',
    title: 'Nur Fehlversuche',
    subtitle: 'Kann negativ',
    hint: 'Nur Fehlversuche kosten; bei sehr vielen Fehlversuchen kann ein Top trotzdem negativ werden.',
  },
]

export default function CreateSession() {
  const { userId } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [hostName, setHostName] = useState('')
  const [mode, setMode] = useState<ScoringMode>(DEFAULT_SCORING.mode)
  const [flash, setFlash] = useState(DEFAULT_SCORING.flashPoints)
  const [top, setTop] = useState(DEFAULT_SCORING.topPoints)
  const [cost, setCost] = useState(DEFAULT_SCORING.attemptCost)
  const [penaltyMode, setPenaltyMode] = useState<PenaltyMode>(DEFAULT_SCORING.penaltyMode)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Beispielpunkte direkt aus der Punktelogik berechnen (immer konsistent mit dem Spiel).
  // Basis = klassisch (ohne Grad-Faktor), damit die Strafmodus-Beispiele den reinen Effekt zeigen.
  const baseCfg: ScoringConfig = {
    mode: 'classic',
    flashPoints: flash,
    topPoints: top,
    attemptCost: cost,
    penaltyMode,
  }
  const exFlash = computePoints('flash', 1, baseCfg)
  const exTop1 = computePoints('top', 2, baseCfg) // 1 Fehlversuch
  const exTopMany = computePoints('top', 9, baseCfg) // 8 Fehlversuche
  const exFail = computePoints('fail', 3, baseCfg) // 3× nicht geschafft

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
        scoring: { mode, flashPoints: flash, topPoints: top, attemptCost: cost, penaltyMode },
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

  const canSubmit = !!name.trim() && !!hostName.trim()

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
        <div className="mb-[18px]">
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

        <div className="panel mb-[18px]">
          <div className="panel-title mb-3.5">Spielmodus</div>
          <div className="seg">
            <SegOption
              active={mode === 'classic'}
              title="Klassisch"
              sub="Feste Punkte"
              onClick={() => setMode('classic')}
            />
            <SegOption
              active={mode === 'multiplier'}
              title="Multiplikator"
              sub="Grad × Punkte"
              onClick={() => setMode('multiplier')}
            />
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
            {mode === 'multiplier' ? (
              <>
                Der Schwierigkeitsgrad multipliziert die Punkte. Beispiel: ein Top mit 1 Fehlversuch
                (klassisch {exTop1}) zählt auf Grad 4 = {exTop1 * 4}. Grad ist beim Anlegen eines
                Boulders Pflicht.
              </>
            ) : (
              <>
                Feste Punkte pro Boulder; der Schwierigkeitsgrad dient nur zur Info. Beispiel: ein
                Top mit 1 Fehlversuch zählt {exTop1} Punkte – unabhängig vom Grad.
              </>
            )}
          </p>
        </div>

        <div className="panel mb-[18px]">
          <div className="panel-title mb-3.5">
            {mode === 'multiplier' ? 'Punkteregeln (pro Grad)' : 'Punkteregeln'}
          </div>
          <RuleRow
            icon={<Bolt />}
            tone="flash"
            label="Punkte für Flash"
            value={flash}
            onChange={setFlash}
          />
          <RuleRow
            icon={<Check />}
            tone="top"
            label="Punkte für Top"
            value={top}
            onChange={setTop}
          />
          <RuleRow
            icon={<X />}
            tone="miss"
            label="Kosten pro Fehlversuch"
            value={cost}
            min={0}
            onChange={setCost}
          />
        </div>

        <div className="panel mb-[18px]">
          <div className="panel-title mb-3.5">Minuspunkte</div>
          <div className="grid grid-cols-3 gap-2">
            {PENALTY_MODES.map((p) => (
              <button
                key={p.value}
                type="button"
                aria-pressed={penaltyMode === p.value}
                onClick={() => setPenaltyMode(p.value)}
                className={`chip${penaltyMode === p.value ? ' is-active' : ''}`}
              >
                <span className="font-display text-[13px] font-bold leading-tight">{p.title}</span>
                <span
                  className={`text-[11px] ${penaltyMode === p.value ? 'text-accent-ink/80' : 'text-muted'}`}
                >
                  {p.subtitle}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
            {PENALTY_MODES.find((p) => p.value === penaltyMode)?.hint}
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            Beispiel: Flash = <b className="text-ink">{exFlash}</b> · Top, 1 Fehlversuch ={' '}
            <b className="text-ink">{exTop1}</b> · Top, 8 Fehlversuche ={' '}
            <b className="text-ink">{exTopMany}</b> · 3× nicht geschafft ={' '}
            <b className="text-ink">{exFail}</b>.
          </p>
        </div>

        {error && <p className="mb-3 text-sm text-bad">{error}</p>}

        <button type="submit" className="btn-primary mt-1.5" disabled={submitting || !canSubmit}>
          {submitting ? 'Erstelle …' : 'Challenge erstellen'}
        </button>
      </form>
    </div>
  )
}

function SegOption({
  active,
  title,
  sub,
  onClick,
}: {
  active: boolean
  title: string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`seg-opt${active ? ' is-active' : ''}`}
    >
      <span className="font-display text-[16px] font-bold">{title}</span>
      <span className={`text-[12px] ${active ? 'text-accent-ink/80' : 'text-muted'}`}>{sub}</span>
    </button>
  )
}

const RULE_TONES = {
  flash: 'text-accent bg-accent-soft',
  top: 'text-ok bg-ok-soft',
  miss: 'text-bad bg-bad-soft',
} as const

function RuleRow({
  icon,
  tone,
  label,
  value,
  onChange,
  min = 0,
  max = 99,
}: {
  icon: React.ReactNode
  tone: keyof typeof RULE_TONES
  label: string
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
}) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)))
  return (
    <div className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0">
      <span
        className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] text-[16px] ${RULE_TONES[tone]}`}
      >
        {icon}
      </span>
      <span className="flex-1 text-[15px] font-medium">{label}</span>
      <div className="stepper">
        <button
          type="button"
          className="step-btn"
          onClick={() => set(value - 1)}
          aria-label="weniger"
        >
          <Down className="text-[16px]" />
        </button>
        <span className="step-val">{value}</span>
        <button type="button" className="step-btn" onClick={() => set(value + 1)} aria-label="mehr">
          <Up className="text-[16px]" />
        </button>
      </div>
    </div>
  )
}
