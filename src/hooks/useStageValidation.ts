import type { Job, Stage } from '../types'

export type StageCondition = {
  label: string
  met: boolean
  required: boolean
}

export function getStageConditions(job: Job): StageCondition[] {
  switch (job.stage) {
    case 'new_site':
      return [
        {
          label: '현장 사진 1장 이상 업로드',
          met: job.photos.length > 0,
          required: true,
        },
      ]
    case 'site_survey':
      return [
        {
          label: '피해복구면적 산출표 작성',
          met: job.areaCalculation.length > 0,
          required: true,
        },
        {
          label: '평면도 업로드',
          met: job.documents.some(d => d.type === 'floor_plan'),
          required: true,
        },
      ]
    case 'estimate':
      return [
        {
          label: '견적서 업로드',
          met: job.documents.some(d => d.type === 'estimate_doc'),
          required: false,
        },
      ]
    case 'restoration':
      return [
        {
          label: '공사전 사진',
          met: job.photos.some(p => p.folder === 'before'),
          required: true,
        },
        {
          label: '공사중 사진',
          met: job.photos.some(p => p.folder === 'during'),
          required: true,
        },
        {
          label: '공사후 사진',
          met: job.photos.some(p => p.folder === 'after'),
          required: true,
        },
        {
          label: '보험청구서 및 개인정보 서류',
          met: job.photos.some(p => p.folder === 'insurance_docs'),
          required: false,
        },
      ]
    case 'claiming':
      return [
        {
          label: '잔액 0원',
          met: job.estimateAmount > 0 && job.depositAmount >= job.estimateAmount,
          required: true,
        },
      ]
    default:
      return []
  }
}

export function canAutoTransition(job: Job): { allowed: boolean; nextStage: Stage | null } {
  switch (job.stage) {
    case 'new_site':
      if (job.photos.length > 0) {
        return { allowed: true, nextStage: 'site_survey' }
      }
      break
    case 'site_survey':
      if (
        job.areaCalculation.length > 0 &&
        job.documents.some(d => d.type === 'floor_plan')
      ) {
        return { allowed: true, nextStage: 'estimate' }
      }
      break
    case 'claiming':
      if (job.estimateAmount > 0 && job.depositAmount >= job.estimateAmount) {
        return { allowed: true, nextStage: 'closed' }
      }
      break
  }
  return { allowed: false, nextStage: null }
}

export function canManualTransition(job: Job): boolean {
  switch (job.stage) {
    case 'estimate':
      return true // 공사승인완료 or 견적서 생략
    case 'restoration': {
      const hasBefore = job.photos.some(p => p.folder === 'before')
      const hasDuring = job.photos.some(p => p.folder === 'during')
      const hasAfter = job.photos.some(p => p.folder === 'after')
      return hasBefore && hasDuring && hasAfter
    }
    case 'completed':
      return true
    default:
      return false
  }
}
