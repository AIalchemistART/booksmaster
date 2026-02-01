/**
 * Call 2: Focused Categorization for Two-Call Categorization System
 * 
 * This module implements the second API call that applies the patterns
 * identified in Call 1 to make a precise categorization decision.
 */

import { getGeminiApiKey } from '../ocr/gemini-vision'
import { logger } from '../logger'
import type { PatternMatchResult } from './pattern-matcher'
import { getCategoriesForJobType, getJobTypesArray } from '../category-mappings'
import { useStore } from '@/store'

/**
 * Result from Call 2 focused categorization
 */
export interface CategorizationResult {
  type: 'income' | 'expense'
  category: string
  confidence: number
  paymentMethod?: 'Card' | 'Cash' | 'Check' | 'Credit' | 'Debit' | 'Deposit'
  incomeSource?: 'check' | 'cash' | 'bank_transfer' | 'deposit' | 'card' | 'other'
  appliedPatterns: string[]
  reasoning: string
}

/**
 * Get user's available categories based on their job type(s)
 */
function getUserCategories(): { expenseCategories: string[]; incomeCategories: string[] } {
  const userProgress = useStore.getState().userProgress
  const jobTypes = getJobTypesArray(userProgress)
  
  const expenseCats = getCategoriesForJobType(jobTypes, 'expense')
  const incomeCats = getCategoriesForJobType(jobTypes, 'income')
  
  return {
    expenseCategories: expenseCats.map(c => `${c.label} (${c.value})`),
    incomeCategories: incomeCats.map(c => `${c.label} (${c.value})`)
  }
}

/**
 * Call 2: Focused categorization using patterns from Call 1
 * This call receives ONLY the relevant patterns, making it highly focused
 */
