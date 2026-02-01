/**
 * Call 1: Pattern Matching for Two-Call Categorization System
 * 
 * This module implements the first API call that identifies which patterns
 * from the user's correction history are relevant to the current transaction.
 */

import { getGeminiApiKey } from '../ocr/gemini-vision'
import { logger } from '../logger'
import type { PatternIndex, VendorPattern, CategoryPattern, PaymentPattern } from './pattern-index'
import { findVendorPattern, findCategoryPatterns, findPaymentPattern } from './pattern-index'

/**
 * Result from Call 1 pattern matching
 */
export interface PatternMatchResult {
  vendorMatch: {
    vendor: string
    confidence: number
    learnedPaymentMethod?: string
    learnedIncomeSource?: string
    learnedCategory?: string
    learnedType?: 'income' | 'expense'
  } | null
  categoryIndicators: string[]
  paymentIndicators: string[]
  relevantPatterns: Array<{
    patternId: string
    type: 'category' | 'payment' | 'document'
    confidence: number
    details: string
  }>
  explicitTextFound: {
    paymentMethod?: string
    fuelIndicators?: string[]
    hardwareIndicators?: string[]
    restaurantIndicators?: string[]
    groceryIndicators?: string[]
    officeSupplyIndicators?: string[]
    checkIndicators?: string[]
    depositIndicators?: string[]
  }
  reasoning: string
}

/**
 * Detect explicit payment method text in description
 */
function detectExplicitPaymentMethod(description: string, lineItems?: Array<{ description: string; amount?: number }>, ocrPaymentMethod?: string): string | undefined {
  // PRIORITY: Use OCR-extracted payment method if available (most reliable)
  if (ocrPaymentMethod) {
    const ocr = ocrPaymentMethod.toLowerCase()
    // Handle ambiguous "debit/credit" text by returning generic 'Card'
    if (ocr.includes('debit') && ocr.includes('credit')) {
      logger.debug('[PAYMENT DETECT] 💳 Ambiguous "debit/credit" detected in OCR, using Card')
      return 'Card'
    }
    if (ocr.includes('debit')) {
      logger.debug('[PAYMENT DETECT] 💳 OCR payment: Debit')
      return 'Debit'
    }
    if (ocr.includes('credit')) {
      logger.debug('[PAYMENT DETECT] 💳 OCR payment: Credit')
      return 'Credit'
    }
    if (ocr.includes('cash')) return 'Cash'
    if (ocr.includes('visa')) return 'Visa'
    if (ocr.includes('mastercard')) return 'Mastercard'
    if (ocr.includes('amex')) return 'American Express'
  }
  
  // Fallback: Combine description + itemization text for detection
  const itemText = lineItems?.map(item => item.description).join(' ') || ''
  const fullText = `${description} ${itemText}`.toLowerCase()
  
  // Handle ambiguous "debit/credit" or "credit/debit" text
  if ((fullText.includes('debit/credit') || fullText.includes('credit/debit') || fullText.includes('debit / credit'))) {
    logger.debug('[PAYMENT DETECT] 💳 Ambiguous "debit/credit" detected in text, using Card')
    return 'Card'
  }
  
  // Priority order - explicit text beats everything
  // Enhanced: "US DEBIT", "DEBIT CARD", etc.
  if ((fullText.includes('us debit') || fullText.includes('debit card') || fullText.includes('debit')) && !fullText.includes('direct debit')) {
    logger.debug('[PAYMENT DETECT] 💳 Text payment: Debit')
    return 'Debit'
  }
  if (fullText.includes('credit card') || (fullText.includes('credit') && !fullText.includes('credit union'))) {
    logger.debug('[PAYMENT DETECT] 💳 Text payment: Credit')
    return 'Credit'
  }
  if (fullText.includes('cash')) return 'Cash'
  if (fullText.includes('check #') || fullText.includes('check no')) return 'Check'
  if (fullText.includes('deposit') || fullText.includes('bank deposit')) return 'Deposit'
  
  return undefined
}

/**
 * Detect fuel indicators in description
 */
