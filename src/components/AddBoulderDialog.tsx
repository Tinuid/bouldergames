import { useState } from 'react'

export default function AddBoulderDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (difficulty: number | null, color: string | null) => Promise<void>
}) {
  const [difficulty, setDifficulty] = useState('')
  const [color, setColor] = useState('')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const diff = difficulty.trim() === '' ? null : Number(difficulty)
      await onAdd(Number.isNaN(diff as number) ? null : diff, color.trim() || null)
      setDifficulty('')
      setColor('')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <form
        className="w-full max-w-md rounded-2xl bg-slate-800 p-5"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 className="mb-4 text-lg font-bold">Boulder hinzufügen</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="diff">
              Schwierigkeit / Wertung
            </label>
            <input
              id="diff"
              type="number"
              inputMode="numeric"
              className="input"
              placeholder="z.B. 4"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="color">
              Farbe (optional)
            </label>
            <input
              id="color"
              className="input"
              placeholder="z.B. rot"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Speichere …' : 'Hinzufügen'}
          </button>
        </div>
      </form>
    </div>
  )
}
