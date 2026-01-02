import type { Transaction } from '@/types'
import { formatDate } from '../utils'

/**
 * Export transactions to Schedule C compatible CSV format
 * IRS Schedule C is used by sole proprietors to report business income/expenses
 */
export function exportScheduleC(
  transactions: Transaction[],
  year?: number
): string {
  const targetYear = year || new Date().getFullYear()
  
  // Filter transactions for the target year and exclude duplicates
  const yearTransactions = transactions.filter(t => {
    const txYear = new Date(t.date).getFullYear()
    return txYear === targetYear && !t.isDuplicateOfLinked
  })

  // Separate income and expenses
  const income = yearTransactions.filter(t => t.type === 'income')
  const expenses = yearTransactions.filter(t => t.type === 'expense')

  // Build CSV content
  let csv = `Schedule C - Business Income and Expenses for ${targetYear}\n\n`
  
  // Income Section
  csv += `INCOME\n`
  csv += `Date,Description,Category,Amount,Verification,Notes\n`
  
  income.forEach(t => {
    csv += `"${formatDate(t.date)}","${escapeCsv(t.description)}","${escapeCsv(t.category)}",${t.amount},"${t.verificationLevel || 'self_reported'}","${escapeCsv(t.notes || '')}"\n`
  })
  
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0)
  csv += `\nTotal Income,,,${totalIncome.toFixed(2)}\n\n`

  // Expenses Section by Category
  csv += `EXPENSES\n`
  csv += `Date,Description,Category,Amount,Payment Method,Receipt,Notes\n`
  
  expenses.forEach(t => {
    csv += `"${formatDate(t.date)}","${escapeCsv(t.description)}","${escapeCsv(t.category)}",${t.amount},"${escapeCsv(t.paymentMethod || 'N/A')}","${t.receiptId ? 'Yes' : 'No'}","${escapeCsv(t.notes || '')}"\n`
  })
  
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0)
  csv += `\nTotal Expenses,,,${totalExpenses.toFixed(2)}\n\n`

  // Summary
  csv += `SUMMARY\n`
  csv += `Total Income,${totalIncome.toFixed(2)}\n`
  csv += `Total Expenses,${totalExpenses.toFixed(2)}\n`
  csv += `Net Profit/Loss,${(totalIncome - totalExpenses).toFixed(2)}\n\n`

  // Category Breakdown
  csv += `\nEXPENSE BREAKDOWN BY CATEGORY\n`
  csv += `Category,Amount,Count\n`
  
  const categoryTotals = expenses.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {} as Record<string, number>)

  const categoryCounts = expenses.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .forEach(([category, amount]) => {
      csv += `"${escapeCsv(category)}",${amount.toFixed(2)},${categoryCounts[category]}\n`
    })

  return csv
}

/**
 * Escape CSV special characters
 */
function escapeCsv(value: string): string {
  if (!value) return ''
  // Replace double quotes with double-double quotes and handle newlines
  return value.replace(/"/g, '""').replace(/\n/g, ' ')
}

/**
 * Download CSV file
 */
export function downloadScheduleC(transactions: Transaction[], year?: number) {
  const csv = exportScheduleC(transactions, year)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  const targetYear = year || new Date().getFullYear()
  link.setAttribute('href', url)
  link.setAttribute('download', `schedule-c-${targetYear}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
