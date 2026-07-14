import { useDialogEscape } from '../hooks/useDialogEscape'
import { CHANGELOG } from '../lib/changelog'

// Bottom-Sheet mit dem manuell gepflegten Changelog (src/lib/changelog.ts).
// Wird über den "Was ist neu?"-Button im Footer der Startseite geöffnet.
export default function ChangelogDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Escape schließt, Body-Scroll sperren – nur solange das Sheet offen ist.
  useDialogEscape(onClose, open)

  if (!open) return null

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grip" />
        <h2 className="mb-4 font-display text-[21px] font-extrabold tracking-[-0.02em]">
          Was ist neu?
        </h2>

        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
          {CHANGELOG.map((entry) => (
            <section key={entry.version}>
              <h3 className="font-display text-[15px] font-bold tracking-[-0.01em]">
                Version {entry.version}
                <span className="ml-2 text-[12.5px] font-normal text-faint">{entry.date}</span>
              </h3>
              <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-muted">
                {entry.text}
              </p>
            </section>
          ))}
        </div>

        <button type="button" className="btn-primary mt-5 w-full" onClick={onClose}>
          Schließen
        </button>
      </div>
    </div>
  )
}
