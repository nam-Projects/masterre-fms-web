export type Stage =
  | 'new_site'
  | 'site_survey'
  | 'report_writing'
  | 'estimate'
  | 'restoration'
  | 'completed'
  | 'claiming'
  | 'closed'

export type ClaimType = 'injury' | 'property' | 'both'

export type Comment = {
  id: string
  author: string
  text: string
  createdAt: string
}

export type PhotoFolder = 'before' | 'during' | 'after' | 'insurance_docs' | 'etc'

export type Photo = {
  id: string
  folder: PhotoFolder
  name: string
  url: string
  storagePath: string
  uploadedAt: string
  uploadedBy: string
}

export type DocumentType = 'area_calc' | 'floor_plan' | 'estimate_doc' | 'etc'

export type Document = {
  id: string
  type: DocumentType
  name: string
  url: string
  storagePath: string
  uploadedAt: string
}

export type AreaEntry = {
  id: string
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
}

export type Victim = {
  name: string
  phone: string
}

export type Job = {
  id: string
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
  victims: Victim[]
  address: string
  notes: string
  stage: Stage
  comments: Comment[]
  photos: Photo[]
  documents: Document[]
  areaCalculation: AreaEntry[]
  createdAt: string
  updatedAt: string
  dailyChecked: boolean
}

export const STAGES: Stage[] = [
  'new_site',
  'site_survey',
  'report_writing',
  'estimate',
  'restoration',
  'completed',
  'claiming',
  'closed',
]

export const STAGE_LABELS: Record<Stage, string> = {
  new_site: '신규현장',
  site_survey: '현장조사',
  report_writing: '보고서작성',
  estimate: '견적서',
  restoration: '복구공사',
  completed: '공사완료',
  claiming: '청구중',
  closed: '종결',
}

export const STAGE_COLORS: Record<Stage, string> = {
  new_site: '#2196F3',
  site_survey: '#FF9800',
  report_writing: '#9C27B0',
  estimate: '#F44336',
  restoration: '#009688',
  completed: '#4CAF50',
  claiming: '#607D8B',
  closed: '#455A64',
}

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  injury: '손방',
  property: '대물',
  both: '손방+대물',
}

export const PHOTO_FOLDER_LABELS: Record<PhotoFolder, string> = {
  before: '공사전 사진',
  during: '공사중 사진',
  after: '공사후 사진',
  insurance_docs: '보험청구서 및 개인정보 서류',
  etc: '기타',
}

export const INSURERS = [
  '현대해상',
  '삼성화재',
  'DB손해보험',
  'KB손해보험',
  '메리츠화재',
  '한화손해보험',
  'NH농협손해보험',
  '롯데손해보험',
]
