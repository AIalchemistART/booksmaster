'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useStore } from '@/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FileText, Download, Calendar, Receipt } from 'lucide-react'
import type { Transaction, Receipt as ReceiptType } from '@/types'
// CUSTODY FEATURES COMMENTED OUT - Too niche for general market offering
// import type { CustodyExpenseType } from '@/types'
import { generateTaxReceiptExcel } from '@/lib/excel-report-generator'
import { FirstVisitIntro, useFirstVisit } from '@/components/gamification/FirstVisitIntro'

// const expenseTypeLabels: Record<CustodyExpenseType, string> = {
//   child_support: 'Child Support',
//   medical: 'Medical',
//   education: 'Education',
//   childcare: 'Childcare',
//   activities: 'Activities',
//   clothing: 'Clothing',
//   food: 'Food',
//   other: 'Other',
// }

export default function ReportsPage() {
  const { transactions, receipts } = useStore() // custodyExpenses removed
  const { showIntro, closeIntro } = useFirstVisit('reports')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [includeLineItems, setIncludeLineItems] = useState(false)

  // CUSTODY FILTERING COMMENTED OUT
  // const filteredCustodyExpenses = custodyExpenses.filter((e) => {
  //   if (!startDate && !endDate) return true // Show all if no dates set
  //   const date = new Date(e.date)
  //   if (startDate && !endDate) return date >= new Date(startDate)
  //   if (!startDate && endDate) return date <= new Date(endDate)
  //   return date >= new Date(startDate) && date <= new Date(endDate)
  // })

  // Filter business transactions by date range (only if dates are set)
  const filteredTransactions = transactions.filter((t: Transaction) => {
    if (!startDate && !endDate) return true // Show all if no dates set
    const date = new Date(t.date)
    if (startDate && !endDate) return date >= new Date(startDate)
    if (!startDate && endDate) return date <= new Date(endDate)
    return date >= new Date(startDate) && date <= new Date(endDate)
  })

  // Filter receipts by date range (only if dates are set)
  const filteredReceipts = receipts.filter((r: ReceiptType) => {
    if (!startDate && !endDate) return true // Show all if no dates set
    
    const dateStr = r.ocrDate || r.createdAt
    if (!dateStr) return true // Include receipts without dates
    
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return true // Include invalid dates
      
      if (startDate && !endDate) return date >= new Date(startDate)
      if (!startDate && endDate) return date <= new Date(endDate)
      return date >= new Date(startDate) && date <= new Date(endDate)
    } catch {
      return true // Include receipts with unparseable dates
    }
  })

  // CUSTODY TOTALS COMMENTED OUT
  // const custodyTotals = {
  //   totalThomasOwes: filteredCustodyExpenses.reduce((sum, e) => sum + e.thomasOwes, 0),
  //   totalOtherParentOwes: filteredCustodyExpenses.reduce((sum, e) => sum + e.otherParentOwes, 0),
  //   totalAmount: filteredCustodyExpenses.reduce((sum, e) => sum + e.amount, 0),
  //   byType: filteredCustodyExpenses.reduce((acc, e) => {
  //     acc[e.expenseType] = (acc[e.expenseType] || 0) + e.amount
  //     return acc
  //   }, {} as Record<CustodyExpenseType, number>),
  // }

  // Calculate business totals
  const businessTotals = {
    totalIncome: filteredTransactions.filter((t: Transaction) => t.type === 'income' && !t.isDuplicateOfLinked).reduce((sum: number, t: Transaction) => sum + t.amount, 0),
    totalExpenses: filteredTransactions.filter((t: Transaction) => t.type === 'expense').reduce((sum: number, t: Transaction) => sum + t.amount, 0),
  }

  // Calculate receipt totals
  const receiptTotals = {
    count: filteredReceipts.length,
    totalAmount: filteredReceipts.reduce((sum: number, r: ReceiptType) => sum + (r.ocrAmount || 0), 0),
    totalTax: filteredReceipts.reduce((sum: number, r: ReceiptType) => sum + (r.ocrTax || 0), 0),
    linkedCount: filteredReceipts.filter((r: ReceiptType) => r.linkedTransactionId).length,
    byVendor: filteredReceipts.reduce((acc: Record<string, number>, r: ReceiptType) => {
      const vendor = r.ocrVendor || 'Unknown'
      acc[vendor] = (acc[vendor] || 0) + (r.ocrAmount || 0)
      return acc
    }, {} as Record<string, number>),
  }

  // CUSTODY REPORT GENERATION COMMENTED OUT
  // const generateCustodyReport = () => {
  //   let report = `CUSTODY EXPENSE REPORT\n`
  //   report += `Period: ${formatDate(startDate)} - ${formatDate(endDate)}\n`
  //   report += `Generated: ${formatDate(new Date())}\n`
  //   report += `${'='.repeat(60)}\n\n`
  //   ... (full function commented out for brevity)
  //   return report
  // }

  const generateTaxReceiptReport = () => {
    let report = `TAX RECEIPT REPORT\n`
    report += `Period: ${formatDate(startDate)} - ${formatDate(endDate)}\n`
    report += `Generated: ${formatDate(new Date())}\n`
    report += `${'='.repeat(80)}\n\n`

    report += `SUMMARY\n`
    report += `${'-'.repeat(50)}\n`
    report += `Total Receipts: ${filteredReceipts.length}\n`
    report += `Total Amount: ${formatCurrency(receiptTotals.totalAmount)}\n`
    const totalSubtotal = filteredReceipts.reduce((sum: number, r: ReceiptType) => sum + (r.ocrSubtotal || 0), 0)
    report += `Total Subtotal: ${formatCurrency(totalSubtotal)}\n`
    report += `Total Tax: ${formatCurrency(receiptTotals.totalTax)}\n\n`

    report += `DETAILED RECEIPTS\n`
    report += `${'-'.repeat(50)}\n`
    
    const sortedReceipts = [...filteredReceipts].sort((a: ReceiptType, b: ReceiptType) => {
      const dateA = new Date(a.ocrDate || a.createdAt)
      const dateB = new Date(b.ocrDate || b.createdAt)
      return dateA.getTime() - dateB.getTime()
    })

    sortedReceipts.forEach((r: ReceiptType, index: number) => {
      report += `${index + 1}. ${formatDate(r.ocrDate || r.createdAt)} | ${r.ocrVendor || 'Unknown Vendor'}\n`
      report += `   Amount: ${formatCurrency(r.ocrAmount || 0)}`
      if (r.ocrSubtotal) report += ` (Subtotal: ${formatCurrency(r.ocrSubtotal)})`
      if (r.ocrTax) report += ` (Tax: ${formatCurrency(r.ocrTax)})`
      report += `\n`
      if (r.ocrPaymentMethod) report += `   Payment: ${r.ocrPaymentMethod}\n`
      if (r.ocrTransactionId) report += `   Transaction ID: ${r.ocrTransactionId}\n`
      
      if (includeLineItems && r.ocrLineItems && r.ocrLineItems.length > 0) {
        report += `   Line Items:\n`
        r.ocrLineItems.forEach((item: any) => {
          report += `     - ${item.description}`
          if (item.quantity) report += ` (${item.quantity}x)`
          if (item.price) report += ` @ ${formatCurrency(item.price)}`
          report += `\n`
        })
      }
      report += `\n`
    })

    return report
  }

  // CUSTODY DOWNLOAD FUNCTIONS COMMENTED OUT
  // const downloadCustodyReport = () => { ... }
  // const downloadCustodyReportDocxFile = () => { ... }

  const downloadTaxReceiptReport = () => {
    generateTaxReceiptExcel(filteredReceipts, startDate, endDate, includeLineItems)
  }

  return (
    <div className="p-8">
      <FirstVisitIntro tabId="reports" isVisible={showIntro} onClose={closeIntro} />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Generate business expense and tax reports</p>
      </div>

      {/* Date Range Selector */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap items-end">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <div className="flex gap-2">
              {/* CUSTODY BUTTON COMMENTED OUT
              <Button onClick={downloadCustodyReportDocxFile} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Custody Report (.xlsx)
              </Button>
              */}
              <Button onClick={downloadTaxReceiptReport}>
                <Download className="h-4 w-4 mr-2" />
                Tax Receipt Report (.xlsx)
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={includeLineItems}
                onChange={(e) => setIncludeLineItems(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span>Include itemized line items in tax report</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* CUSTODY SUMMARY CARD COMMENTED OUT - Too niche for general market
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Custody Expense Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          ... (full card commented out for brevity)
        </CardContent>
      </Card>
      */}

      {/* Business Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Business Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Income</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(businessTotals.totalIncome)}</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(businessTotals.totalExpenses)}</p>
            </div>
            <div className={`p-4 rounded-lg ${businessTotals.totalIncome - businessTotals.totalExpenses >= 0 ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
              <p className="text-sm text-gray-600 dark:text-gray-400">Net Profit</p>
              <p className={`text-2xl font-bold ${businessTotals.totalIncome - businessTotals.totalExpenses >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(businessTotals.totalIncome - businessTotals.totalExpenses)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Receipt Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Receipts Scanned</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{receiptTotals.count}</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(receiptTotals.totalAmount)}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Tax</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(receiptTotals.totalTax)}</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Linked to Transactions</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{receiptTotals.linkedCount} / {receiptTotals.count}</p>
            </div>
          </div>

          <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Spending by Vendor</h4>
          {Object.keys(receiptTotals.byVendor).length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No receipts in this period.</p>
          ) : (
            <div className="space-y-2">
              {(Object.entries(receiptTotals.byVendor) as [string, number][])
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([vendor, amount]) => {
                  const percentage = receiptTotals.totalAmount > 0 ? (amount / receiptTotals.totalAmount) * 100 : 0
                  return (
                    <div key={vendor}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-900 dark:text-gray-100">{vendor}</span>
                        <span className="text-gray-600 dark:text-gray-400">{formatCurrency(amount)}</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 dark:bg-amber-600 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
