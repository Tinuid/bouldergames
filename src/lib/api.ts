import { supabase } from './supabase'
import { generateJoinCode, normalizeJoinCode } from './codes'
import { computePoints, normalizeResult } from './scoring'
import type {
  Boulder,
  Feedback,
  Participant,
  Result,
  ResultStatus,
  ScoringConfig,
  Session,
} from '../types'

// Freies Feedback abschicken. Per RLS für Clients nicht wieder lesbar
// (siehe supabase/migrations/0006_feedback.sql) – darum nichts zurückgeben.
export async function submitFeedback(params: {
  userId: string
  name: string
  message: string
}): Promise<void> {
  const { error } = await supabase.from('feedback').insert({
    user_id: params.userId,
    name: params.name.trim() || 'Anonym',
    message: params.message.trim(),
  })
  if (error) throw error
}

// Alle Feedbacks lesen (öffentliche Liste, neueste zuerst). Lesen ist per RLS
// für alle Angemeldeten erlaubt (siehe 0006).
export async function listFeedback(): Promise<Feedback[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select()
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// Feedback löschen – nur mit korrektem Passwort. Läuft über die security-definer-
// RPC delete_feedback, die das Passwort serverseitig prüft (siehe 0007). Ein
// falsches/fehlendes Passwort wirft serverseitig einen Fehler.
export async function deleteFeedback(id: string, key: string): Promise<void> {
  const { error } = await supabase.rpc('delete_feedback', { p_id: id, p_key: key })
  if (error) throw error
}

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
        scoring_mode: params.scoring.mode,
        flash_points: params.scoring.flashPoints,
        top_points: params.scoring.topPoints,
        attempt_cost: params.scoring.attemptCost,
        penalty_mode: params.scoring.penaltyMode,
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
  imagePath?: string | null
}): Promise<Boulder> {
  // seq wird per DB-Trigger vergeben (race-sicher), daher hier nicht setzen.
  const { data, error } = await supabase
    .from('boulders')
    .insert({
      session_id: params.sessionId,
      created_by: params.userId,
      difficulty: params.difficulty,
      color: params.color,
      image_path: params.imagePath ?? null,
    })
    .select()
    .single<Boulder>()
  if (error) throw error
  return data
}

// Boulder nachträglich ändern (nur Ersteller oder Host, via RLS erzwungen). Im
// Multiplikator-Modus rechnet ein DB-Trigger bei Grad-Änderung die Punkte aller
// Ergebnisse neu (siehe supabase/migrations/0004_boulder_points_rescale.sql).
export async function updateBoulder(params: {
  boulderId: string
  difficulty: number | null
  color: string | null
  imagePath: string | null
}): Promise<Boulder> {
  // .select() zurückfordern, um ein per RLS blockiertes Update zu erkennen
  // (es wirft keinen Fehler, betrifft aber 0 Zeilen).
  const { data, error } = await supabase
    .from('boulders')
    .update({
      difficulty: params.difficulty,
      color: params.color,
      image_path: params.imagePath,
    })
    .eq('id', params.boulderId)
    .select()
    .single<Boulder>()
  if (error) throw error
  if (!data) {
    throw new Error('Nichts geändert – fehlende Berechtigung (nur Ersteller oder Host).')
  }
  return data
}

// Boulder löschen (nur Ersteller oder Host, via RLS boulders_delete erzwungen).
// results hängen per Cascade am Boulder und verschwinden mit.
export async function deleteBoulder(boulderId: string): Promise<void> {
  // .select() zurückfordern, um echtes Löschen zu erkennen: Ein per RLS
  // blockiertes DELETE wirft KEINEN Fehler, betrifft aber 0 Zeilen.
  const { data, error } = await supabase
    .from('boulders')
    .delete()
    .eq('id', boulderId)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('Nichts gelöscht – fehlende Berechtigung (nur Ersteller oder Host).')
  }
}

export async function upsertResult(params: {
  sessionId: string
  boulderId: string
  participantId: string
  status: ResultStatus
  attempts: number
  scoring: ScoringConfig
  // Schwierigkeitsgrad des Boulders – im Multiplikator-Modus der Punkte-Faktor.
  difficulty: number | null
}): Promise<Result> {
  const norm = normalizeResult(params.status, params.attempts)
  const points = computePoints(norm.status, norm.attempts, params.scoring, params.difficulty)
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
