import { useState, useEffect, useCallback } from 'react'
import type { Job } from '../types'
import { getJobWithRelations } from '../services/jobService'

export function useJob(jobId: string | undefined) {
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!jobId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getJobWithRelations(jobId)
      setJob(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '작업을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { job, loading, error, refetch: fetch }
}
