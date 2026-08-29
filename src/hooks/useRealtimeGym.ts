import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getGymBySlug, listGymBoulders, listMyGymTicks } from '../lib/api'
import type { Gym, GymBoulder, GymTick } from '../types'

interface GymData {
  gym: Gym | null
  boulders: GymBoulder[]
  ticks: GymTick[]
  loading: boolean
  error: string | null
  notFound: boolean
  refresh: () => void
}

/**
 * Lädt die Halle mitsamt Boulder-Katalog und den eigenen Marken und hält den
 * Katalog via Supabase-Realtime aktuell – gleiches Re-Fetch-Muster wie
 * useRealtimeSession (bei jeder Änderung die betroffene Tabelle komplett neu
 * laden; einfach und robust für diese Größenordnung).
 *
 * Bewusst KEIN Abo auf gym_ticks: ohne Accounts ist jedes Gerät ein eigener
 * Nutzer, es gibt also keinen zweiten Client, der die eigenen Marken ändern
 * könnte. Marken-Änderungen aktualisiert der Screen optimistisch und ruft im
 * Fehlerfall refresh().
 */
export function useRealtimeGym(slug: string, userId: string | undefined): GymData {
  const [gym, setGym] = useState<Gym | null>(null)
  const [boulders, setBoulders] = useState<GymBoulder[]>([])
  const [ticks, setTicks] = useState<GymTick[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const refresh = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function loadAll() {
      try {
        const g = await getGymBySlug(slug)
        if (cancelled) return
        if (!g) {
          setNotFound(true)
          setLoading(false)
          return
        }
        const [b, t] = await Promise.all([listGymBoulders(g.id), listMyGymTicks(userId!)])
        if (cancelled) return
        setGym(g)
        setBoulders(b)
        setTicks(t)
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
  }, [slug, userId, reloadKey])

  // Realtime: Änderungen am Katalog (durch den Bearbeitungsmodus eines anderen
  // Geräts) sollen auf allen Karten sofort ankommen.
  const gymId = gym?.id
  useEffect(() => {
    if (!gymId) return

    const channel = supabase
      .channel(`gym:${gymId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gym_boulders', filter: `gym_id=eq.${gymId}` },
        () =>
          listGymBoulders(gymId)
            .then(setBoulders)
            .catch(() => {}),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gymId])

  return { gym, boulders, ticks, loading, error, notFound, refresh }
}
