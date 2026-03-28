import { supabase } from '../lib/supabase'
import type { Job, Stage, ClaimType } from '../types'
import {
  dbRowToJob,
  dbRowToJobSummary,
  jobToInsertRow,
  type DbJobRow,
  type DbVictimRow,
  type DbCommentRow,
  type DbPhotoRow,
  type DbDocumentRow,
  type DbAreaCalcRow,
} from '../utils/mappers'

// ============================================================
// 목록 조회
// ============================================================

export async function listJobs(stageFilter?: Stage | null): Promise<Job[]> {
  let query = supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: true })

  if (stageFilter) {
    query = query.eq('stage', stageFilter)
  }

  const { data, error } = await query
  if (error) throw error

  return (data as DbJobRow[]).map(dbRowToJobSummary)
}

// ============================================================
// 단일 조회 (관계 데이터 포함)
// ============================================================

export async function getJobWithRelations(id: string): Promise<Job> {
  const [jobRes, victimsRes, commentsRes, photosRes, docsRes, areasRes, floorPlanRes, estimateRes] =
    await Promise.all([
      supabase.from('jobs').select('*').eq('id', id).single(),
      supabase.from('victims').select('*').eq('job_id', id).order('sort_order'),
      supabase.from('comments').select('*').eq('job_id', id).order('created_at', { ascending: false }),
      supabase.from('photos').select('*').eq('job_id', id).order('uploaded_at'),
      supabase.from('documents').select('*').eq('job_id', id).order('uploaded_at'),
      supabase.from('area_calculations').select('*').eq('job_id', id).order('sort_order'),
      supabase.from('floor_plan_data').select('id').eq('job_id', id).maybeSingle(),
      supabase.from('estimates').select('id').eq('job_id', id).maybeSingle(),
    ])

  if (jobRes.error) throw jobRes.error

  return dbRowToJob(jobRes.data as DbJobRow, {
    victims: (victimsRes.data ?? []) as DbVictimRow[],
    comments: (commentsRes.data ?? []) as DbCommentRow[],
    photos: (photosRes.data ?? []) as DbPhotoRow[],
    documents: (docsRes.data ?? []) as DbDocumentRow[],
    areaCalculations: (areasRes.data ?? []) as DbAreaCalcRow[],
    hasFloorPlan: !!floorPlanRes.data,
    hasEstimate: !!estimateRes.data,
  })
}

// ============================================================
// 생성
// ============================================================

export async function createJob(
  data: {
    receivedDate: string
    insurer: string
    accidentNo: string
    policyNo: string
    claimType: ClaimType
    reviewer: string
    reviewerPhone: string
    adjuster: string
    adjusterPhone: string
    insured: string
    insuredPhone: string
    address: string
    notes: string
    orgId?: string
    createdBy?: string
  },
  victims: { name: string; phone: string }[],
): Promise<string> {
  const row = jobToInsertRow(data)
  const { data: jobData, error: jobError } = await supabase
    .from('jobs')
    .insert(row)
    .select('id')
    .single()

  if (jobError) throw jobError

  const jobId = jobData.id as string

  if (victims.length > 0) {
    const victimRows = victims.map((v, i) => ({
      job_id: jobId,
      name: v.name,
      phone: v.phone,
      sort_order: i,
    }))
    const { error: vError } = await supabase.from('victims').insert(victimRows)
    if (vError) throw vError
  }

  return jobId
}

// ============================================================
// 수정
// ============================================================

export async function updateJob(
  id: string,
  updates: Partial<{
    receivedDate: string
    insurer: string
    accidentNo: string
    policyNo: string
    claimType: ClaimType
    reviewer: string
    reviewerPhone: string
    adjuster: string
    adjusterPhone: string
    insured: string
    insuredPhone: string
    address: string
    notes: string
    dailyChecked: boolean
  }>,
): Promise<void> {
  const dbUpdates: Record<string, unknown> = {}
  if (updates.receivedDate !== undefined) dbUpdates.received_date = updates.receivedDate
  if (updates.insurer !== undefined) dbUpdates.insurer = updates.insurer
  if (updates.accidentNo !== undefined) dbUpdates.accident_no = updates.accidentNo
  if (updates.policyNo !== undefined) dbUpdates.policy_no = updates.policyNo
  if (updates.claimType !== undefined) dbUpdates.claim_type = updates.claimType
  if (updates.reviewer !== undefined) dbUpdates.reviewer = updates.reviewer
  if (updates.reviewerPhone !== undefined) dbUpdates.reviewer_phone = updates.reviewerPhone
  if (updates.adjuster !== undefined) dbUpdates.adjuster = updates.adjuster
  if (updates.adjusterPhone !== undefined) dbUpdates.adjuster_phone = updates.adjusterPhone
  if (updates.insured !== undefined) dbUpdates.insured = updates.insured
  if (updates.insuredPhone !== undefined) dbUpdates.insured_phone = updates.insuredPhone
  if (updates.address !== undefined) dbUpdates.address = updates.address
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes
  if (updates.dailyChecked !== undefined) dbUpdates.daily_checked = updates.dailyChecked

  const { error } = await supabase.from('jobs').update(dbUpdates).eq('id', id)
  if (error) throw error
}

// ============================================================
// 단계 변경
// ============================================================

export async function updateStage(id: string, newStage: Stage): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .update({ stage: newStage })
    .eq('id', id)
  if (error) throw error
}

// ============================================================
// 금액 업데이트
// ============================================================

export async function updateJobFinance(
  id: string,
  data: {
    estimateAmount?: number
    depositAmount?: number
    depositDate?: string | null
  },
): Promise<void> {
  const updates: Record<string, unknown> = {}
  if (data.estimateAmount !== undefined) updates.estimate_amount = data.estimateAmount
  if (data.depositAmount !== undefined) updates.deposit_amount = data.depositAmount
  if (data.depositDate !== undefined) updates.deposit_date = data.depositDate
  const { error } = await supabase.from('jobs').update(updates).eq('id', id)
  if (error) throw error
}

// ============================================================
// 삭제
// ============================================================

export async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase.from('jobs').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// Stage 카운트 (사이드바용)
// ============================================================

export async function getStageCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('jobs').select('stage')
  if (error) throw error

  const counts: Record<string, number> = { all: 0 }
  for (const row of data ?? []) {
    counts.all++
    counts[row.stage] = (counts[row.stage] || 0) + 1
  }
  return counts
}
