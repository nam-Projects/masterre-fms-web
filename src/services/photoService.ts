import { supabase } from '../lib/supabase'
import type { Photo, PhotoFolder } from '../types'
import { dbRowToPhoto, type DbPhotoRow } from '../utils/mappers'

const BUCKET = 'job-photos'

export async function uploadPhotos(
  jobId: string,
  folder: PhotoFolder,
  files: File[],
  uploadedBy: string,
): Promise<Photo[]> {
  const results: Photo[] = []

  for (const file of files) {
    const ext = file.name.split('.').pop() || 'jpg'
    const storagePath = `${jobId}/${folder}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        contentType: file.type,
      })

    if (uploadError) throw uploadError

    const { data, error: dbError } = await supabase
      .from('photos')
      .insert({
        job_id: jobId,
        folder,
        name: file.name,
        storage_path: storagePath,
        uploaded_by: uploadedBy,
      })
      .select()
      .single()

    if (dbError) throw dbError
    results.push(dbRowToPhoto(data as DbPhotoRow))
  }

  return results
}

export async function getPhotoUrl(storagePath: string): Promise<string> {
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600)
  return data?.signedUrl || ''
}

export async function getPhotoUrls(
  photos: Photo[],
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>()
  const promises = photos.map(async (p) => {
    const url = await getPhotoUrl(p.storagePath)
    urlMap.set(p.id, url)
  })
  await Promise.all(promises)
  return urlMap
}

export async function deletePhoto(
  photoId: string,
  storagePath: string,
): Promise<void> {
  await supabase.storage.from(BUCKET).remove([storagePath])
  const { error } = await supabase.from('photos').delete().eq('id', photoId)
  if (error) throw error
}

export async function listPhotos(
  jobId: string,
  folder?: PhotoFolder,
): Promise<Photo[]> {
  let query = supabase.from('photos').select('*').eq('job_id', jobId)
  if (folder) query = query.eq('folder', folder)
  const { data, error } = await query.order('uploaded_at')
  if (error) throw error
  return (data as DbPhotoRow[]).map(dbRowToPhoto)
}
