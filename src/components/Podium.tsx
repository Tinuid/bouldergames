import type { LeaderboardRow } from '../lib/leaderboard'

/**
 * Treppchen für die ersten drei Plätze auf der Ranglisten-Seite. Bekommt die bereits
 * berechneten Zeilen (lib/leaderboard.ts) und zeigt sie in der Reihenfolge Silber–Gold–Bronze,
 * damit Platz 1 in der Mitte steht. Sind weniger als drei Teilnehmer da, werden nur die
 * vorhandenen Spalten gerendert.
 */

// Sockel-Höhe, Kreis-Größe und Schriftgrade je Platz. Platz 1 ist bewusst größer.
const TIERS: Record<
  number,
  {
    token: string
    bar: string
    avatar: string
    avatarText: string
    name: string
    points: string
    numeral: string
    ink: string
  }
> = {
  1: {
    token: 'var(--gold)',
    bar: 'h-[100px] pt-3',
    avatar: 'h-[52px] w-[52px]',
    avatarText: 'text-[19px]',
    name: 'text-[17px]',
    points: 'text-[30px]',
    numeral: 'text-[34px]',
    ink: '#3a2a06',
  },
  2: {
    token: 'var(--silver)',
    bar: 'h-[74px] pt-2.5',
    avatar: 'h-[44px] w-[44px]',
    avatarText: 'text-[16px]',
    name: 'text-[15px]',
    points: 'text-[20px]',
    numeral: 'text-[28px]',
    ink: '#2a2d33',
  },
  3: {
    token: 'var(--bronze)',
    bar: 'h-[58px] pt-2',
    avatar: 'h-[40px] w-[40px]',
    avatarText: 'text-[15px]',
    name: 'text-[15px]',
    points: 'text-[20px]',
    numeral: 'text-[24px]',
    ink: '#2e1a0c',
  },
}

// Initialen aus dem Anzeigenamen: bis zu zwei Wortanfänge, sonst die ersten zwei Zeichen.
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

function Column({
  row,
  place,
  isMe,
  onSelect,
}: {
  row: LeaderboardRow
  place: number
  isMe: boolean
  onSelect?: (row: LeaderboardRow) => void
}) {
  const tier = TIERS[place]
  return (
    <button
      type="button"
      disabled={!onSelect}
      onClick={() => onSelect?.(row)}
      aria-label={`Details zu ${row.participant.display_name}`}
      className="flex min-w-0 flex-col items-center self-end rounded-t-sm2 transition enabled:active:scale-[0.98]"
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-full font-display font-bold ${tier.avatar} ${tier.avatarText}`}
        style={{ background: tier.token, color: tier.ink }}
      >
        {initials(row.participant.display_name)}
      </span>
      <span className="mt-[7px] flex max-w-full items-center gap-1.5">
        <span className={`truncate font-display font-bold ${tier.name}`}>
          {row.participant.display_name}
        </span>
        {isMe && (
          <span className="shrink-0 rounded-md bg-ok-soft px-1 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-ok">
            du
          </span>
        )}
      </span>
      <span
        className={`mt-[3px] font-num font-bold leading-none tracking-[-0.02em] tabular-nums ${tier.points}`}
      >
        {row.points}
      </span>
      <span className="mt-0.5 text-[11px] text-muted">
        {row.tops} Tops · {row.flashes} Flashes
      </span>
      <span
        className={`mt-[9px] flex w-full items-start justify-center rounded-t-sm2 border-t-[3px] font-display font-extrabold leading-none ${tier.bar} ${tier.numeral}`}
        style={{
          borderColor: tier.token,
          background: `color-mix(in srgb, ${tier.token} 16%, transparent)`,
          color: `color-mix(in srgb, ${tier.token} 78%, var(--ink))`,
        }}
      >
        {row.rank}
      </span>
    </button>
  )
}

export default function Podium({
  rows,
  currentUserId,
  onSelectPlayer,
}: {
  // Die ersten (bis zu) drei Zeilen des Leaderboards, bereits sortiert.
  rows: LeaderboardRow[]
  currentUserId: string | null
  onSelectPlayer?: (row: LeaderboardRow) => void
}) {
  if (rows.length === 0) return null

  // Silber – Gold – Bronze, damit Platz 1 in der Mitte steht. `place` ist die Position
  // in der Liste (nicht row.rank – bei Gleichstand stünden sonst zwei Spalten auf demselben Sockel).
  const order = [1, 0, 2].filter((i) => rows[i] != null)

  return (
    <div className="card !px-4 !pb-0 !pt-5">
      <div
        className="grid items-end gap-2.5"
        style={{
          gridTemplateColumns:
            rows.length >= 3
              ? '1fr 1.12fr 1fr'
              : rows.length === 2
                ? '1fr 1.12fr'
                : 'minmax(0, 1fr)',
        }}
      >
        {order.map((i) => (
          <Column
            key={rows[i].participant.id}
            row={rows[i]}
            place={i + 1}
            isMe={currentUserId !== null && rows[i].participant.user_id === currentUserId}
            onSelect={onSelectPlayer}
          />
        ))}
      </div>
    </div>
  )
}
