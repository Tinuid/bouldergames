-- 0018_lageplan_v2.sql
--
-- Umstieg auf den handgezeichneten Lageplan (src/assets/lageplan.svg, Geometrie in
-- src/lib/areas.ts). Der neue Plan hat ein anderes Koordinatensystem (Zeichenfläche
-- 1120×1080 statt Ausschnitt 90/10/960×880) und anders geformte Wände. Darum:
--
--   1. Alle gym_boulders-Positionen (auch abgeschraubte, damit ein Wieder-Aufhängen
--      stimmt) werden JE BEREICH per Bounding-Box vom alten auf den neuen Umriss
--      umgerechnet: x' = nx + (x − ox) · nw/ow, y analog. Das ist bewusst nur eine
--      Näherung – die Wände sind nicht bloß verschoben, sondern umgezeichnet. Feinheiten
--      werden danach auf der Karte per "Verschieben" nachjustiert.
--   2. Der Bereich 'abenteuerfels' entfällt: der Block in der Mitte gehört jetzt zum
--      Abenteuerland (mehrteilige Fläche). Vorher wird er noch auf seinen eigenen neuen
--      Block umgerechnet, damit die Punkte dort landen und nicht im U-Band.
--   3. Der CHECK-Constraint auf gym_boulders.area bekommt das neue Vokabular (7 Werte).
--
-- Idempotent über gyms.map_key (seit 0015, Default 'lageplan'): umgerechnet wird nur,
-- solange er noch 'lageplan' ist; danach steht er auf 'lageplan-v2'. Ein zweiter Lauf
-- ändert keine Koordinate mehr. Alles in EINEM Block, damit Umrechnung und Marker
-- gemeinsam committen.
--
-- Session-Boulder (public.boulders) sind nicht betroffen: Mini-Karte und Sprung auf die
-- Karte lesen x/y live über boulders.gym_boulder_id.
--
-- Reihenfolge beim Ausrollen: direkt NACH dem Deploy der App-Version mit dem neuen
-- Plan ausführen – sonst zeigt die alte Version kurz neue Koordinaten auf dem alten Plan.
-- Umgekehrt sperrt die neue App den Bearbeitungsmodus der Karte, solange map_key noch
-- 'lageplan' ist (LAGEPLAN_MAP_KEY in src/lib/areas.ts): eine im Zwischenfenster
-- gesetzte Position läge schon im neuen System und würde hier sonst doppelt umgerechnet.

-- Neue Hallen starten auf dem aktuellen Plan. Ohne das bekäme eine später angelegte
-- Halle den alten Marker, und ein erneuter Lauf rechnete ihre Boulder fälschlich um.
alter table public.gyms alter column map_key set default 'lageplan-v2';

do $$
begin
  if exists (select 1 from public.gyms where map_key = 'lageplan') then

    -- Bounding-Boxes: alt = Umrisse aus dem Vorgänger-areas.ts, neu = Wandstücke des
    -- handgezeichneten Plans (beide einmalig per Skript aus den Pfaden berechnet).
    -- area = null ⇒ Gesamtausschnitt aller Flächen alt → alle Wände neu.
    with box(area, ox, oy, ow, oh, nx, ny, nw, nh) as (
      values
        ('moor-door',       404.0,  39.9, 578.9, 256.1,  430.8, 101.4,  637.8, 237.1),
        ('kreide-heide',    138.8, 258.8, 377.2, 249.1,   58.7, 328.3,  419.4, 270.9),
        ('feiner-findling', 362.1, 256.3, 212.0, 125.7,  263.3, 327.6,  208.6, 121.7),
        ('pulverturm',      633.2, 282.9, 177.3, 223.8,  647.7, 345.8,  208.6, 330.4),
        ('ems-arena',       886.2, 310.1, 124.2, 539.1,  997.0, 331.2,   85.7, 360.8),
        ('torf-terrasse',   520.3, 481.2, 130.7, 357.1,  445.5, 554.6,  101.7, 288.2),
        ('abenteuerland',   120.9, 514.9, 469.3, 327.6,  201.6, 589.1,  318.1, 232.4),
        ('abenteuerfels',   286.4, 618.4, 159.9, 107.0,  255.5, 688.5,  179.2,  94.8),
        (null,              120.9,  39.9, 889.5, 809.3,   58.7, 101.4, 1024.0, 741.4)
    )
    -- Nur Boulder von Hallen, die noch auf dem alten Plan stehen.
    update public.gym_boulders gb
       set x = round((b.nx + (gb.x - b.ox) * b.nw / b.ow)::numeric, 1),
           y = round((b.ny + (gb.y - b.oy) * b.nh / b.oh)::numeric, 1)
      from box b
     where b.area is not distinct from gb.area
       and gb.gym_id in (select id from public.gyms where map_key = 'lageplan');

    update public.gym_boulders set area = 'abenteuerland' where area = 'abenteuerfels';

    update public.gyms set map_key = 'lageplan-v2' where map_key = 'lageplan';
  end if;
end
$$;

-- Bereichs-Vokabular spiegelt die ids in src/lib/areas.ts (HALL_AREAS).
alter table public.gym_boulders drop constraint if exists gym_boulders_area_check;
alter table public.gym_boulders add  constraint gym_boulders_area_check
  check (area is null or area in (
    'moor-door', 'kreide-heide', 'feiner-findling', 'pulverturm',
    'ems-arena', 'torf-terrasse', 'abenteuerland'
  ));
