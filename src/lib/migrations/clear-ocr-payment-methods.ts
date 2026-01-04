/**
 * Migration: Clear OCR-based payment methods from existing transactions
 * 
 * This migration removes payment methods that came from OCR parsing,
 * keeping only those learned from card number mappings.
 */

import { useStore } from '@/store'
import { lookupCardPaymentType } from '@/lib/payment-type-learning'

export async function migratePaymentMethods() {
  const { transactions, receipts, updateTransaction } = useStore.getState()
  
  let migratedCount = 0
  let keptCount = 0
  
  console.log('[MIGRATION] Starting payment method migration...')
  console.log(`[MIGRATION] Processing ${transactions.length} transactions`)
  
  for (const transaction of transactions) {
    // Skip if no payment method set
    if (!transaction.paymentMethod) {
      continue
    }
    
    // Get linked receipt
    const receipt = transaction.receiptId 
      ? receipts.find(r => r.id === transaction.receiptId)
      : null
    
    // Check if this payment method came from learned card mapping
    let shouldKeep = false
    if (receipt?.ocrCardLastFour) {
      const learned = await lookupCardPaymentType(receipt.ocrCardLastFour)
      if (learned && learned.confidence >= 0.7 && learned.paymentType === transaction.paymentMethod) {
        shouldKeep = true
        keptCount++
      }
    }
    
    // If not from learned mapping, clear it
    if (!shouldKeep) {
      console.log(`[MIGRATION] Clearing OCR payment method "${transaction.paymentMethod}" from transaction ${transaction.id}`)
      updateTransaction(transaction.id, { paymentMethod: undefined })
      migratedCount++
    }
  }
  
  console.log(`[MIGRATION] Complete: Cleared ${migratedCount} OCR payment methods, kept ${keptCount} learned mappings`)
  
  return { migratedCount, keptCount }
}
