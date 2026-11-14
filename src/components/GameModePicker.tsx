import { GAME_MODES, UPCOMING_GAME_MODES } from '../lib/gameModes'
import type { GameMode } from '../types'
import {
  Bolt,
  Check,
  Coins,
  Crown,
  Diamond,
  Dice,
  Flag,
  Grid,
  Hand,
  Hash,
  Palette,
  Plan,
  Pyramid,
  Repeat,
  Scale,
  Timer,
  Trophy,
  Users,
} from './icons'

// Icon je Modus (Darstellung bleibt hier, die Texte kommen aus lib/gameModes.ts).
// Schlüssel = `value` aus GAME_MODES bzw. `key` aus UPCOMING_GAME_MODES.
const ICONS: Record<string, React.ReactNode> = {
  standard: <Check />,
  flash_only: <Bolt />,
  time_attack: <Timer />,
  color: <Palette />,
  last_man_standing: <Crown />,
  bets: <Coins />,
  few_holds: <Hand />,
  max_holds: <Hash />,
  best_n: <Trophy />,
  rarity: <Diamond />,
  first_ascent: <Flag />,
  handicap: <Scale />,
  teams: <Users />,
  bingo: <Grid />,
  area_tour: <Plan />,
  pyramid: <Pyramid />,
  horse: <Repeat />,
  random: <Dice />,
}

// Auswahl des Spielmodus als Karten-Liste – Schritt 1 beim Erstellen und oben im
// Edit-Dialog. Reine Darstellung: der gewählte Wert lebt beim Aufrufer.
export default function GameModePicker({
  value,
  onChange,
  showUpcoming = true,
}: {
  value: GameMode
  onChange: (mode: GameMode) => void
  // Angekündigte Modi als ausgegraute „bald“-Karten zeigen (nicht im Edit-Dialog).
  showUpcoming?: boolean
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {GAME_MODES.map((m) => {
        const active = m.value === value
        return (
          <button
            key={m.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(m.value)}
            className={`flex w-full items-start gap-3 rounded-card border px-4 py-3.5 text-left transition ${
              active ? 'border-accent bg-accent-soft' : 'border-border bg-surface shadow-card'
            }`}
          >
            <ModeIcon icon={ICONS[m.value]} active={active} />
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[16px] font-bold leading-tight">
                {m.title}
              </span>
              <span className="mt-0.5 block text-[12.5px] text-muted">{m.subtitle}</span>
              {active && (
                <span className="mt-1.5 block text-[12.5px] leading-relaxed text-ink">
                  {m.description}
                </span>
              )}
            </span>
          </button>
        )
      })}

      {showUpcoming && UPCOMING_GAME_MODES.length > 0 && (
        // Angekündigte Modi kompakt im 2er-Raster – es sind viele, und sie sind
        // nur Vorschau: nicht antippbar, gestrichelt und blass.
        <div className="mt-4">
          <h2 className="section-label mb-2.5 px-0.5">Bald verfügbar</h2>
          <ul className="grid grid-cols-2 gap-2">
            {UPCOMING_GAME_MODES.map((m) => (
              <li
                key={m.key}
                aria-disabled="true"
                className="flex min-w-0 flex-col gap-1.5 rounded-sm2 border border-dashed border-border px-3 py-2.5 opacity-55"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="shrink-0 text-[15px] text-muted">{ICONS[m.key]}</span>
                  <span className="truncate font-display text-[13.5px] font-bold leading-tight">
                    {m.title}
                  </span>
                </span>
                <span className="text-[11.5px] leading-snug text-muted">{m.subtitle}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ModeIcon({ icon, active }: { icon: React.ReactNode; active: boolean }) {
  return (
    <span
      className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] text-[17px] ${
        active ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted'
      }`}
    >
      {icon}
    </span>
  )
}
