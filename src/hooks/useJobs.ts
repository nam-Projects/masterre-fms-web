import { useState, useEffect, useCallback } from 'react'
import type { Job, Stage } from '../types'
import { listJobs } from '../services/jobService'

export function useJobs(stageFilter?: Stage | null) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listJobs(stageFilter)
      setJobs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [stageFilter])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { jobs, loading, error, refetch: fetch }
}
