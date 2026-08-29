import type { ReactNode } from 'react'
import { DIFFICULTIES } from '../../lib/difficulty'
import { BOULDER_COLORS, colorSwatch } from '../../lib/colors'
import { HALL_AREAS } from '../../lib/areas'
import {
  EMPTY_FILTER,
  activeFilterCount,
  isFiltering,
  toggleValue as toggle,
  type MapFilter,
} from '../../lib/mapFilter'
import { Check, ChevronRight } from '../icons'

const TICK_OPTIONS: { value: MapFilter['tick']; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'offen', label: 'Offen' },
  { value: 'erledigt', label: 'Erledigt' },
]

/**
 * Filterleiste unter der Karte. Zugeklappt zeigt sie nur Zähler und Einstieg,
 * damit sie nicht den Bereich verdeckt, auf den man gerade schaut.
 *
 * Optik und Klassen entsprechen dem Filterblock in SessionView – mit einem
 * Unterschied: hier ist alles MEHRFACHauswahl, weil man auf der Karte typischerweise
 * "Grad 5 und 6 im Pulverturm" sucht.
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
  available: { difficulties: number[]; areas: string[]; colors: string[] }
  visibleCount: number
  totalCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
  // Platz für Aktionen – Aufhänger für die Mehrfachauswahl in Etappe 2.
  footer?: ReactNode
}) {
  const filtering = isFiltering(value)
  const count = activeFilterCount(value)

  const difficulties = DIFFICULTIES.filter((d) => available.difficulties.includes(d.code))
  const areas = HALL_AREAS.filter((a) => available.areas.includes(a.id))
  const colors = BOULDER_COLORS.filter((c) => available.colors.includes(c.name))

  return (
    <div className="border-t border-border bg-surface">
      {open && (
        <div className="max-h-[42vh] overflow-y-auto px-5 pb-1 pt-4">
          {difficulties.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 font-display text-[13px] font-semibold text-muted">Grad</div>
              <div className="flex flex-wrap gap-1.5">
                {difficulties.map((d) => {
                  const selected = value.difficulties.includes(d.code)
                  return (
                    <button
                      key={d.code}
                      type="button"
                      onClick={() => onChange({ ...value, difficulties: toggle(value.difficulties, d.code) })}
                      aria-pressed={selected}
                      aria-label={
                        d.label === '?' || d.label === '!'
                          ? `Schwierigkeit ${d.label}`
                          : `Grad ${d.label}`
                      }
                      className={`flex h-[30px] w-[30px] items-center justify-center rounded-lg border font-num text-[14px] font-bold transition active:scale-90 ${
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
            </div>
          )}

          {areas.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 font-display text-[13px] font-semibold text-muted">Bereich</div>
              <div className="flex flex-wrap gap-1.5">
                {areas.map((a) => {
                  const selected = value.areas.includes(a.id)
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onChange({ ...value, areas: toggle(value.areas, a.id) })}
                      aria-pressed={selected}
                      className={`chip flex-row items-center gap-1.5 px-3 py-2 text-[13px] font-semibold ${
                        selected ? 'is-active' : ''
                      }`}
                    >
                      {selected && <Check className="text-[14px]" />}
                      {a.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {colors.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 font-display text-[13px] font-semibold text-muted">Farbe</div>
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
                      className={`h-6 w-6 rounded-full transition active:scale-90 ${
                        selected
                          ? 'scale-110 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14),0_0_0_2px_var(--surface),0_0_0_4px_var(--accent)]'
                          : 'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14)]'
                      }`}
                      style={{ background: colorSwatch(c.name) }}
                    />
                  )
                })}
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="mb-2 font-display text-[13px] font-semibold text-muted">Meine Marken</div>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Meine Marken">
              {TICK_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={value.tick === o.value}
                  onClick={() => onChange({ ...value, tick: o.value })}
                  className={`seg-opt items-center text-center text-[13px] font-semibold ${
                    value.tick === o.value ? 'is-active' : ''
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-pressed={value.onlyProjects}
              onClick={() => onChange({ ...value, onlyProjects: !value.onlyProjects })}
              className={`chip mt-2 w-full flex-row items-center justify-center gap-2 py-2.5 text-[13px] font-semibold ${
                value.onlyProjects ? 'is-active' : ''
              }`}
            >
              {value.onlyProjects && <Check className="text-[15px]" />}
              Nur Projekte
            </button>
          </div>
        </div>
      )}

      {footer}

      <div
        className="flex items-center justify-between gap-3 px-5 py-3"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          className="flex items-center gap-1.5 font-display text-[14px] font-bold text-ink"
        >
          <ChevronRight className={`text-[16px] transition ${open ? 'rotate-90' : ''}`} />
          Filter
          {count > 0 && (
            <span className="ml-1 rounded-full bg-accent px-2 py-0.5 font-num text-[11px] font-bold text-accent-ink">
              {count}
            </span>
          )}
        </button>

        <div className="flex items-center gap-3">
          <span className="font-num text-[13px] tabular-nums text-muted" aria-live="polite">
            {filtering ? `${visibleCount} / ${totalCount}` : totalCount} Boulder
          </span>
          {filtering && (
            <button
              type="button"
              className="text-[13px] font-semibold text-accent"
              onClick={() => onChange(EMPTY_FILTER)}
            >
              Zurücksetzen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
