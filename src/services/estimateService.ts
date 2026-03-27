import { supabase } from '../lib/supabase'
import type { Estimate, EstimateItem, BizProfile } from '../types'

// ============================================================
// DB row types
// ============================================================

type DbEstimateRow = {
  id: string
  job_id: string
  address_label: string
  estimate_date: string
  vat_type: string
  mgmt_rate: number
  profit_rate: number
  rounding_target: number
  created_at: string
  updated_at: string
}

type DbEstimateItemRow = {
  id: string
  estimate_id: string
  section: string
  item_type: string
  description: string
  code_name: string
  code_item_id: string | null
  unit: string
  quantity: number
  unit_price: number
  amount: number
  note: string
  sort_order: number
}

// ============================================================
// 변환
// ============================================================

function toEstimate(row: DbEstimateRow, items: DbEstimateItemRow[]): Estimate {
  return {
    id: row.id,
    jobId: row.job_id,
    addressLabel: row.address_label,
    estimateDate: row.estimate_date,
    vatType: row.vat_type,
    mgmtRate: Number(row.mgmt_rate),
    profitRate: Number(row.profit_rate),
    roundingTarget: Number(row.rounding_target),
    items: items.map(toItem),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toItem(row: DbEstimateItemRow): EstimateItem {
  return {
    id: row.id,
    section: row.section,
    itemType: row.item_type as EstimateItem['itemType'],
    description: row.description,
    codeName: row.code_name,
    codeItemId: row.code_item_id,
    unit: row.unit,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    amount: Number(row.amount),
    note: row.note,
    sortOrder: row.sort_order,
  }
}

// ============================================================
// CRUD
// ============================================================

export async function getEstimate(jobId: string): Promise<Estimate | null> {
  const { data: est, error } = await supabase
    .from('estimates')
    .select('*')
    .eq('job_id', jobId)
    .maybeSingle()
  if (error) throw error
  if (!est) return null

  const { data: items, error: itemsErr } = await supabase
    .from('estimate_items')
    .select('*')
    .eq('estimate_id', est.id)
    .order('sort_order')
  if (itemsErr) throw itemsErr

  return toEstimate(est as DbEstimateRow, (items ?? []) as DbEstimateItemRow[])
}

export async function saveEstimate(
  jobId: string,
  header: {
    addressLabel: string
    estimateDate: string
    vatType: string
    mgmtRate: number
    profitRate: number
    roundingTarget: number
  },
  items: Omit<EstimateItem, 'id'>[],
): Promise<string> {
  // 기존 견적서 삭제 후 재생성
  const existing = await getEstimate(jobId)
  if (existing) {
    await supabase.from('estimate_items').delete().eq('estimate_id', existing.id)
    await supabase.from('estimates').delete().eq('id', existing.id)
  }

  const { data, error } = await supabase
    .from('estimates')
    .insert({
      job_id: jobId,
      address_label: header.addressLabel,
      estimate_date: header.estimateDate,
      vat_type: header.vatType,
      mgmt_rate: header.mgmtRate,
      profit_rate: header.profitRate,
      rounding_target: header.roundingTarget,
    })
    .select('id')
    .single()
  if (error) throw error

  const estId = data.id as string

  if (items.length > 0) {
    const rows = items.map((item, i) => ({
      estimate_id: estId,
      section: item.section,
      item_type: item.itemType,
      description: item.description,
      code_name: item.codeName,
      code_item_id: item.codeItemId,
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      amount: item.amount,
      note: item.note,
      sort_order: i,
    }))
    const { error: itemsErr } = await supabase.from('estimate_items').insert(rows)
    if (itemsErr) throw itemsErr
  }

  return estId
}

// ============================================================
// 사업자 정보
// ============================================================

export async function getBizProfile(userId: string): Promise<BizProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('biz_registration_no, biz_name, biz_ceo, biz_address, biz_phone')
    .eq('id', userId)
    .single()
  if (error) throw error
  return {
    bizRegistrationNo: data.biz_registration_no ?? '',
    bizName: data.biz_name ?? '',
    bizCeo: data.biz_ceo ?? '',
    bizAddress: data.biz_address ?? '',
    bizPhone: data.biz_phone ?? '',
  }
}

export async function updateBizProfile(
  userId: string,
  biz: BizProfile,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      biz_registration_no: biz.bizRegistrationNo,
      biz_name: biz.bizName,
      biz_ceo: biz.bizCeo,
      biz_address: biz.bizAddress,
      biz_phone: biz.bizPhone,
    })
    .eq('id', userId)
  if (error) throw error
}
