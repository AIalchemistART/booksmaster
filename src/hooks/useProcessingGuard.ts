/**
 * Hook to prevent navigation during active receipt processing
 * This prevents page reloads in production that would destroy processing state
 */

import { useEffect } from 'react'
import { hasActiveProcessing } from '@/lib/global-receipt-processor'

export function useProcessingGuard() {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasActiveProcessing()) {
        // Browser will show confirmation dialog
        e.preventDefault()
        e.returnValue = 'Receipt processing is still in progress. If you leave now, unfinished receipts will be lost.'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])
}
