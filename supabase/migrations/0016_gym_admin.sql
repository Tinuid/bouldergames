-- Boulder Challenges – Lageplan: passwortgeschütztes Pflegen des Boulder-Katalogs
-- Ausführen im Supabase SQL-Editor, NACH 0015_gym_map.sql. Idempotent.
--
-- gym_boulders hat bewusst KEINE insert/update/delete-Policy (siehe 0015). Alle
-- Änderungen laufen über die hier angelegten security-definer-RPCs, die ein in
-- app_config hinterlegtes Passwort serverseitig gegen einen bcrypt-Hash prüfen –
-- exakt das Muster von delete_feedback (0007/0010). Ein client-seitiger Check wäre
-- umgehbar; die Passwortprüfung ist die eigentliche Sicherheitsgrenze.
--
-- Das ist faktisch schon der spätere Betreiber-Modus, nur ohne Accounts. Sobald es
-- einen echten Login gibt, wird der Passwort-Check durch eine Rollenprüfung ersetzt
-- und die Signaturen verlieren p_key.
--
-- Bekannte, wie bei delete_feedback akzeptierte Grenze: es gibt keine
-- Rate-Limitierung. Deshalb ein langes Zufallspasswort verwenden. pg_sleep bei
-- Fehlschlag wäre kontraproduktiv – blockierte Connections sind ein DoS-Vektor.

-- pgcrypto stellt crypt()/gen_salt() bereit; auf Supabase im Schema "extensions".
create extension if not exists pgcrypto with schema extensions;

-- Gemeinsamer Passwortvergleich. Eigener Schlüssel 'gym_admin_key' – bewusst NICHT
-- derselbe wie beim Feedback-Löschen, damit die Wirkungsradien getrennt bleiben.
-- Ohne gesetztes Passwort ist Schreiben gesperrt (fail closed).
--
-- search_path enthält "extensions", damit crypt() innerhalb der security-definer-
-- Funktion auflösbar ist – sonst scheitert der Aufruf erst zur Laufzeit.
create or replace function public.is_gym_admin_key(p_key text)
returns boolean
language sql
security definer
stable
set search_path = public, extensions
as $$
  select p_key is not null and exists (
    select 1 from public.app_config c
    where c.key = 'gym_admin_key' and crypt(p_key, c.value) = c.value
  );
$$;

-- BEWUSST auch "authenticated" entzogen: direkt aufrufbar wäre das ein
-- Passwort-Orakel. Die RPCs unten sind selbst security definer und dürfen die
-- Funktion als ihr Eigentümer trotzdem ausführen. So gibt es genau EINEN
-- kontrollierten Prüf-Einstieg (verify_gym_admin_key).
revoke execute on function public.is_gym_admin_key(text) from public, anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- RPCs
--
-- Keine Default-Parameter: supabase-js erzeugt damit schnell PGRST203
-- ("ambiguous overload"). Der Client schickt immer alle Parameter, p_id = null
-- steht fürs Anlegen.
-- ────────────────────────────────────────────────────────────────────────────

