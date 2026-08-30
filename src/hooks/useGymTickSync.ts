import { useEffect, useMemo, useRef, useState } from 'react'
import { markGymTicksDone } from '../lib/api'
import { pendingDoneTicks, readSyncedTicks, writeSyncedTicks } from '../lib/gymTickSync'
import type { Boulder, Result } from '../types'

interface Params {
  sessionId: string | undefined
  userId: string | null
  boulders: Boulder[]
  // Eigene Ergebnisse, boulderId -> Result (in SessionView bereits als `mine` da).
  myResults: Map<string, Result>
}

/**
 * Setzt für jeden in dieser Challenge geflashten/getoppten Boulder, der von der
 * Hallenkarte übernommen wurde, die eigene Marke auf "erledigt" – einmal pro
 * Boulder und Gerät. Begründung und Speicher-Schema siehe lib/gymTickSync.ts.
 *
 * Deckt beide Momente mit einem Mechanismus ab: beim Öffnen der Challenge (holt
 * ältere Ergebnisse nach) und direkt beim Eintragen – handleSaveResult ruft nach
 * dem Speichern refresh(), damit ändern sich results → myResults → der Key unten.
 * Ein zweiter Schreibpfad im Save-Handler wäre also redundant.
 */
export function useGymTickSync({ sessionId, userId, boulders, myResults }: Params): void {
  // Lazy initialisiert, damit der Vermerk schon im ersten Render steht – der Effekt
  // unten darf nie mit einer leeren Liste loslaufen und alles neu schreiben.
  const [synced, setSynced] = useState<string[]>(() =>
    sessionId ? readSyncedTicks(sessionId) : [],
  )
  useEffect(() => {
    setSynced(sessionId ? readSyncedTicks(sessionId) : [])
  }, [sessionId])

  const pending = useMemo(
    () => pendingDoneTicks(boulders, myResults, synced),
    [boulders, myResults, synced],
  )
  // Stabiler Schlüssel für die Effekt-Abhängigkeit: myResults ist nach jedem
  // Realtime-Refresh eine neue Map-Identität, auch wenn nur ein fremdes Ergebnis
  // hinzukam. Ohne den String liefe der Effekt dauernd neu.
  const pendingKey = useMemo(() => [...pending].sort().join(','), [pending])

  // Verhindert einen zweiten Aufruf, solange der erste unterwegs ist (React
  // StrictMode führt Effekte im Dev doppelt aus).
  const sendingRef = useRef(false)

  useEffect(() => {
    if (!sessionId || !userId || !pendingKey || sendingRef.current) return
    const ids = pendingKey.split(',')
    sendingRef.current = true
    let cancelled = false
    markGymTicksDone(ids, userId)
      .then(() => {
        // Der localStorage-Vermerk wird auch nach einem Unmount geschrieben: die
        // Marken stehen dann bereits in der DB, und ohne Vermerk würde der nächste
        // Besuch sie unnötig erneut schreiben (im Dev-StrictMode wäre das der Normalfall).
        const next = [...new Set([...synced, ...ids])]
        writeSyncedTicks(sessionId, next)
        if (!cancelled) setSynced(next)
      })
      .catch(() => {
        /* Still: der Abgleich ist eine Bequemlichkeit, kein vom Nutzer angestoßenes
           Speichern. Ohne Vermerk im localStorage läuft er beim nächsten Öffnen neu. */
      })
      .finally(() => {
        sendingRef.current = false
      })
    return () => {
      cancelled = true
    }
  }, [sessionId, userId, pendingKey, synced])
}
