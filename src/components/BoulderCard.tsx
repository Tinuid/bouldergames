import { useState } from 'react'
import ResultEditor from './ResultEditor'
import ImageLightbox from './ImageLightbox'
import { boulderImageUrl } from '../lib/images'
import { colorSwatch } from '../lib/colors'
import type { Boulder, Result, ResultStatus, ScoringConfig } from '../types'

export default function BoulderCard({
  boulder,
  myResult,
  allResults,
  scoring,
  onSaveResult,
  onEdit,
}: {
  boulder: Boulder
  myResult: Result | undefined
  allResults: Result[]
  scoring: ScoringConfig
  onSaveResult: (status: ResultStatus, attempts: number) => void
  // Nur gesetzt, wenn der aktuelle Nutzer den Boulder bearbeiten darf (Ersteller oder Host).
  onEdit?: () => void
}) {
  const tops = allResults.filter((r) => r.status === 'top' || r.status === 'flash').length
  const flashes = allResults.filter((r) => r.status === 'flash').length
  const dot = colorSwatch(boulder.color)
  const imageUrl = boulderImageUrl(boulder.image_path)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {imageUrl && (
          <button
            type="button"
            className="h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-600"
            onClick={() => setLightboxOpen(true)}
            aria-label="Foto vergrößern"
          >
            <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          </button>
        )}
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm font-bold">
          {boulder.seq}
        </span>
        <div className="flex-1">
          <div className="font-semibold">
            {boulder.difficulty != null ? `Grad ${boulder.difficulty}` : `Boulder ${boulder.seq}`}
          </div>
          {boulder.color && (
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              {dot && (
                <span
                  className="inline-block h-3 w-3 rounded-full ring-1 ring-slate-600"
                  style={{ background: dot }}
                />
              )}
              {boulder.color}
            </div>
          )}
        </div>
        {(tops > 0 || flashes > 0) && (
          <div className="text-right text-xs text-slate-400">
            {tops} Tops
            {flashes > 0 && <> · {flashes} ⚡</>}
          </div>
        )}
        {onEdit && (
          <button
            type="button"
            className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-700 hover:text-slate-200"
            onClick={onEdit}
            aria-label="Boulder bearbeiten"
            title="Bearbeiten"
          >
            ✎
          </button>
        )}
      </div>

      <ResultEditor
        result={myResult}
        scoring={scoring}
        difficulty={boulder.difficulty}
        onSave={onSaveResult}
      />

      {imageUrl && lightboxOpen && (
        <ImageLightbox src={imageUrl} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  )
}
