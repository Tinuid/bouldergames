import { useEffect, useState } from 'react'
import { computePoints, countsAttempts, normalizeResult } from '../lib/scoring'
import { gameModeInfo } from '../lib/gameModes'
import type { Result, ResultStatus, ScoringConfig } from '../types'
import { Bolt, Check, Minus, Plus } from './icons'

const INACTIVE_CLS = 'border-border-strong bg-surface-2 text-ink'
const FLASH_ACTIVE_CLS = 'border-accent bg-accent text-accent-ink'
// Das Emoji 🪂 folgt currentColor nicht – der aktive Zustand läuft über Hintergrund und Rahmen.
const NOPE_ACTIVE_CLS = 'border-bad bg-bad-soft text-bad'

// Nur noch die beiden Erfolgs-Zustände haben einen eigenen Knopf. "Nicht geschafft"
// ergibt sich aus gezählten Fehlversuchen ohne Top – siehe Zähl-Control unten.
// Ausnahme: ein Versuch pro Boulder („Nur Flash“) – dort Flash oder Nope (selectSingle).
const OPTIONS: {
  status: Extract<ResultStatus, 'flash' | 'top'>
  label: string
  icon: React.ReactNode
  // aktive Variante (inaktiv = neutral)
  activeCls: string
}[] = [
  {
    status: 'flash',
    label: 'Flash',
    icon: <Bolt />,
    activeCls: FLASH_ACTIVE_CLS,
  },
  { status: 'top', label: 'Top', icon: <Check />, activeCls: 'border-ok bg-ok text-white' },
]

// Fehlversuche aus dem gespeicherten Ergebnis: `attempts` sind die GESAMTversuche
// inklusive des erfolgreichen Zugs, ein Flash hat definitionsgemäß keinen Fehlversuch.
function missesOf(status: ResultStatus, attempts: number): number {
  if (status === 'flash' || status === 'open') return 0
  return status === 'top' ? Math.max(0, attempts - 1) : Math.max(0, attempts)
}

