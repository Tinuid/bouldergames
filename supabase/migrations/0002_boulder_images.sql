-- Boulder Challenges – Bilder zu Bouldern
-- Ausführen im Supabase SQL-Editor, NACH 0001_init.sql.
-- Fügt eine optionale Bild-Referenz an boulders an und richtet einen
-- öffentlichen Storage-Bucket für die Boulder-Fotos ein.

-- ────────────────────────────────────────────────────────────────────────────
-- Schema: Bildpfad an boulders
-- ────────────────────────────────────────────────────────────────────────────

-- image_path speichert den Objekt-Pfad im Storage-Bucket 'boulder-images'
-- (z.B. "<user_id>/<uuid>.jpg"), NICHT die volle URL. Die öffentliche URL
-- wird client-seitig aus Bucket + Pfad gebaut.
alter table public.boulders add column if not exists image_path text;

-- ────────────────────────────────────────────────────────────────────────────
-- Storage-Bucket (öffentlich lesbar – konsistent mit dem offenen Lesemodell:
-- Sessions sind für alle Angemeldeten sichtbar, Zugang faktisch über den Code).
-- ────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('boulder-images', 'boulder-images', true)
on conflict (id) do update set public = true;

-- Storage-RLS: öffentlich lesen; Hochladen/Löschen nur im eigenen Ordner
-- (erstes Pfadsegment = auth.uid()). So kann niemand fremde Objekte überschreiben.
drop policy if exists "boulder_images_read" on storage.objects;
create policy "boulder_images_read" on storage.objects
  for select to public
  using (bucket_id = 'boulder-images');

drop policy if exists "boulder_images_insert" on storage.objects;
create policy "boulder_images_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'boulder-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "boulder_images_delete" on storage.objects;
create policy "boulder_images_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'boulder-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