function detectFuelIndicators(description: string, vendor: string, lineItems?: Array<{ description: string; amount?: number }>): string[] {
  // Include itemization text - critical for "Regular Fuel - Pump #07" patterns
  const itemText = lineItems?.map(item => item.description).join(' ') || ''
  const text = `${description} ${vendor} ${itemText}`.toLowerCase()
  const indicators: string[] = []
  
  const fuelKeywords = [
    'fuel', 'gas', 'diesel', 'unleaded', 'premium', 'regular', 
    'gasoline', 'petrol', 'gal', 'gallon', 'pump'
  ]
  
  fuelKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      indicators.push(keyword)
    }
  })
  
  // Gas station vendors
  const gasStations = [
    'shell', 'chevron', 'exxon', 'mobil', 'bp', 'arco', 'texaco', 'citgo',
    '7-eleven', 'circle k', 'jackson', 'stinker', 'maverik', 'pilot',
    'flying j', 'loves', 'speedway', 'marathon', 'conoco', 'phillips 66',
    'valero', 'sunoco', 'gulf', 'sinclair', 'racetrac'
  ]
  
  const vendorLower = vendor.toLowerCase()
  gasStations.forEach(station => {
    if (vendorLower.includes(station)) {
      indicators.push(`gas_station:${station}`)
    }
  })
  
  return indicators
}

/**
 * Detect hardware store indicators in description, vendor, and line items
 */
function detectHardwareIndicators(description: string, vendor: string, lineItems?: Array<{ description: string; amount?: number }>): string[] {
  const itemText = lineItems?.map(item => item.description).join(' ') || ''
  const text = `${description} ${vendor} ${itemText}`.toLowerCase()
  const indicators: string[] = []
  
  const hardwareKeywords = [
    'lumber', 'wood', 'hardware', 'tools', 'drill', 'saw', 'hammer',
    'nails', 'screws', 'bolts', 'paint', 'plywood', '2x4', 'fence',
    'deck', 'construction', 'building', 'supplies'
  ]
  
  hardwareKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      indicators.push(keyword)
    }
  })
  
  const hardwareStores = [
    'home depot', 'lowes', "lowe's", 'ace hardware', 'true value',
    'menards', 'harbor freight', 'tractor supply', 'rural king'
  ]
  
  const vendorLower = vendor.toLowerCase()
  hardwareStores.forEach(store => {
    if (vendorLower.includes(store)) {
      indicators.push(`hardware_store:${store}`)
    }
  })
  
  return indicators
}

/**
 * Detect restaurant indicators in description, vendor, and line items
 */
function detectRestaurantIndicators(description: string, vendor: string, lineItems?: Array<{ description: string; amount?: number }>): string[] {
  const itemText = lineItems?.map(item => item.description).join(' ') || ''
  const text = `${description} ${vendor} ${itemText}`.toLowerCase()
  const indicators: string[] = []
  
  const restaurantKeywords = [
    'menu', 'dining', 'restaurant', 'cafe', 'bistro', 'grill', 'bar',
    'server', 'tip', 'gratuity', 'table', 'dine-in', 'takeout',
    'appetizer', 'entree', 'dessert', 'beverage'
  ]
  
  restaurantKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      indicators.push(keyword)
    }
  })
  
  const restaurantChains = [
    'mcdonalds', 'burger king', 'wendys', 'taco bell', 'subway',
    'chipotle', 'panera', 'olive garden', 'applebees', 'chilis',
    'outback', 'red lobster', 'starbucks', 'dunkin', 'pizza hut',
    'dominos', 'papa johns', 'kfc', 'popeyes', 'arbys'
  ]
  
  const vendorLower = vendor.toLowerCase()
  restaurantChains.forEach(chain => {
    if (vendorLower.includes(chain)) {
      indicators.push(`restaurant:${chain}`)
    }
  })
  
  return indicators
}

/**
 * Detect grocery store indicators in description, vendor, and line items
 */
function detectGroceryIndicators(description: string, vendor: string, lineItems?: Array<{ description: string; amount?: number }>): string[] {
  const itemText = lineItems?.map(item => item.description).join(' ') || ''
  const text = `${description} ${vendor} ${itemText}`.toLowerCase()
  const indicators: string[] = []
  
  const groceryKeywords = [
    'grocery', 'produce', 'dairy', 'meat', 'bakery', 'deli',
    'frozen', 'canned', 'fresh', 'organic', 'vegetables', 'fruit'
  ]
  
  groceryKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      indicators.push(keyword)
    }
  })
  
  const groceryStores = [
    'walmart', 'target', 'kroger', 'safeway', 'albertsons', 'publix',
    'whole foods', 'trader joes', "trader joe's", 'costco', 'sam\'s club',
    'aldi', 'food lion', 'giant', 'stop & shop', 'wegmans', 'heb',
    'winco', 'fred meyer', 'smiths', 'ralphs'
  ]
  
  const vendorLower = vendor.toLowerCase()
  groceryStores.forEach(store => {
    if (vendorLower.includes(store)) {
      indicators.push(`grocery_store:${store}`)
    }
  })
  
  return indicators
}

