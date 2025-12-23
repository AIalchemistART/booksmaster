'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useStore } from '@/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FileText, Download, Calendar, Receipt } from 'lucide-react'
import type { CustodyExpenseType } from '@/types'

const expenseTypeLabels: Record<CustodyExpenseType, string> = {
  child_support: 'Child Support',
  medical: 'Medical',
  education: 'Education',
  childcare: 'Childcare',
  activities: 'Activities',
  clothing: 'Clothing',
  food: 'Food',
  other: 'Other',
}

export default function ReportsPage() {
  const { custodyExpenses, transactions, receipts } = useStore()
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [includeLineItems, setIncludeLineItems] = useState(false)

  // Filter custody expenses by date range
  const filteredCustodyExpenses = custodyExpenses.filter((e) => {
    const date = new Date(e.date)
    return date >= new Date(startDate) && date <= new Date(endDate)
  })

  // Filter business transactions by date range
  const filteredTransactions = transactions.filter((t) => {
    const date = new Date(t.date)
    return date >= new Date(startDate) && date <= new Date(endDate)
  })

  // Filter receipts by date range
  const filteredReceipts = receipts.filter((r) => {
    if (!r.ocrDate) return false
    const date = new Date(r.ocrDate)
    return date >= new Date(startDate) && date <= new Date(endDate)
  })

  // Calculate custody totals
  const custodyTotals = {
    totalThomasOwes: filteredCustodyExpenses.reduce((sum, e) => sum + e.thomasOwes, 0),
    totalOtherParentOwes: filteredCustodyExpenses.reduce((sum, e) => sum + e.otherParentOwes, 0),
    totalAmount: filteredCustodyExpenses.reduce((sum, e) => sum + e.amount, 0),
    byType: filteredCustodyExpenses.reduce((acc, e) => {
      acc[e.expenseType] = (acc[e.expenseType] || 0) + e.amount
      return acc
    }, {} as Record<CustodyExpenseType, number>),
  }

  // Calculate business totals
  const businessTotals = {
    totalIncome: filteredTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    totalExpenses: filteredTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
  }

  // Calculate receipt totals
  const receiptTotals = {
    count: filteredReceipts.length,
    totalAmount: filteredReceipts.reduce((sum, r) => sum + (r.ocrAmount || 0), 0),
    totalTax: filteredReceipts.reduce((sum, r) => sum + (r.ocrTax || 0), 0),
    linkedCount: filteredReceipts.filter(r => r.linkedTransactionId).length,
    byVendor: filteredReceipts.reduce((acc, r) => {
      const vendor = r.ocrVendor || 'Unknown'
      acc[vendor] = (acc[vendor] || 0) + (r.ocrAmount || 0)
      return acc
    }, {} as Record<string, number>),
  }

  const generateCustodyReport = () => {
    let report = `CUSTODY EXPENSE REPORT\n`
    report += `Period: ${formatDate(startDate)} - ${formatDate(endDate)}\n`
    report += `Generated: ${formatDate(new Date())}\n`
    report += `${'='.repeat(60)}\n\n`

    report += `SUMMARY\n`
    report += `${'-'.repeat(40)}\n`
    report += `Total Expenses: ${formatCurrency(custodyTotals.totalAmount)}\n`
    report += `Thomas Owes: ${formatCurrency(custodyTotals.totalThomasOwes)}\n`
    report += `Other Parent Owes: ${formatCurrency(custodyTotals.totalOtherParentOwes)}\n`
    report += `Net Balance: ${formatCurrency(custodyTotals.totalOtherParentOwes - custodyTotals.totalThomasOwes)}\n`
    report += `(Positive = Owed to Thomas)\n\n`

    report += `EXPENSES BY CATEGORY\n`
    report += `${'-'.repeat(40)}\n`
    Object.entries(custodyTotals.byType).forEach(([type, amount]) => {
      report += `${expenseTypeLabels[type as CustodyExpenseType]}: ${formatCurrency(amount)}\n`
    })
    report += `\n`

    report += `DETAILED TRANSACTIONS\n`
    report += `${'-'.repeat(40)}\n`
    filteredCustodyExpenses
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((e) => {
        report += `${formatDate(e.date)} | ${e.description}\n`
        report += `  Type: ${expenseTypeLabels[e.expenseType]}\n`
        report += `  Amount: ${formatCurrency(e.amount)} | Paid by: ${e.paidBy === 'thomas' ? 'Thomas' : 'Other Parent'}\n`
        report += `  Split: ${e.splitPercentage}% Thomas\n`
        if (e.paidBy === 'thomas') {
          report += `  Other Parent Owes: ${formatCurrency(e.otherParentOwes)}\n`
        } else {
          report += `  Thomas Owes: ${formatCurrency(e.thomasOwes)}\n`
        }
        if (e.notes) {
          report += `  Notes: ${e.notes}\n`
        }
        report += `\n`
      })

    return report
  }

  const generateTaxReceiptReport = () => {
    let report = `TAX RECEIPT REPORT\n`
    report += `Period: ${formatDate(startDate)} - ${formatDate(endDate)}\n`
    report += `Generated: ${formatDate(new Date())}\n`
    report += `${'='.repeat(80)}\n\n`

    report += `SUMMARY\n`
    report += `${'-'.repeat(50)}\n`
    report += `Total Receipts: ${filteredReceipts.length}\n`
    report += `Total Amount: ${formatCurrency(receiptTotals.totalAmount)}\n`
    const totalSubtotal = filteredReceipts.reduce((sum, r) => sum + (r.ocrSubtotal || 0), 0)
    report += `Total Subtotal: ${formatCurrency(totalSubtotal)}\n`
    report += `Total Tax: ${formatCurrency(receiptTotals.totalTax)}\n\n`

    report += `DETAILED RECEIPTS\n`
    report += `${'-'.repeat(50)}\n`
    
    const sortedReceipts = filteredReceipts.sort((a, b) => {
      const dateA = new Date(a.ocrDate || a.createdAt)
      const dateB = new Date(b.ocrDate || b.createdAt)
      return dateA.getTime() - dateB.getTime()
    })

    sortedReceipts.forEach((r, index) => {
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

  const downloadCustodyReport = () => {
    const report = generateCustodyReport()
    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `custody-report-${startDate}-to-${endDate}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadTaxReceiptReport = () => {
    const report = generateTaxReceiptReport()
    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tax-receipt-report-${startDate}-to-${endDate}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">Generate expense reports for court or personal records</p>
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
              <Button onClick={downloadCustodyReport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Custody Report
              </Button>
              <Button onClick={downloadTaxReceiptReport}>
                <Download className="h-4 w-4 mr-2" />
                Tax Receipt Report
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeLineItems}
                onChange={(e) => setIncludeLineItems(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Include itemized line items in tax report</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Custody Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Custody Expense Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold">{formatCurrency(custodyTotals.totalAmount)}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Thomas Owes</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(custodyTotals.totalThomasOwes)}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">Other Parent Owes</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(custodyTotals.totalOtherParentOwes)}</p>
            </div>
            <div className={`p-4 rounded-lg ${custodyTotals.totalOtherParentOwes - custodyTotals.totalThomasOwes >= 0 ? 'bg-green-50' : 'bg-orange-50'}`}>
              <p className="text-sm text-gray-600">Net Balance</p>
              <p className={`text-2xl font-bold ${custodyTotals.totalOtherParentOwes - custodyTotals.totalThomasOwes >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {formatCurrency(Math.abs(custodyTotals.totalOtherParentOwes - custodyTotals.totalThomasOwes))}
              </p>
              <p className="text-xs text-gray-500">
                {custodyTotals.totalOtherParentOwes - custodyTotals.totalThomasOwes >= 0 ? 'Owed to Thomas' : 'Thomas owes'}
              </p>
            </div>
          </div>

          <h4 className="font-medium mb-3">Expenses by Category</h4>
          {Object.keys(custodyTotals.byType).length === 0 ? (
            <p className="text-gray-500">No expenses in this period.</p>
          ) : (
            <div className="space-y-2">
              {(Object.entries(custodyTotals.byType) as [CustodyExpenseType, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([type, amount]) => {
                  const percentage = custodyTotals.totalAmount > 0 ? (amount / custodyTotals.totalAmount) * 100 : 0
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{expenseTypeLabels[type]}</span>
                        <span className="text-gray-600">{formatCurrency(amount)}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
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

      {/* Business Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Business Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(businessTotals.totalIncome)}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(businessTotals.totalExpenses)}</p>
            </div>
            <div className={`p-4 rounded-lg ${businessTotals.totalIncome - businessTotals.totalExpenses >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="text-sm text-gray-600">Net Profit</p>
              <p className={`text-2xl font-bold ${businessTotals.totalIncome - businessTotals.totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
            <div className="p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-gray-600">Receipts Scanned</p>
              <p className="text-2xl font-bold text-amber-600">{receiptTotals.count}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(receiptTotals.totalAmount)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Tax</p>
              <p className="text-2xl font-bold">{formatCurrency(receiptTotals.totalTax)}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Linked to Transactions</p>
              <p className="text-2xl font-bold text-blue-600">{receiptTotals.linkedCount} / {receiptTotals.count}</p>
            </div>
          </div>

          <h4 className="font-medium mb-3">Spending by Vendor</h4>
          {Object.keys(receiptTotals.byVendor).length === 0 ? (
            <p className="text-gray-500">No receipts in this period.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(receiptTotals.byVendor)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([vendor, amount]) => {
                  const percentage = receiptTotals.totalAmount > 0 ? (amount / receiptTotals.totalAmount) * 100 : 0
                  return (
                    <div key={vendor}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{vendor}</span>
                        <span className="text-gray-600">{formatCurrency(amount)}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
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
