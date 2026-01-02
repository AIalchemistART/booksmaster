import type { Transaction } from '@/types'

/**
 * 2024 Tax Rates for Self-Employment
 * Source: IRS Tax Tables
 */
const TAX_YEAR_2024 = {
  // Self-employment tax rate (Social Security + Medicare)
  selfEmploymentTaxRate: 0.153, // 15.3% (12.4% SS + 2.9% Medicare)
  
  // Federal income tax brackets for single filers
  federalBrackets: [
    { max: 11600, rate: 0.10 },
    { max: 47150, rate: 0.12 },
    { max: 100525, rate: 0.22 },
    { max: 191950, rate: 0.24 },
    { max: 243725, rate: 0.32 },
    { max: 609350, rate: 0.35 },
    { max: Infinity, rate: 0.37 }
  ],
  
  // Standard deduction
  standardDeduction: 14600,
  
  // QBI deduction threshold (20% of qualified business income)
  qbiThreshold: 191950,
  qbiDeduction: 0.20
}

export interface QuarterlyTaxEstimate {
  quarter: 1 | 2 | 3 | 4
  quarterLabel: string
  dueDate: string
  grossIncome: number
  totalExpenses: number
  netProfit: number
  selfEmploymentTax: number
  federalIncomeTax: number
  totalTaxDue: number
  estimatedPayment: number
  paymentStatus: 'not_due' | 'due_soon' | 'overdue' | 'paid'
}

export interface AnnualTaxProjection {
  ytdGrossIncome: number
  ytdExpenses: number
  ytdNetProfit: number
  
  projectedAnnualIncome: number
  projectedAnnualExpenses: number
  projectedNetProfit: number
  
  selfEmploymentTax: number
  federalIncomeTax: number
  totalEstimatedTax: number
  
  effectiveTaxRate: number
  
  quarters: QuarterlyTaxEstimate[]
}

/**
 * Calculate self-employment tax (Social Security + Medicare)
 */
function calculateSelfEmploymentTax(netProfit: number): number {
  // Only 92.35% of net profit is subject to SE tax
  const adjustedProfit = netProfit * 0.9235
  return adjustedProfit * TAX_YEAR_2024.selfEmploymentTaxRate
}

/**
 * Calculate federal income tax using progressive brackets
 */
function calculateFederalIncomeTax(taxableIncome: number): number {
  let tax = 0
  let previousMax = 0
  
  for (const bracket of TAX_YEAR_2024.federalBrackets) {
    const bracketIncome = Math.min(taxableIncome - previousMax, bracket.max - previousMax)
    if (bracketIncome <= 0) break
    
    tax += bracketIncome * bracket.rate
    previousMax = bracket.max
    
    if (taxableIncome <= bracket.max) break
  }
  
  return tax
}

/**
 * Calculate quarterly tax estimates
 */
