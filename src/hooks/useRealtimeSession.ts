import { useEffect, useState, useCallback } from 'react'
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

/**
 * Lädt eine komplette Session (Stammdaten + Teilnehmer + Boulder + Ergebnisse)
 * und hält sie via Supabase-Realtime aktuell. Bei jeder relevanten Änderung
 * werden die betroffenen Tabellen neu geladen (einfach & robust für MVP-Größen).
 */
export function useRealtimeSession(sessionId: string | undefined): SessionData {
  const [session, setSession] = useState<Session | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [boulders, setBoulders] = useState<Boulder[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const refresh = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false

    async function loadAll() {
      try {
        const s = await getSessionById(sessionId!)
        if (cancelled) return
        if (!s) {
          setNotFound(true)
          setLoading(false)
          return
        }
        const [p, b, r] = await Promise.all([
          listParticipants(sessionId!),
          listBoulders(sessionId!),
          listResults(sessionId!),
        ])
        if (cancelled) return
        setSession(s)
        setParticipants(p)
        setBoulders(b)
        setResults(r)
        setLoading(false)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen.')
        setLoading(false)
      }
    }

    loadAll()
    return () => {
      cancelled = true
    }
  }, [sessionId, reloadKey])

  // Realtime-Abos: bei Änderungen die jeweilige Tabelle neu laden.
  useEffect(() => {
    if (!sessionId) return
    const filter = `session_id=eq.${sessionId}`

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter }, () =>
        listParticipants(sessionId)
          .then(setParticipants)
          .catch(() => {}),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boulders', filter }, () =>
        listBoulders(sessionId)
          .then(setBoulders)
          .catch(() => {}),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results', filter }, () =>
        listResults(sessionId)
          .then(setResults)
          .catch(() => {}),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        () =>
          getSessionById(sessionId)
            .then((s) => s && setSession(s))
            .catch(() => {}),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  return { session, participants, boulders, results, loading, error, notFound, refresh }
}
