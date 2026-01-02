'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { getGlobalReceiptProcessor, hasActiveProcessing } from '@/lib/global-receipt-processor'
import Link from 'next/link'

export function BackgroundProcessingIndicator() {
  const [stats, setStats] = useState({ pending: 0, processing: 0, done: 0, error: 0, total: 0 })
  const [isVisible, setIsVisible] = useState(false)
  const [completionTimestamp, setCompletionTimestamp] = useState<number | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      const processor = getGlobalReceiptProcessor()
      
      // Clean up any stalled receipts that have been stuck in processing
      processor.cleanupStalledReceipts()
      
      const currentStats = processor.getStats()
      
      // Update stats if there's work or if we recently had work
      if (currentStats.total > 0) {
        setStats(currentStats)
        
        const isActive = currentStats.processing > 0 || currentStats.pending > 0
        
        if (isActive) {
          setIsVisible(true)
          setCompletionTimestamp(null) // Reset completion timestamp while processing
        } else {
          // All done or failed - mark completion time
          if (completionTimestamp === null) {
            setCompletionTimestamp(Date.now())
          } else if (Date.now() - completionTimestamp > 3000) {
            // Hide after 3 seconds of completion
            setIsVisible(false)
            setCompletionTimestamp(null)
          }
        }
      }
    }, 500) // Check every 500ms

    return () => clearInterval(interval)
  }, [completionTimestamp])

  if (!isVisible || stats.total === 0) {
    return null
  }

  const isProcessing = stats.processing > 0 || stats.pending > 0

  return (
    <Link href="/receipts">
      <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border-2 cursor-pointer transition-all hover:scale-105 ${
        isProcessing 
          ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800' 
          : 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800'
      }`}>
        <div className="flex items-center gap-3">
          {isProcessing ? (
            <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          )}
          
          <div className="text-sm">
            <p className={`font-semibold ${
              isProcessing 
                ? 'text-blue-900 dark:text-blue-100' 
                : 'text-green-900 dark:text-green-100'
            }`}>
              {isProcessing ? 'Processing Receipts...' : 'Processing Complete!'}
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mt-1">
              {stats.processing > 0 && (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {stats.processing} processing
                </span>
              )}
              {stats.pending > 0 && (
                <span>{stats.pending} pending</span>
              )}
              {stats.done > 0 && (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {stats.done} done
                </span>
              )}
              {stats.error > 0 && (
                <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {stats.error} failed
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
