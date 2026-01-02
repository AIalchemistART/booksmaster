import type { Transaction, Receipt } from '@/types'
import { formatDate, formatCurrency } from '../utils'

/**
 * Export data to Excel-compatible CSV with multiple sheets
 * Uses tab-separated values for better Excel compatibility
 */
export function exportToExcel(
  transactions: Transaction[],
  receipts: Receipt[],
  year?: number
): string {
  const targetYear = year || new Date().getFullYear()
  
  // Filter for target year
  const yearTransactions = transactions.filter(t => {
    const txYear = new Date(t.date).getFullYear()
    return txYear === targetYear && !t.isDuplicateOfLinked
  })

  let output = ''

  // Sheet 1: Transactions Summary
  output += `TRANSACTIONS SUMMARY - ${targetYear}\n`
  output += `Date\tDescription\tType\tCategory\tAmount\tPayment Method\tReceipt\tVerification\tNotes\n`
  
  yearTransactions
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach(t => {
      output += `${formatDate(t.date)}\t`
      output += `${escapeExcel(t.description)}\t`
      output += `${t.type}\t`
      output += `${escapeExcel(t.category)}\t`
      output += `${t.amount}\t`
      output += `${escapeExcel(t.paymentMethod || 'N/A')}\t`
      output += `${t.receiptId ? 'Yes' : 'No'}\t`
      output += `${t.verificationLevel || 'N/A'}\t`
      output += `${escapeExcel(t.notes || '')}\n`
    })

  output += `\n\n`

  // Sheet 2: Monthly Summary
  output += `MONTHLY SUMMARY - ${targetYear}\n`
  output += `Month\tIncome\tExpenses\tNet Profit\n`

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const monthTx = yearTransactions.filter(t => {
      const txMonth = new Date(t.date).getMonth() + 1
      return txMonth === month
    })

    const income = monthTx
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const expenses = monthTx
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    return {
      month: new Date(targetYear, i, 1).toLocaleDateString('en-US', { month: 'long' }),
      income,
      expenses,
      net: income - expenses
    }
  })

  monthlyData.forEach(m => {
    output += `${m.month}\t${m.income.toFixed(2)}\t${m.expenses.toFixed(2)}\t${m.net.toFixed(2)}\n`
  })

  const yearIncome = monthlyData.reduce((sum, m) => sum + m.income, 0)
  const yearExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0)
  output += `TOTAL\t${yearIncome.toFixed(2)}\t${yearExpenses.toFixed(2)}\t${(yearIncome - yearExpenses).toFixed(2)}\n`

  output += `\n\n`

  // Sheet 3: Category Analysis
  output += `EXPENSE CATEGORY ANALYSIS - ${targetYear}\n`
  output += `Category\tTotal Amount\tTransaction Count\tAverage\tPercentage\n`

  const expenses = yearTransactions.filter(t => t.type === 'expense')
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0)

  const categoryData = expenses.reduce((acc, t) => {
    if (!acc[t.category]) {
      acc[t.category] = { total: 0, count: 0 }
    }
    acc[t.category].total += t.amount
    acc[t.category].count += 1
    return acc
  }, {} as Record<string, { total: number; count: number }>)

  Object.entries(categoryData)
    .sort(([, a], [, b]) => b.total - a.total)
    .forEach(([category, data]) => {
      const avg = data.total / data.count
      const pct = (data.total / totalExpenses) * 100
      output += `${escapeExcel(category)}\t${data.total.toFixed(2)}\t${data.count}\t${avg.toFixed(2)}\t${pct.toFixed(1)}%\n`
    })

  output += `\n\n`

  // Sheet 4: Receipts Inventory
  const yearReceipts = receipts.filter(r => {
    const rYear = new Date(r.ocrDate || r.createdAt).getFullYear()
    return rYear === targetYear
  })

  output += `RECEIPTS INVENTORY - ${targetYear}\n`
  output += `Date\tVendor\tAmount\tType\tValidated\tLinked Transaction\n`

  yearReceipts
    .sort((a, b) => {
      const dateA = new Date(a.ocrDate || a.createdAt).getTime()
      const dateB = new Date(b.ocrDate || b.createdAt).getTime()
      return dateA - dateB
    })
    .forEach(r => {
      output += `${formatDate(r.ocrDate || r.createdAt)}\t`
      output += `${escapeExcel(r.ocrVendor || 'Unknown')}\t`
      output += `${r.ocrAmount?.toFixed(2) || '0.00'}\t`
      output += `${r.transactionType || 'N/A'}\t`
      output += `${r.userValidated ? 'Yes' : 'No'}\t`
      output += `${r.linkedTransactionId ? 'Yes' : 'No'}\n`
    })

  return output
}

/**
 * Escape Excel special characters
 */
function escapeExcel(value: string): string {
  if (!value) return ''
  // Remove tabs and newlines, handle quotes
  return value.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/"/g, '""')
}

/**
 * Download Excel-compatible file
 */
export function downloadExcel(transactions: Transaction[], receipts: Receipt[], year?: number) {
  const content = exportToExcel(transactions, receipts, year)
  const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  const targetYear = year || new Date().getFullYear()
  link.setAttribute('href', url)
  link.setAttribute('download', `thomas-books-${targetYear}.xls`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
