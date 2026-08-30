import { supabase } from './supabase'
import { generateJoinCode, normalizeJoinCode } from './codes'
import { computePoints, normalizeResult } from './scoring'
import { deleteBoulderImage } from './images'
import type {
  Boulder,
  Feedback,
  Gym,
  GymBoulder,
  GymTick,
  GymTickState,
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
  // true: jeder Teilnehmer darf Ergebnisse für alle Mitspieler eintragen (siehe Migration 0011).
  sharedScoring?: boolean
  // true: erscheint auf der Startseite als laufende Session (siehe Migration 0013).
  isPublic?: boolean
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
        shared_scoring: params.sharedScoring ?? false,
        is_public: params.isPublic ?? false,
      })
      .select()
      .single<Session>()

    if (!error && data) {
      // Ersteller direkt als Teilnehmer aufnehmen. Schlägt das fehl, die eben
      // erstellte Session best-effort wieder löschen, damit keine verwaiste
      // Session ohne Host-Teilnehmer zurückbleibt.
      try {
        await joinSession(data.id, params.hostId, params.hostName)
      } catch (joinErr) {
        await supabase.from('sessions').delete().eq('id', data.id)
        throw joinErr
      }
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

// Alle öffentlichen aktiven Sessions (Liste "Laufende Sessions" auf der Startseite).
// RLS erlaubt das Lesen aller Sessions; sichtbar sind hier aber nur Sessions, die
// per is_public-Flag bewusst geteilt wurden (Migration 0013).
export async function listPublicSessions(): Promise<SessionSummary[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*, participants(count)')
    .eq('status', 'active')
    .eq('is_public', true)
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
  const { data, error } = await supabase.from('sessions').delete().eq('id', sessionId).select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error(
      'Nichts gelöscht – vermutlich fehlt die DELETE-Policy in Supabase (siehe sessions_delete).',
    )
  }
}

// Spieleinstellungen einer Session nachträglich ändern (nur Host, via RLS
// sessions_update erzwungen). Eine geänderte Punkteregel berührt bestehende
// results.points NICHT automatisch – die Neuberechnung übernimmt der Aufrufer
// per recomputeSessionResults.
export async function updateSession(params: {
  sessionId: string
  name: string
  scoring: ScoringConfig
  sharedScoring: boolean
  isPublic: boolean
}): Promise<Session> {
  // .select() zurückfordern, um ein per RLS blockiertes Update zu erkennen
  // (es wirft keinen Fehler, betrifft aber 0 Zeilen).
  const { data, error } = await supabase
    .from('sessions')
    .update({
      name: params.name.trim() || 'Boulder-Challenge',
      scoring_mode: params.scoring.mode,
      flash_points: params.scoring.flashPoints,
      top_points: params.scoring.topPoints,
      attempt_cost: params.scoring.attemptCost,
      penalty_mode: params.scoring.penaltyMode,
      shared_scoring: params.sharedScoring,
      is_public: params.isPublic,
    })
    .eq('id', params.sessionId)
    .select()
    .single<Session>()
  if (error) throw error
  if (!data) {
    throw new Error('Nichts geändert – nur der Host darf die Einstellungen ändern.')
  }
  return data
}

// Alle bestehenden Ergebnisse einer Session mit den (geänderten) Punkteregeln neu
// berechnen und schreiben. Reicht jedes Ergebnis durch upsertResult (onConflict →
// In-Place-Update, keine Duplikate); der Grad des zugehörigen Boulders ist im
// Multiplikator-Modus der Punkte-Faktor. Nur der Host darf fremde Ergebnisse
// korrigieren (RLS results_update via is_session_host).
export async function recomputeSessionResults(params: {
  sessionId: string
  results: Result[]
  boulders: Boulder[]
  scoring: ScoringConfig
}): Promise<void> {
  const difficultyByBoulder = new Map(params.boulders.map((b) => [b.id, b.difficulty]))
  for (const r of params.results) {
    if (!difficultyByBoulder.has(r.boulder_id)) continue
    await upsertResult({
      sessionId: params.sessionId,
      boulderId: r.boulder_id,
      participantId: r.participant_id,
      status: r.status,
      attempts: r.attempts,
      scoring: params.scoring,
      difficulty: difficultyByBoulder.get(r.boulder_id) ?? null,
    })
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

// Challenge verlassen: nur die eigene Teilnehmer-Zeile löschen (RLS participants_delete
// erlaubt user_id = auth.uid()). Eigene Ergebnisse fallen per on-delete-cascade weg; die
// Challenge bleibt für alle anderen bestehen.
export async function leaveSession(participantId: string): Promise<void> {
  // .select() wie bei deleteSession: ein per RLS blockiertes DELETE wirft keinen Fehler,
  // betrifft aber 0 Zeilen.
  const { data, error } = await supabase
    .from('participants')
    .delete()
    .eq('id', participantId)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('Verlassen fehlgeschlagen – die Teilnahme konnte nicht entfernt werden.')
  }
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

// Boulder nachträglich ändern (jeder Teilnehmer, via RLS erzwungen – siehe
// Migration 0009). Im Multiplikator-Modus rechnet ein DB-Trigger bei Grad-Änderung
// die Punkte aller Ergebnisse neu (siehe supabase/migrations/0004_boulder_points_rescale.sql).
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
    throw new Error('Nichts geändert – fehlende Berechtigung (kein Teilnehmer dieser Challenge).')
  }
  return data
}

