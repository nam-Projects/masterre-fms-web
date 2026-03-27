import { useState } from 'react'
import { STAGES, STAGE_LABELS, STAGE_COLORS } from '../../types'
import type { Stage, Job } from '../../types'
import { getStageConditions, canManualTransition } from '../../hooks/useStageValidation'

type Props = {
  job: Job
  onStageChange: (newStage: Stage) => Promise<void>
  onFinanceUpdate?: (data: { estimateAmount?: number; depositAmount?: number; depositDate?: string | null }) => Promise<void>
}

export default function StageTransition({ job, onStageChange, onFinanceUpdate }: Props) {
  const currentIndex = STAGES.indexOf(job.stage)
  const conditions = getStageConditions(job)

  return (
    <div className="stage-transition">
      <div className="stage-transition-header">
        <h3>단계 진행</h3>
        {currentIndex > 0 && (
          <button
            className="btn-stage-revert"
            onClick={() => onStageChange(STAGES[currentIndex - 1])}
          >
            이전단계로 되돌리기
          </button>
        )}
      </div>

      <div className="stage-track">
        {STAGES.map((s, i) => (
          <div
            key={s}
            className={`stage-step ${i <= currentIndex ? 'done' : ''} ${i === currentIndex ? 'current' : ''}`}
            style={
              i <= currentIndex
                ? { borderColor: STAGE_COLORS[s], color: STAGE_COLORS[s] }
                : undefined
            }
          >
            <div
              className="stage-step-dot"
              style={
                i <= currentIndex ? { background: STAGE_COLORS[s] } : undefined
              }
            />
            <span className="stage-step-label">{STAGE_LABELS[s]}</span>
          </div>
        ))}
      </div>

      {conditions.length > 0 && (
        <div className="stage-conditions">
          <h4>전환 조건</h4>
          <ul className="stage-condition-list">
            {conditions.map((c, i) => (
              <li key={i} className={`stage-condition ${c.met ? 'met' : 'unmet'}`}>
                <span className="condition-icon">{c.met ? '\u2713' : '\u2717'}</span>
                <span className="condition-label">{c.label}</span>
                <span className="condition-badge">{c.required ? '필수' : '선택'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <StageActions
        job={job}
        onStageChange={onStageChange}
        onFinanceUpdate={onFinanceUpdate}
      />
    </div>
  )
}

function StageActions({
  job,
  onStageChange,
  onFinanceUpdate,
}: {
  job: Job
  onStageChange: (stage: Stage) => Promise<void>
  onFinanceUpdate?: (data: { estimateAmount?: number; depositAmount?: number; depositDate?: string | null }) => Promise<void>
}) {
  switch (job.stage) {
    case 'new_site':
      return (
        <div className="stage-action-info">
          현장 사진을 업로드하면 자동으로 <strong>현장조사</strong> 단계로 전환됩니다.
        </div>
      )

    case 'site_survey':
      return (
        <div className="stage-action-info">
          피해복구면적 산출표를 작성하고 평면도를 업로드하면 자동으로 <strong>견적서</strong> 단계로 전환됩니다.
        </div>
      )

    case 'estimate':
      return <EstimateActions job={job} onStageChange={onStageChange} />

    case 'restoration':
      return <RestorationActions job={job} onStageChange={onStageChange} />

    case 'completed':
      return (
        <div className="stage-action-buttons">
          <button
            className="btn-stage-action primary"
            onClick={() => onStageChange('claiming')}
          >
            보험사 보험금 지급요청 완료
          </button>
        </div>
      )

    case 'claiming':
      return <ClaimingActions job={job} onStageChange={onStageChange} onFinanceUpdate={onFinanceUpdate} />

    case 'closed':
      return (
        <div className="stage-action-info complete">
          이 건은 <strong>종결</strong>되었습니다.
        </div>
      )

    default:
      return null
  }
}

function EstimateActions({ job, onStageChange }: { job: Job; onStageChange: (stage: Stage) => Promise<void> }) {
  return (
    <div className="stage-action-buttons">
      <button
        className="btn-stage-action secondary"
        onClick={() => onStageChange('restoration')}
      >
        견적서 생략
      </button>
      <button
        className={`btn-stage-action primary ${!job.hasEstimate ? 'disabled' : ''}`}
        onClick={() => job.hasEstimate && onStageChange('restoration')}
        disabled={!job.hasEstimate}
        title={!job.hasEstimate ? '견적서를 먼저 작성해주세요' : undefined}
      >
        공사승인 완료
      </button>
    </div>
  )
}

function RestorationActions({ job, onStageChange }: { job: Job; onStageChange: (stage: Stage) => Promise<void> }) {
  const canComplete = canManualTransition(job)

  return (
    <div className="stage-action-buttons">
      <button
        className={`btn-stage-action primary ${!canComplete ? 'disabled' : ''}`}
        onClick={() => canComplete && onStageChange('completed')}
        disabled={!canComplete}
        title={!canComplete ? '공사전/중/후 사진을 모두 업로드해주세요' : undefined}
      >
        공사완료
      </button>
    </div>
  )
}

function ClaimingActions({
  job,
  onStageChange,
  onFinanceUpdate,
}: {
  job: Job
  onStageChange: (stage: Stage) => Promise<void>
  onFinanceUpdate?: (data: { estimateAmount?: number; depositAmount?: number; depositDate?: string | null }) => Promise<void>
}) {
  const [estimateAmount, setEstimateAmount] = useState(job.estimateAmount || 0)
  const [depositAmount, setDepositAmount] = useState(job.depositAmount || 0)
  const [depositDate, setDepositDate] = useState(job.depositDate || '')
  const [saving, setSaving] = useState(false)

  const balance = estimateAmount - depositAmount

  const handleSave = async () => {
    if (!onFinanceUpdate) return
    setSaving(true)
    try {
      await onFinanceUpdate({
        estimateAmount,
        depositAmount,
        depositDate: depositDate || null,
      })
      if (balance === 0 && estimateAmount > 0) {
        await onStageChange('closed')
      }
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  return (
    <div className="stage-claiming-form">
      <div className="claiming-row">
        <label>견적금액</label>
        <input
          type="number"
          value={estimateAmount || ''}
          onChange={e => setEstimateAmount(Number(e.target.value))}
          placeholder="0"
        />
        <span className="claiming-unit">원</span>
      </div>
      <div className="claiming-row">
        <label>입금액</label>
        <input
          type="number"
          value={depositAmount || ''}
          onChange={e => setDepositAmount(Number(e.target.value))}
          placeholder="0"
        />
        <span className="claiming-unit">원</span>
      </div>
      <div className="claiming-row">
        <label>입금일자</label>
        <input
          type="date"
          value={depositDate}
          onChange={e => setDepositDate(e.target.value)}
        />
      </div>
      <div className="claiming-row claiming-balance">
        <label>잔액</label>
        <span className={`claiming-balance-value ${balance === 0 && estimateAmount > 0 ? 'zero' : ''}`}>
          {balance.toLocaleString()}원
        </span>
      </div>
      {balance === 0 && estimateAmount > 0 && (
        <div className="claiming-auto-note">
          잔액이 0원입니다. 저장 시 자동으로 종결 처리됩니다.
        </div>
      )}
      <button
        className="btn-stage-action primary"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  )
}
