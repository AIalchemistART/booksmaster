/**
 * Global singleton receipt processor that continues running in background
 * even when user navigates away from the receipts page
 */

import { ReceiptProcessorQueue, ProcessingOptions, ProcessedReceipt } from './receipt-processor'
import { useStore } from '@/store'
import type { Receipt } from '@/types'

// Singleton instance
let globalProcessor: ReceiptProcessorQueue | null = null

// Helper to generate IDs (matches pattern in receipts page)
function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

/**
 * Note: Auto-save is disabled to prevent duplicate receipts.
 * Receipts are saved when user explicitly clicks "Add Successful to App" button.
 * This gives the user control over which processed receipts to add to the app.
 */

/**
 * Get or create the global processor instance
 */
export function getGlobalReceiptProcessor(): ReceiptProcessorQueue {
  if (!globalProcessor) {
    console.log('[GLOBAL PROCESSOR] Creating new global processor instance')
    globalProcessor = new ReceiptProcessorQueue({
      useSAM: false,
      enhanceContrast: true,
      ocrMode: 'accurate',
    })
    console.log('[GLOBAL PROCESSOR] Processor initialized (auto-save disabled)')
  }
  return globalProcessor
}

/**
 * Check if global processor exists and has active work
 */
export function hasActiveProcessing(): boolean {
  if (!globalProcessor) return false
  return globalProcessor.hasActiveProcessing()
}

/**
 * Get current processing stats (safe to call even if processor doesn't exist)
 */
export function getProcessingStats() {
  if (!globalProcessor) {
    return { pending: 0, processing: 0, done: 0, error: 0, total: 0 }
  }
  return globalProcessor.getStats()
}

/**
 * Reset the global processor (useful for testing or complete reset)
 */
export function resetGlobalProcessor() {
  console.log('[GLOBAL PROCESSOR] Resetting global processor')
  globalProcessor = null
}
