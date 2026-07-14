import { useEffect, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { boulderImageUrl } from '../lib/images'
import { colorSwatch } from '../lib/colors'
import { difficultyLabel } from '../lib/difficulty'
import type { Boulder } from '../types'
import { GripVertical } from './icons'
import { useDialogEscape } from '../hooks/useDialogEscape'

// Dialog zum Umsortieren der Boulder (nur Host, Einstieg im EditSessionDialog).
// Die Reihenfolge wird per Drag & Drop NUR am Griff geändert (kein versehentliches
// Verschieben durch Tippen/Scrollen auf der Zeile) und lokal gesammelt – erst
// "Speichern" schreibt sie in einem Rutsch über die RPC reorder_boulders.
export default function ReorderBouldersDialog({
  open,
  boulders,
  onClose,
  onSave,
}: {
  open: boolean
  // Alle Boulder der Session, seq-geordnet und UNGEFILTERT.
  boulders: Boulder[]
  onClose: () => void
  // Bekommt die Boulder-IDs in Zielreihenfolge; wirft bei Fehler (Dialog bleibt offen).
  onSave: (orderedIds: string[]) => Promise<void>
}) {
  const [ordered, setOrdered] = useState<Boulder[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Beim Öffnen die Staging-Kopie aus den aktuellen Bouldern seeden.
  useEffect(() => {
    if (!open) return
    setOrdered(boulders)
    setError(null)
    // boulders bewusst NICHT in den Deps: nur beim Öffnen seeden – sonst
    // überschriebe eine externe (Realtime-)Änderung die laufende Sortierung.
    // Wird die Liste dadurch veraltet, lehnt die RPC das Speichern ab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Drag startet erst nach kleiner Bewegung (distance) – ein Tap bleibt ein Tap.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Escape schließt, Body-Scroll sperren – nur solange das Sheet offen ist.
  useDialogEscape(onClose, open)

  if (!open) return null

  const dirty =
    ordered.map((b) => b.id).join(',') !== boulders.map((b) => b.id).join(',')

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    setOrdered((items) => {
      const oldIndex = items.findIndex((b) => b.id === active.id)
      const newIndex = items.findIndex((b) => b.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return items
      return arrayMove(items, oldIndex, newIndex)
    })
  }

  async function save() {
    if (saving) return
    setError(null)
    setSaving(true)
    try {
      await onSave(ordered.map((b) => b.id))
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="font-display text-[21px] font-extrabold tracking-[-0.02em]">
          Reihenfolge ändern
        </div>
        <p className="mt-1 text-[13px] text-muted">
          Ziehe die Boulder am Griff in die gewünschte Reihenfolge. Übernommen wird sie erst mit
          „Speichern".
        </p>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={ordered.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="mt-4 flex flex-col gap-2">
              {ordered.map((b, index) => (
                <SortableRow key={b.id} boulder={b} position={index + 1} disabled={saving} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {error && <p className="mt-3 text-sm text-bad">{error}</p>}

        <div className="mt-[22px] grid grid-cols-[1fr_1.35fr] gap-2.5">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={save}
            disabled={saving || !dirty}
          >
            {saving ? 'Speichere …' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Eine sortierbare Zeile: Drag-Listener liegen NUR auf dem Griff-Button, der Rest
// der Zeile ist inert. position ist die KÜNFTIGE Nummer (1..n) nach dem Speichern.
function SortableRow({
  boulder,
  position,
  disabled,
}: {
  boulder: Boulder
  position: number
  disabled: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: boulder.id,
    disabled,
  })
  const dot = colorSwatch(boulder.color)
  const imageUrl = boulderImageUrl(boulder.image_path)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2.5 rounded-[12px] border border-border bg-surface-2 py-1.5 pl-1 pr-2 ${
        isDragging ? 'relative z-10 border-border-strong opacity-90 shadow-lg' : ''
      }`}
    >
      <button
        type="button"
        className="flex h-10 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-faint active:cursor-grabbing"
        aria-label="Verschieben"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="text-[18px]" />
      </button>
      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] bg-surface-3 font-num text-[14px] font-bold">
        {position}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[15px] font-bold">
          {boulder.difficulty != null ? `Grad ${difficultyLabel(boulder.difficulty)}` : 'Boulder'}
        </span>
        {boulder.color && (
          <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
            {dot && (
              <span
                className="inline-block h-[10px] w-[10px] rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
                style={{ background: dot }}
              />
            )}
            {boulder.color}
          </span>
        )}
      </span>
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className="h-10 w-10 shrink-0 rounded-[10px] object-cover ring-1 ring-border-strong"
        />
      )}
    </div>
  )
}
