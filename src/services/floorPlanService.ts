import { supabase } from '../lib/supabase'
import type { FloorPlanData, AnnotationShape } from '../types'

const BUCKET = 'job-documents'

type DbFloorPlanRow = {
  id: string
  job_id: string
  image_storage_path: string
  image_name: string
  annotations: AnnotationShape[]
  created_at: string
  updated_at: string
}

function toFrontend(row: DbFloorPlanRow): FloorPlanData {
  return {
    id: row.id,
    jobId: row.job_id,
    imageStoragePath: row.image_storage_path,
    imageName: row.image_name,
    annotations: row.annotations ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getFloorPlan(jobId: string): Promise<FloorPlanData | null> {
  const { data, error } = await supabase
    .from('floor_plan_data')
    .select('*')
    .eq('job_id', jobId)
    .maybeSingle()
  if (error) throw error
  return data ? toFrontend(data as DbFloorPlanRow) : null
}

export async function uploadFloorPlanImage(
  jobId: string,
  file: File,
): Promise<FloorPlanData> {
  const ext = file.name.split('.').pop() || 'jpg'
  const storagePath = `${jobId}/floor_plan/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type,
    })
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('floor_plan_data')
    .insert({
      job_id: jobId,
      image_storage_path: storagePath,
      image_name: file.name,
      annotations: [],
    })
    .select()
    .single()
  if (error) throw error
  return toFrontend(data as DbFloorPlanRow)
}

export async function replaceFloorPlanImage(
  id: string,
  oldStoragePath: string,
  jobId: string,
  file: File,
): Promise<FloorPlanData> {
  // 기존 이미지 삭제
  await supabase.storage.from(BUCKET).remove([oldStoragePath])

  const ext = file.name.split('.').pop() || 'jpg'
  const storagePath = `${jobId}/floor_plan/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type,
    })
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('floor_plan_data')
    .update({
      image_storage_path: storagePath,
      image_name: file.name,
      annotations: [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return toFrontend(data as DbFloorPlanRow)
}

export async function saveAnnotations(
  id: string,
  annotations: AnnotationShape[],
): Promise<void> {
  const { error } = await supabase
    .from('floor_plan_data')
    .update({
      annotations,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteFloorPlan(
  id: string,
  storagePath: string,
): Promise<void> {
  await supabase.storage.from(BUCKET).remove([storagePath])
  const { error } = await supabase
    .from('floor_plan_data')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function getFloorPlanImageUrl(storagePath: string): Promise<string> {
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600)
  return data?.signedUrl || ''
}
