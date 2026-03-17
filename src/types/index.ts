export type Stage =
  | 'new_site'
  | 'site_survey'
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
  estimateAmount: number
  depositAmount: number
  depositDate: string | null
}

// 코드 관리 타입 (트리 구조)
// area: 산출표 서식 템플릿 (방→천장/벽체/바닥→공종, 욕실→..., 발코니→...)
// area_room: 산출표 장소 목록 (방→전실/거실/..., 욕실→욕실1/..., 발코니→전면발코니1/...)
export type CodeType = 'area' | 'area_room' | 'labor' | 'material'

export type CodeItem = {
  id: string
  codeType: CodeType
  parentId: string | null
  name: string
  rate: number | null
  unit: string
  sortOrder: number
  children?: CodeItem[]
}

export const CODE_TYPE_LABELS: Record<CodeType, string> = {
  area: '산출표 서식',
  area_room: '산출표 장소',
  labor: '인건비 코드',
  material: '자재비 코드',
}

export const STAGES: Stage[] = [
  'new_site',
  'site_survey',
  'estimate',
  'restoration',
  'completed',
  'claiming',
  'closed',
]

export const STAGE_LABELS: Record<Stage, string> = {
  new_site: '신규현장',
  site_survey: '현장조사',
  estimate: '견적서',
  restoration: '복구공사',
  completed: '공사완료',
  claiming: '청구중',
  closed: '종결',
}

export const STAGE_COLORS: Record<Stage, string> = {
  new_site: '#2196F3',
  site_survey: '#FF9800',
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
