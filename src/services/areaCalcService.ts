import { supabase } from '../lib/supabase'

type AreaEntryInput = {
  room: string
  scope: string
  workType: string
  damageWidth: number
  damageHeight: number
  damageArea: number
  restoreWidth: number
  restoreHeight: number
  restoreArea: number
  note: string
  sortOrder: number
}

export async function saveAreaEntries(
  jobId: string,
  entries: AreaEntryInput[],
): Promise<void> {
  // 기존 데이터 삭제 후 전체 재삽입
  const { error: delError } = await supabase
    .from('area_calculations')
    .delete()
    .eq('job_id', jobId)

  if (delError) throw delError

  if (entries.length === 0) return

  const rows = entries.map((e, i) => ({
    job_id: jobId,
    room: e.room,
    scope: e.scope,
    work_type: e.workType,
    damage_width: e.damageWidth,
    damage_height: e.damageHeight,
    damage_area: e.damageArea,
    restore_width: e.restoreWidth,
    restore_height: e.restoreHeight,
    restore_area: e.restoreArea,
    note: e.note,
    sort_order: e.sortOrder ?? i,
  }))

  const { error } = await supabase.from('area_calculations').insert(rows)
  if (error) throw error
}
