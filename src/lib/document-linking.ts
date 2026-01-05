/**
 * Document linking and duplicate detection utilities
 * Matches payment receipts to itemized receipts and detects duplicate uploads
 */

import type { Receipt } from '@/types'

/**
 * Check if two filenames are likely the same file (duplicate detection)
 */
export function areFilenamesSimilar(filename1: string, filename2: string): boolean {
  if (!filename1 || !filename2) return false
  
  // Exact match
  if (filename1 === filename2) return true
  
  // Normalize: lowercase, remove extensions, remove common prefixes/suffixes
  const normalize = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\.(jpg|jpeg|png|heic|heif|pdf|webp)$/i, '')
      .replace(/^(img|image|receipt|scan|photo)[-_]?/i, '')
      .replace(/[-_](copy|duplicate|\d+)$/i, '')
      .trim()
  }
  
  const norm1 = normalize(filename1)
  const norm2 = normalize(filename2)
  
  // Check if normalized versions match
  if (norm1 === norm2) return true
  
  // Check if one contains the other (handles cases like "receipt.jpg" and "receipt-2.jpg")
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    // But only if they're very close in length (within 3 chars)
    if (Math.abs(norm1.length - norm2.length) <= 3) {
      return true
    }
  }
  
  return false
}

/**
 * Find potential duplicate receipts based on filename
 */
export function findDuplicatesByFilename(
  newReceipt: Receipt,
  existingReceipts: Receipt[]
): Receipt[] {
  if (!newReceipt.sourceFilename) return []
  
  return existingReceipts.filter(existing => {
    if (!existing.sourceFilename || existing.id === newReceipt.id) return false
    return areFilenamesSimilar(newReceipt.sourceFilename!, existing.sourceFilename)
  })
}

/**
 * Extract all identifier numbers from a receipt for linking
 * NOTE: Only use explicit parsed fields - raw OCR text patterns are too noisy
 * and cause false positive matches (store numbers, phone numbers, etc.)
 */
function extractIdentifiers(receipt: Receipt): string[] {
  const identifiers: string[] = []
  
  // Only use explicitly parsed identifier fields - these are reliable
  if (receipt.transactionNumber) identifiers.push(receipt.transactionNumber.toLowerCase().trim())
  if (receipt.orderNumber) identifiers.push(receipt.orderNumber.toLowerCase().trim())
  if (receipt.invoiceNumber) identifiers.push(receipt.invoiceNumber.toLowerCase().trim())
  if (receipt.ocrTransactionId) identifiers.push(receipt.ocrTransactionId.toLowerCase().trim())
  
  // NOTE: Removed raw OCR text pattern matching - it was extracting generic numbers
  // (store numbers, phone numbers) that appear on many receipts, causing hundreds
  // of false positive document links
  
  return identifiers.filter(id => id.length > 0)
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  if (s1 === s2) return 1
  if (s1.length === 0 || s2.length === 0) return 0
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length)
  }
  
  // Simple word overlap
  const words1 = s1.split(/\s+/)
  const words2 = s2.split(/\s+/)
  const commonWords = words1.filter(w => words2.includes(w)).length
  const totalWords = new Set([...words1, ...words2]).size
  
  return commonWords / totalWords
}

/**
 * Calculate confidence score for a document match (0-100)
 */
export function calculateMatchConfidence(doc1: Receipt, doc2: Receipt): number {
  let score = 0
  
  // Matching identifiers (high weight)
  if (haveMatchingIdentifiers(doc1, doc2)) {
    score += 50
  }
  
  // Same vendor (medium weight)
  if (doc1.ocrVendor && doc2.ocrVendor) {
    const similarity = stringSimilarity(doc1.ocrVendor, doc2.ocrVendor)
    score += similarity * 25
  }
  
  // Same or close date (low weight)
  if (doc1.ocrDate && doc2.ocrDate) {
    const date1 = new Date(doc1.ocrDate).getTime()
    const date2 = new Date(doc2.ocrDate).getTime()
    const daysDiff = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24)
    
    if (daysDiff === 0) score += 15
    else if (daysDiff <= 1) score += 12
    else if (daysDiff <= 3) score += 8
    else if (daysDiff <= 7) score += 4
  }
  
  // Same or similar amount (low weight)
  if (doc1.ocrAmount !== undefined && doc2.ocrAmount !== undefined) {
    const diff = Math.abs(doc1.ocrAmount - doc2.ocrAmount)
    const maxAmount = Math.max(doc1.ocrAmount, doc2.ocrAmount)
    
    if (diff === 0) score += 10
    else if (maxAmount > 0 && diff / maxAmount < 0.01) score += 8 // Within 1%
    else if (maxAmount > 0 && diff / maxAmount < 0.05) score += 4 // Within 5%
  }
  
  return Math.min(score, 100)
}

