/**
 * Enhanced AI Learning Engine
 * Learns from user corrections to improve categorization, vendor normalization,
 * payment method detection, and confidence thresholds
 */

import type { CategorizationCorrection, Transaction, Receipt } from '@/types'

// Learned vendor name mappings (OCR variations → canonical name)
export interface VendorNameMapping {
  variations: string[]  // OCR variations seen
  canonical: string     // User-corrected canonical name
  confidence: number    // How certain we are (based on confirmation count)
  lastUpdated: string
  timesConfirmed: number
}

// Learned category patterns for a vendor
export interface VendorCategoryPattern {
  vendor: string
  category: string
  type: 'income' | 'expense'
  confidence: number
  occurrences: number
  lastSeen: string
  amountRange?: { min: number; max: number }
}

// Payment method learning
export interface PaymentMethodPattern {
  cardLastFour?: string
  paymentType: 'Credit' | 'Debit' | 'Cash' | 'Check' | 'ACH' | 'Wire'
  confidence: number
  occurrences: number
  learnedFrom: string[] // vendor names where this was confirmed
}

// Confidence calibration data
export interface ConfidenceCalibration {
  category: string
  predictedConfidenceRange: { min: number; max: number }
  actualAccuracy: number  // How often predictions in this range were correct
  sampleSize: number
  lastCalibrated: string
}

// Full learning state
export interface AILearningState {
  vendorMappings: VendorNameMapping[]
  categoryPatterns: VendorCategoryPattern[]
  paymentPatterns: PaymentMethodPattern[]
  confidenceCalibration: ConfidenceCalibration[]
  totalCorrections: number
  lastUpdated: string
  version: string
}

const INITIAL_STATE: AILearningState = {
  vendorMappings: [],
  categoryPatterns: [],
  paymentPatterns: [],
  confidenceCalibration: [],
  totalCorrections: 0,
  lastUpdated: new Date().toISOString(),
  version: '1.0.0'
}

/**
 * Normalize vendor name for comparison
 */
export function normalizeVendorName(vendor: string): string {
  return vendor
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')        // Normalize whitespace
    .replace(/\b(inc|llc|ltd|corp|co)\b/gi, '') // Remove business suffixes
    .trim()
}

/**
 * Calculate string similarity (Levenshtein-based)
 */
export function stringSimilarity(a: string, b: string): number {
  const s1 = normalizeVendorName(a)
  const s2 = normalizeVendorName(b)
  
  if (s1 === s2) return 1
  if (s1.length === 0 || s2.length === 0) return 0
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.9
  }
  
  // Levenshtein distance
  const matrix: number[][] = []
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }
  
  const distance = matrix[s1.length][s2.length]
  const maxLen = Math.max(s1.length, s2.length)
  return 1 - distance / maxLen
}

/**
 * Learn from a single correction
 */
export function learnFromCorrection(
  state: AILearningState,
  correction: CategorizationCorrection
): AILearningState {
  const newState = { ...state }
  const now = new Date().toISOString()
  
  // Learn vendor name normalization if description changed
  if (correction.changes.description) {
    const { from, to } = correction.changes.description
    newState.vendorMappings = learnVendorMapping(
      newState.vendorMappings,
      from,
      to
    )
  }
  
  // Learn category pattern
  if (correction.changes.category || correction.changes.type) {
    const vendor = correction.vendor
    const category = correction.changes.category?.to || ''
    const type = correction.changes.type?.to || 'expense'
    
    if (category) {
      newState.categoryPatterns = learnCategoryPattern(
        newState.categoryPatterns,
        vendor,
        category,
        type,
        correction.amount
      )
    }
  }
  
  // Learn payment method pattern
  if (correction.changes.paymentMethod) {
    const { to, cardLastFour } = correction.changes.paymentMethod
    if (to && (to === 'Credit' || to === 'Debit')) {
      newState.paymentPatterns = learnPaymentPattern(
        newState.paymentPatterns,
        to as 'Credit' | 'Debit',
        cardLastFour,
        correction.vendor
      )
    }
  }
  
  // Update calibration data
  if (correction.wasAutoCategorizationCorrection) {
    newState.confidenceCalibration = updateCalibration(
      newState.confidenceCalibration,
      correction.changes.category?.from || '',
      false // AI was wrong
    )
  }
  
  newState.totalCorrections++
  newState.lastUpdated = now
  
  return newState
}

/**
 * Learn vendor name mapping
 */
