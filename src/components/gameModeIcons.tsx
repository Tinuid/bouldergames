// Icons der Spielmodi, Spielformen und Extras – Schlüssel = `value` aus GAME_MODES bzw.
// `key` der angekündigten Einträge (src/lib/gameModes.ts). Eigene Datei, damit Badges
// (Session-Kopf) und die Moduswahl dieselben Icons nutzen.
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

export const GAME_MODE_ICONS: Record<string, React.ReactNode> = {
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
