import { useState } from 'react'
import ResultEditor from './ResultEditor'
import ImageLightbox from './ImageLightbox'
import { boulderImageUrl } from '../lib/images'
import { colorSwatch } from '../lib/colors'
import { difficultyLabel } from '../lib/difficulty'
import type { Boulder, Result, ResultStatus, ScoringConfig } from '../types'
import { Edit } from './icons'

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
  // Öffnet den Bearbeiten-Dialog. Jeder Teilnehmer darf Boulder bearbeiten (RLS, Migration 0009),
  // daher reicht SessionView dies stets durch.
  onEdit?: () => void
}) {
  const tops = allResults.filter((r) => r.status === 'top' || r.status === 'flash').length
  const dot = colorSwatch(boulder.color)
  const imageUrl = boulderImageUrl(boulder.image_path)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  return (
    <div className="card !px-[15px] !pb-[13px] !pt-[15px]">
      <div className="mb-[13px] flex items-center gap-[13px]">
        {imageUrl && (
          <button
            type="button"
            className="h-[64px] w-[64px] shrink-0 overflow-hidden rounded-[14px] ring-1 ring-border-strong"
            onClick={() => setLightboxOpen(true)}
            aria-label="Foto vergrößern"
          >
            <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          </button>
        )}
        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-surface-3 font-num text-[15px] font-bold">
          {boulder.seq}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[17px] font-bold">
            {boulder.difficulty != null ? `Grad ${difficultyLabel(boulder.difficulty)}` : 'Boulder'}
          </div>
          {boulder.color && (
            <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
              {dot && (
                <span
                  className="inline-block h-[11px] w-[11px] rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
                  style={{ background: dot }}
                />
              )}
              {boulder.color}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {tops > 0 && (
            <span className="whitespace-nowrap text-[13px] text-muted">{tops} Tops</span>
          )}
          {onEdit && (
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-[9px] text-faint transition hover:bg-surface-2 hover:text-accent"
              onClick={onEdit}
              aria-label="Boulder bearbeiten"
              title="Bearbeiten"
            >
              <Edit className="text-[16px]" />
            </button>
          )}
        </div>
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