function learnVendorMapping(
  mappings: VendorNameMapping[],
  ocrVariation: string,
  canonicalName: string
): VendorNameMapping[] {
  const normalized = normalizeVendorName(canonicalName)
  const existingIndex = mappings.findIndex(
    m => normalizeVendorName(m.canonical) === normalized
  )
  
  if (existingIndex >= 0) {
    // Update existing mapping
    const existing = mappings[existingIndex]
    const normalizedVariation = normalizeVendorName(ocrVariation)
    
    if (!existing.variations.some(v => normalizeVendorName(v) === normalizedVariation)) {
      existing.variations.push(ocrVariation)
    }
    existing.timesConfirmed++
    existing.confidence = Math.min(0.99, 0.7 + (existing.timesConfirmed * 0.05))
    existing.lastUpdated = new Date().toISOString()
    
    return [...mappings.slice(0, existingIndex), existing, ...mappings.slice(existingIndex + 1)]
  } else {
    // Create new mapping
    return [...mappings, {
      variations: [ocrVariation],
      canonical: canonicalName,
      confidence: 0.7,
      lastUpdated: new Date().toISOString(),
      timesConfirmed: 1
    }]
  }
}

/**
 * Learn category pattern for vendor
 */
function learnCategoryPattern(
  patterns: VendorCategoryPattern[],
  vendor: string,
  category: string,
  type: 'income' | 'expense',
  amount: number
): VendorCategoryPattern[] {
  const normalizedVendor = normalizeVendorName(vendor)
  const existingIndex = patterns.findIndex(
    p => normalizeVendorName(p.vendor) === normalizedVendor && p.category === category
  )
  
  if (existingIndex >= 0) {
    const existing = patterns[existingIndex]
    existing.occurrences++
    existing.confidence = Math.min(0.99, 0.6 + (existing.occurrences * 0.08))
    existing.lastSeen = new Date().toISOString()
    
    // Update amount range
    if (existing.amountRange) {
      existing.amountRange.min = Math.min(existing.amountRange.min, amount)
      existing.amountRange.max = Math.max(existing.amountRange.max, amount)
    } else {
      existing.amountRange = { min: amount, max: amount }
    }
    
    return [...patterns.slice(0, existingIndex), existing, ...patterns.slice(existingIndex + 1)]
  } else {
    return [...patterns, {
      vendor,
      category,
      type,
      confidence: 0.6,
      occurrences: 1,
      lastSeen: new Date().toISOString(),
      amountRange: { min: amount, max: amount }
    }]
  }
}

/**
 * Learn payment method pattern
 */
function learnPaymentPattern(
  patterns: PaymentMethodPattern[],
  paymentType: 'Credit' | 'Debit',
  cardLastFour?: string,
  vendor?: string
): PaymentMethodPattern[] {
  if (!cardLastFour) return patterns
  
  const existingIndex = patterns.findIndex(p => p.cardLastFour === cardLastFour)
  
  if (existingIndex >= 0) {
    const existing = patterns[existingIndex]
    existing.occurrences++
    existing.confidence = Math.min(0.99, 0.7 + (existing.occurrences * 0.1))
    if (vendor && !existing.learnedFrom.includes(vendor)) {
      existing.learnedFrom.push(vendor)
    }
    
    return [...patterns.slice(0, existingIndex), existing, ...patterns.slice(existingIndex + 1)]
  } else {
    return [...patterns, {
      cardLastFour,
      paymentType,
      confidence: 0.7,
      occurrences: 1,
      learnedFrom: vendor ? [vendor] : []
    }]
  }
}

/**
 * Update confidence calibration
 */
function updateCalibration(
  calibrations: ConfidenceCalibration[],
  category: string,
  wasCorrect: boolean
): ConfidenceCalibration[] {
  if (!category) return calibrations
  
  const existingIndex = calibrations.findIndex(c => c.category === category)
  
  if (existingIndex >= 0) {
    const existing = calibrations[existingIndex]
    const newSampleSize = existing.sampleSize + 1
    const correctCount = existing.actualAccuracy * existing.sampleSize + (wasCorrect ? 1 : 0)
    existing.actualAccuracy = correctCount / newSampleSize
    existing.sampleSize = newSampleSize
    existing.lastCalibrated = new Date().toISOString()
    
    return [...calibrations.slice(0, existingIndex), existing, ...calibrations.slice(existingIndex + 1)]
  } else {
    return [...calibrations, {
      category,
      predictedConfidenceRange: { min: 0.5, max: 1.0 },
      actualAccuracy: wasCorrect ? 1 : 0,
      sampleSize: 1,
      lastCalibrated: new Date().toISOString()
    }]
  }
}

