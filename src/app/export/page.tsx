'use client'

import { useState } from 'react'
import { useStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Download, FileText, Table, FileSpreadsheet, Loader2 } from 'lucide-react'
import { downloadScheduleC } from '@/lib/export/schedule-c-csv'
import { downloadExcel } from '@/lib/export/excel-export'
import { downloadQuickBooksIIF } from '@/lib/export/quickbooks-iif'
import { downloadReceiptArchive } from '@/lib/export/pdf-receipt-archive'
import { FeatureLock } from '@/components/gamification/FeatureLock'

export default function ExportPage() {
  const store = useStore()
  const { userProgress } = store
  const { transactions, receipts } = useStore()
  const currentYear = new Date().getFullYear()
  
  const [selectedYear, setSelectedYear] = useState(currentYear.toString())
  const [exportingPDF, setExportingPDF] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  
  // Get available years from transactions
  const yearSet = new Set<number>(transactions.map((t: any) => new Date(t.date).getFullYear()))
  const availableYears: number[] = Array.from(yearSet).sort((a, b) => b - a)

  const yearOptions = availableYears.map((year: number) => ({
    value: year.toString(),
    label: year.toString()
  }))

  if (yearOptions.length === 0) {
    yearOptions.push({ value: currentYear.toString(), label: currentYear.toString() })
  }

  const year = parseInt(selectedYear)

  // Filter transactions for selected year
  const yearTransactions = transactions.filter((t: any) => {
    const txYear = new Date(t.date).getFullYear()
    return txYear === year && !t.isDuplicateOfLinked
  })

  const income = yearTransactions.filter((t: any) => t.type === 'income')
  const expenses = yearTransactions.filter((t: any) => t.type === 'expense')
  const totalIncome = income.reduce((sum: number, t: any) => sum + t.amount, 0)
  const totalExpenses = expenses.reduce((sum: number, t: any) => sum + t.amount, 0)

  // Count receipts with images for PDF export
  const yearReceipts = receipts.filter((r: any) => {
    const rYear = new Date(r.ocrDate || r.createdAt).getFullYear()
    return rYear === year && r.imageData
  })

  const handlePDFExport = async () => {
    setExportingPDF(true)
    setPdfError(null)
    try {
      await downloadReceiptArchive(receipts, transactions, year)
      // Award XP for export
      await useStore().completeAction('firstExport')
      useStore().unlockAchievement('first_export')
    } catch (error) {
      console.error('PDF export failed:', error)
      setPdfError(error instanceof Error ? error.message : 'Failed to generate PDF')
    } finally {
      setExportingPDF(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Export Data</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Export your financial data in various formats</p>
      </div>

      {/* Year Selector */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Select Tax Year</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select
              label="Tax Year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              options={yearOptions}
            />
            <div className="flex-1">
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Income</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    ${totalIncome.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">{income.length} transactions</p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Expenses</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">
                    ${totalExpenses.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">{expenses.length} transactions</p>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Net Profit</p>
                  <p className={`text-xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                    ${(totalIncome - totalExpenses).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">{yearTransactions.length} total</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Schedule C CSV */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Schedule C (CSV)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Tax-ready CSV format for IRS Schedule C. Includes income/expense breakdown, category totals, and verification levels.
            </p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Format:</span>
                <span className="font-medium">CSV</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Compatible with:</span>
                <span className="font-medium">Excel, Google Sheets, Tax Software</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Includes:</span>
                <span className="font-medium">Categories, Verification, Notes</span>
              </div>
            </div>
            <Button
              onClick={async () => {
                downloadScheduleC(transactions, year)
                await useStore().completeAction('exportScheduleC')
                useStore().unlockAchievement('tax_ready')
              }}
              disabled={yearTransactions.length === 0}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Schedule C CSV
            </Button>
          </CardContent>
        </Card>

        {/* Excel Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table className="h-5 w-5" />
              Excel Workbook
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Multi-sheet Excel file with transactions, monthly summaries, category analysis, and receipt inventory.
            </p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Format:</span>
                <span className="font-medium">XLS (Tab-separated)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Sheets:</span>
                <span className="font-medium">4 (Summary, Monthly, Categories, Receipts)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Features:</span>
                <span className="font-medium">Pivot-ready, Formulas, Analysis</span>
              </div>
            </div>
            <Button
              onClick={async () => {
                downloadExcel(transactions, receipts, year)
                await useStore().completeAction('firstExport')
              }}
              disabled={yearTransactions.length === 0}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Excel File
            </Button>
          </CardContent>
        </Card>

        {/* QuickBooks IIF */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              QuickBooks (IIF)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Intuit Interchange Format for importing into QuickBooks Desktop. Categories auto-mapped to QB accounts.
            </p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Format:</span>
                <span className="font-medium">IIF</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Compatible with:</span>
                <span className="font-medium">QuickBooks Desktop</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Mapping:</span>
                <span className="font-medium">Auto-maps to QB accounts</span>
              </div>
            </div>
            <Button
              onClick={async () => {
                downloadQuickBooksIIF(transactions, year)
                await useStore().completeAction('firstExport')
              }}
              disabled={yearTransactions.length === 0}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download QuickBooks IIF
            </Button>
          </CardContent>
        </Card>

        {/* PDF Receipt Archive */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              PDF Receipt Archive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Bundle all receipts into a single PDF organized by date with transaction details and images.
            </p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Format:</span>
                <span className="font-medium">PDF</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Receipts with Images:</span>
                <span className="font-medium">{yearReceipts.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Features:</span>
                <span className="font-medium">Images, Details, Line Items</span>
              </div>
            </div>
            {pdfError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <p className="text-sm text-red-600 dark:text-red-400">{pdfError}</p>
              </div>
            )}
            <Button
              onClick={handlePDFExport}
              disabled={yearReceipts.length === 0 || exportingPDF}
              className="w-full"
            >
              {exportingPDF ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt Archive
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Export Tips */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Export Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">💡</span>
              <p>
                <strong>Schedule C CSV:</strong> Best for tax preparation. Import into TurboTax, H&R Block, or give to your accountant.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">💡</span>
              <p>
                <strong>Excel Workbook:</strong> Best for analysis and reporting. Use pivot tables to analyze spending patterns.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">💡</span>
              <p>
                <strong>QuickBooks IIF:</strong> Migration path if you decide to switch to QuickBooks. Categories auto-map to QB accounts.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <p>
                All exports exclude linked duplicates to prevent double-counting income.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
