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
 * Exported for use in receipt processing to avoid Gemini rate limiting
 */
export function fallbackCategorization(
  description: string,
  amount: number,
  vendor?: string
): CategorizationResult {
  const desc = description.toLowerCase()
  const vendorLower = (vendor || '').toLowerCase()

  // Income indicators - deposits, payments received, job payments
  const incomeKeywords = [
    'deposit', 'payment received', 'job completed', 'payment to thomas',
    'check - same day', 'small business checking deposit', 'checking deposit',
    'business share savings new account deposit'
  ]
  const hasIncomeKeyword = incomeKeywords.some(keyword => desc.includes(keyword) || vendorLower.includes(keyword))
  
  // Vendors that indicate income (banks, clients paying)
  const incomeVendors = ['credit union', 'iccu', 'idaho central', 'bank']
  const isIncomeVendor = incomeVendors.some(vendor => vendorLower.includes(vendor))
  
  // Check if description mentions payment TO the business owner
  const paymentToOwner = desc.includes('payment to thomas') || desc.includes('tom fenwick')
  
  if (hasIncomeKeyword || (isIncomeVendor && desc.includes('deposit')) || paymentToOwner) {
    // Determine income category
    if (desc.includes('remod') || desc.includes('bath') || desc.includes('residential') || paymentToOwner) {
      return { type: 'income', category: 'Residential Job', confidence: 0.8 }
    } else if (desc.includes('commercial')) {
      return { type: 'income', category: 'Commercial Job', confidence: 0.8 }
    } else if (desc.includes('repair')) {
      return { type: 'income', category: 'Repairs', confidence: 0.8 }
    } else {
      return { type: 'income', category: 'Residential Job', confidence: 0.6 }
    }
  }

  // Expense categorization by keywords and vendor names
  
  // Fuel/Gas stations
  if (desc.includes('fuel') || desc.includes('gas') || desc.includes('diesel') ||
      vendorLower.includes('shell') || vendorLower.includes('chevron') || 
      vendorLower.includes('exxon') || vendorLower.includes('mobil') ||
      vendorLower.includes('bp') || vendorLower.includes('arco') ||
      vendorLower.includes('texaco') || vendorLower.includes('citgo') ||
      vendorLower.includes('7-eleven') || vendorLower.includes('circle k')) {
    return { type: 'expense', category: 'Fuel', confidence: 0.8 }
  }

  // Building materials suppliers
  if (desc.includes('home depot') || desc.includes('lowes') || desc.includes('lumber') ||
      vendorLower.includes('depot') || vendorLower.includes('lowes') ||
      vendorLower.includes('84 lumber') || vendorLower.includes('menards') ||
      vendorLower.includes('ace hardware')) {
    return { type: 'expense', category: 'Materials', confidence: 0.8 }
  }

  // Tools and equipment
  if (desc.includes('tool') || desc.includes('drill') || desc.includes('saw') ||
      vendorLower.includes('harbor freight') || vendorLower.includes('northern tool')) {
    return { type: 'expense', category: 'Tools', confidence: 0.8 }
  }

  // Insurance
  if (desc.includes('insurance') || desc.includes('premium') ||
      vendorLower.includes('state farm') || vendorLower.includes('geico') ||
      vendorLower.includes('progressive') || vendorLower.includes('allstate')) {
    return { type: 'expense', category: 'Insurance', confidence: 0.9 }
  }

  // Permits and licenses
  if (desc.includes('permit') || desc.includes('license') || desc.includes('fee') ||
      vendorLower.includes('city of') || vendorLower.includes('county')) {
    return { type: 'expense', category: 'Permits', confidence: 0.85 }
  }

  // Office supplies
  if (desc.includes('office') || desc.includes('staples') || desc.includes('paper') ||
      vendorLower.includes('staples') || vendorLower.includes('office depot') ||
      vendorLower.includes('officemax')) {
    return { type: 'expense', category: 'Office Supplies', confidence: 0.8 }
  }

  // Marketing and advertising
  if (desc.includes('marketing') || desc.includes('advertising') || desc.includes('ad') ||
      desc.includes('website') || desc.includes('seo') || desc.includes('social media') ||
      vendorLower.includes('google ads') || vendorLower.includes('facebook')) {
    return { type: 'expense', category: 'Marketing', confidence: 0.8 }
  }

  // Vehicle maintenance
  if (desc.includes('oil change') || desc.includes('tire') || desc.includes('brake') ||
      desc.includes('repair') || desc.includes('auto') || desc.includes('vehicle') ||
      vendorLower.includes('jiffy lube') || vendorLower.includes('pep boys') ||
      vendorLower.includes('midas') || vendorLower.includes('firestone')) {
    return { type: 'expense', category: 'Vehicle Maintenance', confidence: 0.8 }
  }

  // Equipment rental
  if (desc.includes('rental') || desc.includes('rent') || desc.includes('lease') ||
      vendorLower.includes('sunbelt') || vendorLower.includes('united rentals') ||
      vendorLower.includes('herc rentals')) {
    return { type: 'expense', category: 'Equipment Rental', confidence: 0.8 }
  }

  // Professional services (accountant, lawyer, etc.)
  if (desc.includes('accountant') || desc.includes('lawyer') || desc.includes('attorney') ||
      desc.includes('consultant') || desc.includes('professional') ||
      vendorLower.includes('cpa') || vendorLower.includes('law firm')) {
    return { type: 'expense', category: 'Professional Services', confidence: 0.8 }
  }

  // Utilities
  if (desc.includes('electric') || desc.includes('water') || desc.includes('utility') ||
      desc.includes('internet') || desc.includes('phone') ||
      vendorLower.includes('pge') || vendorLower.includes('at&t') ||
      vendorLower.includes('verizon') || vendorLower.includes('comcast')) {
    return { type: 'expense', category: 'Utilities', confidence: 0.8 }
  }

  // Default to Other for expenses (lower confidence)
  return {
    type: 'expense',
    category: 'Other',
    confidence: 0.3
  }
}

/**
 * Get available categories for a transaction type
 */
export function getCategoriesForType(type: 'income' | 'expense'): string[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}