/**
 * Get best vendor name match
 */
export function getBestVendorMatch(
  state: AILearningState,
  ocrVendor: string
): { canonical: string; confidence: number } | null {
  const normalized = normalizeVendorName(ocrVendor)
  
  for (const mapping of state.vendorMappings) {
    // Check exact match first
    if (normalizeVendorName(mapping.canonical) === normalized) {
      return { canonical: mapping.canonical, confidence: mapping.confidence }
    }
    
    // Check variations
    for (const variation of mapping.variations) {
      if (normalizeVendorName(variation) === normalized) {
        return { canonical: mapping.canonical, confidence: mapping.confidence }
      }
      
      // Fuzzy match
      const similarity = stringSimilarity(ocrVendor, variation)
      if (similarity > 0.85) {
        return { canonical: mapping.canonical, confidence: mapping.confidence * similarity }
      }
    }
  }
  
  return null
}

/**
 * Get category suggestion based on learned patterns
 */
export function getCategorySuggestion(
  state: AILearningState,
  vendor: string,
  amount?: number
): { category: string; type: 'income' | 'expense'; confidence: number } | null {
  const normalizedVendor = normalizeVendorName(vendor)
  
  // Find matching patterns
  const matches = state.categoryPatterns.filter(p => {
    const similarity = stringSimilarity(p.vendor, vendor)
    return similarity > 0.8
  })
  
  if (matches.length === 0) return null
  
  // Sort by confidence and recency
  matches.sort((a, b) => {
    const confidenceDiff = b.confidence - a.confidence
    if (Math.abs(confidenceDiff) > 0.1) return confidenceDiff
    return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
  })
  
  const best = matches[0]
  
  // Adjust confidence based on amount range match
  let confidence = best.confidence
  if (amount && best.amountRange) {
    const inRange = amount >= best.amountRange.min * 0.5 && 
                    amount <= best.amountRange.max * 1.5
    if (!inRange) {
      confidence *= 0.8 // Reduce confidence if amount is unusual
    }
  }
  
  return {
    category: best.category,
    type: best.type,
    confidence
  }
}

/**
 * Get payment type for card
 */
export function getPaymentTypeForCard(
  state: AILearningState,
  cardLastFour: string
): { paymentType: 'Credit' | 'Debit'; confidence: number } | null {
  const pattern = state.paymentPatterns.find(p => p.cardLastFour === cardLastFour)
  
  // Only return Credit or Debit for card-based payments
  if (pattern && (pattern.paymentType === 'Credit' || pattern.paymentType === 'Debit')) {
    return {
      paymentType: pattern.paymentType,
      confidence: pattern.confidence
    }
  }
  
  return null
}

/**
 * Get calibrated confidence (adjust AI confidence based on historical accuracy)
 */
export function getCalibratedConfidence(
  state: AILearningState,
  category: string,
  rawConfidence: number
): number {
  const calibration = state.confidenceCalibration.find(c => c.category === category)
  
  if (!calibration || calibration.sampleSize < 5) {
    return rawConfidence // Not enough data to calibrate
  }
  
  // Adjust confidence based on historical accuracy
  // If AI tends to be overconfident, reduce; if underconfident, increase
  const adjustmentFactor = calibration.actualAccuracy / rawConfidence
  return Math.min(0.99, Math.max(0.1, rawConfidence * adjustmentFactor))
}

/**
 * Process all corrections to build learning state
 */
export function buildLearningState(corrections: CategorizationCorrection[]): AILearningState {
  let state = { ...INITIAL_STATE }
  
  for (const correction of corrections) {
    state = learnFromCorrection(state, correction)
  }
  
  return state
}

/**
 * Get learning statistics
 */
export function getLearningStats(state: AILearningState): {
  vendorMappings: number
  categoryPatterns: number
  paymentPatterns: number
  totalCorrections: number
  avgCategoryConfidence: number
} {
  const avgCategoryConfidence = state.categoryPatterns.length > 0
    ? state.categoryPatterns.reduce((sum, p) => sum + p.confidence, 0) / state.categoryPatterns.length
    : 0
  
  return {
    vendorMappings: state.vendorMappings.length,
    categoryPatterns: state.categoryPatterns.length,
    paymentPatterns: state.paymentPatterns.length,
    totalCorrections: state.totalCorrections,
    avgCategoryConfidence
  }
}

export { INITIAL_STATE }
