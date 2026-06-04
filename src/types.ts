// Domänen-Typen, passend zum Postgres-Schema (supabase/migrations/0001_init.sql).

export type ResultStatus = 'open' | 'flash' | 'top' | 'fail'

// Spielmodus:
//  'classic'    – feste Punkte (Flash/Top minus Versuchskosten), Grad ist nur Info.
//  'multiplier' – der Schwierigkeitsgrad multipliziert das klassische Ergebnis
//                 (z.B. Flash auf Grad 4 = (flashPoints − Kosten) × 4). Grad ist Pflicht.
export type ScoringMode = 'classic' | 'multiplier'

// Strafmodus – wie Versuchskosten/Minuspunkte wirken (pro Session beim Erstellen wählbar):
//  'top_floor' – erfolgreicher Zug gratis; Flash/Top nie < 0 (Fail bleibt negativ).
//  'strict'    – jeder Versuch kostet (auch der erfolgreiche); Top kann negativ werden.
//  'misses'    – erfolgreicher Zug gratis; nur Fehlversuche kosten (Top kann negativ werden).
export type PenaltyMode = 'top_floor' | 'strict' | 'misses'

export interface ScoringConfig {
  mode: ScoringMode
  flashPoints: number
  topPoints: number
  // Kosten pro Fehlversuch (im 'strict'-Modus kostet auch der erfolgreiche Zug).
  attemptCost: number
  penaltyMode: PenaltyMode
}

export const DEFAULT_SCORING: ScoringConfig = {
  mode: 'classic',
  flashPoints: 30,
  topPoints: 25,
  attemptCost: 5,
  penaltyMode: 'top_floor',
}

export interface Session {
  id: string
  join_code: string
  name: string
  host_id: string
  scoring_mode: ScoringMode
  flash_points: number
  top_points: number
  attempt_cost: number
  free_success: boolean
  penalty_mode: PenaltyMode
  status: 'active' | 'archived'
  created_at: string
}

export interface Participant {
  id: string
  session_id: string
  user_id: string
  display_name: string
  color: string | null
  joined_at: string
}

export interface Boulder {
  id: string
  session_id: string
  seq: number
  // Schwierigkeits-Code (siehe src/lib/difficulty.ts): 1–7 = Grad, 8 = "?", 9 = "!".
  // null = ohne Grad. Anzeige via difficultyLabel, Wertungs-Faktor via difficultyFactor.
  difficulty: number | null
  color: string | null
  // Objekt-Pfad im Storage-Bucket 'boulder-images' (nicht die volle URL), z.B.
  // "<user_id>/<uuid>.jpg". null = kein Bild. Siehe src/lib/images.ts.
  image_path: string | null
  created_by: string
  created_at: string
}

export interface Result {
  id: string
  session_id: string
  boulder_id: string
  participant_id: string
  status: ResultStatus
  attempts: number
  points: number
  updated_at: string
}

export interface Feedback {
  id: string
  user_id: string | null
  name: string
  message: string
  created_at: string
}

// Hilfs-Mapper: Session-Datensatz -> ScoringConfig
export function scoringFromSession(s: Session): ScoringConfig {
  return {
    mode: s.scoring_mode ?? 'classic',
    flashPoints: s.flash_points,
    topPoints: s.top_points,
    attemptCost: s.attempt_cost,
    penaltyMode: s.penalty_mode ?? 'strict',
  }
}
