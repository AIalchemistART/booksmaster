import type { Transaction, Receipt } from '@/types'
import { calculateVerificationLevel } from './duplicate-detection'

export interface ConfidenceMetrics {
  overallScore: number // 0-100
  breakdown: {
    verificationQuality: number // 0-100
    userValidation: number // 0-100
    documentationCoverage: number // 0-100
    duplicatePrevention: number // 0-100
  }
  strengths: string[]
  improvements: string[]
}

/**
 * Calculate comprehensive AI confidence score based on:
 * - Income verification levels
 * - User validation rates
 * - Receipt coverage
 * - Duplicate prevention effectiveness
 */
export function calculateAIConfidenceScore(
  transactions: Transaction[],
  receipts: Receipt[]
): ConfidenceMetrics {
  const incomeTransactions = transactions.filter(t => t.type === 'income' && !t.isDuplicateOfLinked)
  const allTransactions = transactions.filter(t => !t.isDuplicateOfLinked)
  
  // 1. Verification Quality Score (40% weight)
  const verificationScore = calculateVerificationScore(incomeTransactions)
  
  // 2. User Validation Score (30% weight)
  const validationScore = calculateValidationScore(allTransactions, receipts)
  
  // 3. Documentation Coverage Score (20% weight)
  const documentationScore = calculateDocumentationScore(allTransactions, receipts)
  
  // 4. Duplicate Prevention Score (10% weight)
  const duplicatePreventionScore = calculateDuplicatePreventionScore(transactions)
  
  // Weighted overall score
  const overallScore = Math.round(
    verificationScore * 0.40 +
    validationScore * 0.30 +
    documentationScore * 0.20 +
    duplicatePreventionScore * 0.10
  )
  
  // Generate insights
  const strengths: string[] = []
  const improvements: string[] = []
  
  if (verificationScore >= 85) strengths.push('Excellent income verification (85%+ strong/bank)')
  else if (verificationScore >= 70) strengths.push('Good income verification')
  else improvements.push('Link more check-to-deposit pairs for stronger verification')
  
  if (validationScore >= 90) strengths.push('Outstanding user validation rate (90%+)')
  else if (validationScore >= 75) strengths.push('Solid user validation rate')
  else improvements.push('Validate more transactions/receipts to improve AI accuracy')
  
  if (documentationScore >= 80) strengths.push('Strong receipt coverage')
  else improvements.push('Attach receipts to more transactions for audit readiness')
  
  if (duplicatePreventionScore >= 90) strengths.push('Effective duplicate prevention')
  else if (duplicatePreventionScore < 70) improvements.push('Review potential duplicates in reconciliation')
  
  return {
    overallScore,
    breakdown: {
      verificationQuality: verificationScore,
      userValidation: validationScore,
      documentationCoverage: documentationScore,
      duplicatePrevention: duplicatePreventionScore
    },
    strengths,
    improvements
  }
}

/**
 * Score based on income verification levels
 * Strong: 100 points, Bank: 70 points, Self: 30 points
 */
function calculateVerificationScore(incomeTransactions: Transaction[]): number {
  if (incomeTransactions.length === 0) return 100 // No income = perfect by default
  
  let totalPoints = 0
  let maxPoints = 0
  
  incomeTransactions.forEach(t => {
    const level = t.verificationLevel || calculateVerificationLevel(t)
    maxPoints += 100
    
    if (level === 'strong') totalPoints += 100
    else if (level === 'bank') totalPoints += 70
    else totalPoints += 30 // self_reported
  })
  
  return Math.round((totalPoints / maxPoints) * 100)
}

/**
 * Score based on percentage of validated transactions and receipts
 */
function calculateValidationScore(transactions: Transaction[], receipts: Receipt[]): number {
  if (transactions.length === 0 && receipts.length === 0) return 100
  
  const validatedTransactions = transactions.filter(t => t.userValidated).length
  const validatedReceipts = receipts.filter(r => r.userValidated).length
  
  const totalItems = transactions.length + receipts.length
  const validatedItems = validatedTransactions + validatedReceipts
  
  // Weighting: Each validated item adds to score
  // Goal: 75%+ validation rate for good score
  const validationRate = (validatedItems / totalItems) * 100
  
  return Math.round(validationRate)
}

/**
 * Score based on receipt attachment coverage
 */
function calculateDocumentationScore(transactions: Transaction[], receipts: Receipt[]): number {
  if (transactions.length === 0) return 100
  
  const transactionsWithReceipts = transactions.filter(t => t.receiptId).length
  const coverage = (transactionsWithReceipts / transactions.length) * 100
  
  // Bonus for receipt quality
  const highQualityReceipts = receipts.filter(r => 
    r.userValidated && !r.ocrFailed && r.ocrAmount
  ).length
  
  const qualityBonus = receipts.length > 0 
    ? (highQualityReceipts / receipts.length) * 10 
    : 0
  
  return Math.min(100, Math.round(coverage + qualityBonus))
}

/**
 * Score based on duplicate detection effectiveness
 */
function calculateDuplicatePreventionScore(transactions: Transaction[]): number {
  const incomeTransactions = transactions.filter(t => t.type === 'income')
  if (incomeTransactions.length === 0) return 100
  
  const linkedPairs = incomeTransactions.filter(t => 
    t.linkedTransactionId && !t.isDuplicateOfLinked
  ).length
  
  const excludedDuplicates = incomeTransactions.filter(t => 
    t.isDuplicateOfLinked
  ).length
  
  // If no links exist, check for potential issues
  const checkDeposits = incomeTransactions.filter(t => 
    t.incomeSource === 'check' || t.incomeSource === 'deposit'
  ).length
  
  if (linkedPairs > 0) {
    // Active linking = good score
    // More links relative to potential duplicates = better
    const effectivenessRatio = linkedPairs / (checkDeposits || 1)
    return Math.min(100, Math.round(70 + (effectivenessRatio * 30)))
  } else if (checkDeposits > 5) {
    // Many check/deposits but no links = potential issue
    return 50
  } else {
    // Few check/deposits, no links needed
    return 90
  }
}

/**
 * Get confidence level label
 */
export function getConfidenceLevel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 60) return 'Fair'
  return 'Needs Improvement'
}

/**
 * Get confidence color classes
 */
export function getConfidenceColor(score: number): string {
  if (score >= 90) return 'text-green-600 dark:text-green-400'
  if (score >= 75) return 'text-blue-600 dark:text-blue-400'
  if (score >= 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}
