import { getGeminiApiKey } from './ocr/gemini-vision'

export interface CategorizationResult {
  type: 'income' | 'expense'
  category: string
  confidence: number
}

const EXPENSE_CATEGORIES = [
  'Materials',
  'Tools',
  'Fuel',
  'Insurance',
  'Permits',
  'Subcontractors',
  'Office Supplies',
  'Marketing',
  'Vehicle Maintenance',
  'Equipment Rental',
  'Professional Services',
  'Utilities',
  'Other'
]

const INCOME_CATEGORIES = [
  'Residential Job',
  'Commercial Job',
  'Repairs',
  'Consultation',
  'Other Income'
]

/**
 * Use Gemini AI to categorize a transaction
 */
export async function categorizeTransaction(
  description: string,
  amount: number,
  vendor?: string
): Promise<CategorizationResult> {
  const apiKey = getGeminiApiKey()
  
  if (!apiKey) {
    // Fallback to simple heuristics if no API key
    return fallbackCategorization(description, amount, vendor)
  }

  try {
    const prompt = `You are a financial categorization assistant for a residential contracting LLC business.

Analyze this transaction and determine:
1. Is it INCOME or EXPENSE?
2. What category does it belong to?

Transaction Details:
- Description: ${description}
- Amount: $${amount.toFixed(2)}
${vendor ? `- Vendor: ${vendor}` : ''}

Available EXPENSE categories: ${EXPENSE_CATEGORIES.join(', ')}
Available INCOME categories: ${INCOME_CATEGORIES.join(', ')}

Respond ONLY with valid JSON in this exact format:
{
  "type": "income" or "expense",
  "category": "one of the categories from the lists above",
  "confidence": 0.0 to 1.0
}

Important rules:
- If the description mentions payment received, completed job, invoice paid, deposit, it's INCOME
- If it's a purchase, payment to vendor, bill, subscription, it's EXPENSE
- Choose the most specific category that matches
- Confidence should be high (>0.8) only if very certain`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json'
          }
        })
      }
    )

    if (!response.ok) {
      console.warn('Gemini categorization failed, using fallback')
      return fallbackCategorization(description, amount, vendor)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!text) {
      return fallbackCategorization(description, amount, vendor)
    }

    const result = JSON.parse(text)
    
    // Validate result
    if (!result.type || !result.category) {
      return fallbackCategorization(description, amount, vendor)
    }

    return {
      type: result.type === 'income' ? 'income' : 'expense',
      category: result.category,
      confidence: result.confidence || 0.5
    }

  } catch (error) {
    console.error('Error in Gemini categorization:', error)
    return fallbackCategorization(description, amount, vendor)
  }
}

/**
 * Simple heuristic-based categorization fallback
 */
function fallbackCategorization(
  description: string,
  amount: number,
  vendor?: string
): CategorizationResult {
  const desc = description.toLowerCase()
  const vendorLower = (vendor || '').toLowerCase()

  // Income indicators
  const incomeKeywords = ['payment', 'paid', 'invoice', 'deposit', 'job completed', 'received']
  const isIncome = incomeKeywords.some(keyword => desc.includes(keyword))

  if (isIncome) {
    return {
      type: 'income',
      category: 'Residential Job',
      confidence: 0.6
    }
  }

  // Expense categorization by keywords
  if (desc.includes('fuel') || desc.includes('gas') || vendorLower.includes('shell') || vendorLower.includes('chevron')) {
    return { type: 'expense', category: 'Fuel', confidence: 0.7 }
  }

  if (desc.includes('home depot') || desc.includes('lowes') || vendorLower.includes('depot') || vendorLower.includes('lowes')) {
    return { type: 'expense', category: 'Materials', confidence: 0.8 }
  }

  if (desc.includes('tool') || desc.includes('hardware')) {
    return { type: 'expense', category: 'Tools', confidence: 0.7 }
  }

  if (desc.includes('insurance')) {
    return { type: 'expense', category: 'Insurance', confidence: 0.9 }
  }

  if (desc.includes('permit')) {
    return { type: 'expense', category: 'Permits', confidence: 0.9 }
  }

  // Default to Materials for expenses
  return {
    type: 'expense',
    category: 'Materials',
    confidence: 0.4
  }
}

/**
 * Get available categories for a transaction type
 */
export function getCategoriesForType(type: 'income' | 'expense'): string[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}
