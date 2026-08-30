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
  penalty_mode: PenaltyMode
  // true: jeder Teilnehmer darf Ergebnisse für ALLE Mitspieler eintragen/ändern
  // (RLS-Funktion can_score_others, Migration 0011). Default false.
  shared_scoring: boolean
  // true: erscheint auf der Startseite in der Liste laufender Sessions und ist dort
  // ohne Code beitretbar (Migration 0013). Default false.
  is_public: boolean
  status: 'active' | 'archived'
  created_at: string
}

export interface Participant {
  id: string
  session_id: string
  user_id: string
  display_name: string
  joined_at: string
}

export interface Boulder {
  id: string
  session_id: string
  seq: number
  // Herkunft: aus welchem Karten-Boulder wurde dieser übernommen (Migration 0017).
  // null = frei angelegt. Bewusst nur Provenienz, kein Spiegel: Grad und Farbe sind
  // KOPIEN und hier frei änderbar. Nur das Foto wird über die Referenz aufgelöst,
  // weil es keine Wertung beeinflusst – und weil ein geteilter image_path vom
  // nächtlichen Aufräumen mitgelöscht würde.
  gym_boulder_id: string | null
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

// ── Hallenkarte / Lageplan (supabase/migrations/0015_gym_map.sql) ────────────
// Der Hallen-Katalog lebt bewusst NEBEN dem Session-Modell: Session-Boulder
// werden vom nächtlichen Cleanup mitgelöscht, Karten-Boulder sind der Bestand.

export type GymTickState = 'done' | 'project'

export interface Gym {
  id: string
  // Stabiler Schlüssel, über den der Client die Halle auflöst (src/lib/gyms.ts).
  slug: string
  name: string
  // Verweist auf den im Bundle liegenden Grundriss (src/lib/areas.ts).
  map_key: string
  created_at: string
}

export interface GymBoulder {
  id: string
  gym_id: string
  // Position im SVG-User-Space des Lageplans (viewBox "90 10 960 880").
  x: number
  y: number
  // Bereichs-Id aus src/lib/areas.ts, beim Setzen aus x/y vorbelegt und danach
  // gespeichert. null = außerhalb aller Flächen.
  area: string | null
  // Code wie boulders.difficulty: 1–7 = Grad, 8 = "?", 9 = "!".
  difficulty: number
  // Farbname aus src/lib/colors.ts.
  color: string
  // Früher eine optionale freie Hallen-Kennzeichnung. Wird von der App nicht mehr
  // gesetzt oder angezeigt; die Spalte steht nur noch in der Datenbank.
  label: string | null
  image_path: string | null
  // Gesetzt = abgeschraubt: nicht mehr auf der Karte, Marken bleiben.
  removed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface GymTick {
  id: string
  gym_boulder_id: string
  user_id: string
  state: GymTickState
  created_at: string
  updated_at: string
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
