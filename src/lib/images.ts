import { supabase } from './supabase'

// Storage-Bucket für Boulder-Fotos (siehe supabase/migrations/0002_boulder_images.sql).
const BUCKET = 'boulder-images'

// Boulder-Fotos sind oft Handy-Aufnahmen mit mehreren MB. Vor dem Upload
// client-seitig auf eine sinnvolle Kantenlänge verkleinern und als JPEG
// komprimieren – spart Bandbreite, Storage und macht Thumbnails schnell.
const MAX_EDGE = 1600
const JPEG_QUALITY = 0.82

/**
 * Verkleinert ein Bild via Canvas auf max. MAX_EDGE (längere Kante) und gibt
 * einen JPEG-Blob zurück. Lässt kleinere Bilder in der Auflösung unangetastet
 * (komprimiert sie aber dennoch zu JPEG).
 */
async function downscaleToJpeg(file: File): Promise<Blob> {
  const bitmap = await loadBitmap(file)
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas-Kontext nicht verfügbar.')
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    if (!blob) throw new Error('Bild konnte nicht verarbeitet werden.')
    return blob
  } finally {
    // ImageBitmap freigeben, falls genutzt.
    if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()
  }
}

// createImageBitmap respektiert standardmäßig die EXIF-Orientierung nicht
// überall gleich – mit Option erzwingen, damit Hochformat-Fotos korrekt sind.
async function loadBitmap(file: File): Promise<ImageBitmap> {
  return await createImageBitmap(file, { imageOrientation: 'from-image' })
}

/**
 * Verkleinert das Bild und lädt es in den Storage-Bucket. Der Pfad beginnt mit
 * der user_id (von der Storage-RLS verlangt), gefolgt von einer zufälligen UUID.
 * Gibt den Objekt-Pfad zurück, der in boulders.image_path persistiert wird.
 */
export async function uploadBoulderImage(file: File, userId: string): Promise<string> {
  const blob = await downscaleToJpeg(file)
  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error
  return path
}

/**
 * Löscht ein Boulder-Bild aus dem Storage (best-effort). Die Storage-RLS erlaubt
 * das Löschen nur im eigenen Ordner (Pfad beginnt mit der user_id) – ein Host, der
 * ein fremdes Bild ersetzt, darf dessen Datei evtl. nicht entfernen. Ein verwaistes
 * Objekt im öffentlichen Bucket ist unkritisch, daher wird ein Fehler verschluckt.
 */
export async function deleteBoulderImage(path: string | null | undefined): Promise<void> {
  if (!path) return
  try {
    await supabase.storage.from(BUCKET).remove([path])
  } catch {
    // bewusst ignoriert
  }
}

/** Baut die öffentliche URL zu einem gespeicherten Boulder-Bild-Pfad. */
export function boulderImageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