/**
 * Check if two receipts share any common identifiers
 */
function haveMatchingIdentifiers(receipt1: Receipt, receipt2: Receipt): boolean {
  const ids1 = extractIdentifiers(receipt1)
  const ids2 = extractIdentifiers(receipt2)
  
  if (ids1.length === 0 || ids2.length === 0) return false
  
  // Check for any common identifier
  return ids1.some(id1 => ids2.some(id2 => id1 === id2))
}

/**
 * Link a payment receipt to its corresponding itemized receipt
 * Returns the ID of the itemized receipt if found, null otherwise
 * 
 * NOTE: Payment receipts should ONLY be linked if they have STRONG evidence
 * of being duplicate documentation (same transaction number, order number, etc.)
 * Regular purchase receipts should NOT be auto-linked just based on vendor matching.
 */
export function findItemizedReceiptForPayment(
  paymentReceipt: Receipt,
  allReceipts: Receipt[]
): Receipt | null {
  if (paymentReceipt.documentType !== 'payment_receipt') {
    return null
  }
  
  // IMPORTANT: Only auto-link if there are explicit transaction identifiers
  // Vendor matching alone is too weak and causes false positives
  const paymentIds = extractIdentifiers(paymentReceipt)
  if (paymentIds.length === 0) {
    // No identifiers - cannot auto-link safely
    return null
  }
  
  // Look for expense receipts with matching identifiers
  const candidates = allReceipts.filter(r => {
    // Skip self
    if (r.id === paymentReceipt.id) return false
    
    // Must be a regular payment receipt (not supplemental docs or other types)
    if (r.documentType === 'manifest' || r.documentType === 'bank_deposit_receipt' || r.isSupplementalDoc) return false
    
    // Must have matching identifiers (strict requirement)
    if (!haveMatchingIdentifiers(paymentReceipt, r)) return false
    
    // Must be from same vendor (if both have vendor info)
    if (r.ocrVendor && paymentReceipt.ocrVendor) {
      const vendor1 = r.ocrVendor.toLowerCase().trim()
      const vendor2 = paymentReceipt.ocrVendor.toLowerCase().trim()
      if (!vendor1.includes(vendor2) && !vendor2.includes(vendor1)) {
        return false
      }
    }
    
    return true
  })
  
  if (candidates.length === 0) return null
  
  // If multiple candidates, prefer the one closest in date
  if (paymentReceipt.ocrDate && candidates.length > 1) {
    candidates.sort((a, b) => {
      const dateA = a.ocrDate || '1900-01-01'
      const dateB = b.ocrDate || '1900-01-01'
      const paymentDate = paymentReceipt.ocrDate || '1900-01-01'
      
      const diffA = Math.abs(new Date(dateA).getTime() - new Date(paymentDate).getTime())
      const diffB = Math.abs(new Date(dateB).getTime() - new Date(paymentDate).getTime())
      
      return diffA - diffB
    })
  }
  
  return candidates[0] || null
}

/**
 * Link all receipts in a collection, establishing relationships between
 * payment receipts and their itemized counterparts
 */
export function linkAllReceipts(receipts: Receipt[]): Receipt[] {
  const linkedReceipts = [...receipts]
  
  // Find all payment receipts and try to link them
  receipts.forEach((receipt, index) => {
    if (receipt.documentType === 'payment_receipt') {
      const itemizedReceipt = findItemizedReceiptForPayment(receipt, receipts)
      
      if (itemizedReceipt) {
        console.log(`[LINKING] Found match for payment receipt ${receipt.id} -> itemized receipt ${itemizedReceipt.id}`)
        
        // Update payment receipt
        linkedReceipts[index] = {
          ...receipt,
          isSupplementalDoc: true,
          primaryDocumentId: itemizedReceipt.id,
          linkedDocumentIds: [itemizedReceipt.id]
        }
        
        // Update itemized receipt to reference the payment
        const itemizedIndex = receipts.findIndex(r => r.id === itemizedReceipt.id)
        if (itemizedIndex !== -1) {
          const existingLinks = linkedReceipts[itemizedIndex].linkedDocumentIds || []
          linkedReceipts[itemizedIndex] = {
            ...linkedReceipts[itemizedIndex],
            linkedDocumentIds: [...existingLinks, receipt.id]
          }
        }
      }
    }
  })
  
  return linkedReceipts
}

