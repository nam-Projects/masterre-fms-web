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
          <div className="empty-icon">📋</div>
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