/**
 * Detect office supply indicators in description, vendor, and line items
 */
function detectOfficeSupplyIndicators(description: string, vendor: string, lineItems?: Array<{ description: string; amount?: number }>): string[] {
  const itemText = lineItems?.map(item => item.description).join(' ') || ''
  const text = `${description} ${vendor} ${itemText}`.toLowerCase()
  const indicators: string[] = []
  
  const officeKeywords = [
    'paper', 'ink', 'toner', 'staples', 'pens', 'pencils', 'notebook',
    'folder', 'binder', 'envelope', 'printer', 'copy', 'office supplies'
  ]
  
  officeKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      indicators.push(keyword)
    }
  })
  
  const officeStores = [
    'staples', 'office depot', 'officedepot', 'office max', 'officemax'
  ]
  
  const vendorLower = vendor.toLowerCase()
  officeStores.forEach(store => {
    if (vendorLower.includes(store)) {
      indicators.push(`office_store:${store}`)
    }
  })
  
  return indicators
}

/**
 * Detect check indicators in description or OCR payment method
 */
function detectCheckIndicators(description: string, ocrPaymentMethod?: string): string[] {
  const desc = description.toLowerCase()
  const indicators: string[] = []
  
  // PRIORITY: Check OCR payment method first (most reliable for checks)
  if (ocrPaymentMethod?.toLowerCase() === 'check') {
    indicators.push('ocr_check')
    return indicators
  }
  
  // Fallback: Look for check keywords in description
  if (desc.includes('check #') || desc.includes('check no')) indicators.push('check_number')
  if (desc.includes('pay to the order of')) indicators.push('check_payee_line')
  if (desc.includes('memo:')) indicators.push('check_memo')
  
  return indicators
}

/**
 * Detect deposit indicators in description
 */
function detectDepositIndicators(description: string, vendor: string): string[] {
  const text = `${description} ${vendor}`.toLowerCase()
  const indicators: string[] = []
  
  if (text.includes('deposit')) indicators.push('deposit_keyword')
  if (text.includes('bank') || text.includes('credit union')) indicators.push('bank_vendor')
  if (text.includes('checking') || text.includes('savings')) indicators.push('account_type')
  
  return indicators
}

/**
 * Call 1: Select relevant patterns using Gemini API
 * This is a lightweight call that identifies which correction patterns apply
 */
