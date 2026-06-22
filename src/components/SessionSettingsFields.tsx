import { computePoints } from '../lib/scoring'
import type { PenaltyMode, ScoringConfig, ScoringMode } from '../types'
import { Bolt, Check, Down, Up, X } from './icons'

// Die fünf Spieleinstellungen einer Session – geteilt von CreateSession (Anlegen)
// und EditSessionDialog (nachträgliches Ändern durch den Host). Eine Quelle der
// Wahrheit für Layout und Texte, damit beide Formulare nicht auseinanderlaufen.
export interface SessionSettingsValues {
  name: string
  mode: ScoringMode
  flashPoints: number
  topPoints: number
  attemptCost: number
  penaltyMode: PenaltyMode
  sharedScoring: boolean
}

// Auswählbare Strafmodi (siehe PenaltyMode in types.ts).
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

export default function SessionSettingsFields({
  values,
  onChange,
}: {
  values: SessionSettingsValues
  onChange: (patch: Partial<SessionSettingsValues>) => void
}) {
  const { name, mode, flashPoints, topPoints, attemptCost, penaltyMode, sharedScoring } = values

  // Beispielpunkte direkt aus der Punktelogik berechnen (immer konsistent mit dem Spiel).
  // Basis = klassisch (ohne Grad-Faktor), damit die Strafmodus-Beispiele den reinen Effekt zeigen.
  const baseCfg: ScoringConfig = {
    mode: 'classic',
    flashPoints,
    topPoints,
    attemptCost,
    penaltyMode,
  }
  const exFlash = computePoints('flash', 1, baseCfg)
  const exTop1 = computePoints('top', 2, baseCfg) // 1 Fehlversuch
  const exTopMany = computePoints('top', 9, baseCfg) // 8 Fehlversuche
  const exFail = computePoints('fail', 3, baseCfg) // 3× nicht geschafft

  return (
    <>
      <div className="mb-[18px]">
        <label className="label" htmlFor="name">
          Name der Challenge
        </label>
        <input
          id="name"
          className="input"
          placeholder="z.B. Alle Vierer abklettern"
          value={name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>

      <div className="panel mb-[18px]">
        <div className="panel-title mb-3.5">Spielmodus</div>
        <div className="seg">
          <SegOption
            active={mode === 'classic'}
            title="Klassisch"
            sub="Feste Punkte"
            onClick={() => onChange({ mode: 'classic' })}
          />
          <SegOption
            active={mode === 'multiplier'}
            title="Multiplikator"
            sub="Grad × Punkte"
            onClick={() => onChange({ mode: 'multiplier' })}
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
              Feste Punkte pro Boulder; der Schwierigkeitsgrad dient nur zur Info. Beispiel: ein Top
              mit 1 Fehlversuch zählt {exTop1} Punkte – unabhängig vom Grad.
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
          value={flashPoints}
          onChange={(n) => onChange({ flashPoints: n })}
        />
        <RuleRow
          icon={<Check />}
          tone="top"
          label="Punkte für Top"
          value={topPoints}
          onChange={(n) => onChange({ topPoints: n })}
        />
        <RuleRow
          icon={<X />}
          tone="miss"
          label="Kosten pro Fehlversuch"
          value={attemptCost}
          min={0}
          onChange={(n) => onChange({ attemptCost: n })}
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
              onClick={() => onChange({ penaltyMode: p.value })}
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

      <div className="panel mb-[18px]">
        <div className="panel-title mb-3.5">Eintragen</div>
        <button
          type="button"
          aria-pressed={sharedScoring}
          onClick={() => onChange({ sharedScoring: !sharedScoring })}
          className={`chip w-full flex-row items-center justify-center gap-2 py-2.5 text-[13px] font-semibold${sharedScoring ? ' is-active' : ''}`}
        >
          {sharedScoring && <Check className="text-[15px]" />}
          Für andere eintragen erlauben
        </button>
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
          Jeder Teilnehmer darf Ergebnisse für alle Mitspieler eintragen – praktisch, wenn einer mit
          dem Handy für die Gruppe mitschreibt. Ohne Haken trägt jeder nur für sich selbst ein.
        </p>
      </div>
    </>
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
        <button type="button" className="step-btn" onClick={() => set(value - 1)} aria-label="weniger">
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
