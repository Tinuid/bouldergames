import { useState } from 'react'
import ResultEditor from './ResultEditor'
import ImageLightbox from './ImageLightbox'
import { boulderImageUrl } from '../lib/images'
import { colorSwatch } from '../lib/colors'
import { difficultyLabel } from '../lib/difficulty'
import type { Boulder, Participant, Result, ResultStatus, ScoringConfig } from '../types'
import { Edit } from './icons'

export default function BoulderCard({
  boulder,
  myResult,
  allResults,
  scoring,
  onSaveResult,
  onEdit,
  onOpenRanking,
  highlight,
  participants,
  resultsByParticipant,
  myParticipantId,
  showOthers = false,
  onSaveResultFor,
}: {
  boulder: Boulder
  myResult: Result | undefined
  allResults: Result[]
  scoring: ScoringConfig
  onSaveResult: (status: ResultStatus, attempts: number) => void
  // Öffnet den Bearbeiten-Dialog. Jeder Teilnehmer darf Boulder bearbeiten (RLS, Migration 0009),
  // daher reicht SessionView dies stets durch.
  onEdit?: () => void
  // Öffnet die Rangliste aller Teilnehmer für diesen Boulder (Klick auf den Boulder-Kopf).
  onOpenRanking?: () => void
  // Lässt die Karte einmal kurz aufleuchten (z.B. nach dem Anspringen aus der Spieler-Detailansicht).
  highlight?: boolean
  // Für andere eintragen (shared_scoring, Migration 0011): alle Teilnehmer (sortiert, ich zuerst),
  // deren Ergebnisse für diesen Boulder und der Speicher-Callback je Teilnehmer. showOthers steuert,
  // ob die Fremd-Zeilen sichtbar sind (gerätelokaler "andere ausblenden"-Toggle in SessionView).
  participants?: Participant[]
  resultsByParticipant?: Map<string, Result>
  myParticipantId?: string
  showOthers?: boolean
  onSaveResultFor?: (participantId: string, status: ResultStatus, attempts: number) => void
}) {
  const tops = allResults.filter((r) => r.status === 'top' || r.status === 'flash').length
  const dot = colorSwatch(boulder.color)
  const imageUrl = boulderImageUrl(boulder.image_path)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  return (
    <div
      id={`boulder-card-${boulder.id}`}
      className={`card scroll-mt-20 !px-[15px] !pb-[13px] !pt-[15px] ${highlight ? 'animate-flash' : ''}`}
    >
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
        <button
          type="button"
          onClick={onOpenRanking}
          disabled={!onOpenRanking}
          aria-label="Rangliste anzeigen"
          title="Rangliste anzeigen"
          className={`-my-1 flex min-w-0 flex-1 items-center gap-[13px] rounded-[12px] border border-border px-2 py-1 text-left transition enabled:hover:border-border-strong enabled:hover:bg-surface-2 enabled:active:scale-[0.99] disabled:border-transparent disabled:px-0`}
        >
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-surface-3 font-num text-[15px] font-bold">
            {boulder.seq}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[17px] font-bold">
              {boulder.difficulty != null
                ? `Grad ${difficultyLabel(boulder.difficulty)}`
                : 'Boulder'}
            </span>
            {boulder.color && (
              <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
                {dot && (
                  <span
                    className="inline-block h-[11px] w-[11px] rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
                    style={{ background: dot }}
                  />
                )}
                {boulder.color}
              </span>
            )}
          </span>
        </button>
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

      {showOthers &&
        onSaveResultFor &&
        participants
          ?.filter((p) => p.id !== myParticipantId)
          .map((p) => (
            <ResultEditor
              key={p.id}
              compact
              label={p.display_name}
              result={resultsByParticipant?.get(p.id)}
              scoring={scoring}
              difficulty={boulder.difficulty}
              onSave={(status, attempts) => onSaveResultFor(p.id, status, attempts)}
            />
          ))}

      {imageUrl && lightboxOpen && (
        <ImageLightbox src={imageUrl} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  )
}
