import type {
  Job, Comment, Photo, Document, AreaEntry, Victim,
  Stage, ClaimType, PhotoFolder, DocumentType,
} from '../types'

// ============================================================
// DB Row Types (snake_case — Supabase 테이블 구조)
// ============================================================

export type DbJobRow = {
  id: string
  received_date: string
  insurer: string
  accident_no: string
  policy_no: string
  claim_type: string
  reviewer: string
  reviewer_phone: string
  adjuster: string
  adjuster_phone: string
  insured: string
  insured_phone: string
  address: string
  notes: string
  stage: string
  daily_checked: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  estimate_amount: number
  deposit_amount: number
  deposit_date: string | null
}

export type DbVictimRow = {
  id: string
  job_id: string
  name: string
  phone: string
  sort_order: number
}

export type DbCommentRow = {
  id: string
  job_id: string
  author: string
  text: string
  created_by: string | null
  created_at: string
}

export type DbPhotoRow = {
  id: string
  job_id: string
  folder: string
  name: string
  storage_path: string
  uploaded_by: string
  uploaded_at: string
}

export type DbDocumentRow = {
  id: string
  job_id: string
  doc_type: string
  name: string
  storage_path: string
  uploaded_at: string
}

export type DbAreaCalcRow = {
  id: string
  job_id: string
  room: string
  scope: string
  work_type: string
  damage_width: number
  damage_height: number
  damage_area: number
  restore_width: number
  restore_height: number
  restore_area: number
  note: string
  sort_order: number
}

// ============================================================
// DB → Frontend 변환
// ============================================================

export function dbRowToVictim(row: DbVictimRow): Victim {
  return { name: row.name, phone: row.phone }
}

export function dbRowToComment(row: DbCommentRow): Comment {
  return {
    id: row.id,
    author: row.author,
    text: row.text,
    createdAt: row.created_at,
  }
}

export function dbRowToPhoto(row: DbPhotoRow): Photo {
  return {
    id: row.id,
    folder: row.folder as PhotoFolder,
    name: row.name,
    url: '', // signed URL로 나중에 채워짐
    storagePath: row.storage_path,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by,
  }
}

export function dbRowToDocument(row: DbDocumentRow): Document {
  return {
    id: row.id,
    type: row.doc_type as DocumentType,
    name: row.name,
    url: '', // signed URL로 나중에 채워짐
    storagePath: row.storage_path,
    uploadedAt: row.uploaded_at,
  }
}

export function dbRowToAreaEntry(row: DbAreaCalcRow): AreaEntry {
  return {
    id: row.id,
    room: row.room,
    scope: row.scope,
    workType: row.work_type,
    damageWidth: Number(row.damage_width),
    damageHeight: Number(row.damage_height),
    damageArea: Number(row.damage_area),
    restoreWidth: Number(row.restore_width),
    restoreHeight: Number(row.restore_height),
    restoreArea: Number(row.restore_area),
    note: row.note,
  }
}

export function dbRowToJob(
  row: DbJobRow,
  relations: {
    victims: DbVictimRow[]
    comments: DbCommentRow[]
    photos: DbPhotoRow[]
    documents: DbDocumentRow[]
    areaCalculations: DbAreaCalcRow[]
  },
): Job {
  return {
    id: row.id,
    receivedDate: row.received_date,
    insurer: row.insurer,
    accidentNo: row.accident_no,
    policyNo: row.policy_no,
    claimType: row.claim_type as ClaimType,
    reviewer: row.reviewer,
    reviewerPhone: row.reviewer_phone,
    adjuster: row.adjuster,
    adjusterPhone: row.adjuster_phone,
    insured: row.insured,
    insuredPhone: row.insured_phone,
    address: row.address,
    notes: row.notes,
    stage: row.stage as Stage,
    dailyChecked: row.daily_checked,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    victims: relations.victims.map(dbRowToVictim),
    comments: relations.comments.map(dbRowToComment),
    photos: relations.photos.map(dbRowToPhoto),
    documents: relations.documents.map(dbRowToDocument),
    areaCalculation: relations.areaCalculations.map(dbRowToAreaEntry),
    estimateAmount: Number(row.estimate_amount) || 0,
    depositAmount: Number(row.deposit_amount) || 0,
    depositDate: row.deposit_date,
  }
}

// ============================================================
// Frontend → DB INSERT 변환
// ============================================================

export function jobToInsertRow(data: {
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
  createdBy?: string
}) {
  return {
    received_date: data.receivedDate,
    insurer: data.insurer,
    accident_no: data.accidentNo,
    policy_no: data.policyNo,
    claim_type: data.claimType,
    reviewer: data.reviewer,
    reviewer_phone: data.reviewerPhone,
    adjuster: data.adjuster,
    adjuster_phone: data.adjusterPhone,
    insured: data.insured,
    insured_phone: data.insuredPhone,
    address: data.address,
    notes: data.notes,
    created_by: data.createdBy ?? null,
  }
}

// Job 목록용 (관계 데이터 없이 간단 변환)
export function dbRowToJobSummary(row: DbJobRow): Job {
  return dbRowToJob(row, {
    victims: [],
    comments: [],
    photos: [],
    documents: [],
    areaCalculations: [],
  })
}
