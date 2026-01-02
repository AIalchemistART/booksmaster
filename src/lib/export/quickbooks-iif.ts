import type { Transaction } from '@/types'
import { formatDate } from '../utils'

/**
 * Export transactions to QuickBooks IIF format
 * IIF (Intuit Interchange Format) is used for importing into QuickBooks Desktop
 */
export function exportToQuickBooksIIF(transactions: Transaction[], year?: number): string {
  const targetYear = year || new Date().getFullYear()
  
  // Filter for target year and exclude duplicates
  const yearTransactions = transactions.filter(t => {
    const txYear = new Date(t.date).getFullYear()
    return txYear === targetYear && !t.isDuplicateOfLinked
  })

  let iif = ''

  // IIF Header
  iif += `!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tDOCNUM\tMEMO\tCLEAR\n`
  iif += `!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tDOCNUM\tMEMO\tCLEAR\n`
  iif += `!ENDTRNS\n`

  // Export each transaction
  yearTransactions.forEach((t, index) => {
    const trnsId = `TRNS-${index + 1}`
    const qbDate = formatDateForQB(t.date)
    const qbType = t.type === 'income' ? 'DEPOSIT' : 'CHECK'
    const qbAccount = t.type === 'income' ? 'Income' : mapCategoryToQBAccount(t.category)
    const amount = t.type === 'income' ? t.amount : -t.amount
    const memo = escapeIIF(t.description)
    const docNum = t.receiptId || ''

    // Transaction header
    iif += `TRNS\t${trnsId}\t${qbType}\t${qbDate}\tUndeposited Funds\t${escapeIIF(t.description)}\t\t${amount.toFixed(2)}\t${docNum}\t${memo}\tN\n`
    
    // Split line (offsetting account)
    iif += `SPL\t${trnsId}-SPL\t${qbType}\t${qbDate}\t${qbAccount}\t\t\t${(-amount).toFixed(2)}\t\t${escapeIIF(t.category)}\tN\n`
    
    // End transaction
    iif += `ENDTRNS\n`
  })

  return iif
}

/**
 * Map expense categories to QuickBooks account names
 */
function mapCategoryToQBAccount(category: string): string {
  const mapping: Record<string, string> = {
    'materials': 'Cost of Goods Sold:Materials',
    'tools': 'Equipment:Tools',
    'fuel': 'Auto Expense:Fuel',
    'subcontractors': 'Contract Labor',
    'insurance': 'Insurance',
    'permits': 'Licenses and Permits',
    'office_supplies': 'Office Supplies',
    'marketing': 'Advertising',
    'vehicle_maintenance': 'Auto Expense:Repairs',
    'equipment_rental': 'Equipment Rental',
    'professional_services': 'Professional Fees',
    'utilities': 'Utilities',
    'other': 'Other Expenses',
    // Income categories
    'residential_job': 'Income:Residential',
    'commercial_job': 'Income:Commercial',
    'repairs': 'Income:Repairs',
    'consultation': 'Income:Consultation',
    'other_income': 'Other Income'
  }

  return mapping[category] || 'Other Expenses'
}

/**
 * Format date for QuickBooks (MM/DD/YYYY)
 */
function formatDateForQB(dateString: string): string {
  const date = new Date(dateString)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}

/**
 * Escape IIF special characters
 */
function escapeIIF(value: string): string {
  if (!value) return ''
  // Remove tabs and newlines, truncate long descriptions
  return value
    .replace(/\t/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .substring(0, 255) // QB has field length limits
}

/**
 * Download IIF file
 */
export function downloadQuickBooksIIF(transactions: Transaction[], year?: number) {
  const iif = exportToQuickBooksIIF(transactions, year)
  const blob = new Blob([iif], { type: 'text/plain;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  const targetYear = year || new Date().getFullYear()
  link.setAttribute('href', url)
  link.setAttribute('download', `thomas-books-qb-${targetYear}.iif`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
