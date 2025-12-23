import * as XLSX from 'xlsx'
import type { Receipt } from '@/types'

/**
 * Generate a comprehensive tax receipt report as an Excel spreadsheet
 */
export function generateTaxReceiptExcel(
  receipts: Receipt[],
  startDate: string,
  endDate: string,
  includeLineItems: boolean
): void {
  const totalAmount = receipts.reduce((sum, r) => sum + (r.ocrAmount || 0), 0)
  const totalSubtotal = receipts.reduce((sum, r) => sum + (r.ocrSubtotal || 0), 0)
  const totalTax = receipts.reduce((sum, r) => sum + (r.ocrTax || 0), 0)

  // Create workbook
  const wb = XLSX.utils.book_new()

  // Summary sheet data
  const summaryData = [
    ['TAX RECEIPT REPORT'],
    [],
    ['Period:', formatDate(startDate) + ' - ' + formatDate(endDate)],
    ['Generated:', formatDate(new Date())],
    [],
    ['SUMMARY'],
    ['Total Receipts:', receipts.length],
    ['Total Amount:', totalAmount],
    ['Total Subtotal:', totalSubtotal],
    ['Total Tax:', totalTax],
  ]

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  
  // Set column widths for summary
  summarySheet['!cols'] = [
    { wch: 20 },
    { wch: 20 }
  ]

  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

  // Detailed receipts sheet
  const sortedReceipts = receipts.sort((a, b) => {
    const dateA = new Date(a.ocrDate || a.createdAt)
    const dateB = new Date(b.ocrDate || b.createdAt)
    return dateA.getTime() - dateB.getTime()
  })

  const detailedData: any[][] = [
    ['DETAILED RECEIPTS'],
    [],
    ['Date', 'Vendor', 'Amount', 'Tax', 'Subtotal', 'Payment Method', 'Store ID', 'Transaction ID']
  ]

  sortedReceipts.forEach(receipt => {
    detailedData.push([
      formatDate(receipt.ocrDate || receipt.createdAt),
      receipt.ocrVendor || 'Unknown',
      receipt.ocrAmount || 0,
      receipt.ocrTax || 0,
      receipt.ocrSubtotal || 0,
      receipt.ocrPaymentMethod || '-',
      receipt.ocrStoreId || '-',
      receipt.ocrTransactionId || '-'
    ])

    // Add line items if requested
    if (includeLineItems && receipt.ocrLineItems && receipt.ocrLineItems.length > 0) {
      receipt.ocrLineItems.forEach((item: any) => {
        detailedData.push([
          '',
          `  • ${item.description}`,
          item.price || 0,
          '',
          '',
          '',
          item.sku || '',
          ''
        ])
      })
    }
  })

  const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData)

  // Set column widths for detailed sheet
  detailedSheet['!cols'] = [
    { wch: 15 },  // Date
    { wch: 35 },  // Vendor
    { wch: 12 },  // Amount
    { wch: 10 },  // Tax
    { wch: 12 },  // Subtotal
    { wch: 18 },  // Payment Method
    { wch: 15 },  // Store ID
    { wch: 20 }   // Transaction ID
  ]

  XLSX.utils.book_append_sheet(wb, detailedSheet, 'Detailed Receipts')

  // Generate filename
  const filename = `tax-receipt-report-${startDate}-to-${endDate}.xlsx`

  // Write file
  XLSX.writeFile(wb, filename)
}

/**
 * Generate custody expense report as an Excel spreadsheet
 */
export function generateCustodyReportExcel(
  expenses: any[],
  startDate: string,
  endDate: string,
  totals: any
): void {
  const wb = XLSX.utils.book_new()

  // Summary sheet
  const summaryData = [
    ['CUSTODY EXPENSE REPORT'],
    [],
    ['Period:', formatDate(startDate) + ' - ' + formatDate(endDate)],
    ['Generated:', formatDate(new Date())],
    [],
    ['SUMMARY'],
    ['Total Expenses:', totals.totalAmount],
    ['Thomas Owes:', totals.totalThomasOwes],
    ['Other Parent Owes:', totals.totalOtherParentOwes],
    ['Net Balance:', totals.totalOtherParentOwes - totals.totalThomasOwes],
    ['(Positive = Owed to Thomas)'],
    [],
    ['EXPENSES BY CATEGORY'],
  ]

  // Add category breakdown
  Object.entries(totals.byType).forEach(([type, amount]: [string, any]) => {
    summaryData.push([type, amount])
  })

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

  // Detailed expenses sheet
  const detailedData: any[][] = [
    ['Date', 'Description', 'Amount', 'Type', 'Thomas Owes', 'Other Parent Owes', 'Notes']
  ]

  const sortedExpenses = expenses.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  sortedExpenses.forEach(expense => {
    detailedData.push([
      formatDate(expense.date),
      expense.description,
      expense.amount,
      expense.expenseType,
      expense.thomasOwes,
      expense.otherParentOwes,
      expense.notes || ''
    ])
  })

  const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData)
  detailedSheet['!cols'] = [
    { wch: 12 },  // Date
    { wch: 30 },  // Description
    { wch: 12 },  // Amount
    { wch: 15 },  // Type
    { wch: 12 },  // Thomas Owes
    { wch: 18 },  // Other Parent Owes
    { wch: 30 }   // Notes
  ]
  XLSX.utils.book_append_sheet(wb, detailedSheet, 'Detailed Expenses')

  const filename = `custody-report-${startDate}-to-${endDate}.xlsx`
  XLSX.writeFile(wb, filename)
}

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
