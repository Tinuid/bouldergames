import { rankClass, rankToken } from '../lib/leaderboard'

/**
 * Rang-Kennzeichen einer Leaderboard-Zeile: ab Platz 4 der neutrale Kreis mit der Ziffer,
 * auf den ersten drei Plätzen dieselbe Scheibe als Medaille – zwei gekreuzte Bändchen
 * dahinter, geprägter Innenring, Ziffer unverändert in der App-Schrift.
 *
 * Die Bändchen ragen bewusst nur in die vorhandene Zeilen-Polsterung hinein (das SVG ist
 * absolut positioniert und wird von der danach gezeichneten Scheibe überdeckt): die Zeilenhöhe
 * hängt an Name + Unterzeile, Platz 3 und Platz 4 bleiben damit exakt gleich hoch.
 */
export default function RankMedal({ rank, className = '' }: { rank: number; className?: string }) {
  const token = rankToken(rank)

  return (
    <span
      className={`relative flex h-[30px] w-[30px] shrink-0 items-center justify-center ${className}`}
    >
      {token && (
        // Hinter der Scheibe: die unteren 9px verschwinden darunter, sichtbar bleiben 7px.
        <svg
          aria-hidden="true"
          viewBox="0 0 26 16"
          width="26"
          height="16"
          className="absolute -top-[7px] left-1/2 -translate-x-1/2"
        >
          {/* Farbe über style statt über das fill-Attribut: color-mix() ist dort sicher
              als CSS geparst – dieselbe Vorsicht wie beim Verlauf der Karten-Punkte. */}
          <polygon
            points="1,0 8,0 17,16 10,16"
            style={{ fill: `color-mix(in srgb, ${token} 62%, var(--ink))` }}
          />
          <polygon
            points="25,0 18,0 9,16 16,16"
            style={{ fill: `color-mix(in srgb, ${token} 82%, var(--ink))` }}
          />
        </svg>
      )}
      <span
        className={`relative flex h-[30px] w-[30px] items-center justify-center rounded-full font-num text-[14px] font-bold tabular-nums ${rankClass(
          rank,
        )}`}
        style={
          token
            ? {
                boxShadow:
                  'inset 0 0 0 1.5px color-mix(in srgb, #fff 40%, transparent), 0 1px 2px rgba(40,33,20,0.22)',
              }
            : undefined
        }
      >
        {rank}
      </span>
    </span>
  )
}
