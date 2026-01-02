import type { Transaction } from '@/types'

export interface PotentialDuplicate {
  transaction: Transaction
  matchScore: number // 0-100, higher = more likely duplicate
  matchReasons: string[]
}

/**
 * Find potential duplicate income transactions (check + deposit of same check)
 * 
 * Matching criteria:
 * - Both are income transactions
 * - Similar amounts (within tolerance)
 * - Date proximity (deposit typically 1-5 business days after check)
 * - Not already linked to each other
 */
export function findPotentialDuplicates(
  transaction: Transaction,
  allTransactions: Transaction[],
  options: {
    amountTolerance?: number // Default: $50
    maxDaysBetween?: number // Default: 5 business days (7 calendar days)
  } = {}
): PotentialDuplicate[] {
  const { amountTolerance = 50, maxDaysBetween = 7 } = options
  
  // Only check income transactions
  if (transaction.type !== 'income') {
    return []
  }
  
  const transactionDate = new Date(transaction.date)
  const potentialDuplicates: PotentialDuplicate[] = []
  
  for (const otherTransaction of allTransactions) {
    // Skip self
    if (otherTransaction.id === transaction.id) continue
    
    // Skip if already linked
    if (transaction.linkedTransactionId === otherTransaction.id || 
        otherTransaction.linkedTransactionId === transaction.id) continue
    
    // Only check income
    if (otherTransaction.type !== 'income') continue
    
    const otherDate = new Date(otherTransaction.date)
    const daysDiff = Math.abs((transactionDate.getTime() - otherDate.getTime()) / (1000 * 60 * 60 * 24))
    const amountDiff = Math.abs(transaction.amount - otherTransaction.amount)
    
    const matchReasons: string[] = []
    let matchScore = 0
    
    // Amount matching (most important)
    if (amountDiff === 0) {
      matchScore += 50
      matchReasons.push('Exact amount match')
    } else if (amountDiff <= amountTolerance) {
      matchScore += 40 - (amountDiff / amountTolerance) * 10
      matchReasons.push(`Similar amount (within $${amountDiff.toFixed(2)})`)
    } else {
      continue // Amount too different, not a duplicate candidate
    }
    
    // Date proximity
    if (daysDiff <= maxDaysBetween) {
      matchScore += 30 - (daysDiff / maxDaysBetween) * 10
      matchReasons.push(`${Math.round(daysDiff)} day${daysDiff !== 1 ? 's' : ''} apart`)
    } else {
      continue // Too far apart in time
    }
    
    // Income source patterns
    const isCheckAndDeposit = (
      (transaction.incomeSource === 'check' && otherTransaction.incomeSource === 'deposit') ||
      (transaction.incomeSource === 'deposit' && otherTransaction.incomeSource === 'check')
    )
    
    if (isCheckAndDeposit) {
      matchScore += 20
      matchReasons.push('Check + Deposit pair')
    }
    
    // Both cash or both deposit (also suspicious)
    if (transaction.incomeSource === 'deposit' && otherTransaction.incomeSource === 'deposit') {
      matchScore += 10
      matchReasons.push('Both marked as deposits')
    }
    
    // If we have a decent match, add to results
    if (matchScore >= 50) {
      potentialDuplicates.push({
        transaction: otherTransaction,
        matchScore,
        matchReasons
      })
    }
  }
  
  // Sort by match score (highest first)
  return potentialDuplicates.sort((a, b) => b.matchScore - a.matchScore)
}

/**
 * Get duplicate warning message for UI display
 */
export function getDuplicateWarningMessage(duplicates: PotentialDuplicate[]): string {
  if (duplicates.length === 0) return ''
  
  const topMatch = duplicates[0]
  
  if (topMatch.matchScore >= 80) {
    return `⚠️ High probability duplicate: ${topMatch.matchReasons.join(', ')}`
  } else if (topMatch.matchScore >= 60) {
    return `⚠️ Possible duplicate: ${topMatch.matchReasons.join(', ')}`
  } else {
    return `💡 Similar transaction found: ${topMatch.matchReasons.join(', ')}`
  }
}

/**
 * Link two transactions as check/deposit pair to prevent double-counting
 * Marks one as the duplicate and sets verification level
 */
export function linkTransactions(
  primaryTransactionId: string,
  duplicateTransactionId: string,
  transactions: Transaction[]
): Transaction[] {
  return transactions.map(t => {
    if (t.id === primaryTransactionId) {
      // Primary keeps counting toward totals, gets 'strong' verification
      return { 
        ...t, 
        linkedTransactionId: duplicateTransactionId,
        verificationLevel: 'strong' as const,
        isDuplicateOfLinked: false
      }
    }
    if (t.id === duplicateTransactionId) {
      // Duplicate doesn't count toward totals
      return { 
        ...t, 
        linkedTransactionId: primaryTransactionId,
        isDuplicateOfLinked: true,
        verificationLevel: 'strong' as const
      }
    }
    return t
  })
}

/**
 * Unlink two previously linked transactions
 */
export function unlinkTransactions(
  transaction1Id: string,
  transaction2Id: string,
  transactions: Transaction[]
): Transaction[] {
  return transactions.map(t => {
    if (t.id === transaction1Id || t.id === transaction2Id) {
      return { 
        ...t, 
        linkedTransactionId: undefined,
        isDuplicateOfLinked: false,
        verificationLevel: t.receiptId ? 'bank' as const : 'self_reported' as const
      }
    }
    return t
  })
}

/**
 * Calculate verification level for a transaction
 */
export function calculateVerificationLevel(transaction: Transaction): Transaction['verificationLevel'] {
  // If linked to another transaction, it's strongly verified
  if (transaction.linkedTransactionId) {
    return 'strong'
  }
  
  // If has receipt/bank statement, it's bank verified
  if (transaction.receiptId || transaction.receiptUrl) {
    return 'bank'
  }
  
  // Otherwise, self-reported
  return 'self_reported'
}
