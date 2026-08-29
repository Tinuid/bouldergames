-- Boulder Challenges – Hallenkarte (Lageplan): Boulder-Katalog und eigene Marken
-- Ausführen im Supabase SQL-Editor, NACH den vorherigen Migrationen. Idempotent.
--
-- Warum eine EIGENE Tabelle statt public.boulders zu erweitern: Session-Boulder
-- sind Wegwerf-Objekte. Sie hängen per not-null-FK an einer Session, und
-- cleanup_stale_sessions() (0012) löscht Sessions samt Bouldern nach spätestens
-- sechs Wochen. Der Hallen-Katalog ist das Gegenteil – er ist der Bestand und darf
-- nie mitgeräumt werden. Beide Modelle in eine Tabelle zu pressen würde entweder
-- den Katalog dem Cleanup ausliefern oder die Session-Logik (seq-Trigger,
-- unique (session_id, seq), Realtime-Filter) verbiegen.
--
-- Diese Migration fasst public.sessions/boulders/results und deren Policies,
-- Trigger und Funktionen NICHT an. cleanup_stale_sessions() liest und löscht
-- ausschließlich sessions und liest boulders; die hier angelegten Tabellen haben
-- keinen FK dorthin und bleiben vom nächtlichen Aufräumen also ABSICHTLICH
-- unberührt. Wer das Cleanup später anfasst, muss das so lassen.
--
-- Schreibrechte auf gym_boulders vergibt diese Migration BEWUSST nicht – dafür
-- gibt es die passwortgeschützten RPCs in 0016_gym_admin.sql.

-- ────────────────────────────────────────────────────────────────────────────
-- Tabellen
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.gyms (
  id         uuid primary key default gen_random_uuid(),
  -- Stabiler Schlüssel, über den der Client die Halle auflöst (src/lib/gyms.ts).
  -- Die id ist pro Umgebung zufällig – darum steht NIE eine uuid fest im Code.
  slug       text not null unique,
  name       text not null,
  -- Welcher Grundriss gerendert wird. Der Plan selbst liegt im Bundle
  -- (src/lib/areas.ts, Original src/assets/lageplan.svg) – hier steht nur der Verweis.
  map_key    text not null default 'lageplan',
  created_at timestamptz not null default now()
);

-- Die eine Halle. do update statt do nothing: ein erneuter Lauf gleicht den Namen
-- ab, bleibt aber idempotent.
insert into public.gyms (slug, name)
values ('halle', 'Kletterhalle')
on conflict (slug) do update set name = excluded.name;

