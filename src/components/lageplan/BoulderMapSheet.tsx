import { useState } from 'react'
import { boulderImageUrl } from '../../lib/images'
import { colorSwatch } from '../../lib/colors'
import { difficultyLabel } from '../../lib/difficulty'
import { areaLabel } from '../../lib/areas'
import ImageLightbox from '../ImageLightbox'
import { Check, Crosshair, Edit, Flag, X } from '../icons'
import type { GymBoulder, GymTickState } from '../../types'

/**
 * Detail-Sheet zu einem Boulder auf der Karte.
 *
 * Bewusst OHNE .sheet-scrim: der dunkle inset-0-Hintergrund würde genau den Punkt
 * verstecken, den man gerade angetippt hat. Entsprechend auch kein aria-modal –
 * die Karte darüber bleibt bedienbar, und das ehrlich zu signalisieren ist besser,
 * als es zu behaupten.
 *
 * Die Prop ist ein Array, obwohl Etappe 1 immer genau einen Boulder zeigt: die
 * Mehrfachauswahl aus Etappe 2 füllt später dieselbe Komponente.
 */
export default function BoulderMapSheet({
  boulders,
  tick,
  adminMode,
  onSetTick,
  onEdit,
  onStartMove,
  onClose,
}: {
  boulders: GymBoulder[]
  tick: GymTickState | null
  adminMode: boolean
  // null ⇒ Marke entfernen (zurück auf "offen").
  onSetTick: (state: GymTickState | null) => void
  onEdit: () => void
  onStartMove: () => void
  onClose: () => void
}) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  const boulder = boulders[0]
  if (!boulder) return null

  const imageUrl = boulderImageUrl(boulder.image_path)
  const area = areaLabel(boulder.area)

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center">
        <div className="sheet-inline pointer-events-auto" role="dialog" aria-label="Boulder">
          <div className="sheet-grip" />

          <div className="flex items-start gap-3">
            {imageUrl ? (
              <button
                type="button"
                className="h-16 w-16 shrink-0 overflow-hidden rounded-sm2 border border-border"
                onClick={() => setLightbox(imageUrl)}
                aria-label="Foto vergrößern"
              >
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              </button>
            ) : null}

            <div className="min-w-0 flex-1">
              <div className="font-display text-[21px] font-extrabold tracking-[-0.02em]">
                Grad {difficultyLabel(boulder.difficulty)}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[14px] text-muted">
                <span
                  className="inline-block h-[11px] w-[11px] shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
                  style={{ background: colorSwatch(boulder.color) }}
                />
                <span className="truncate">
                  {boulder.color}
                  {area ? ` · ${area}` : ''}
                </span>
              </div>
            </div>

            <button
              type="button"
              aria-label="Schließen"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
              onClick={onClose}
            >
              <X />
            </button>
          </div>

          {/* Sofort speichern, erneutes Tippen setzt zurück – gleiche Semantik wie
              der ResultEditor in einer Session. */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              aria-pressed={tick === 'done'}
              onClick={() => onSetTick(tick === 'done' ? null : 'done')}
              className={`flex min-h-[52px] items-center justify-center gap-2 rounded-sm2 border text-[15px] font-bold transition active:scale-[0.97] ${
                tick === 'done'
                  ? 'border-ok bg-ok text-white'
                  : 'border-border-strong bg-surface-2 text-ink'
              }`}
            >
              <Check className="text-[18px]" />
              Erledigt
            </button>
            <button
              type="button"
              aria-pressed={tick === 'project'}
              onClick={() => onSetTick(tick === 'project' ? null : 'project')}
              className={`flex min-h-[52px] items-center justify-center gap-2 rounded-sm2 border text-[15px] font-bold transition active:scale-[0.97] ${
                tick === 'project'
                  ? 'border-accent bg-accent text-accent-ink'
                  : 'border-border-strong bg-surface-2 text-ink'
              }`}
            >
              <Flag className="text-[18px]" />
              Projekt
            </button>
          </div>

          {adminMode && (
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-sm2 border border-border-strong bg-surface-2 text-[14px] font-semibold text-ink transition active:scale-[0.97]"
                onClick={onEdit}
              >
                <Edit className="text-[16px]" />
                Bearbeiten
              </button>
              <button
                type="button"
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-sm2 border border-border-strong bg-surface-2 text-[14px] font-semibold text-ink transition active:scale-[0.97]"
                onClick={onStartMove}
              >
                <Crosshair className="text-[16px]" />
                Verschieben
              </button>
            </div>
          )}
        </div>
      </div>

      {lightbox && <ImageLightbox src={lightbox} alt="Boulder" onClose={() => setLightbox(null)} />}
    </>
  )
}
