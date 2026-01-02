'use client'

import { useState } from 'react'
import { useStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { calculateVerificationLevel } from '@/lib/duplicate-detection'
import { Download, FileText, CheckCircle } from 'lucide-react'
import type { Transaction } from '@/types'

export default function AuditReportPage() {
  const { transactions, receipts } = useStore()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Filter transactions by year
  const yearTransactions = transactions.filter(t => {
    const txYear = new Date(t.date).getFullYear()
    return txYear === selectedYear
  })

  // Income breakdown by verification level
  const incomeByVerification = {
    strong: yearTransactions.filter(t => 
      t.type === 'income' && 
      !t.isDuplicateOfLinked && 
      (t.verificationLevel || calculateVerificationLevel(t)) === 'strong'
    ),
    bank: yearTransactions.filter(t => 
      t.type === 'income' && 
      !t.isDuplicateOfLinked && 
      (t.verificationLevel || calculateVerificationLevel(t)) === 'bank'
    ),
    self: yearTransactions.filter(t => 
      t.type === 'income' && 
      !t.isDuplicateOfLinked && 
      (t.verificationLevel || calculateVerificationLevel(t)) === 'self_reported'
    )
  }

  const totalIncome = yearTransactions
    .filter(t => t.type === 'income' && !t.isDuplicateOfLinked)
    .reduce((sum, t) => sum + t.amount, 0)

  const strongAmount = incomeByVerification.strong.reduce((sum, t) => sum + t.amount, 0)
  const bankAmount = incomeByVerification.bank.reduce((sum, t) => sum + t.amount, 0)
  const selfAmount = incomeByVerification.self.reduce((sum, t) => sum + t.amount, 0)

  // Linked transaction pairs
  const linkedPairs = yearTransactions.filter(t => 
    t.linkedTransactionId && !t.isDuplicateOfLinked
  )

  const excludedDuplicates = yearTransactions.filter(t => t.isDuplicateOfLinked)

  // Available years
  const years = Array.from(new Set(transactions.map(t => new Date(t.date).getFullYear()))).sort((a, b) => b - a)

  const handleExport = () => {
    const reportData = {
      reportDate: new Date().toISOString(),
      taxYear: selectedYear,
      summary: {
        totalIncome,
        totalIncomeTransactions: yearTransactions.filter(t => t.type === 'income' && !t.isDuplicateOfLinked).length,
        linkedPairs: linkedPairs.length,
        excludedDuplicates: excludedDuplicates.length,
        verificationBreakdown: {
          strong: { count: incomeByVerification.strong.length, amount: strongAmount },
          bank: { count: incomeByVerification.bank.length, amount: bankAmount },
          self: { count: incomeByVerification.self.length, amount: selfAmount }
        }
      },
      strongVerification: incomeByVerification.strong.map(t => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        linkedTo: t.linkedTransactionId,
        receiptId: t.receiptId
      })),
      bankVerification: incomeByVerification.bank.map(t => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        receiptId: t.receiptId
      })),
      selfReported: incomeByVerification.self.map(t => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        notes: t.notes
      })),
      linkedPairs: linkedPairs.map(t => {
        const linked = yearTransactions.find(tx => tx.id === t.linkedTransactionId)
        return {
          primary: { date: t.date, description: t.description, amount: t.amount },
          duplicate: linked ? { date: linked.date, description: linked.description, amount: linked.amount } : null
        }
      })
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-report-${selectedYear}.json`
    a.click()
  }

  const auditScore = totalIncome > 0 ? Math.round(((strongAmount + bankAmount) / totalIncome) * 100) : 0

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">IRS Audit Report</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Income verification documentation for tax year {selectedYear}</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <Button onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Audit Readiness Score */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Audit Readiness Score</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Percentage of income with strong or bank-level verification
              </p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${
                auditScore >= 85 ? 'text-green-600 dark:text-green-400' : 
                auditScore >= 70 ? 'text-blue-600 dark:text-blue-400' : 
                'text-amber-600 dark:text-amber-400'
              }`}>
                {auditScore}%
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {auditScore >= 85 ? 'Excellent' : auditScore >= 70 ? 'Good' : 'Needs Improvement'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Income ({selectedYear})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalIncome)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {yearTransactions.filter(t => t.type === 'income' && !t.isDuplicateOfLinked).length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Linked Pairs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {linkedPairs.length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {excludedDuplicates.length} duplicates excluded from totals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Documentation Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {incomeByVerification.strong.length + incomeByVerification.bank.length}/{yearTransactions.filter(t => t.type === 'income' && !t.isDuplicateOfLinked).length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Transactions with receipts or links
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Verification Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Strong Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">🔒</span>
              Strong Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(strongAmount)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {incomeByVerification.strong.length} transactions ({Math.round((strongAmount / totalIncome) * 100)}%)
              </p>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {incomeByVerification.strong.slice(0, 5).map(t => (
                <div key={t.id} className="text-xs p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                  <div className="flex justify-between font-medium">
                    <span>{formatDate(t.date)}</span>
                    <span>{formatCurrency(t.amount)}</span>
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 truncate">{t.description}</div>
                </div>
              ))}
              {incomeByVerification.strong.length > 5 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                  + {incomeByVerification.strong.length - 5} more
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bank Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">🏦</span>
              Bank Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(bankAmount)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {incomeByVerification.bank.length} transactions ({Math.round((bankAmount / totalIncome) * 100)}%)
              </p>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {incomeByVerification.bank.slice(0, 5).map(t => (
                <div key={t.id} className="text-xs p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between font-medium">
                    <span>{formatDate(t.date)}</span>
                    <span>{formatCurrency(t.amount)}</span>
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 truncate">{t.description}</div>
                </div>
              ))}
              {incomeByVerification.bank.length > 5 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                  + {incomeByVerification.bank.length - 5} more
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Self-Reported */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">📝</span>
              Self-Reported
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {formatCurrency(selfAmount)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {incomeByVerification.self.length} transactions ({Math.round((selfAmount / totalIncome) * 100)}%)
              </p>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {incomeByVerification.self.slice(0, 5).map(t => (
                <div key={t.id} className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between font-medium">
                    <span>{formatDate(t.date)}</span>
                    <span>{formatCurrency(t.amount)}</span>
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 truncate">{t.description}</div>
                </div>
              ))}
              {incomeByVerification.self.length > 5 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                  + {incomeByVerification.self.length - 5} more
                </p>
              )}
            </div>
            {incomeByVerification.self.length > 0 && (
              <div className="mt-4 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-800 dark:text-amber-300">
                <strong>⚠️ Action needed:</strong> Add receipts or link to deposits to improve verification
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linked Transaction Pairs */}
      {linkedPairs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Linked Transaction Pairs (Duplicate Prevention)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {linkedPairs.map(primary => {
                const duplicate = yearTransactions.find(t => t.id === primary.linkedTransactionId)
                return (
                  <div key={primary.id} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">Primary (Counted)</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {formatDate(primary.date)} • {primary.description} • {formatCurrency(primary.amount)}
                        </div>
                      </div>
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                        Strong Verification
                      </span>
                    </div>
                    {duplicate && (
                      <div className="pl-4 border-l-2 border-blue-400 dark:border-blue-600">
                        <div className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-1">🔗 Linked Duplicate (Excluded)</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(duplicate.date)} • {duplicate.description} • {formatCurrency(duplicate.amount)}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