export function calculateQuarterlyEstimates(
  transactions: Transaction[],
  year?: number
): AnnualTaxProjection {
  const targetYear = year || new Date().getFullYear()
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1 // 1-12
  const currentQuarter = Math.ceil(currentMonth / 3)
  
  // Filter transactions for target year
  const yearTransactions = transactions.filter(t => {
    const txYear = new Date(t.date).getFullYear()
    return txYear === targetYear && !t.isDuplicateOfLinked
  })
  
  // Calculate YTD totals
  const ytdGrossIncome = yearTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const ytdExpenses = yearTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const ytdNetProfit = ytdGrossIncome - ytdExpenses
  
  // Project annual totals based on YTD performance
  const monthsElapsed = currentMonth
  const monthsRemaining = 12 - monthsElapsed
  const monthlyAverageIncome = ytdGrossIncome / monthsElapsed
  const monthlyAverageExpenses = ytdExpenses / monthsElapsed
  
  const projectedAnnualIncome = ytdGrossIncome + (monthlyAverageIncome * monthsRemaining)
  const projectedAnnualExpenses = ytdExpenses + (monthlyAverageExpenses * monthsRemaining)
  const projectedNetProfit = projectedAnnualIncome - projectedAnnualExpenses
  
  // Calculate taxes
  const selfEmploymentTax = calculateSelfEmploymentTax(projectedNetProfit)
  
  // Deduct 50% of SE tax from AGI for income tax calculation
  const adjustedGrossIncome = projectedNetProfit - (selfEmploymentTax / 2)
  
  // Apply QBI deduction if applicable (20% of QBI for income under threshold)
  const qbiDeduction = adjustedGrossIncome < TAX_YEAR_2024.qbiThreshold
    ? Math.min(projectedNetProfit * TAX_YEAR_2024.qbiDeduction, adjustedGrossIncome * 0.20)
    : 0
  
  // Calculate taxable income
  const taxableIncome = Math.max(0, adjustedGrossIncome - TAX_YEAR_2024.standardDeduction - qbiDeduction)
  
  const federalIncomeTax = calculateFederalIncomeTax(taxableIncome)
  const totalEstimatedTax = selfEmploymentTax + federalIncomeTax
  const effectiveTaxRate = projectedNetProfit > 0 ? (totalEstimatedTax / projectedNetProfit) : 0
  
  // Calculate quarterly breakdown
  const quarterlyTaxDue = totalEstimatedTax / 4
  
  const quarters: QuarterlyTaxEstimate[] = [
    {
      quarter: 1,
      quarterLabel: 'Q1 (Jan-Mar)',
      dueDate: `${targetYear}-04-15`,
      grossIncome: 0,
      totalExpenses: 0,
      netProfit: 0,
      selfEmploymentTax: 0,
      federalIncomeTax: 0,
      totalTaxDue: 0,
      estimatedPayment: quarterlyTaxDue,
      paymentStatus: currentQuarter > 1 ? 'overdue' : currentQuarter === 1 ? 'due_soon' : 'not_due'
    },
    {
      quarter: 2,
      quarterLabel: 'Q2 (Apr-Jun)',
      dueDate: `${targetYear}-06-15`,
      grossIncome: 0,
      totalExpenses: 0,
      netProfit: 0,
      selfEmploymentTax: 0,
      federalIncomeTax: 0,
      totalTaxDue: 0,
      estimatedPayment: quarterlyTaxDue,
      paymentStatus: currentQuarter > 2 ? 'overdue' : currentQuarter === 2 ? 'due_soon' : 'not_due'
    },
    {
      quarter: 3,
      quarterLabel: 'Q3 (Jul-Sep)',
      dueDate: `${targetYear}-09-15`,
      grossIncome: 0,
      totalExpenses: 0,
      netProfit: 0,
      selfEmploymentTax: 0,
      federalIncomeTax: 0,
      totalTaxDue: 0,
      estimatedPayment: quarterlyTaxDue,
      paymentStatus: currentQuarter > 3 ? 'overdue' : currentQuarter === 3 ? 'due_soon' : 'not_due'
    },
    {
      quarter: 4,
      quarterLabel: 'Q4 (Oct-Dec)',
      dueDate: `${targetYear + 1}-01-15`,
      grossIncome: 0,
      totalExpenses: 0,
      netProfit: 0,
      selfEmploymentTax: 0,
      federalIncomeTax: 0,
      totalTaxDue: 0,
      estimatedPayment: quarterlyTaxDue,
      paymentStatus: currentQuarter > 4 ? 'overdue' : currentQuarter === 4 ? 'due_soon' : 'not_due'
    }
  ]
  
  // Calculate actual amounts per quarter
  quarters.forEach((q, idx) => {
    const quarterStart = new Date(targetYear, idx * 3, 1)
    const quarterEnd = new Date(targetYear, (idx + 1) * 3, 0)
    
    const quarterTransactions = yearTransactions.filter(t => {
      const date = new Date(t.date)
      return date >= quarterStart && date <= quarterEnd
    })
    
    q.grossIncome = quarterTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    q.totalExpenses = quarterTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    
    q.netProfit = q.grossIncome - q.totalExpenses
  })
  
  return {
    ytdGrossIncome,
    ytdExpenses,
    ytdNetProfit,
    projectedAnnualIncome,
    projectedAnnualExpenses,
    projectedNetProfit,
    selfEmploymentTax,
    federalIncomeTax,
    totalEstimatedTax,
    effectiveTaxRate,
    quarters
  }
}

/**
 * Get tax deadline dates for a given year
 */
export function getTaxDeadlines(year: number) {
  return {
    q1: new Date(`${year}-04-15`),
    q2: new Date(`${year}-06-15`),
    q3: new Date(`${year}-09-15`),
    q4: new Date(`${year + 1}-01-15`),
    annualFiling: new Date(`${year + 1}-04-15`),
    extensionDeadline: new Date(`${year + 1}-10-15`)
  }
}

/**
 * Check if a deadline is approaching (within 30 days)
 */
export function isDeadlineApproaching(deadline: Date): boolean {
  const now = new Date()
  const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntil > 0 && daysUntil <= 30
}
