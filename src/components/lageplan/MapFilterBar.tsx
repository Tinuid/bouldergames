import type { ReactNode } from 'react'
import { DIFFICULTIES } from '../../lib/difficulty'
import { BOULDER_COLORS, colorSwatch } from '../../lib/colors'
import {
  EMPTY_FILTER,
  activeFilterCount,
  isFiltering,
  toggleValue as toggle,
  type MapFilter,
} from '../../lib/mapFilter'
import { ChevronLeft } from '../icons'

const TICK_OPTIONS: { value: MapFilter['tick']; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'offen', label: 'Offen' },
  { value: 'erledigt', label: 'Erledigt' },
  { value: 'projekte', label: 'Projekte' },
]

/**
 * Filterleiste unter der Karte.
 *
 * Standardmäßig aufgeklappt und bewusst kompakt: es muss IMMER alles sichtbar sein,
 * ohne innerhalb des Filters zu scrollen – ein Filter, dessen Optionen man erst
 * suchen muss, wird nicht benutzt. Dafür ist die Zahl der Gruppen klein gehalten
 * (Grad, Farbe, eigene Marken) und der Bereichsfilter derzeit gar nicht dabei: die
 * Karte zeigt ohnehin, wo etwas hängt.
 *
 * Der Einklapp-Pfeil sitzt oben rechts – dort ist er mit dem Daumen der rechten Hand
 * zu erreichen, ohne die Karte zu verdecken.
 *
 * Optik und Klassen folgen dem Filterblock in SessionView, nur enger und überall
 * mit Mehrfachauswahl.
 */
export default function MapFilterBar({
  value,
  onChange,
  available,
  visibleCount,
  totalCount,
  open,
  onOpenChange,
  footer,
}: {
  value: MapFilter
  onChange: (next: MapFilter) => void
  // Nur Werte anbieten, die tatsächlich vorkommen (Muster aus SessionView).
  available: { difficulties: number[]; colors: string[] }
  visibleCount: number
  totalCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
  // Platz für Aktionen – im Auswahlmodus sitzt hier die Aktionsleiste.
  footer?: ReactNode
}) {
  const filtering = isFiltering(value)
  const count = activeFilterCount(value)

  const difficulties = DIFFICULTIES.filter((d) => available.difficulties.includes(d.code))
  const colors = BOULDER_COLORS.filter((c) => available.colors.includes(c.name))

  const toggleButton = (
    <button
      type="button"
      onClick={() => onOpenChange(!open)}
      aria-expanded={open}
      aria-label={open ? 'Filter ausblenden' : 'Filter einblenden'}
      className="-my-1 -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
    >
      <ChevronLeft className={`text-[18px] transition ${open ? 'rotate-90' : '-rotate-90'}`} />
    </button>
  )

  return (
    <div className="border-t border-border bg-surface">
      {footer}

      <div
        className="px-5 py-2.5"
        style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-3">
          <span className="font-display text-[13px] font-bold text-ink">Filter</span>
          {count > 0 && (
            <span className="rounded-full bg-accent px-1.5 py-px font-num text-[11px] font-bold text-accent-ink">
              {count}
            </span>
          )}
          <span
            className="ml-auto font-num text-[12px] tabular-nums text-muted"
            aria-live="polite"
          >
            {filtering ? `${visibleCount} / ${totalCount}` : totalCount} Boulder
          </span>
          {filtering && (
            <button
              type="button"
              className="text-[12px] font-semibold text-accent"
              onClick={() => onChange(EMPTY_FILTER)}
            >
              Zurücksetzen
            </button>
          )}
          {toggleButton}
        </div>

        {open && (
          <div className="mt-2.5 flex flex-col gap-2.5">
            {difficulties.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {difficulties.map((d) => {
                  const selected = value.difficulties.includes(d.code)
                  return (
                    <button
                      key={d.code}
                      type="button"
                      onClick={() =>
                        onChange({ ...value, difficulties: toggle(value.difficulties, d.code) })
                      }
                      aria-pressed={selected}
                      aria-label={
                        d.label === '?' || d.label === '!'
                          ? `Schwierigkeit ${d.label}`
                          : `Grad ${d.label}`
                      }
                      className={`flex h-[28px] w-[28px] items-center justify-center rounded-lg border font-num text-[13px] font-bold transition active:scale-90 ${
                        selected
                          ? 'border-accent bg-accent text-accent-ink'
                          : 'border-border-strong bg-surface-2 text-ink'
                      }`}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            )}

            {colors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => {
                  const selected = value.colors.includes(c.name)
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => onChange({ ...value, colors: toggle(value.colors, c.name) })}
                      title={c.name}
                      aria-label={c.name}
                      aria-pressed={selected}
                      className={`h-[22px] w-[22px] rounded-full transition active:scale-90 ${
                        selected
                          ? 'scale-110 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14),0_0_0_2px_var(--surface),0_0_0_3px_var(--accent)]'
                          : 'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14)]'
                      }`}
                      style={{ background: colorSwatch(c.name) }}
                    />
                  )
                })}
              </div>
            )}

            <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Meine Marken">
              {TICK_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={value.tick === o.value}
                  onClick={() => onChange({ ...value, tick: o.value })}
                  className={`rounded-sm2 border py-1.5 text-center text-[12px] font-semibold transition active:scale-95 ${
                    value.tick === o.value
                      ? 'border-accent bg-accent text-accent-ink'
                      : 'border-border-strong bg-surface-2 text-ink'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
