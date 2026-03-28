import { useState } from 'react'
import type { FormEvent } from 'react'
import { INSURERS, CLAIM_TYPE_LABELS } from '../../types'
import type { ClaimType, Victim } from '../../types'
import { createJob } from '../../services/jobService'
import { useAuth } from '../../contexts/AuthContext'

type Props = {
  open: boolean
  onClose: () => void
}

const emptyVictim = (): Victim => ({ name: '', phone: '' })

export default function RegistrationModal({ open, onClose }: Props) {
  const { user, organization } = useAuth()
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [insurer, setInsurer] = useState(INSURERS[0])
  const [customInsurer, setCustomInsurer] = useState('')
  const [useCustomInsurer, setUseCustomInsurer] = useState(false)
  const [accidentNo, setAccidentNo] = useState('')
  const [policyNo, setPolicyNo] = useState('')
  const [claimType, setClaimType] = useState<ClaimType>('both')
  const [reviewer, setReviewer] = useState('')
  const [reviewerPhone, setReviewerPhone] = useState('')
  const [adjuster, setAdjuster] = useState('')
  const [adjusterPhone, setAdjusterPhone] = useState('')
  const [insured, setInsured] = useState('')
  const [insuredPhone, setInsuredPhone] = useState('')
  const [victims, setVictims] = useState<Victim[]>([emptyVictim()])
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const addVictim = () => {
    if (victims.length < 3) setVictims([...victims, emptyVictim()])
  }

  const removeVictim = (i: number) => {
    if (victims.length > 1) setVictims(victims.filter((_, idx) => idx !== i))
  }

  const updateVictim = (i: number, field: keyof Victim, value: string) => {
    setVictims(victims.map((v, idx) => (idx === i ? { ...v, [field]: value } : v)))
  }

  const resetForm = () => {
    setReceivedDate(new Date().toISOString().slice(0, 10))
    setInsurer(INSURERS[0])
    setCustomInsurer('')
    setUseCustomInsurer(false)
    setAccidentNo('')
    setPolicyNo('')
    setClaimType('both')
    setReviewer('')
    setReviewerPhone('')
    setAdjuster('')
    setAdjusterPhone('')
    setInsured('')
    setInsuredPhone('')
    setVictims([emptyVictim()])
    setAddress('')
    setNotes('')
    setError('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await createJob(
        {
          receivedDate,
          insurer: useCustomInsurer ? customInsurer : insurer,
          accidentNo,
          policyNo,
          claimType,
          reviewer,
          reviewerPhone,
          adjuster,
          adjusterPhone,
          insured,
          insuredPhone,
          address,
          notes,
          orgId: organization?.id,
          createdBy: user?.id,
        },
        victims.filter((v) => v.name.trim()),
      )
      resetForm()
      onClose()
      // 페이지 새로고침으로 목록 갱신
      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>현장등록</h2>
          <button className="modal-close" onClick={handleClose}>
            &times;
          </button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>수임일자</label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>보험사</label>
              <div className="insurer-field">
                {useCustomInsurer ? (
                  <input
                    type="text"
                    value={customInsurer}
                    onChange={(e) => setCustomInsurer(e.target.value)}
                    placeholder="보험사명 직접 입력"
                    required
                  />
                ) : (
                  <select
                    value={insurer}
                    onChange={(e) => setInsurer(e.target.value)}
                  >
                    {INSURERS.map((ins) => (
                      <option key={ins} value={ins}>
                        {ins}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  className="btn-small"
                  onClick={() => setUseCustomInsurer(!useCustomInsurer)}
                >
                  {useCustomInsurer ? '목록선택' : '직접입력'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>사고번호</label>
              <input
                type="text"
                value={accidentNo}
                onChange={(e) => setAccidentNo(e.target.value)}
                placeholder="예: 20260203-123456"
              />
            </div>

            <div className="form-group">
              <label>증권번호</label>
              <input
                type="text"
                value={policyNo}
                onChange={(e) => setPolicyNo(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>유형</label>
              <select
                value={claimType}
                onChange={(e) => setClaimType(e.target.value as ClaimType)}
              >
                {(Object.entries(CLAIM_TYPE_LABELS) as [ClaimType, string][]).map(
                  ([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="form-divider" />

            <div className="form-group">
              <label>심사담당자</label>
              <input
                type="text"
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>심사담당자 연락처</label>
              <input
                type="tel"
                value={reviewerPhone}
                onChange={(e) => setReviewerPhone(e.target.value)}
                placeholder="010-0000-0000"
              />
            </div>

            <div className="form-group">
              <label>손사담당자</label>
              <input
                type="text"
                value={adjuster}
                onChange={(e) => setAdjuster(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>손사담당자 연락처</label>
              <input
                type="tel"
                value={adjusterPhone}
                onChange={(e) => setAdjusterPhone(e.target.value)}
                placeholder="010-0000-0000"
              />
            </div>

            <div className="form-divider" />

            <div className="form-group">
              <label>피보험자</label>
              <input
                type="text"
                value={insured}
                onChange={(e) => setInsured(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>피보험자 연락처</label>
              <input
                type="tel"
                value={insuredPhone}
                onChange={(e) => setInsuredPhone(e.target.value)}
                placeholder="010-0000-0000"
              />
            </div>

            <div className="form-divider" />

            {victims.map((v, i) => (
              <div className="form-group-row" key={i}>
                <div className="form-group">
                  <label>
                    피해자{i + 1}
                    {victims.length > 1 && (
                      <button
                        type="button"
                        className="btn-tiny"
                        onClick={() => removeVictim(i)}
                      >
                        삭제
                      </button>
                    )}
                  </label>
                  <input
                    type="text"
                    value={v.name}
                    onChange={(e) => updateVictim(i, 'name', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>피해자{i + 1} 연락처</label>
                  <input
                    type="tel"
                    value={v.phone}
                    onChange={(e) => updateVictim(i, 'phone', e.target.value)}
                    placeholder="010-0000-0000"
                  />
                </div>
              </div>
            ))}
            {victims.length < 3 && (
              <button type="button" className="btn-add-victim" onClick={addVictim}>
                + 피해자 추가
              </button>
            )}

            <div className="form-divider" />

            <div className="form-group full">
              <label>주소</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="인천시 서구 가좌동 ..."
                required
              />
            </div>

            <div className="form-group full">
              <label>특이사항</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="방문 예정일, 특이사항 등"
              />
            </div>
          </div>

          {error && <div className="login-error" style={{ marginTop: 8 }}>{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              취소
            </button>
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
