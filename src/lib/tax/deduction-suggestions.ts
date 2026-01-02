import type { Transaction, ExpenseCategory } from '@/types'

export interface DeductionSuggestion {
  id: string
  title: string
  description: string
  category: ExpenseCategory | 'home_office' | 'vehicle' | 'general'
  potentialSavings: number
  confidence: 'high' | 'medium' | 'low'
  actionItems: string[]
  learnMoreUrl?: string
}

/**
 * Analyze transactions and suggest potential missed deductions
 */
export function suggestDeductions(
  transactions: Transaction[],
  year?: number
): DeductionSuggestion[] {
  const targetYear = year || new Date().getFullYear()
  const suggestions: DeductionSuggestion[] = []
  
  // Filter to active transactions for the year
  const yearTransactions = transactions.filter(t => {
    const txYear = new Date(t.date).getFullYear()
    return txYear === targetYear && !t.isDuplicateOfLinked
  })
  
  const expenses = yearTransactions.filter(t => t.type === 'expense')
  
  // Calculate category totals
  const categoryTotals = expenses.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {} as Record<string, number>)
  
  // 1. Home Office Deduction
  const hasUtilities = categoryTotals['utilities'] > 0
  const hasOfficeSupplies = categoryTotals['office_supplies'] > 0
  
  if (hasUtilities || hasOfficeSupplies) {
    const estimatedHomeOfficeSavings = 1500 // Conservative estimate
    suggestions.push({
      id: 'home-office',
      title: 'Home Office Deduction',
      description: 'You have utility and office supply expenses. If you use part of your home exclusively for business, you may qualify for the home office deduction.',
      category: 'home_office',
      potentialSavings: estimatedHomeOfficeSavings,
      confidence: 'medium',
      actionItems: [
        'Measure your home office space (square footage)',
        'Calculate percentage of home used for business',
        'Keep records of utilities, rent/mortgage, insurance',
        'Use simplified method ($5 per sq ft, max 300 sq ft) or actual expense method'
      ],
      learnMoreUrl: 'https://www.irs.gov/businesses/small-businesses-self-employed/home-office-deduction'
    })
  }
  
  // 2. Vehicle Expenses
  const hasFuel = categoryTotals['fuel'] > 0
  const hasVehicleMaintenance = categoryTotals['vehicle_maintenance'] > 0
  
  if (hasFuel || hasVehicleMaintenance) {
    const fuelExpenses = categoryTotals['fuel'] || 0
    const maintenanceExpenses = categoryTotals['vehicle_maintenance'] || 0
    const totalVehicleExpenses = fuelExpenses + maintenanceExpenses
    
    // Estimate potential additional savings with mileage tracking
    // Standard mileage rate is 67¢/mile for 2024
    const estimatedMiles = totalVehicleExpenses / 0.15 // rough estimate: $0.15 per mile in actual costs
    const standardMileageDeduction = estimatedMiles * 0.67
    const potentialAdditionalSavings = Math.max(0, standardMileageDeduction - totalVehicleExpenses)
    
    if (potentialAdditionalSavings > 100) {
      suggestions.push({
        id: 'vehicle-mileage',
        title: 'Vehicle Mileage Tracking',
        description: `You're tracking ${totalVehicleExpenses.toFixed(0)} in vehicle expenses, but you could potentially deduct more using the standard mileage rate.`,
        category: 'vehicle',
        potentialSavings: potentialAdditionalSavings,
        confidence: 'medium',
        actionItems: [
          'Start tracking business mileage with a mileage log',
          'Record odometer readings at start/end of year',
          'Log purpose of each business trip',
          'Compare actual expense method vs standard mileage rate annually'
        ],
        learnMoreUrl: 'https://www.irs.gov/tax-professionals/standard-mileage-rates'
      })
    }
  }
  
  // 3. Missing Common Contractor Expenses
  const commonExpenses: Array<{ category: ExpenseCategory; name: string; avgAnnual: number }> = [
    { category: 'insurance', name: 'Business Insurance', avgAnnual: 2000 },
    { category: 'professional_services', name: 'Professional Services (CPA, Legal)', avgAnnual: 1000 },
    { category: 'marketing', name: 'Marketing & Advertising', avgAnnual: 500 },
    { category: 'tools', name: 'Tools & Equipment', avgAnnual: 1500 }
  ]
  
  commonExpenses.forEach(expense => {
    const hasExpense = categoryTotals[expense.category] > 0
    if (!hasExpense) {
      suggestions.push({
        id: `missing-${expense.category}`,
        title: `Missing ${expense.name} Expenses`,
        description: `Most contractors have ${expense.name.toLowerCase()} expenses. Make sure you're tracking these deductions.`,
        category: expense.category,
        potentialSavings: expense.avgAnnual * 0.25, // Assume 25% tax rate
        confidence: 'low',
        actionItems: [
          `Review if you have any ${expense.name.toLowerCase()} expenses`,
          'Add receipts for these expenses if you have them',
          `Consider budgeting for ${expense.name.toLowerCase()} in the future`
        ]
      })
    }
  })
  
  // 4. Receipt Validation Reminder
  const unvalidatedReceipts = expenses.filter(t => t.receiptId && !t.userValidated).length
  if (unvalidatedReceipts > 5) {
    suggestions.push({
      id: 'validate-receipts',
      title: 'Unvalidated Receipt Deductions',
      description: `You have ${unvalidatedReceipts} expense transactions with receipts that haven't been validated. Validate them to strengthen your deduction claims.`,
      category: 'general',
      potentialSavings: 0,
      confidence: 'high',
      actionItems: [
        'Review each receipt image to verify accuracy',
        'Correct any OCR errors in amounts or vendors',
        'Mark receipts as validated once confirmed'
      ]
    })
  }
  
  // 5. Quarterly Estimated Tax Payments
  const hasPayments = expenses.some(t => 
    t.description.toLowerCase().includes('estimated tax') ||
    t.description.toLowerCase().includes('quarterly payment')
  )
  
  if (!hasPayments) {
    suggestions.push({
      id: 'estimated-tax-tracking',
      title: 'Track Estimated Tax Payments',
      description: 'Remember to track your quarterly estimated tax payments as expenses to avoid double-counting them.',
      category: 'general',
      potentialSavings: 0,
      confidence: 'high',
      actionItems: [
        'Create a transaction for each quarterly tax payment',
        'Categorize as "professional_services" or create a "taxes" category',
        'Keep confirmation receipts from IRS payments'
      ]
    })
  }
  
  // 6. Subcontractor Payments (1099 tracking)
  const subcontractorExpenses = categoryTotals['subcontractors'] || 0
  if (subcontractorExpenses > 600) {
    suggestions.push({
      id: '1099-requirement',
      title: '1099 Forms Required',
      description: `You paid $${subcontractorExpenses.toFixed(2)} to subcontractors. You'll need to file 1099-NEC forms for any contractor you paid $600 or more.`,
      category: 'subcontractors',
      potentialSavings: 0,
      confidence: 'high',
      actionItems: [
        'Collect W-9 forms from all subcontractors',
        'Track total payments per contractor',
        'File 1099-NEC forms by January 31st',
        'Keep records for at least 3 years'
      ],
      learnMoreUrl: 'https://www.irs.gov/forms-pubs/about-form-1099-nec'
    })
  }
  
  // Sort by potential savings (highest first)
  return suggestions.sort((a, b) => b.potentialSavings - a.potentialSavings)
}

/**
 * Calculate simplified home office deduction
 */
export function calculateSimplifiedHomeOffice(squareFeet: number): number {
  const maxSquareFeet = 300
  const ratePerSquareFoot = 5
  return Math.min(squareFeet, maxSquareFeet) * ratePerSquareFoot
}

/**
 * Calculate actual home office deduction
 */
export function calculateActualHomeOffice(
  totalHomeExpenses: number,
  homeSquareFeet: number,
  officeSquareFeet: number
): number {
  const businessPercentage = officeSquareFeet / homeSquareFeet
  return totalHomeExpenses * businessPercentage
}

/**
 * Calculate standard mileage deduction
 */
export function calculateStandardMileage(businessMiles: number, year: number = 2024): number {
  // IRS standard mileage rates
  const rates: Record<number, number> = {
    2024: 0.67,
    2023: 0.655,
    2022: 0.625
  }
  
  const rate = rates[year] || 0.67
  return businessMiles * rate
}
