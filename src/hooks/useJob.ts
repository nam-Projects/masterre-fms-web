import { useState, useEffect, useCallback, useRef } from 'react'
import type { Job } from '../types'
import { getJobWithRelations } from '../services/jobService'

export function useJob(jobId: string | undefined) {
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initialLoad = useRef(true)

  const fetch = useCallback(async () => {
    if (!jobId) {
      setLoading(false)
      return
    }
    // 최초 로드만 loading 표시, refetch 시에는 기존 데이터 유지
    if (initialLoad.current) {
      setLoading(true)
    }
    setError(null)
    try {
      const data = await getJobWithRelations(jobId)
      setJob(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '작업을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
      initialLoad.current = false
    }
  }, [jobId])

  useEffect(() => {
    initialLoad.current = true
    fetch()
  }, [fetch])

  return { job, loading, error, refetch: fetch }
}
