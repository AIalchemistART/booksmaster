/**
 * Payment Type Learning System
 * 
 * Learns card payment types (Credit vs Debit) from user corrections.
 * When a user manually corrects "Card" to "Credit" or "Debit" for a specific
 * card number, we store that association and apply it to future receipts.
 * 
 * Mappings are persisted to the file system in ai-learning/card-payment-mappings.json
 */

import { saveCardPaymentMappingsToFileSystem, loadCardPaymentMappingsFromFileSystem } from './file-system-adapter'
import type { CardPaymentTypeMapping } from '@/types'

/**
 * Get all learned card payment type mappings
 */
export async function getCardPaymentTypeMappings(): Promise<CardPaymentTypeMapping[]> {
  try {
    return await loadCardPaymentMappingsFromFileSystem()
  } catch (error) {
    console.error('[PAYMENT LEARNING] Failed to load mappings:', error)
    return []
  }
}

/**
 * Learn a card's payment type from user correction
 */
export async function learnCardPaymentType(
  cardLastFour: string,
  paymentType: 'Credit' | 'Debit',
  context: {
    receiptId: string
    vendor: string
    amount: number
  }
): Promise<void> {
  const mappings = await getCardPaymentTypeMappings()
  const existing = mappings.find(m => m.cardLastFour === cardLastFour)
  
  if (existing) {
    // Update existing mapping
    if (existing.paymentType === paymentType) {
      // Confirm existing knowledge
      existing.timesConfirmed++
      existing.confidence = Math.min(1.0, existing.confidence + 0.1)
      console.log(`[PAYMENT LEARNING] Confirmed card *${cardLastFour} is ${paymentType} (confidence: ${existing.confidence.toFixed(2)})`)
    } else {
      // User changed their mind - update the mapping
      existing.paymentType = paymentType
      existing.learnedAt = new Date().toISOString()
      existing.learnedFrom = context
      existing.confidence = 0.7 // Reset confidence but higher than initial
      existing.timesConfirmed = 1
      console.log(`[PAYMENT LEARNING] Updated card *${cardLastFour} from ${existing.paymentType} to ${paymentType}`)
    }
  } else {
    // Learn new mapping
    mappings.push({
      cardLastFour,
      paymentType,
      learnedAt: new Date().toISOString(),
      learnedFrom: context,
      confidence: 0.8, // Initial confidence
      timesConfirmed: 1
    })
    console.log(`[PAYMENT LEARNING] Learned card *${cardLastFour} is ${paymentType}`)
  }
  
  // Save updated mappings to file system
  try {
    await saveCardPaymentMappingsToFileSystem(mappings)
  } catch (error) {
    console.error('[PAYMENT LEARNING] Failed to save mappings:', error)
  }
}

/**
 * Look up learned payment type for a card
 */
export async function lookupCardPaymentType(cardLastFour: string | undefined): Promise<{
  paymentType: 'Credit' | 'Debit'
  confidence: number
} | null> {
  if (!cardLastFour) return null
  
  const mappings = await getCardPaymentTypeMappings()
  const mapping = mappings.find(m => m.cardLastFour === cardLastFour)
  
  if (mapping) {
    console.log(`[PAYMENT LEARNING] Found learned type for card *${cardLastFour}: ${mapping.paymentType} (confidence: ${mapping.confidence.toFixed(2)})`)
    return {
      paymentType: mapping.paymentType,
      confidence: mapping.confidence
    }
  }
  
  return null
}

/**
 * Get statistics about learned card types
 */
export async function getPaymentLearningStats() {
  const mappings = await getCardPaymentTypeMappings()
  return {
    totalCards: mappings.length,
    creditCards: mappings.filter(m => m.paymentType === 'Credit').length,
    debitCards: mappings.filter(m => m.paymentType === 'Debit').length,
    averageConfidence: mappings.reduce((sum, m) => sum + m.confidence, 0) / Math.max(mappings.length, 1),
    highConfidenceCards: mappings.filter(m => m.confidence >= 0.9).length
  }
}
