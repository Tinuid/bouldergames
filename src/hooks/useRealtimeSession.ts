import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getSessionById, listBoulders, listParticipants, listResults } from '../lib/api'
import type { Boulder, Participant, Result, Session } from '../types'

interface SessionData {
  session: Session | null
  participants: Participant[]
  boulders: Boulder[]
  results: Result[]
  loading: boolean
  error: string | null
  notFound: boolean
  refresh: () => void
}

type Table = 'session' | 'participants' | 'boulders' | 'results'
const TABLES: Table[] = ['session', 'participants', 'boulders', 'results']

// Realtime-Ereignisse einer Tabelle werden kurz gesammelt (z.B. erzeugt eine
// Punkte-Neuberechnung viele Ereignisse auf einmal) – höchstens aber MAX_WAIT lang
// aufgeschoben, damit Dauerfeuer das Nachladen nicht endlos verschiebt.
const DEBOUNCE_MS = 150
const MAX_WAIT_MS = 500
// Nachladen beim Aufwachen/Reconnect höchstens so oft.
const WAKE_THROTTLE_MS = 2000

/**
 * Lädt eine komplette Session (Stammdaten + Teilnehmer + Boulder + Ergebnisse)
 * und hält sie via Supabase-Realtime aktuell. Bei jeder relevanten Änderung
 * werden die betroffenen Tabellen neu geladen (einfach & robust für MVP-Größen).
 *
 * Robustheit:
 *  - Je Tabelle zählt ein Anfragezähler mit; kommt eine ältere Antwort nach einer
 *    neueren an, wird sie verworfen (sonst überschriebe alter Stand den neuen).
 *  - Antworten einer vorherigen Session (sessionId gewechselt) werden verworfen.
 *  - Nach Bildschirm-aus / Tab-Wechsel, nach Netz-Rückkehr und nach jedem
 *    (Re-)Subscribe des Realtime-Kanals wird alles neu geladen – verpasste
 *    Ereignisse gibt es sonst nicht nachgeliefert.
 *  - Nachladen im Hintergrund schluckt Fehler still: der Fehlerbildschirm ist nur
 *    für das erste Laden gedacht.
 */
export function useRealtimeSession(sessionId: string | undefined): SessionData {
  const [session, setSession] = useState<Session | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [boulders, setBoulders] = useState<Boulder[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  // Aktuell angezeigte Session – späte Antworten anderer Sessions werden verworfen.
  const activeId = useRef<string | undefined>(sessionId)
  activeId.current = sessionId
  const seq = useRef<Record<Table, number>>({ session: 0, participants: 0, boulders: 0, results: 0 })
  const lastFullLoad = useRef(0)

  // Eine Tabelle neu laden; verwirft die Antwort, wenn inzwischen eine neuere
  // Anfrage für dieselbe Tabelle (oder eine andere Session) unterwegs ist.
  const loadTable = useCallback(async (sid: string, table: Table) => {
    const n = ++seq.current[table]
    const fresh = () => activeId.current === sid && seq.current[table] === n
    try {
      switch (table) {
        case 'session': {
          const s = await getSessionById(sid)
          if (fresh() && s) setSession(s)
          break
        }
        case 'participants': {
          const p = await listParticipants(sid)
          if (fresh()) setParticipants(p)
          break
        }
        case 'boulders': {
          const b = await listBoulders(sid)
          if (fresh()) setBoulders(b)
          break
        }
        case 'results': {
          const r = await listResults(sid)
          if (fresh()) setResults(r)
          break
        }
      }
    } catch {
      /* Hintergrund-Nachladen: beim nächsten Ereignis / Aufwachen wieder */
    }
  }, [])

  // Alles laden. `initial` = erstes Laden der Session (setzt loading/error/notFound).
  const loadAll = useCallback(async (sid: string, initial: boolean) => {
    lastFullLoad.current = Date.now()
    // Alle vier Zähler erhöhen: eine noch laufende Einzel-Anfrage ist damit veraltet,
    // und dieses Gesamt-Laden darf auch keine frischere Einzel-Antwort überschreiben.
    const n = { ...seq.current }
    for (const t of TABLES) n[t] = ++seq.current[t]
    const fresh = (t: Table) => activeId.current === sid && seq.current[t] === n[t]
    try {
      const s = await getSessionById(sid)
      if (activeId.current !== sid) return
      if (!s) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const [p, b, r] = await Promise.all([
        listParticipants(sid),
        listBoulders(sid),
        listResults(sid),
      ])
      if (fresh('session')) setSession(s)
      if (fresh('participants')) setParticipants(p)
      if (fresh('boulders')) setBoulders(b)
      if (fresh('results')) setResults(r)
      if (activeId.current === sid) setLoading(false)
    } catch (err) {
      if (!initial || activeId.current !== sid) return
      setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen.')
      setLoading(false)
    }
  }, [])

  // Nach eigenen Mutationen sofort (ohne Debounce/Drossel) neu laden.
  const refresh = useCallback(() => {
    if (activeId.current) void loadAll(activeId.current, false)
  }, [loadAll])

  // Erstes Laden.
  useEffect(() => {
    if (!sessionId) return
    void loadAll(sessionId, true)
  }, [sessionId, loadAll])

  // Realtime-Abos + Nachladen beim Aufwachen.
  useEffect(() => {
    if (!sessionId) return
    const sid = sessionId
    const filter = `session_id=eq.${sid}`

    // Debounce je Tabelle (mit Höchstwartezeit).
    const pending = new Map<Table, { timer: ReturnType<typeof setTimeout>; firstAt: number }>()
    function schedule(table: Table) {
      const now = Date.now()
      const prev = pending.get(table)
      if (prev) clearTimeout(prev.timer)
      const firstAt = prev?.firstAt ?? now
      const delay = Math.max(0, Math.min(DEBOUNCE_MS, firstAt + MAX_WAIT_MS - now))
      const timer = setTimeout(() => {
        pending.delete(table)
        void loadTable(sid, table)
      }, delay)
      pending.set(table, { timer, firstAt })
    }

    // Gedrosseltes Komplett-Nachladen (Aufwachen, Netz zurück, Re-Subscribe).
    function wake() {
      if (Date.now() - lastFullLoad.current < WAKE_THROTTLE_MS) return
      void loadAll(sid, false)
    }

    const channel = supabase
      .channel(`session:${sid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter }, () =>
        schedule('participants'),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boulders', filter }, () =>
        schedule('boulders'),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results', filter }, () =>
        schedule('results'),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sid}` },
        () => schedule('session'),
      )
      // SUBSCRIBED kommt beim ersten Beitritt und nach jedem automatischen Rejoin –
      // dazwischen verpasste Ereignisse werden nicht nachgeliefert, darum neu laden.
      // Fehler-Status (CHANNEL_ERROR/TIMED_OUT) nicht selbst behandeln: realtime-js
      // versucht den Beitritt von sich aus erneut.
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') wake()
      })

    function onVisible() {
      if (document.visibilityState === 'visible') wake()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', wake)
    window.addEventListener('pageshow', wake)

    return () => {
      for (const p of pending.values()) clearTimeout(p.timer)
      pending.clear()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', wake)
      window.removeEventListener('pageshow', wake)
      supabase.removeChannel(channel)
    }
  }, [sessionId, loadAll, loadTable])

  return { session, participants, boulders, results, loading, error, notFound, refresh }
}