-- Passwort prüfen, ohne etwas zu ändern. Damit lässt sich der Bearbeitungsmodus
-- entsperren, BEVOR die erste Änderung passiert – sonst fiele ein falsches Passwort
-- erst auf, wenn der Punkt optisch schon gesetzt ist.
create or replace function public.verify_gym_admin_key(p_key text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_gym_admin_key(p_key) then
    raise exception 'Falsches Passwort' using errcode = '28000';
  end if;
end;
$$;

-- Anlegen (p_id is null) und vollständiges Bearbeiten in einer Funktion: der
-- Admin-Dialog hat damit genau einen Codepfad.
create or replace function public.upsert_gym_boulder(
  p_key        text,
  p_id         uuid,
  p_gym_id     uuid,
  p_x          double precision,
  p_y          double precision,
  p_area       text,
  p_difficulty int,
  p_color      text,
  p_label      text,
  p_image_path text
)
returns public.gym_boulders
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.gym_boulders;
begin
  if not public.is_gym_admin_key(p_key) then
    raise exception 'Falsches Passwort' using errcode = '28000';
  end if;

  if p_id is null then
    insert into public.gym_boulders
      (gym_id, x, y, area, difficulty, color, label, image_path, created_by)
    values
      (p_gym_id, p_x, p_y, p_area, p_difficulty, p_color,
       nullif(btrim(p_label), ''), p_image_path, auth.uid())
    returning * into v_row;
  else
    -- p_gym_id wird beim Update ignoriert: ein Boulder wechselt nie die Halle.
    update public.gym_boulders set
      x          = p_x,
      y          = p_y,
      area       = p_area,
      difficulty = p_difficulty,
      color      = p_color,
      label      = nullif(btrim(p_label), ''),
      image_path = p_image_path
    where id = p_id
    returning * into v_row;

    if not found then
      raise exception 'Boulder nicht gefunden.' using errcode = 'P0002';
    end if;
  end if;

  return v_row;
end;
$$;

-- Nur die Position ändern. Bewusst eine eigene, schmale RPC: beim Verschieben
-- müsste die generische Upsert alle Felder erneut mitschicken und würde damit eine
-- parallel vorgenommene Grad- oder Farbänderung überschreiben.
create or replace function public.move_gym_boulder(
  p_key text,
  p_id  uuid,
  p_x   double precision,
  p_y   double precision,
  p_area text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_gym_admin_key(p_key) then
    raise exception 'Falsches Passwort' using errcode = '28000';
  end if;

  update public.gym_boulders set x = p_x, y = p_y, area = p_area where id = p_id;

  if not found then
    raise exception 'Boulder nicht gefunden.' using errcode = 'P0002';
  end if;
end;
$$;

-- Abschrauben / wieder anschrauben (weich). Der Boulder verschwindet von der Karte,
-- die Marken aller Nutzer bleiben erhalten. coalesce: erneutes Abschrauben frischt
-- den Zeitstempel nicht auf.
create or replace function public.set_gym_boulder_removed(
  p_key     text,
  p_id      uuid,
  p_removed boolean
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_gym_admin_key(p_key) then
    raise exception 'Falsches Passwort' using errcode = '28000';
  end if;

  update public.gym_boulders
     set removed_at = case when p_removed then coalesce(removed_at, now()) else null end
   where id = p_id;

  if not found then
    raise exception 'Boulder nicht gefunden.' using errcode = 'P0002';
  end if;
end;
$$;

-- Endgültig löschen – nur für Fehleingaben. Nimmt per Cascade die Marken ALLER
-- Nutzer mit; im UI liegt es darum hinter einer eigenen Bestätigung, Standard ist
-- das weiche Abschrauben.
--
-- Gibt den image_path zurück, damit der Client das verwaiste Storage-Objekt
-- entfernen kann: die Datenbank kann Storage nicht anfassen (gleiches Muster wie
-- cleanup_stale_sessions in 0012).
create or replace function public.delete_gym_boulder(p_key text, p_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_path text;
begin
  if not public.is_gym_admin_key(p_key) then
    raise exception 'Falsches Passwort' using errcode = '28000';
  end if;

  delete from public.gym_boulders where id = p_id returning image_path into v_path;

  if not found then
    raise exception 'Boulder nicht gefunden.' using errcode = 'P0002';
  end if;

  return v_path;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Rechte: nur Angemeldete dürfen aufrufen (anonyme Auth = Rolle authenticated).
-- Die Passwortprüfung in der Funktion ist die eigentliche Grenze.
-- ────────────────────────────────────────────────────────────────────────────

revoke execute on function public.verify_gym_admin_key(text) from public, anon;
grant  execute on function public.verify_gym_admin_key(text) to authenticated;

revoke execute on function public.upsert_gym_boulder(
  text, uuid, uuid, double precision, double precision, text, int, text, text, text
) from public, anon;
grant execute on function public.upsert_gym_boulder(
  text, uuid, uuid, double precision, double precision, text, int, text, text, text
) to authenticated;

revoke execute on function public.move_gym_boulder(text, uuid, double precision, double precision, text)
  from public, anon;
grant execute on function public.move_gym_boulder(text, uuid, double precision, double precision, text)
  to authenticated;

revoke execute on function public.set_gym_boulder_removed(text, uuid, boolean) from public, anon;
grant  execute on function public.set_gym_boulder_removed(text, uuid, boolean) to authenticated;

revoke execute on function public.delete_gym_boulder(text, uuid) from public, anon;
grant  execute on function public.delete_gym_boulder(text, uuid) to authenticated;

-- PostgREST kennt neue Funktionen erst nach einem Cache-Reload (sonst: PGRST202).
notify pgrst, 'reload schema';

-- ────────────────────────────────────────────────────────────────────────────
-- EINMALIG ausführen und PASSWORT ersetzen (steht bewusst NICHT fest im Code).
-- Ohne gesetztes Passwort ist das Bearbeiten der Karte gesperrt:
--
--   insert into public.app_config (key, value)
--   values ('gym_admin_key', extensions.crypt('DEIN-LAGEPLAN-PASSWORT', extensions.gen_salt('bf', 10)))
--   on conflict (key) do update set value = excluded.value;
--
-- In der App wird das Passwort beim Betreten des Bearbeitungsmodus abgefragt und
-- nur IM SPEICHER der Sitzung gemerkt (nicht im localStorage) – nach einem Reload
-- ist es weg und wird neu abgefragt.
-- ────────────────────────────────────────────────────────────────────────────
