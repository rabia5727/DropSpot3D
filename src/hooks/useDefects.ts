import { useCallback, useEffect, useState } from 'react'
import { fetchHistory } from '../lib/defects'
import type { Defect } from '../lib/types'

export function useDefects(productId: string | null) {
  const [defects, setDefects] = useState<Defect[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    try {
      const rows = await fetchHistory(productId)
      setDefects(rows)
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    refetch()
    window.addEventListener('linecheck:changed', refetch)
    return () => window.removeEventListener('linecheck:changed', refetch)
  }, [refetch])

  return { defects, loading, refetch }
}