/**
 * Mark manifest documents as supplemental (don't count as expenses)
 */
export function markManifestsAsSupplemental(receipts: Receipt[]): Receipt[] {
  // Track if this is the first manifest being marked
  const existingManifests = receipts.filter(r => r.documentType === 'manifest' && r.isSupplementalDoc).length
  let firstManifestMarked = false
  
  const processed = receipts.map(receipt => {
    if (receipt.documentType === 'manifest' && !receipt.isSupplementalDoc) {
      console.log('[MANIFEST] Marking receipt as supplemental doc:', receipt.id)
      
      // Quest: Upload supplemental document → Level 6 (Supporting Documents)
      if (existingManifests === 0 && !firstManifestMarked) {
        firstManifestMarked = true
        
        // Dynamically import to avoid circular dependencies
        import('@/store').then(({ useStore }) => {
          const { manualLevelUp, userProgress, completeQuest, questProgress, incrementMilestone } = useStore.getState()
          
          console.log('[QUEST CHECK] First manifest - Level:', userProgress.currentLevel, 'Quest completed:', questProgress.completedQuests.includes('upload_supplemental'))
          
          // Track milestone
          incrementMilestone('supplementalDocs')
          
          if (!questProgress.completedQuests.includes('upload_supplemental') && userProgress.currentLevel >= 3 && userProgress.currentLevel < 7) {
            completeQuest('upload_supplemental')
            manualLevelUp()
            console.log('[QUEST] ✅ Completed upload_supplemental quest (manifest) - advancing to next level (Supporting Documents)')
          } else {
            console.log('[QUEST CHECK] Quest already completed, level too low, or already at max')
          }
        })
      }
      
      return {
        ...receipt,
        isSupplementalDoc: true
      }
    }
    return receipt
  })
  
  return processed
}

/**
 * Mark invoice documents as supplemental (don't count as expenses)
 * Invoices represent money owed TO the user, not expenses paid BY the user
 */
export function markInvoicesAsSupplemental(receipts: Receipt[]): Receipt[] {
  return receipts.map(receipt => {
    if (receipt.documentType === 'invoice') {
      return {
        ...receipt,
        isSupplementalDoc: true
      }
    }
    return receipt
  })
}

/**
 * Check for and flag potential duplicates in a receipt collection
 */
export function detectDuplicates(receipts: Receipt[]): Receipt[] {
  const processedReceipts = [...receipts]
  
  receipts.forEach((receipt, index) => {
    if (receipt.isDuplicate) return // Already flagged
    
    const duplicates = findDuplicatesByFilename(receipt, receipts.slice(0, index))
    
    if (duplicates.length > 0) {
      console.log(`[DUPLICATE] Found ${duplicates.length} potential duplicate(s) for ${receipt.sourceFilename}`)
      processedReceipts[index] = {
        ...receipt,
        isDuplicate: true,
        duplicateOfId: duplicates[0].id
      }
    }
  })
  
  return processedReceipts
}

/**
 * Process all receipts: detect duplicates, link documents, mark supplemental
 */
export function processReceiptDocuments(receipts: Receipt[]): Receipt[] {
  console.log('[DOCUMENT PROCESSING] Starting full document processing...')
  
  let processed = receipts
  
  // Step 1: Detect duplicates
  processed = detectDuplicates(processed)
  
  // Step 2: Link payment receipts to itemized receipts
  processed = linkAllReceipts(processed)
  
  // Step 3: Mark manifests as supplemental
  processed = markManifestsAsSupplemental(processed)
  
  // Step 4: Mark invoices as supplemental (third-party/scanned invoices)
  processed = markInvoicesAsSupplemental(processed)
  
  console.log('[DOCUMENT PROCESSING] Complete')
  return processed
}
