import { useState, useEffect, useCallback } from 'react'
import { getStageCounts } from '../services/jobService'

const STAGE_CHANGE_EVENT = 'stage-counts-refresh'

/** 단계 카운트 새로고침 트리거 (어디서든 호출 가능) */
export function refreshStageCounts() {
  window.dispatchEvent(new Event(STAGE_CHANGE_EVENT))
}

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
    window.addEventListener(STAGE_CHANGE_EVENT, fetch)
    return () => window.removeEventListener(STAGE_CHANGE_EVENT, fetch)
  }, [fetch])

  return { counts, loading, refetch: fetch }
}