// Reihenfolge aller Boulder einer Session neu setzen (nur Host – die security-
// definer-RPC reorder_boulders prüft is_session_host, siehe Migration 0014).
// Läuft atomar in einer RPC, weil einzelne seq-Updates an unique (session_id, seq)
// scheitern würden. boulderIds muss ALLE Boulder der Session in Zielreihenfolge
// enthalten; die RPC validiert das und wirft bei veralteter Liste.
export async function reorderBoulders(sessionId: string, boulderIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_boulders', {
    p_session_id: sessionId,
    p_boulder_ids: boulderIds,
  })
  if (error) throw error
}

// Boulder löschen (jeder Teilnehmer, via RLS boulders_delete erzwungen – siehe
// Migration 0009). results hängen per Cascade am Boulder und verschwinden mit.
export async function deleteBoulder(boulderId: string): Promise<void> {
  // .select() zurückfordern, um echtes Löschen zu erkennen: Ein per RLS
  // blockiertes DELETE wirft KEINEN Fehler, betrifft aber 0 Zeilen.
  const { data, error } = await supabase.from('boulders').delete().eq('id', boulderId).select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('Nichts gelöscht – fehlende Berechtigung (kein Teilnehmer dieser Challenge).')
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

// ════════════════════════════════════════════════════════════════════════════
// Hallenkarte / Lageplan (Migrationen 0015 + 0016)
//
// Der Katalog liegt in eigenen Tabellen neben dem Session-Modell. Lesen darf jeder
// Angemeldete; die eigenen Marken filtert die RLS auf auth.uid(). Geschrieben wird
// der Katalog ausschließlich über die passwortgeschützten RPCs – auf gym_boulders
// gibt es bewusst keine insert/update/delete-Policy.
// ════════════════════════════════════════════════════════════════════════════

// Halle über ihren stabilen slug auflösen (die uuid ist pro Umgebung zufällig).
export async function getGymBySlug(slug: string): Promise<Gym | null> {
  const { data, error } = await supabase.from('gyms').select().eq('slug', slug).maybeSingle<Gym>()
  if (error) throw error
  return data
}

export async function getGymById(id: string): Promise<Gym | null> {
  const { data, error } = await supabase.from('gyms').select().eq('id', id).maybeSingle<Gym>()
  if (error) throw error
  return data
}

// Boulder einer Halle. Standardmäßig ohne abgeschraubte; includeRemoved lädt sie
// mit, damit ältere Marken auflösbar bleiben.
export async function listGymBoulders(
  gymId: string,
  opts?: { includeRemoved?: boolean },
): Promise<GymBoulder[]> {
  let query = supabase.from('gym_boulders').select().eq('gym_id', gymId)
  if (!opts?.includeRemoved) query = query.is('removed_at', null)
  const { data, error } = await query.order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

// Eigene Marken. Die RLS gibt ohnehin nur eigene Zeilen zurück – user_id wird
// trotzdem gefiltert, damit der Index greift.
export async function listMyGymTicks(userId: string): Promise<GymTick[]> {
  const { data, error } = await supabase.from('gym_ticks').select().eq('user_id', userId)
  if (error) throw error
  return data ?? []
}

// Marke setzen bzw. umschalten (erledigt ⇄ Projekt). Upsert wie bei results.
export async function setGymTick(params: {
  gymBoulderId: string
  userId: string
  state: GymTickState
}): Promise<GymTick> {
  const { data, error } = await supabase
    .from('gym_ticks')
    .upsert(
      { gym_boulder_id: params.gymBoulderId, user_id: params.userId, state: params.state },
      { onConflict: 'gym_boulder_id,user_id' },
    )
    .select()
    .single<GymTick>()
  if (error) throw error
  return data
}

// Mehrere Karten-Boulder auf einmal als "erledigt" markieren – ein Round-Trip statt
// einer Anfrage pro Boulder (beim ersten Öffnen einer Challenge sind das schnell 15).
// Wird vom automatischen Abgleich aus einer Challenge benutzt (siehe gymTickSync.ts).
//
// Ein bestehendes 'project' wird dabei bewusst zu 'done': wer den Boulder in einer
// Challenge geschafft hat, hat ihn geschafft. Kein .select() – der Aufrufer braucht
// die Zeilen nicht, und ohne Rückgabe bleibt die Payload klein.
export async function markGymTicksDone(gymBoulderIds: string[], userId: string): Promise<void> {
  if (gymBoulderIds.length === 0) return
  const { error } = await supabase.from('gym_ticks').upsert(
    gymBoulderIds.map((id) => ({ gym_boulder_id: id, user_id: userId, state: 'done' as const })),
    { onConflict: 'gym_boulder_id,user_id' },
  )
  if (error) throw error
}

// Marke entfernen (keine Zeile = keine Marke).
//
// Bewusste Abweichung vom Repo-Idiom ".select('id') + bei 0 Zeilen werfen": hier
// sind 0 Zeilen zweideutig (Marke war schon weg vs. RLS blockt). Ein doppelter Tipp
// würde sonst eine falsche Fehlermeldung erzeugen.
export async function clearGymTick(gymBoulderId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('gym_ticks')
    .delete()
    .eq('gym_boulder_id', gymBoulderId)
    .eq('user_id', userId)
  if (error) throw error
}

// Erkennt den serverseitigen "Falsches Passwort"-Fehler der Admin-RPCs.
export function isWrongPasswordError(err: unknown): boolean {
  return err instanceof Error && /passwort/i.test(err.message)
}

// Admin-Passwort serverseitig prüfen, um den Bearbeitungsmodus zu entsperren,
// bevor die erste Änderung passiert.
export async function verifyGymAdminKey(key: string): Promise<void> {
  const { error } = await supabase.rpc('verify_gym_admin_key', { p_key: key })
  if (error) throw error
}

// Karten-Boulder anlegen (id weglassen) oder vollständig bearbeiten.
export async function upsertGymBoulder(params: {
  key: string
  id?: string | null
  gymId: string
  x: number
  y: number
  area: string | null
  difficulty: number
  color: string
  imagePath: string | null
}): Promise<GymBoulder> {
  const { data, error } = await supabase.rpc('upsert_gym_boulder', {
    p_key: params.key,
    p_id: params.id ?? null,
    p_gym_id: params.gymId,
    p_x: params.x,
    p_y: params.y,
    p_area: params.area,
    p_difficulty: params.difficulty,
    p_color: params.color,
    // Die freie Kennzeichnung ist aus der App entfernt; Spalte und RPC-Parameter bleiben
    // stehen (keine Migration), darum hier fest null – sonst fände Postgres die Funktion
    // mit ihren zehn Parametern nicht. Ein alter Wert wird beim Bearbeiten geleert.
    p_label: null,
    p_image_path: params.imagePath,
  })
  if (error) throw error
  return data as GymBoulder
}

// Nur die Position ändern (Ergebnis des Verschiebens). Eigene schmale RPC, damit
// ein Zug nicht alle Felder überschreibt.
export async function moveGymBoulder(params: {
  key: string
  id: string
  x: number
  y: number
  area: string | null
}): Promise<void> {
  const { error } = await supabase.rpc('move_gym_boulder', {
    p_key: params.key,
    p_id: params.id,
    p_x: params.x,
    p_y: params.y,
    p_area: params.area,
  })
  if (error) throw error
}

// Abschrauben / wieder anschrauben: verschwindet von der Karte, Marken bleiben.
export async function setGymBoulderRemoved(params: {
  key: string
  id: string
  removed: boolean
}): Promise<void> {
  const { error } = await supabase.rpc('set_gym_boulder_removed', {
    p_key: params.key,
    p_id: params.id,
    p_removed: params.removed,
  })
  if (error) throw error
}

// Endgültig löschen (nimmt die Marken aller Nutzer mit). Die RPC gibt den
// image_path zurück; das Storage-Objekt räumt der Client best-effort hinterher,
// weil die Datenbank den Bucket nicht anfassen kann.
export async function deleteGymBoulder(params: { key: string; id: string }): Promise<void> {
  const { data, error } = await supabase.rpc('delete_gym_boulder', {
    p_key: params.key,
    p_id: params.id,
  })
  if (error) throw error
  await deleteBoulderImage(data as string | null)
}

// ── Brücke Hallenkarte → Challenges (Migration 0017) ────────────────────────

// Eine Session, in der ich Teilnehmer bin – inklusive meines dortigen Namens.
export interface MySession extends Session {
  displayName: string
}

// Meine laufenden Challenges. Bewusst über participants statt über den
// gerätelokalen Verlauf (localHistory): der kann auf aufgeräumte oder verlassene
// Sessions zeigen. Hier zählt die tatsächliche Mitgliedschaft – und genau die
// verlangt auch die Policy boulders_insert (is_session_member) beim Übernehmen.
export async function listMySessions(userId: string): Promise<MySession[]> {
  const { data, error } = await supabase
    .from('participants')
    .select('display_name, sessions(*)')
    .eq('user_id', userId)
  if (error) throw error

  return (data ?? [])
    .map((row) => {
      const r = row as unknown as { display_name: string; sessions: Session | null }
      return r.sessions ? { ...r.sessions, displayName: r.display_name } : null
    })
    .filter((s): s is MySession => s != null && s.status === 'active')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

// Karten-Boulder zu einer Menge von Ids – löst die Fotos übernommener Boulder in
// der Session-Ansicht auf. Abgeschraubte sind bewusst dabei: ihre Zeile bleibt
// bestehen, und die alte Challenge soll das Foto behalten.
export async function listGymBouldersByIds(ids: string[]): Promise<GymBoulder[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase.from('gym_boulders').select().in('id', ids)
  if (error) throw error
  return data ?? []
}

/**
 * Übernimmt Karten-Boulder in eine Challenge.
 *
 * Läuft als ganz normaler Insert und damit innerhalb der Policy boulders_insert
 * (created_by = auth.uid() und Mitgliedschaft) – keine security-definer-RPC, die
 * die RLS umgehen und die Mitgliedschaft selbst nachbauen müsste.
 *
 * Ein Mehrfach-Insert ist sicher: der before-insert-Trigger set_boulder_seq sieht
 * die zuvor eingefügten Zeilen derselben Anweisung und nummeriert korrekt in
 * Array-Reihenfolge durch (nachgemessen).
 *
 * Grad und Farbe werden KOPIERT, image_path bleibt null – das Foto kommt in der
 * Anzeige über gym_boulder_id (siehe Kommentar an Boulder.gym_boulder_id).
 */
export async function addBouldersFromGym(params: {
  sessionId: string
  userId: string
  // In Auswahlreihenfolge – daraus ergibt sich die Nummerierung.
  boulders: GymBoulder[]
}): Promise<{ added: number; skipped: number }> {
  // Schon übernommene überspringen, damit ein zweiter Versuch nicht am partiellen
  // Unique-Index scheitert, sondern eine verständliche Rückmeldung ergibt.
  const existing = await listBoulders(params.sessionId)
  const already = new Set(
    existing.map((b) => b.gym_boulder_id).filter((id): id is string => id != null),
  )
  const todo = params.boulders.filter((b) => !already.has(b.id))
  const skipped = params.boulders.length - todo.length
  if (todo.length === 0) return { added: 0, skipped }

  const { data, error } = await supabase
    .from('boulders')
    .insert(
      todo.map((g) => ({
        session_id: params.sessionId,
        created_by: params.userId,
        difficulty: g.difficulty,
        color: g.color,
        image_path: null,
        gym_boulder_id: g.id,
      })),
    )
    .select('id')

  if (error) {
    // 23505 = unique_violation: jemand anderes war in derselben Sekunde schneller.
    if ((error as { code?: string }).code === '23505') {
      throw new Error('Einer der Boulder ist schon in dieser Challenge.')
    }
    throw error
  }

  return { added: data?.length ?? 0, skipped }
}
