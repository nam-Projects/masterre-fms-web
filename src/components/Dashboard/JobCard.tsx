import { useNavigate } from 'react-router-dom'
import { STAGE_LABELS, STAGE_COLORS } from '../../types'
import type { Job } from '../../types'

type Props = {
  job: Job
}

export default function JobCard({ job }: Props) {
  const navigate = useNavigate()
  const color = STAGE_COLORS[job.stage]
  const label = STAGE_LABELS[job.stage]

  return (
    <div className="job-card" onClick={() => navigate(`/job/${job.id}`)}>
      <div className="job-card-header" style={{ background: color }}>
        <span className="job-card-stage">{label}</span>
      </div>
      <div className="job-card-body">
        <p className="job-card-insured">
          <span className="job-card-label">피보험자:</span>
          {job.insured}
        </p>
        <p className="job-card-address">
          <span className="job-card-label">주소:</span>
          {job.address}
        </p>
        {job.notes && (
          <p className="job-card-notes">
            <span className="job-card-label">특이사항:</span>
            {job.notes}
          </p>
        )}
      </div>
    </div>
  )
}
