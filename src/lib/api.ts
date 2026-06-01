import { supabase } from './supabase'
import { generateJoinCode, normalizeJoinCode } from './codes'
import { computePoints, normalizeResult } from './scoring'
import type {
  Boulder,
  Participant,
  Result,
  ResultStatus,
  ScoringConfig,
  Session,
} from '../types'

export async function createSession(params: {
  name: string
  hostId: string
  hostName: string
  scoring: ScoringConfig
}): Promise<Session> {
  // Bis zu wenige Versuche, falls ein Code zufällig schon vergeben ist.
  let lastError: unknown = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateJoinCode()
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        join_code: code,
        name: params.name.trim() || 'Boulder-Challenge',
        host_id: params.hostId,
        flash_points: params.scoring.flashPoints,
        top_points: params.scoring.topPoints,
        attempt_cost: params.scoring.attemptCost,
        free_success: params.scoring.freeSuccess ?? false,
      })
      .select()
      .single<Session>()

    if (!error && data) {
      // Ersteller direkt als Teilnehmer aufnehmen.
      await joinSession(data.id, params.hostId, params.hostName)
      return data
    }
    lastError = error
    // 23505 = unique_violation (Code-Kollision) -> erneut versuchen
    if (error && (error as { code?: string }).code !== '23505') break
  }
  throw lastError ?? new Error('Session konnte nicht erstellt werden.')
}

export interface SessionSummary extends Session {
  participantCount: number
}

// Alle aktiven Challenges (für die öffentliche Übersicht auf der Startseite).
// RLS erlaubt das Lesen aller Sessions; Zugang besteht hier bewusst ohne Code.
export async function listSessions(): Promise<SessionSummary[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*, participants(count)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => {
    const { participants, ...session } = row as Session & {
      participants: { count: number }[]
    }
    return { ...session, participantCount: participants?.[0]?.count ?? 0 }
  })
}

export async function getSessionByCode(code: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select()
    .eq('join_code', normalizeJoinCode(code))
    .maybeSingle<Session>()
  if (error) throw error
  return data
}

export async function getSessionById(id: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select()
    .eq('id', id)
    .maybeSingle<Session>()
  if (error) throw error
  return data
}

// Challenge löschen (nur Host, via RLS erzwungen). Cascade entfernt Teilnehmer,
// Boulder und Ergebnisse mit.
export async function deleteSession(sessionId: string): Promise<void> {
  // .select() zurückfordern, um echtes Löschen zu erkennen: Ein per RLS
  // blockiertes DELETE wirft KEINEN Fehler, betrifft aber 0 Zeilen.
  const { data, error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error(
      'Nichts gelöscht – vermutlich fehlt die DELETE-Policy in Supabase (siehe sessions_delete).',
    )
  }
}

export async function joinSession(
  sessionId: string,
  userId: string,
  displayName: string,
): Promise<Participant> {
  const { data, error } = await supabase
    .from('participants')
    .upsert(
      {
        session_id: sessionId,
        user_id: userId,
        display_name: displayName.trim() || 'Anonym',
      },
      { onConflict: 'session_id,user_id' },
    )
    .select()
    .single<Participant>()
  if (error) throw error
  return data
}

export async function getMyParticipant(
  sessionId: string,
  userId: string,
): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('participants')
    .select()
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .maybeSingle<Participant>()
  if (error) throw error
  return data
}

export async function listParticipants(sessionId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('participants')
    .select()
    .eq('session_id', sessionId)
    .order('joined_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function listBoulders(sessionId: string): Promise<Boulder[]> {
  const { data, error } = await supabase
    .from('boulders')
    .select()
    .eq('session_id', sessionId)
    .order('seq', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function listResults(sessionId: string): Promise<Result[]> {
  const { data, error } = await supabase.from('results').select().eq('session_id', sessionId)
  if (error) throw error
  return data ?? []
}

export async function addBoulder(params: {
  sessionId: string
  userId: string
  difficulty: number | null
  color: string | null
}): Promise<Boulder> {
  // seq wird per DB-Trigger vergeben (race-sicher), daher hier nicht setzen.
  const { data, error } = await supabase
    .from('boulders')
    .insert({
      session_id: params.sessionId,
      created_by: params.userId,
      difficulty: params.difficulty,
      color: params.color,
    })
    .select()
    .single<Boulder>()
  if (error) throw error
  return data
}

export async function upsertResult(params: {
  sessionId: string
  boulderId: string
  participantId: string
  status: ResultStatus
  attempts: number
  scoring: ScoringConfig
}): Promise<Result> {
  const norm = normalizeResult(params.status, params.attempts)
  const points = computePoints(norm.status, norm.attempts, params.scoring)
  const { data, error } = await supabase
    .from('results')
    .upsert(
      {
        session_id: params.sessionId,
        boulder_id: params.boulderId,
        participant_id: params.participantId,
        status: norm.status,
        attempts: norm.attempts,
        points,
      },
      { onConflict: 'boulder_id,participant_id' },
    )
    .select()
    .single<Result>()
  if (error) throw error
  return data
}
