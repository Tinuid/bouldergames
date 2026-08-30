import { useState } from 'react'
import ResultEditor from './ResultEditor'
import ImageLightbox from './ImageLightbox'
import { boulderImageUrl } from '../lib/images'
import MiniMap from './lageplan/MiniMap'
import { colorSwatch } from '../lib/colors'
import { difficultyLabel } from '../lib/difficulty'
import type { Boulder, Participant, Result, ResultStatus, ScoringConfig } from '../types'
import { Edit } from './icons'

export default function BoulderCard({
  boulder,
  myResult,
  scoring,
  onSaveResult,
  onEdit,
  onOpenRanking,
  highlight,
  fallbackImagePath,
  gymPosition,
  onOpenMap,
  participants,
  resultsByParticipant,
  myParticipantId,
  showOthers = false,
  onSaveResultFor,
}: {
  boulder: Boulder
  myResult: Result | undefined
  scoring: ScoringConfig
  onSaveResult: (status: ResultStatus, attempts: number) => void
  // Öffnet den Bearbeiten-Dialog. Jeder Teilnehmer darf Boulder bearbeiten (RLS, Migration 0009),
  // daher reicht SessionView dies stets durch.
  onEdit?: () => void
  // Öffnet die Rangliste aller Teilnehmer für diesen Boulder (Klick auf den Boulder-Kopf).
  onOpenRanking?: () => void
  // Lässt die Karte einmal kurz aufleuchten (z.B. nach dem Anspringen aus der Spieler-Detailansicht).
  highlight?: boolean
  // Foto des Karten-Boulders, aus dem dieser übernommen wurde (Migration 0017).
  // Greift nur, wenn der Boulder kein eigenes Foto hat: ein hier aufgenommenes Foto
  // gewinnt also immer. Übernommene Boulder tragen bewusst KEINEN eigenen
  // image_path – sonst würde das nächtliche Aufräumen der Session das Bild des
  // Karten-Boulders mitlöschen.
  fallbackImagePath?: string | null
  // Position des Karten-Boulders, aus dem dieser übernommen wurde – zeigt die
  // Mini-Karte an. null/undefined ⇒ keine Karte (frei angelegter Boulder).
  gymPosition?: { x: number; y: number } | null
  // Öffnet den Lageplan auf diesem Boulder.
  onOpenMap?: () => void
  // Für andere eintragen (shared_scoring, Migration 0011): alle Teilnehmer (sortiert, ich zuerst),
  // deren Ergebnisse für diesen Boulder und der Speicher-Callback je Teilnehmer. showOthers steuert,
  // ob die Fremd-Zeilen sichtbar sind (gerätelokaler "andere ausblenden"-Toggle in SessionView).
  participants?: Participant[]
  resultsByParticipant?: Map<string, Result>
  myParticipantId?: string
  showOthers?: boolean
  onSaveResultFor?: (participantId: string, status: ResultStatus, attempts: number) => void
}) {
  // Bewusst nicht auf der Karte: die laufende Nummer (die Reihenfolge der Liste sagt
  // dasselbe, und ReorderBouldersDialog zeigt sie weiterhin) und die Zahl der Tops
  // (steht in der Rangliste hinter dem Boulder-Kopf). Beides kostete mehr Platz, als
  // es wert war – neben Foto und Mini-Karte wurde die Zeile sonst zu eng.
  const dot = colorSwatch(boulder.color)
  const imageUrl = boulderImageUrl(boulder.image_path ?? fallbackImagePath)
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
        {gymPosition && (
          <button
            type="button"
            className="h-[64px] w-[64px] shrink-0 overflow-hidden rounded-[14px] bg-bg p-1 ring-1 ring-border-strong transition enabled:active:scale-[0.97] disabled:opacity-100"
            onClick={onOpenMap}
            disabled={!onOpenMap}
            aria-label="Auf der Karte zeigen"
            title="Auf der Karte zeigen"
          >
            <MiniMap
              x={gymPosition.x}
              y={gymPosition.y}
              color={boulder.color}
              className="h-full w-full"
            />
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
          <span className="min-w-0 flex-1">
            <span className="block whitespace-nowrap font-display text-[17px] font-bold">
              {boulder.difficulty != null
                ? `Grad ${difficultyLabel(boulder.difficulty)}`
                : 'Boulder'}
            </span>
            {boulder.color && (
              <span className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-muted">
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