export async function selectRelevantPatterns(
  description: string,
  amount: number,
  vendor: string,
  patternIndex: PatternIndex,
  lineItems?: Array<{ description: string; amount?: number }>,
  ocrPaymentMethod?: string
): Promise<PatternMatchResult> {
  const apiKey = getGeminiApiKey()
  
  // Fallback to deterministic matching if no API key
  if (!apiKey) {
    return selectPatternsDeterministic(description, amount, vendor, patternIndex, lineItems, ocrPaymentMethod)
  }
  
  // First, do deterministic checks for explicit text
  // Now includes OCR payment method + itemization text for better detection
  const explicitPayment = detectExplicitPaymentMethod(description, lineItems, ocrPaymentMethod)
  const fuelIndicators = detectFuelIndicators(description, vendor, lineItems)
  const hardwareIndicators = detectHardwareIndicators(description, vendor, lineItems)
  const restaurantIndicators = detectRestaurantIndicators(description, vendor, lineItems)
  const groceryIndicators = detectGroceryIndicators(description, vendor, lineItems)
  const officeSupplyIndicators = detectOfficeSupplyIndicators(description, vendor, lineItems)
  const checkIndicators = detectCheckIndicators(description, ocrPaymentMethod)
  const depositIndicators = detectDepositIndicators(description, vendor)
  
  // 🔍 DEBUG: Log what we detected
  if (fuelIndicators.length > 0) {
    logger.info(`[PATTERN MATCH] 🔥 Fuel indicators detected: ${fuelIndicators.join(', ')}`)
  }
  if (hardwareIndicators.length > 0) {
    logger.info(`[PATTERN MATCH] 🛠️ Hardware indicators detected: ${hardwareIndicators.join(', ')}`)
  }
  if (restaurantIndicators.length > 0) {
    logger.info(`[PATTERN MATCH] 🍔 Restaurant indicators detected: ${restaurantIndicators.join(', ')}`)
  }
  if (groceryIndicators.length > 0) {
    logger.info(`[PATTERN MATCH] 🛒 Grocery indicators detected: ${groceryIndicators.join(', ')}`)
  }
  if (officeSupplyIndicators.length > 0) {
    logger.info(`[PATTERN MATCH] 📄 Office supply indicators detected: ${officeSupplyIndicators.join(', ')}`)
  }
  if (explicitPayment) {
    logger.info(`[PATTERN MATCH] 💳 Payment method detected: ${explicitPayment}`)
  }
  
  // Check for exact vendor match in index
  const vendorPattern = findVendorPattern(vendor, patternIndex)
  const paymentPattern = findPaymentPattern(vendor, patternIndex)
  const categoryPatterns = findCategoryPatterns(description, vendor, patternIndex)
  
  // Build compact pattern summary for Gemini
  const patternSummary = {
    vendorMatch: vendorPattern ? {
      vendor: vendorPattern.vendor,
      paymentMethod: vendorPattern.paymentMethod,
      category: vendorPattern.category,
      type: vendorPattern.type,
      correctionCount: vendorPattern.correctionCount,
      confidence: vendorPattern.confidence
    } : null,
    categoryPatterns: categoryPatterns.map(p => ({
      id: p.id,
      from: p.fromCategory,
      to: p.toCategory,
      occurrences: p.occurrences,
      confidence: p.confidence,
      keywords: p.keywords,
      reasons: p.reasons || []
    })),
    paymentPattern: paymentPattern ? {
      vendor: paymentPattern.vendor,
      method: paymentPattern.paymentMethod,
      occurrences: paymentPattern.occurrences,
      confidence: paymentPattern.confidence
    } : null
  }
  
  const prompt = `You are a pattern recognition system for financial transaction categorization.

Given this transaction, identify which learned patterns apply:

Transaction:
- Description: ${description}
- Amount: $${amount.toFixed(2)}
- Vendor: ${vendor}

Learned Patterns Available:
${JSON.stringify(patternSummary, null, 2)}

Explicit Indicators Detected:
- Payment method text: ${explicitPayment || 'none'}
- Fuel indicators: ${fuelIndicators.length > 0 ? fuelIndicators.join(', ') : 'none'}
- Hardware indicators: ${hardwareIndicators.length > 0 ? hardwareIndicators.join(', ') : 'none'}
- Restaurant indicators: ${restaurantIndicators.length > 0 ? restaurantIndicators.join(', ') : 'none'}
- Grocery indicators: ${groceryIndicators.length > 0 ? groceryIndicators.join(', ') : 'none'}
- Office supply indicators: ${officeSupplyIndicators.length > 0 ? officeSupplyIndicators.join(', ') : 'none'}
- Check indicators: ${checkIndicators.length > 0 ? checkIndicators.join(', ') : 'none'}
- Deposit indicators: ${depositIndicators.length > 0 ? depositIndicators.join(', ') : 'none'}

Respond ONLY with valid JSON in this format:
{
  "vendorMatchConfidence": 0.0 to 1.0,
  "shouldUseVendorPattern": true/false,
  "categoryIndicators": ["fuel", "hardware", "gas_station", etc.],
  "paymentIndicators": ["debit_explicit", "learned_pattern", "card_brand", etc.],
  "relevantPatternIds": ["pattern1", "pattern2"],
  "reasoning": "brief explanation of which patterns apply and why"
}

Rules:
1. If explicitPayment is detected, ALWAYS include "explicit_text" in paymentIndicators
2. If vendorMatch exists with high confidence (>0.8), set shouldUseVendorPattern: true
3. If fuelIndicators detected, ALWAYS include "fuel" in categoryIndicators
4. If hardwareIndicators detected, ALWAYS include "hardware" in categoryIndicators
5. If restaurantIndicators detected, ALWAYS include "restaurant" in categoryIndicators
6. If groceryIndicators detected, ALWAYS include "grocery" in categoryIndicators
7. If officeSupplyIndicators detected, ALWAYS include "office_supply" in categoryIndicators
8. If checkIndicators detected, include "check" in categoryIndicators
9. Focus on HIGH CONFIDENCE patterns only (>0.7)
10. Return pattern IDs that are MOST RELEVANT, not all patterns`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5, // Balanced - need pattern matching + new pattern recognition
            responseMimeType: 'application/json'
          }
        })
      }
    )

    if (!response.ok) {
      logger.warn('[PATTERN MATCHER] Gemini API failed, using deterministic fallback')
      return selectPatternsDeterministic(description, amount, vendor, patternIndex, lineItems, ocrPaymentMethod)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!text) {
      logger.warn('[PATTERN MATCHER] No response from Gemini, using deterministic fallback')
      return selectPatternsDeterministic(description, amount, vendor, patternIndex, lineItems, ocrPaymentMethod)
    }

    const geminiResult = JSON.parse(text)
    
    // Build final result combining Gemini's analysis with deterministic checks
    // 🔴 CRITICAL: ALWAYS pass matched patterns to Call 2 - don't let AI filter them
    const result: PatternMatchResult = {
      vendorMatch: vendorPattern ? {
        vendor: vendorPattern.vendor,
        confidence: vendorPattern.confidence,
        learnedPaymentMethod: vendorPattern.paymentMethod,
        learnedIncomeSource: vendorPattern.incomeSource,
        learnedCategory: vendorPattern.category,
        learnedType: vendorPattern.type
      } : null,
      categoryIndicators: geminiResult.categoryIndicators || [],
      paymentIndicators: geminiResult.paymentIndicators || [],
      relevantPatterns: buildRelevantPatternsList(
        geminiResult.relevantPatternIds || [],
        categoryPatterns,
        paymentPattern
      ),
      explicitTextFound: {
        paymentMethod: explicitPayment,
        fuelIndicators: fuelIndicators.length > 0 ? fuelIndicators : undefined,
        hardwareIndicators: hardwareIndicators.length > 0 ? hardwareIndicators : undefined,
        restaurantIndicators: restaurantIndicators.length > 0 ? restaurantIndicators : undefined,
        groceryIndicators: groceryIndicators.length > 0 ? groceryIndicators : undefined,
        officeSupplyIndicators: officeSupplyIndicators.length > 0 ? officeSupplyIndicators : undefined,
        checkIndicators: checkIndicators.length > 0 ? checkIndicators : undefined,
        depositIndicators: depositIndicators.length > 0 ? depositIndicators : undefined
      },
      reasoning: geminiResult.reasoning || 'Pattern matching completed'
    }
    
    logger.debug('[PATTERN MATCHER] Call 1 complete:', {
      vendorMatch: !!result.vendorMatch,
      categoryIndicators: result.categoryIndicators,
      paymentIndicators: result.paymentIndicators,
      explicitPayment
    })
    
    return result

  } catch (error) {
    logger.error('[PATTERN MATCHER] Error in Gemini pattern matching:', error)
    return selectPatternsDeterministic(description, amount, vendor, patternIndex, lineItems, ocrPaymentMethod)
  }
}