export default function ResultEditor({
  result,
  scoring,
  difficulty = null,
  weekBonus = false,
  onSave,
  label,
  compact = false,
  lockedReason,
}: {
  result: Result | undefined
  scoring: ScoringConfig
  // Schwierigkeitsgrad des Boulders – im Multiplikator-Modus der Punkte-Faktor.
  difficulty?: number | null
  // Boulder der Woche ⇒ die Punkte-Vorschau zählt doppelt (wie beim Speichern).
  weekBonus?: boolean
  onSave: (status: ResultStatus, attempts: number) => void
  // Kompakte Variante für Fremd-Zeilen (Ergebnis für andere eintragen): Name links,
  // platzsparende Icon-Buttons rechts, ohne Punkte-Vorschau.
  label?: string
  compact?: boolean
  // Eingabe gesperrt (z.B. „Die Challenge ist beendet“): das Ergebnis wird nur angezeigt.
  // Später auch für „Zeit ist um“ oder „ausgeschieden“. Der Text erscheint als Tooltip.
  lockedReason?: string
}) {
  const [status, setStatus] = useState<ResultStatus>(result?.status ?? 'open')
  const [attempts, setAttempts] = useState<number>(result?.attempts ?? 1)

  // Mit Realtime-Updates synchronisieren (z.B. Host-Korrektur, anderes Gerät).
  useEffect(() => {
    setStatus(result?.status ?? 'open')
    setAttempts(result?.attempts ?? 1)
  }, [result?.id, result?.status, result?.attempts])

  function apply(nextStatus: ResultStatus, nextAttempts: number) {
    const norm = normalizeResult(nextStatus, nextAttempts)
    setStatus(norm.status)
    setAttempts(norm.attempts)
    onSave(norm.status, norm.attempts)
  }

  const misses = missesOf(status, attempts)

  function selectStatus(s: 'flash' | 'top') {
    // Toggle: nochmaliges Tippen nimmt den Erfolg zurück. Die gezählten Fehlversuche
    // bleiben dabei stehen – sonst wäre ein Fehlgriff auf "Top" nicht zu korrigieren.
    if (s === status) {
      apply(misses > 0 ? 'fail' : 'open', misses)
    } else if (s === 'flash') {
      apply('flash', 1)
    } else {
      // Die bereits gezählten Fehlversuche bleiben stehen, der erfolgreiche Zug kommt dazu.
      // Ein Top hat mindestens 1 Fehlversuch (0 Fehlversuche wäre ein Flash) ⇒ attempts ≥ 2.
      apply('top', Math.max(2, misses + 1))
    }
  }

  function addMiss() {
    if (status === 'top') apply('top', attempts + 1)
    // Ein Flash verträgt keinen Fehlversuch – der Zähler löst ihn auf.
    else if (status === 'flash') apply('fail', 1)
    else apply('fail', misses + 1)
  }

  function removeMiss() {
    if (status === 'top') apply('top', Math.max(2, attempts - 1))
    else if (misses <= 1) apply('open', 0)
    else apply('fail', misses - 1)
  }

  // Ein Versuch pro Boulder („Nur Flash“): nur Flash oder Nope, kein Top, kein Zähler.
  const single = gameModeInfo(scoring.gameMode).singleAttempt
  // Nope ist aktiv bei jedem eingetragenen Nicht-Flash – auch bei einem alten Top oder einem
  // Fail mit mehreren Versuchen aus der Zeit, bevor die Session auf diesen Modus umgestellt
  // wurde (beides zählt hier 0). Gespeichert wird erst beim Tippen.
  const nopeActive = status === 'top' || status === 'fail'
  // Nach der Wahl bleibt nur der gewählte Knopf (volle Breite, mit Punkten); Antippen setzt
  // den Boulder zurück auf offen, dann sind wieder beide Knöpfe da.
  const chosen: 'flash' | 'nope' | null =
    status === 'flash' ? 'flash' : nopeActive ? 'nope' : null

  function selectSingle(s: 'flash' | 'nope') {
    if (s === 'flash') apply('flash', 1)
    else apply('fail', 1)
  }

  function resetSingle() {
    apply('open', 0)
  }

  const preview = computePoints(status, attempts, scoring, difficulty, weekBonus)
  // Kosten Fehlversuche keine Punkte (oder „Nur Flash“), gibt es nichts zu zählen –
  // dann fällt der Knopf weg.
  const showCounter = countsAttempts(scoring)
  // „Nur Flash“: ein Top bleibt für die Statistik eintragbar, zählt aber 0.
  const topDoesNotCount = !gameModeInfo(scoring.gameMode).scoresTop && status === 'top'
  // Ein Top braucht seinen einen Fehlversuch; darunter geht der Zähler nicht.
  const minusDisabled = status === 'top' && misses <= 1
  const counterCls =
    misses > 0 ? 'border-bad bg-bad-soft text-bad' : 'border-border-strong bg-surface-2 text-ink'
  // Trennlinie im geteilten Knopf: Tailwind-Opacity greift auf den var(--…)-Tokens nicht.
  const dividerStyle = { borderRight: '1px solid color-mix(in srgb, var(--bad) 30%, transparent)' }

  if (compact) {
    return (
      <fieldset
        disabled={lockedReason != null}
        title={lockedReason}
        className="m-0 min-w-0 border-0 p-0 disabled:opacity-60"
      >
        <div className="flex items-center gap-2 border-t border-border py-2.5">
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{label}</span>
          <div className="flex gap-1.5">
            {single && chosen ? (
              // Gewählt: ein Knopf so breit wie beide zusammen (34 + 6 + 72), Zeilen bleiben bündig.
              <button
                onClick={resetSingle}
                aria-label={
                  chosen === 'flash'
                    ? 'Geflasht – antippen zum Zurücksetzen'
                    : 'Nope – antippen zum Zurücksetzen'
                }
                title="Antippen zum Zurücksetzen"
                className={`flex h-[34px] w-[112px] items-center justify-center gap-1.5 rounded-[10px] border font-display text-[13px] font-bold transition ${
                  chosen === 'flash' ? FLASH_ACTIVE_CLS : NOPE_ACTIVE_CLS
                }`}
              >
                {chosen === 'flash' ? (
                  <Bolt className="text-[16px]" />
                ) : (
                  <span aria-hidden className="text-[16px] leading-none">
                    🪂
                  </span>
                )}
                {chosen === 'flash' ? 'Geflasht' : 'Nope'}
              </button>
            ) : single ? (
              // Gleiche Reihenfolge wie groß: Nope links, Flash rechts und doppelt so breit.
              <>
                <button
                  onClick={() => selectSingle('nope')}
                  aria-label="Nope – nicht geflasht"
                  title="Nope – nicht geflasht"
                  className={`flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border text-[17px] transition ${INACTIVE_CLS}`}
                >
                  <span aria-hidden>🪂</span>
                </button>
                <button
                  onClick={() => selectSingle('flash')}
                  aria-label="Flash"
                  title="Flash"
                  className={`flex h-[34px] w-[72px] items-center justify-center rounded-[10px] border text-[18px] transition ${INACTIVE_CLS}`}
                >
                  <Bolt />
                </button>
              </>
            ) : (
              OPTIONS.map((o) => {
                const active = status === o.status
                return (
                  <button
                    key={o.status}
                    onClick={() => selectStatus(o.status)}
                    aria-label={o.label}
                    title={o.label}
                    aria-pressed={active}
                    className={`flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border text-[16px] transition ${
                      active ? o.activeCls : INACTIVE_CLS
                    }`}
                  >
                    {o.icon}
                  </button>
                )
              })
            )}

            {showCounter && (
              <div
                className={`flex h-[34px] items-stretch overflow-hidden rounded-[10px] border transition ${counterCls}`}
              >
                {misses > 0 && (
                  <button
                    onClick={removeMiss}
                    disabled={minusDisabled}
                    aria-label="Ein Versuch weniger"
                    title="Ein Versuch weniger"
                    className="flex w-7 shrink-0 items-center justify-center transition disabled:opacity-35"
                    style={dividerStyle}
                  >
                    <Minus className="text-[15px]" />
                  </button>
                )}
                <button
                  onClick={addMiss}
                  aria-label="Ein Versuch mehr"
                  title="Ein Versuch mehr"
                  className="flex min-w-[34px] items-center justify-center px-1.5"
                >
                  {misses > 0 ? (
                    <span className="font-num text-[15px] font-bold tabular-nums">{misses}</span>
                  ) : (
                    <Plus className="text-[16px]" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </fieldset>
    )
  }

  return (
    <fieldset
      disabled={lockedReason != null}
      title={lockedReason}
      className="m-0 min-w-0 border-0 p-0 disabled:opacity-60"
    >
      <div className="flex flex-col">
        {single && chosen ? (
          // Gewählt: ein Knopf über die volle Breite, gleiche Höhe wie vorher (die Karte springt
          // nicht), Ergebnis links, Punkte rechts. Antippen setzt zurück.
          <button
            onClick={resetSingle}
            aria-label={
              chosen === 'flash'
                ? `Geflasht, ${preview} Punkte – antippen zum Zurücksetzen`
                : `Nope, ${preview} Punkte – antippen zum Zurücksetzen`
            }
            title="Antippen zum Zurücksetzen"
            className={`flex w-full items-center justify-between gap-2 rounded-sm2 border px-4 py-4 font-display text-[19px] font-bold transition ${
              chosen === 'flash' ? FLASH_ACTIVE_CLS : NOPE_ACTIVE_CLS
            }`}
          >
            <span className="flex items-center gap-2">
              {chosen === 'flash' ? (
                <span className="text-[26px]">
                  <Bolt />
                </span>
              ) : (
                <span aria-hidden className="text-[24px] leading-none">
                  🪂
                </span>
              )}
              {chosen === 'flash' ? 'Geflasht!' : 'Nope'}
            </span>
            <span className="font-num tabular-nums">{preview} P.</span>
          </button>
        ) : single ? (
          // 3:1 – Nope schmal links, Flash breit rechts (Rechtshänder tippen öfter Flash).
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => selectSingle('nope')}
              aria-label="Nope – nicht geflasht"
              title="Nope – nicht geflasht"
              className={`col-span-1 flex flex-col items-center justify-center gap-1 rounded-sm2 border px-1 py-2 font-display text-[13px] font-bold transition ${INACTIVE_CLS}`}
            >
              <span aria-hidden className="text-[22px] leading-none">
                🪂
              </span>
              Nope
            </button>
            <button
              onClick={() => selectSingle('flash')}
              className={`col-span-3 flex items-center justify-center gap-2 rounded-sm2 border px-2 py-4 font-display text-[19px] font-bold transition ${INACTIVE_CLS}`}
            >
              <span className="text-[26px]">
                <Bolt />
              </span>
              Flash!
            </button>
          </div>
        ) : (
          <div className={`grid gap-2 ${showCounter ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {OPTIONS.map((o) => {
              const active = status === o.status
              return (
                <button
                  key={o.status}
                  onClick={() => selectStatus(o.status)}
                  aria-pressed={active}
                  className={`flex items-center justify-center gap-1.5 rounded-sm2 border px-1.5 py-2.5 font-display text-[14px] font-bold transition ${
                    active ? o.activeCls : 'border-border-strong bg-surface-2 text-ink'
                  }`}
                >
                  <span className="text-[16px]">{o.icon}</span>
                  {o.label}
                </button>
              )
            })}

            {showCounter && (
              // Zweigeteilt, optisch weiter ein Knopf im Raster: schmales Minus zum Korrigieren
              // (erst ab dem ersten Versuch), breite Plus-Hälfte als Hauptaktion.
              <div
                className={`flex items-stretch overflow-hidden rounded-sm2 border font-display text-[14px] font-bold transition ${counterCls}`}
              >
                {misses > 0 && (
                  <button
                    onClick={removeMiss}
                    disabled={minusDisabled}
                    aria-label="Ein Versuch weniger"
                    title="Ein Versuch weniger"
                    className="flex w-10 shrink-0 items-center justify-center transition disabled:opacity-35"
                    style={dividerStyle}
                  >
                    <Minus className="text-[16px]" />
                  </button>
                )}
                <button
                  onClick={addMiss}
                  aria-label="Ein Versuch mehr"
                  title="Ein Versuch mehr"
                  className="flex min-w-0 flex-1 items-center justify-center gap-1.5 px-1.5 py-2.5"
                >
                  {misses > 0 ? (
                    <span className="font-num text-lg font-bold tabular-nums">{misses}</span>
                  ) : (
                    <>
                      <span className="text-[16px]">
                        <Plus />
                      </span>
                      Versuch
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bei einem Versuch pro Boulder stehen die Punkte schon im gewählten Knopf. */}
        {!single && status !== 'open' && (
          <div className="mt-2.5 text-right font-display text-[14px] font-semibold text-muted">
            Punkte:{' '}
            <span className={`ml-1 font-num font-bold ${preview < 0 ? 'text-bad' : 'text-ok'}`}>
              {preview}
            </span>
            {topDoesNotCount && <span className="ml-1.5 font-medium">· zählt nur Flash</span>}
          </div>
        )}
      </div>
    </fieldset>
  )
}
