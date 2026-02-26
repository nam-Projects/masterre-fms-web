import { useParams, useNavigate } from 'react-router-dom'
import {
  STAGE_LABELS,
  STAGE_COLORS,
  CLAIM_TYPE_LABELS,
  PHOTO_FOLDER_LABELS,
  STAGES,
} from '../../types'
import type { Stage, PhotoFolder } from '../../types'
import { formatDate } from '../../utils/storage'
import CommentBox from './CommentBox'
import StageTransition from './StageTransition'
import PhotoUploader from './PhotoUploader'
import { useState } from 'react'
import { useJob } from '../../hooks/useJob'
import { updateStage } from '../../services/jobService'
import { addComment } from '../../services/commentService'

const PHOTO_FOLDERS: PhotoFolder[] = [
  'before',
  'during',
  'after',
  'insurance_docs',
  'etc',
]

export default function DetailPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { job, loading, error, refetch } = useJob(jobId)
  const [activePhotoTab, setActivePhotoTab] = useState<PhotoFolder>('before')

  if (loading) {
    return (
      <div className="detail-page">
        <div className="dashboard-empty">
          <div className="loading-spinner" />
          <p>불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="detail-not-found">
        <h2>{error || '작업을 찾을 수 없습니다.'}</h2>
        <button onClick={() => navigate('/')}>목록으로 돌아가기</button>
      </div>
    )
  }

  const handleAddComment = async (text: string, author: string) => {
    await addComment(jobId!, { author, text })
    refetch()
  }

  const handlePrevStage = async () => {
    const idx = STAGES.indexOf(job.stage)
    if (idx > 0) {
      const prevStage = STAGES[idx - 1] as Stage
      await updateStage(jobId!, prevStage)
      await addComment(jobId!, {
        author: '시스템',
        text: `단계 변경: ${STAGE_LABELS[job.stage]} → ${STAGE_LABELS[prevStage]}`,
      })
      refetch()
    }
  }

  const handleNextStage = async () => {
    const idx = STAGES.indexOf(job.stage)
    if (idx < STAGES.length - 1) {
      const nextStage = STAGES[idx + 1] as Stage
      await updateStage(jobId!, nextStage)
      await addComment(jobId!, {
        author: '시스템',
        text: `단계 변경: ${STAGE_LABELS[job.stage]} → ${STAGE_LABELS[nextStage]}`,
      })
      refetch()
    }
  }

  const stageColor = STAGE_COLORS[job.stage]
  const photosInFolder = job.photos.filter((p) => p.folder === activePhotoTab)

  return (
    <div className="detail-page">
      <div className="detail-top-bar">
        <button className="btn-back" onClick={() => navigate('/')}>
          ← 목록
        </button>
        <div
          className="detail-stage-badge"
          style={{ background: stageColor }}
        >
          {STAGE_LABELS[job.stage]}
        </div>
      </div>

      {/* 현장등록 정보 */}
      <section className="detail-card detail-info">
        <h3>현장등록</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">수임일자</span>
            <span className="info-value">{formatDate(job.receivedDate)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">보험사</span>
            <span className="info-value">{job.insurer}</span>
          </div>
          <div className="info-item">
            <span className="info-label">사고번호</span>
            <span className="info-value">{job.accidentNo || '-'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">증권번호</span>
            <span className="info-value">{job.policyNo || '-'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">유형</span>
            <span className="info-value">
              {CLAIM_TYPE_LABELS[job.claimType]}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">심사담당자</span>
            <span className="info-value">
              {job.reviewer || '-'}
              {job.reviewerPhone && ` (${job.reviewerPhone})`}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">손사담당자</span>
            <span className="info-value">
              {job.adjuster || '-'}
              {job.adjusterPhone && ` (${job.adjusterPhone})`}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">피보험자</span>
            <span className="info-value">
              {job.insured}
              {job.insuredPhone && ` (${job.insuredPhone})`}
            </span>
          </div>
          {job.victims.map((v, i) => (
            <div className="info-item" key={i}>
              <span className="info-label">피해자{i + 1}</span>
              <span className="info-value">
                {v.name}
                {v.phone && ` (${v.phone})`}
              </span>
            </div>
          ))}
          <div className="info-item full">
            <span className="info-label">주소</span>
            <span className="info-value">{job.address}</span>
          </div>
          {job.notes && (
            <div className="info-item full">
              <span className="info-label">특이사항</span>
              <span className="info-value highlight">{job.notes}</span>
            </div>
          )}
        </div>
      </section>

      {/* 코멘트 */}
      <section className="detail-card">
        <CommentBox comments={job.comments} onAdd={handleAddComment} />
      </section>

      {/* 현장사진 */}
      <section className="detail-card">
        <h3>현장사진</h3>
        <div className="photo-tabs">
          {PHOTO_FOLDERS.map((f) => {
            const count = job.photos.filter((p) => p.folder === f).length
            return (
              <button
                key={f}
                className={`photo-tab ${activePhotoTab === f ? 'active' : ''}`}
                onClick={() => setActivePhotoTab(f)}
              >
                {PHOTO_FOLDER_LABELS[f]}
                <span className="photo-tab-count">({count})</span>
              </button>
            )
          })}
        </div>
        <PhotoUploader
          jobId={jobId!}
          folder={activePhotoTab}
          photos={photosInFolder}
          onRefresh={refetch}
        />
      </section>

      {/* 하단 문서 버튼 */}
      <section className="detail-card">
        <h3>문서</h3>
        <div className="doc-buttons">
          <button className="doc-btn">
            <span className="doc-btn-label">A</span>
            <span>피해복구면적산출표</span>
          </button>
          <button className="doc-btn">
            <span className="doc-btn-label">B</span>
            <span>평면도</span>
          </button>
          <button className="doc-btn">
            <span className="doc-btn-label">C</span>
            <span>견적서</span>
          </button>
          <button className="doc-btn disabled">
            <span className="doc-btn-label">D</span>
            <span>미정</span>
          </button>
          <button className="doc-btn disabled">
            <span className="doc-btn-label">E</span>
            <span>미정</span>
          </button>
        </div>
      </section>

      {/* 단계 전환 */}
      <section className="detail-card">
        <StageTransition
          currentStage={job.stage}
          onPrev={handlePrevStage}
          onNext={handleNextStage}
        />
      </section>
    </div>
  )
}