/**
 * Deterministic pattern matching fallback (no API call)
 */
function selectPatternsDeterministic(
  description: string,
  amount: number,
  vendor: string,
  patternIndex: PatternIndex,
  lineItems?: Array<{ description: string; amount?: number }>,
  ocrPaymentMethod?: string
): PatternMatchResult {
  const vendorPattern = findVendorPattern(vendor, patternIndex)
  const paymentPattern = findPaymentPattern(vendor, patternIndex)
  const categoryPatterns = findCategoryPatterns(description, vendor, patternIndex)
  
  const explicitPayment = detectExplicitPaymentMethod(description, lineItems, ocrPaymentMethod)
  const fuelIndicators = detectFuelIndicators(description, vendor, lineItems)
  const hardwareIndicators = detectHardwareIndicators(description, vendor, lineItems)
  const restaurantIndicators = detectRestaurantIndicators(description, vendor, lineItems)
  const groceryIndicators = detectGroceryIndicators(description, vendor, lineItems)
  const officeSupplyIndicators = detectOfficeSupplyIndicators(description, vendor, lineItems)
  const checkIndicators = detectCheckIndicators(description, ocrPaymentMethod)
  const depositIndicators = detectDepositIndicators(description, vendor)
  
  // 🔍 DEBUG: Log what we detected (deterministic path)
  if (fuelIndicators.length > 0) {
    logger.info(`[PATTERN MATCH] 🔥 Fuel indicators detected: ${fuelIndicators.join(', ')}`)
  }
  if (hardwareIndicators.length > 0) {
    logger.info(`[PATTERN MATCH] 🛠️ Hardware indicators detected: ${hardwareIndicators.join(', ')}`)
  }
  if (restaurantIndicators.length > 0) {
    logger.info(`[PATTERN MATCH] 🍔 Restaurant indicators detected: ${restaurantIndicators.join(', ')}`)
  }
  if (groceryIndicators.length > 0) {
    logger.info(`[PATTERN MATCH] 🛒 Grocery indicators detected: ${groceryIndicators.join(', ')}`)
  }
  if (officeSupplyIndicators.length > 0) {
    logger.info(`[PATTERN MATCH] 📄 Office supply indicators detected: ${officeSupplyIndicators.join(', ')}`)
  }
  if (explicitPayment) {
    logger.info(`[PATTERN MATCH] 💳 Payment method detected: ${explicitPayment}`)
  }
  
  const categoryIndicatorsList: string[] = []
  if (fuelIndicators.length > 0) categoryIndicatorsList.push('fuel')
  if (hardwareIndicators.length > 0) categoryIndicatorsList.push('hardware')
  if (restaurantIndicators.length > 0) categoryIndicatorsList.push('restaurant')
  if (groceryIndicators.length > 0) categoryIndicatorsList.push('grocery')
  if (officeSupplyIndicators.length > 0) categoryIndicatorsList.push('office_supply')
  if (checkIndicators.length > 0) categoryIndicatorsList.push('check')
  if (depositIndicators.length > 0) categoryIndicatorsList.push('deposit')
  
  const paymentIndicatorsList: string[] = []
  if (explicitPayment) paymentIndicatorsList.push('explicit_text')
  if (vendorPattern?.paymentMethod) paymentIndicatorsList.push('learned_pattern')
  if (paymentPattern) paymentIndicatorsList.push('payment_correction')
  
  return {
    vendorMatch: vendorPattern ? {
      vendor: vendorPattern.vendor,
      confidence: vendorPattern.confidence,
      learnedPaymentMethod: vendorPattern.paymentMethod,
      learnedIncomeSource: vendorPattern.incomeSource,
      learnedCategory: vendorPattern.category,
      learnedType: vendorPattern.type
    } : null,
    categoryIndicators: categoryIndicatorsList,
    paymentIndicators: paymentIndicatorsList,
    relevantPatterns: buildRelevantPatternsList(
      categoryPatterns.map(p => p.id),
      categoryPatterns,
      paymentPattern
    ),
    explicitTextFound: {
      paymentMethod: explicitPayment,
      fuelIndicators: fuelIndicators.length > 0 ? fuelIndicators : undefined,
      hardwareIndicators: hardwareIndicators.length > 0 ? hardwareIndicators : undefined,
      restaurantIndicators: restaurantIndicators.length > 0 ? restaurantIndicators : undefined,
      groceryIndicators: groceryIndicators.length > 0 ? groceryIndicators : undefined,
      officeSupplyIndicators: officeSupplyIndicators.length > 0 ? officeSupplyIndicators : undefined,
      checkIndicators: checkIndicators.length > 0 ? checkIndicators : undefined,
      depositIndicators: depositIndicators.length > 0 ? depositIndicators : undefined
    },
    reasoning: 'Deterministic pattern matching (no API key)'
  }
}

/**
 * Build relevant patterns list from IDs
 */
function buildRelevantPatternsList(
  patternIds: string[],
  categoryPatterns: CategoryPattern[],
  paymentPattern: PaymentPattern | null
): PatternMatchResult['relevantPatterns'] {
  const patterns: PatternMatchResult['relevantPatterns'] = []
  
  categoryPatterns.forEach(cp => {
    if (patternIds.includes(cp.id)) {
      patterns.push({
        patternId: cp.id,
        type: 'category',
        confidence: cp.confidence,
        details: `${cp.fromCategory} → ${cp.toCategory} (${cp.occurrences}x)`
      })
    }
  })
  
  if (paymentPattern) {
    patterns.push({
      patternId: paymentPattern.id,
      type: 'payment',
      confidence: paymentPattern.confidence,
      details: `${paymentPattern.vendor} → ${paymentPattern.paymentMethod} (${paymentPattern.occurrences}x)`
    })
  }
  
  return patterns
}