export async function categorizeFocused(
  description: string,
  amount: number,
  vendor: string,
  patterns: PatternMatchResult
): Promise<CategorizationResult> {
  const apiKey = getGeminiApiKey()
  
  // Fallback to deterministic if no API key
  if (!apiKey) {
    return categorizeDeterministic(description, amount, vendor, patterns)
  }
  
  // 🔴 CRITICAL FIX: Bypass AI for high-confidence patterns to prevent hallucination
  // AI has been shown to ignore/hallucinate learned patterns, so use deterministic logic
  
  const shouldUseDeterministic = 
    // High-confidence vendor match (>=0.6 means at least 1 correction learned)
    (patterns.vendorMatch && patterns.vendorMatch.confidence >= 0.6) ||
    // Explicit fuel indicators (always high confidence)
    (patterns.explicitTextFound.fuelIndicators && patterns.explicitTextFound.fuelIndicators.length > 0) ||
    // Explicit check indicators
    (patterns.explicitTextFound.checkIndicators && patterns.explicitTextFound.checkIndicators.length > 0) ||
    // Explicit deposit indicators
    (patterns.explicitTextFound.depositIndicators && patterns.explicitTextFound.depositIndicators.length > 0) ||
    // Explicit payment method detected
    (patterns.explicitTextFound.paymentMethod)
  
  if (shouldUseDeterministic) {
    logger.info('[FOCUSED CATEGORIZER] 🎯 High-confidence pattern detected - using deterministic result to ensure accuracy')
    return categorizeDeterministic(description, amount, vendor, patterns)
  }
  
  const { expenseCategories, incomeCategories } = getUserCategories()
  
  // Build focused rules based on Call 1 results
  let absoluteRules = ''
  let detectedPatterns = ''
  
  // ABSOLUTE RULE: Vendor exact match
  if (patterns.vendorMatch && patterns.vendorMatch.confidence > 0.8) {
    absoluteRules += `\n🔴 ABSOLUTE RULE - Vendor Exact Match:\n`
    absoluteRules += `- Vendor "${patterns.vendorMatch.vendor}" has been corrected ${patterns.vendorMatch.confidence >= 0.9 ? 'many times' : 'before'}\n`
    
    if (patterns.vendorMatch.learnedPaymentMethod) {
      absoluteRules += `- Payment Method MUST be: "${patterns.vendorMatch.learnedPaymentMethod}"\n`
    }
    if (patterns.vendorMatch.learnedIncomeSource) {
      absoluteRules += `- Income Source MUST be: "${patterns.vendorMatch.learnedIncomeSource}"\n`
    }
    if (patterns.vendorMatch.learnedCategory) {
      absoluteRules += `- Category MUST be: "${patterns.vendorMatch.learnedCategory}"\n`
    }
    if (patterns.vendorMatch.learnedType) {
      absoluteRules += `- Type MUST be: "${patterns.vendorMatch.learnedType}"\n`
    }
    absoluteRules += `- Confidence: ${(patterns.vendorMatch.confidence * 100).toFixed(0)}%\n`
    absoluteRules += `- DO NOT DEVIATE from these learned patterns\n`
  }
  
  // ABSOLUTE RULE: Explicit payment method text
  if (patterns.explicitTextFound.paymentMethod) {
    absoluteRules += `\n🔴 ABSOLUTE RULE - Explicit Payment Method:\n`
    absoluteRules += `- Receipt explicitly shows: "${patterns.explicitTextFound.paymentMethod}"\n`
    absoluteRules += `- Payment Method MUST be: "${patterns.explicitTextFound.paymentMethod}"\n`
    absoluteRules += `- This is visible text on the receipt, not a guess\n`
  }
  
  // DETECTED PATTERNS: Fuel indicators
  if (patterns.explicitTextFound.fuelIndicators && patterns.explicitTextFound.fuelIndicators.length > 0) {
    detectedPatterns += `\n⚠️ FUEL RECEIPT DETECTED:\n`
    detectedPatterns += `- Indicators found: ${patterns.explicitTextFound.fuelIndicators.join(', ')}\n`
    detectedPatterns += `- Category MUST be: car_and_truck\n`
    detectedPatterns += `- NOT "supplies" even if vendor is hardware store\n`
  }
  
  // DETECTED PATTERNS: Check indicators
  if (patterns.explicitTextFound.checkIndicators && patterns.explicitTextFound.checkIndicators.length > 0) {
    detectedPatterns += `\n⚠️ CHECK DETECTED:\n`
    detectedPatterns += `- Indicators: ${patterns.explicitTextFound.checkIndicators.join(', ')}\n`
    detectedPatterns += `- Payment Method MUST be "Check"\n`
    detectedPatterns += `- Income Source MUST be "check"\n`
    detectedPatterns += `- Type should be "income" (default for received checks)\n`
    detectedPatterns += `- Category should be "gross_receipts" (default until AI learns otherwise)\n`
    detectedPatterns += `- Vendor is the ACCOUNT HOLDER (top-left name), not the payee\n`
  }
  
  // DETECTED PATTERNS: Deposit indicators
  if (patterns.explicitTextFound.depositIndicators && patterns.explicitTextFound.depositIndicators.length > 0) {
    detectedPatterns += `\n⚠️ DEPOSIT/BANK STATEMENT DETECTED:\n`
    detectedPatterns += `- Indicators: ${patterns.explicitTextFound.depositIndicators.join(', ')}\n`
    detectedPatterns += `- Payment Method should be "Deposit"\n`
    detectedPatterns += `- Likely income transaction\n`
  }
  
  // LEARNED PATTERNS: Category corrections
  if (patterns.relevantPatterns.length > 0) {
    detectedPatterns += `\n📊 LEARNED PATTERNS (from user corrections):\n`
    patterns.relevantPatterns.forEach(p => {
      detectedPatterns += `- ${p.details} (confidence: ${(p.confidence * 100).toFixed(0)}%)\n`
    })
  }
  
  logger.info('[FOCUSED CATEGORIZER] 🎯 Call 2 starting with patterns:', {
    vendorMatch: patterns.vendorMatch ? `${patterns.vendorMatch.vendor} → ${patterns.vendorMatch.learnedCategory}` : 'none',
    relevantPatterns: patterns.relevantPatterns.length,
    fuelIndicators: patterns.explicitTextFound.fuelIndicators?.length || 0
  })

  const prompt = `You are a focused categorization system. You have already identified the relevant patterns.
Now apply them to categorize this transaction.

Transaction:
- Description: ${description}
- Amount: $${amount.toFixed(2)}
- Vendor: ${vendor}

Available EXPENSE categories: ${expenseCategories.join(', ')}
Available INCOME categories: ${incomeCategories.join(', ')}

${absoluteRules ? `${absoluteRules}\n` : ''}${detectedPatterns ? `${detectedPatterns}\n` : ''}

${!absoluteRules && !detectedPatterns ? 'No specific patterns found. Use your best judgment based on the transaction details.\n' : ''}

Respond ONLY with valid JSON in this exact format:
{
  "type": "income" or "expense",
  "category": "value from parentheses (e.g., car_and_truck, supplies, advertising)",
  "confidence": 0.0 to 1.0,
  "paymentMethod": "Card" | "Cash" | "Check" | "Credit" | "Debit" | "Deposit" (ONLY if indicated above or clearly detectable),
  "incomeSource": "check" | "cash" | "bank_transfer" | "deposit" | "card" | "other" (ONLY for income),
  "appliedPatterns": ["pattern1", "pattern2"],
  "reasoning": "brief explanation of which patterns were applied"
}

CRITICAL RULES:
1. If ABSOLUTE RULE shows payment method → USE IT (confidence = 0.95+)
2. If ABSOLUTE RULE shows category → USE IT (confidence = 0.95+)
3. If fuel detected → category MUST be: car_and_truck
4. If check detected → paymentMethod = "Check"
5. If deposit detected → paymentMethod = "Deposit"
6. List which patterns you applied in appliedPatterns array
7. Confidence should be HIGH (>0.9) if using absolute rules, MODERATE (0.7-0.9) if using detected patterns, LOW (<0.7) if guessing
8. 🔴 CRITICAL: Return the VALUE in parentheses (e.g., car_and_truck), NOT the label (e.g., Car and Truck Expenses)
9. 🔴 CRITICAL: For income transactions, ONLY use income categories (gross_receipts or other_income). NEVER use "other" for income - "other" is an EXPENSE category!`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1, // Very deterministic - just apply the patterns we found
            responseMimeType: 'application/json'
          }
        })
      }
    )

    if (!response.ok) {
      logger.warn('[FOCUSED CATEGORIZER] Gemini API failed, using deterministic fallback')
      return categorizeDeterministic(description, amount, vendor, patterns)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!text) {
      logger.warn('[FOCUSED CATEGORIZER] No response from Gemini, using deterministic fallback')
      return categorizeDeterministic(description, amount, vendor, patterns)
    }

    const geminiResult = JSON.parse(text) as CategorizationResult
    
    // CRITICAL: Validate income transactions use income categories only
    // Fix AI hallucinations where it returns type=income but category=other (expense category)
    const validIncomeCategories = ['gross_receipts', 'other_income']
    if (geminiResult.type === 'income' && !validIncomeCategories.includes(geminiResult.category)) {
      logger.warn(`[FOCUSED CATEGORIZER] ⚠️ Income transaction with invalid category "${geminiResult.category}", correcting to gross_receipts`)
      geminiResult.category = 'gross_receipts'
      geminiResult.confidence = Math.max(0.6, geminiResult.confidence - 0.1) // Reduce confidence slightly
    }
    
    logger.info('[FOCUSED CATEGORIZER] ✅ Call 2 complete:', {
      type: geminiResult.type,
      category: geminiResult.category,
      paymentMethod: geminiResult.paymentMethod,
      confidence: geminiResult.confidence,
      appliedPatterns: geminiResult.appliedPatterns,
      reasoning: geminiResult.reasoning
    })
    
    // CRITICAL: Log if AI ignored patterns
    if (patterns.vendorMatch?.learnedCategory && geminiResult.category !== patterns.vendorMatch.learnedCategory) {
      logger.warn(`[FOCUSED CATEGORIZER] ⚠️ AI IGNORED VENDOR PATTERN! Expected: ${patterns.vendorMatch.learnedCategory}, Got: ${geminiResult.category}`)
    }
    
    return {
      type: geminiResult.type,
      category: geminiResult.category,
      confidence: geminiResult.confidence,
      paymentMethod: geminiResult.paymentMethod,
      incomeSource: geminiResult.incomeSource,
      appliedPatterns: geminiResult.appliedPatterns || [],
      reasoning: geminiResult.reasoning || 'Categorization applied'
    }

  } catch (error) {
    logger.error('[FOCUSED CATEGORIZER] Error in focused categorization:', error)
    return categorizeDeterministic(description, amount, vendor, patterns)
  }
}

