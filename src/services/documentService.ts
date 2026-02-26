import { supabase } from '../lib/supabase'
import type { Document, DocumentType } from '../types'
import { dbRowToDocument, type DbDocumentRow } from '../utils/mappers'

const BUCKET = 'job-documents'

export async function uploadDocument(
  jobId: string,
  docType: DocumentType,
  file: File,
): Promise<Document> {
  const ext = file.name.split('.').pop() || 'pdf'
  const storagePath = `${jobId}/${docType}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type,
    })

  if (uploadError) throw uploadError

  const { data, error: dbError } = await supabase
    .from('documents')
    .insert({
      job_id: jobId,
      doc_type: docType,
      name: file.name,
      storage_path: storagePath,
    })
    .select()
    .single()

  if (dbError) throw dbError
  return dbRowToDocument(data as DbDocumentRow)
}

export async function getDocumentUrl(storagePath: string): Promise<string> {
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600)
  return data?.signedUrl || ''
}

export async function deleteDocument(
  docId: string,
  storagePath: string,
): Promise<void> {
  await supabase.storage.from(BUCKET).remove([storagePath])
  const { error } = await supabase.from('documents').delete().eq('id', docId)
  if (error) throw error
}

export async function listDocuments(
  jobId: string,
  docType?: DocumentType,
): Promise<Document[]> {
  let query = supabase.from('documents').select('*').eq('job_id', jobId)
  if (docType) query = query.eq('doc_type', docType)
  const { data, error } = await query.order('uploaded_at')
  if (error) throw error
  return (data as DbDocumentRow[]).map(dbRowToDocument)
}
