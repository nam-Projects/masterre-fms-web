import { useState, useEffect, useCallback } from 'react'
import { getStageCounts } from '../services/jobService'

export function useStageCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({ all: 0 })
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const data = await getStageCounts()
      setCounts(data)
    } catch {
      // 실패 시 기본값 유지
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { counts, loading, refetch: fetch }
}
