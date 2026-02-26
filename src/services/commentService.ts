import { supabase } from '../lib/supabase'
import type { Comment } from '../types'
import { dbRowToComment, type DbCommentRow } from '../utils/mappers'

export async function addComment(
  jobId: string,
  data: { author: string; text: string; createdBy?: string },
): Promise<Comment> {
  const { data: row, error } = await supabase
    .from('comments')
    .insert({
      job_id: jobId,
      author: data.author,
      text: data.text,
      created_by: data.createdBy ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return dbRowToComment(row as DbCommentRow)
}

export async function listComments(jobId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as DbCommentRow[]).map(dbRowToComment)
}