/**
 * Deterministic categorization fallback (no API call)
 * Uses simple heuristics + the patterns from Call 1
 */
function categorizeDeterministic(
  description: string,
  amount: number,
  vendor: string,
  patterns: PatternMatchResult
): CategorizationResult {
  const appliedPatterns: string[] = []
  
  // Use explicit payment method if found
  let paymentMethod = patterns.explicitTextFound.paymentMethod as any
  if (paymentMethod) {
    appliedPatterns.push('explicit_payment_text')
  }
  
  // PRIORITY 1: Check for deposit indicators FIRST (income categories are high priority)
  if (patterns.explicitTextFound.depositIndicators && patterns.explicitTextFound.depositIndicators.length > 0) {
    appliedPatterns.push('deposit_detected')
    logger.info(`[DETERMINISTIC] 💰 Deposit detected, using gross_receipts category`)
    return {
      type: 'income',
      category: 'gross_receipts',
      confidence: 0.85,
      paymentMethod: 'Deposit',
      incomeSource: 'deposit',
      appliedPatterns,
      reasoning: 'Bank deposit detected'
    }
  }
  
  // PRIORITY 2: Check for check indicators - DEFAULT TO INCOME (most received checks are income)
  // AI will learn which specific account holders are expenses through corrections
  if (patterns.explicitTextFound.checkIndicators && patterns.explicitTextFound.checkIndicators.length > 0) {
    appliedPatterns.push('check_detected')
    logger.info(`[DETERMINISTIC] ✅ Check detected - defaulting to income/gross_receipts`)
    
    // Default to income unless explicitly looks like expense
    const isExpense = description.toLowerCase().includes('payment sent') || 
                      description.toLowerCase().includes('check written')
    
    return {
      type: isExpense ? 'expense' : 'income',
      category: isExpense ? 'other' : 'gross_receipts',
      confidence: 0.8,
      paymentMethod: 'Check',
      incomeSource: isExpense ? undefined : 'check',
      appliedPatterns,
      reasoning: 'Check detected - vendor name from account holder (top-left)'
    }
  }
  
  // PRIORITY 3: Use vendor match if available AND has category (>=0.6 means at least 1 correction learned)
  // CRITICAL: Learned patterns override ALL explicit indicators (fuel/hardware/restaurant/grocery/office)
  // because user corrections are the strongest signal - if user corrected Home Depot 19 times to "supplies",
  // that overrides any fuel text detected in line items
  if (patterns.vendorMatch && patterns.vendorMatch.confidence >= 0.6 && patterns.vendorMatch.learnedCategory) {
    appliedPatterns.push('vendor_exact_match')
    
    // Fallback order: learned payment → explicit detection → detected payment method → Card
    const finalPayment = (patterns.vendorMatch.learnedPaymentMethod as any) || paymentMethod || 'Card'
    const finalIncomeSource = patterns.vendorMatch.learnedIncomeSource as any
    
    logger.info(`[DETERMINISTIC] ✅ Applying vendor pattern: ${patterns.vendorMatch.vendor} → ${patterns.vendorMatch.learnedCategory}, ${finalPayment}${finalIncomeSource ? `, incomeSource: ${finalIncomeSource}` : ''}`)
    
    return {
      type: patterns.vendorMatch.learnedType || 'expense',
      category: patterns.vendorMatch.learnedCategory,
      confidence: patterns.vendorMatch.confidence,
      paymentMethod: finalPayment,
      incomeSource: finalIncomeSource,
      appliedPatterns,
      reasoning: `Vendor "${patterns.vendorMatch.vendor}" matched with ${(patterns.vendorMatch.confidence * 100).toFixed(0)}% confidence`
    }
  }
  
  // PRIORITY 4: Check for fuel indicators (only if no learned vendor pattern)
  // Fuel text might appear in line items but learned patterns take precedence
  if (patterns.explicitTextFound.fuelIndicators && patterns.explicitTextFound.fuelIndicators.length > 0) {
    appliedPatterns.push('fuel_detected')
    logger.info(`[DETERMINISTIC] 🔥 Fuel detected, using car_and_truck category`)
    
    const finalPayment = (patterns.vendorMatch?.learnedPaymentMethod as any) || paymentMethod || 'Card'
    
    return {
      type: 'expense',
      category: 'car_and_truck',
      confidence: 0.9,
      paymentMethod: finalPayment,
      appliedPatterns,
      reasoning: `Fuel indicators detected: ${patterns.explicitTextFound.fuelIndicators.join(', ')}`
    }
  }
  
  // PRIORITY 5: Check for hardware indicators (FALLBACK - only if no learned pattern)
  if (patterns.explicitTextFound.hardwareIndicators && patterns.explicitTextFound.hardwareIndicators.length > 0) {
    appliedPatterns.push('hardware_detected')
    logger.info(`[DETERMINISTIC] 🛠️ Hardware detected, using repairs_maintenance category`)
    
    const finalPayment = (patterns.vendorMatch?.learnedPaymentMethod as any) || paymentMethod || 'Card'
    
    return {
      type: 'expense',
      category: 'repairs_maintenance',
      confidence: 0.85,
      paymentMethod: finalPayment,
      appliedPatterns,
      reasoning: `Hardware indicators detected: ${patterns.explicitTextFound.hardwareIndicators.join(', ')}`
    }
  }
  
  // PRIORITY 6: Check for restaurant indicators (FALLBACK - only if no learned pattern)
  if (patterns.explicitTextFound.restaurantIndicators && patterns.explicitTextFound.restaurantIndicators.length > 0) {
    appliedPatterns.push('restaurant_detected')
    logger.info(`[DETERMINISTIC] 🍔 Restaurant detected, using meals category`)
    
    const finalPayment = (patterns.vendorMatch?.learnedPaymentMethod as any) || paymentMethod || 'Card'
    
    return {
      type: 'expense',
      category: 'meals',
      confidence: 0.85,
      paymentMethod: finalPayment,
      appliedPatterns,
      reasoning: `Restaurant indicators detected: ${patterns.explicitTextFound.restaurantIndicators.join(', ')}`
    }
  }
  
  // PRIORITY 7: Check for grocery indicators (FALLBACK - only if no learned pattern)
  if (patterns.explicitTextFound.groceryIndicators && patterns.explicitTextFound.groceryIndicators.length > 0) {
    appliedPatterns.push('grocery_detected')
    logger.info(`[DETERMINISTIC] 🛒 Grocery detected, using supplies category`)
    
    const finalPayment = (patterns.vendorMatch?.learnedPaymentMethod as any) || paymentMethod || 'Card'
    
    return {
      type: 'expense',
      category: 'supplies',
      confidence: 0.8,
      paymentMethod: finalPayment,
      appliedPatterns,
      reasoning: `Grocery indicators detected: ${patterns.explicitTextFound.groceryIndicators.join(', ')}`
    }
  }
  
  // PRIORITY 8: Check for office supply indicators (FALLBACK - only if no learned pattern)
  if (patterns.explicitTextFound.officeSupplyIndicators && patterns.explicitTextFound.officeSupplyIndicators.length > 0) {
    appliedPatterns.push('office_supply_detected')
    logger.info(`[DETERMINISTIC] 📄 Office supply detected, using office_expense category`)
    
    const finalPayment = (patterns.vendorMatch?.learnedPaymentMethod as any) || paymentMethod || 'Card'
    
    return {
      type: 'expense',
      category: 'office_expense',
      confidence: 0.85,
      paymentMethod: finalPayment,
      appliedPatterns,
      reasoning: `Office supply indicators detected: ${patterns.explicitTextFound.officeSupplyIndicators.join(', ')}`
    }
  }
  
  
  // Fallback to basic heuristics
  appliedPatterns.push('fallback_heuristics')
  
  const desc = description.toLowerCase()
  
  // Income detection
  if (desc.includes('deposit') || desc.includes('payment received')) {
    return {
      type: 'income',
      category: 'gross_receipts',
      confidence: 0.6,
      paymentMethod,
      appliedPatterns,
      reasoning: 'Income keywords detected'
    }
  }
  
  // Default to expense
  return {
    type: 'expense',
    category: 'other',
    confidence: 0.4,
    paymentMethod,
    appliedPatterns,
    reasoning: 'No specific patterns matched, defaulting to expense'
  }
}