create table if not exists public.gym_boulders (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid not null references public.gyms (id) on delete cascade,
  -- Position im SVG-USERSPACE des Lageplans (viewBox "90 10 960 880"), NICHT auf
  -- 0..1 normiert: die Pfad-Geometrie ist das Stabile, die viewBox nur ein
  -- Ausschnitt. Wird der Plan später anders beschnitten, bleiben rohe Koordinaten
  -- korrekt – normierte würden sich stillschweigend alle verschieben.
  x           double precision not null,
  y           double precision not null,
  -- Bereich (Pfad-id aus src/lib/areas.ts). Beim Setzen client-seitig per
  -- Punkt-in-Polygon vorbelegt, vom Admin änderbar und GESPEICHERT – nicht zur
  -- Renderzeit abgeleitet: die Flächen sind nicht-konvexe Bänder, in deren
  -- Konkavität ein Punkt-in-Polygon-Test fälschlich "drinnen" meldet.
  -- null = außerhalb aller Flächen (Gang/Rand) und ausdrücklich erlaubt.
  area        text,
  -- Schwierigkeits-CODE wie boulders.difficulty (src/lib/difficulty.ts):
  -- 1–7 = Grad, 8 = "?", 9 = "!". Auf dem Karten-Punkt steht difficultyLabel(code).
  -- not null, weil ein Punkt ohne Zahl auf der Karte nichts aussagt – "unbekannt"
  -- ist als Code 8 bereits modelliert.
  difficulty  int not null,
  -- Farbname aus src/lib/colors.ts. Bewusst ohne CHECK: colors.ts ändert sich
  -- häufiger als difficulty.ts, und boulders.color hat auch keinen. Ein unbekannter
  -- Name führt client-seitig nur zu einem neutralen Fallback-Punkt.
  color       text not null,
  -- Optionale Hallen-Kennzeichnung ("A7"), rein informativ. KEINE laufende Nummer:
  -- die bräuchte denselben Advisory-Lock-Trigger und unique-Constraint wie
  -- boulders.seq und wäre nach jedem Umschraub-Zyklus ohnehin durchgewürfelt.
  label       text,
  -- Objektpfad im Storage-Bucket 'boulder-images' (siehe src/lib/images.ts).
  image_path  text,
  -- null = hängt. Gesetzt = abgeschraubt: verschwindet von der Karte, die Ticks
  -- bleiben erhalten. Zeitstempel statt boolean, weil das "wann" später gebraucht
  -- wird ("geschafft, bevor er wegkam") und ein Aufräum-Kriterium liefert.
  removed_at  timestamptz,
  -- Wer den Punkt gesetzt hat. Nullable, weil ein Eintrag über den SQL-Editor
  -- (service_role) keine auth.uid() hat.
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.gym_ticks (
  id             uuid primary key default gen_random_uuid(),
  gym_boulder_id uuid not null references public.gym_boulders (id) on delete cascade,
  -- An die anonyme auth.uid() gebunden, also faktisch an das Gerät. Ein späterer
  -- echter Login erbt die Marken NUR, wenn er den anonymen Nutzer aufwertet
  -- (linkIdentity, gleiche auth.uid()) – ein frisch angelegter Account nicht.
  user_id        uuid not null references auth.users (id) on delete cascade,
  -- "erledigt" und "Projekt" schließen sich aus (ein geschafftes Projekt ist
  -- geschafft), darum EIN Datensatz mit Zustand statt zweier Flags. Keine Marke
  -- = keine Zeile.
  state          text not null check (state in ('done', 'project')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (gym_boulder_id, user_id)
);

-- ────────────────────────────────────────────────────────────────────────────
-- Constraints als drop/add-Paare
--
-- "create table if not exists" trägt an einer bereits existierenden Tabelle KEINE
-- nachträglich ergänzten Inline-Checks nach – eine korrigierte Migration wäre beim
-- zweiten Lauf sonst wirkungslos.
-- ────────────────────────────────────────────────────────────────────────────

-- Großzügige Bereichsgrenzen als Sanity-Guard, nicht als Modell (eine erweiterte
-- viewBox soll keine Migration erzwingen). Wichtiger Nebeneffekt: 'NaN'::float8 ist
-- in Postgres speicherbar und würde den Punkt unsichtbar machen – ein Bereichs-Check
-- verwirft NaN/Infinity automatisch (alle Vergleiche sind false), ein not null nicht.
alter table public.gym_boulders drop constraint if exists gym_boulders_x_check;
alter table public.gym_boulders add  constraint gym_boulders_x_check check (x between -1000 and 5000);

alter table public.gym_boulders drop constraint if exists gym_boulders_y_check;
alter table public.gym_boulders add  constraint gym_boulders_y_check check (y between -1000 and 5000);

alter table public.gym_boulders drop constraint if exists gym_boulders_difficulty_check;
alter table public.gym_boulders add  constraint gym_boulders_difficulty_check
  check (difficulty between 1 and 9);

-- Bereichs-Vokabular spiegelt die Pfad-ids in src/lib/areas.ts (HALL_AREAS).
-- Neue Fläche ⇒ Eintrag dort UND neue Migration hier. Freitext wäre schlechter:
-- ein Tippfehler ließe den Boulder still aus jedem Filter-Chip fallen.
alter table public.gym_boulders drop constraint if exists gym_boulders_area_check;
alter table public.gym_boulders add  constraint gym_boulders_area_check
  check (area is null or area in (
    'moor-door', 'kreide-heide', 'feiner-findling', 'pulverturm',
    'ems-arena', 'torf-terrasse', 'abenteuerland', 'abenteuerfels'
  ));

-- Die Karte lädt nur hängende Boulder ⇒ partieller Index.
create index if not exists idx_gym_boulders_gym_active
  on public.gym_boulders (gym_id) where removed_at is null;

create index if not exists idx_gym_ticks_user on public.gym_ticks (user_id);

-- updated_at pflegen. touch_updated_at() existiert seit 0001 und wird hier NUR
-- angehängt, bewusst nicht neu definiert – kein create or replace, kein Drift-Risiko
-- für die results-Tabelle, die an derselben Funktion hängt.
drop trigger if exists trg_gym_boulders_touch on public.gym_boulders;
create trigger trg_gym_boulders_touch
  before update on public.gym_boulders
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_gym_ticks_touch on public.gym_ticks;
create trigger trg_gym_ticks_touch
  before update on public.gym_ticks
  for each row execute function public.touch_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────────────────────

alter table public.gyms         enable row level security;
alter table public.gym_boulders enable row level security;
alter table public.gym_ticks    enable row level security;

-- Halle: nur lesen. Geändert wird die eine Zeile über den SQL-Editor.
drop policy if exists gyms_select on public.gyms;
create policy gyms_select on public.gyms
  for select to authenticated using (true);

-- Katalog: LESEN für alle Angemeldeten – auch abgeschraubte Boulder, damit alte
-- Marken auflösbar bleiben (die Karte filtert removed_at im Query).
-- SCHREIBEN gibt es hier bewusst NICHT: keine insert/update/delete-Policy. Jede
-- Änderung läuft ausschließlich über die passwortgeschützten security-definer-RPCs
-- aus 0016 – exakt dasselbe Muster wie feedback/delete_feedback.
drop policy if exists gym_boulders_select on public.gym_boulders;
create policy gym_boulders_select on public.gym_boulders
  for select to authenticated using (true);

-- Marken: strikt privat. Jeder sieht und schreibt NUR seine eigenen.
--
-- Warum anders als results (dort ist select "using (true)"): eine Session ist ein
-- bewusst geteilter Gruppenkontext. Der Lageplan ist das nicht – global lesbare
-- Marken ergäben eine Tabelle, aus der sich für jede anonyme uid die vollständige
-- Kletterhistorie auslesen und über Zeitmuster korrelieren ließe, ohne dass es
-- dafür bisher einen Produktnutzen gibt. Zähler wie "12× getoppt" lassen sich
-- später über eine security-definer-RPC nachrüsten, die NIE eine user_id herausgibt.
drop policy if exists gym_ticks_select on public.gym_ticks;
create policy gym_ticks_select on public.gym_ticks
  for select to authenticated using (user_id = auth.uid());

drop policy if exists gym_ticks_insert on public.gym_ticks;
create policy gym_ticks_insert on public.gym_ticks
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists gym_ticks_update on public.gym_ticks;
create policy gym_ticks_update on public.gym_ticks
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists gym_ticks_delete on public.gym_ticks;
create policy gym_ticks_delete on public.gym_ticks
  for delete to authenticated using (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- Realtime
--
-- Nur gym_boulders: gyms ist eine statische Seed-Zeile, und gym_ticks braucht kein
-- Abo – ohne Accounts ist jedes Gerät ein eigener Nutzer, es gibt also keinen
-- zweiten Client, der meine Marken ändern könnte.
-- replica identity full ist zwingend, damit der Filter gym_id=eq.… auch für
-- DELETE-Events greift (die alte Zeile muss im WAL stehen) – sonst blieben
-- gelöschte Punkte auf fremden Geräten stehen.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.gym_boulders replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.gym_boulders;
exception when duplicate_object then null;
end $$;

-- PostgREST kennt neue Tabellen erst nach einem Cache-Reload (sonst: PGRST205).
notify pgrst, 'reload schema';
