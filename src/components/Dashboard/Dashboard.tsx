import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import JobCard from './JobCard'
import type { Stage } from '../../types'
import { useJobs } from '../../hooks/useJobs'

export default function Dashboard() {
  const [searchParams] = useSearchParams()
  const stageFilter = searchParams.get('stage') as Stage | null
  const { jobs, loading, error } = useJobs(stageFilter)

  const sorted = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const aIsClosed = a.stage === 'closed' ? 1 : 0
      const bIsClosed = b.stage === 'closed' ? 1 : 0
      if (aIsClosed !== bIsClosed) return aIsClosed - bIsClosed
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }, [jobs])

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>작업 현황</h1>
        </div>
        <div className="dashboard-empty">
          <div className="loading-spinner" />
          <p>불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>작업 현황</h1>
        </div>
        <div className="dashboard-empty">
          <p className="error-text">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>작업 현황</h1>
        <p className="dashboard-count">
          총 <strong>{sorted.length}</strong>건
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="dashboard-empty">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <p>작업 건이 없습니다.</p>
        </div>
      ) : (
        <div className="dashboard-grid">
          {sorted.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
