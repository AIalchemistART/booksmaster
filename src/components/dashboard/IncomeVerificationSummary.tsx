'use client'

import { useStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { calculateVerificationLevel } from '@/lib/duplicate-detection'
import { formatCurrency } from '@/lib/utils'

export function IncomeVerificationSummary() {
  const { transactions } = useStore()

  const incomeTransactions = transactions.filter(t => t.type === 'income' && !t.isDuplicateOfLinked)

  const stats = {
    total: incomeTransactions.length,
    strong: 0,
    bank: 0,
    self: 0,
    totalAmount: 0,
    strongAmount: 0,
    bankAmount: 0,
    selfAmount: 0,
    linked: 0,
    duplicatesFound: 0
  }

  incomeTransactions.forEach(t => {
    const level = t.verificationLevel || calculateVerificationLevel(t)
    stats.totalAmount += t.amount
    
    if (level === 'strong') {
      stats.strong++
      stats.strongAmount += t.amount
      if (t.linkedTransactionId) stats.linked++
    } else if (level === 'bank') {
      stats.bank++
      stats.bankAmount += t.amount
    } else {
      stats.self++
      stats.selfAmount += t.amount
    }
  })

  // Count duplicates (linked transactions marked as duplicates)
  stats.duplicatesFound = transactions.filter(t => t.type === 'income' && t.isDuplicateOfLinked).length

  const strongPercent = stats.total > 0 ? Math.round((stats.strong / stats.total) * 100) : 0
  const bankPercent = stats.total > 0 ? Math.round((stats.bank / stats.total) * 100) : 0
  const selfPercent = stats.total > 0 ? Math.round((stats.self / stats.total) * 100) : 0

  const getAuditReadinessColor = () => {
    if (strongPercent >= 70) return 'text-green-600 dark:text-green-400'
    if (strongPercent + bankPercent >= 85) return 'text-blue-600 dark:text-blue-400'
    return 'text-amber-600 dark:text-amber-400'
  }

  const getAuditReadinessLabel = () => {
    if (strongPercent >= 70) return 'Excellent'
    if (strongPercent + bankPercent >= 85) return 'Good'
    return 'Needs Improvement'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Income Verification Status</span>
          <span className={`text-sm font-semibold ${getAuditReadinessColor()}`}>
            {getAuditReadinessLabel()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Total Income Summary */}
          <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Income Tracked</span>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(stats.totalAmount)}
            </span>
          </div>

          {/* Verification Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Documentation Quality</h4>
            
            {/* Strong */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔒</span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Strong Verification</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{stats.strong} transactions ({strongPercent}%)</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(stats.strongAmount)}
              </span>
            </div>

            {/* Bank */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏦</span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Bank Verified</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{stats.bank} transactions ({bankPercent}%)</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {formatCurrency(stats.bankAmount)}
              </span>
            </div>

            {/* Self Reported */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📝</span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Self-Reported</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{stats.self} transactions ({selfPercent}%)</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                {formatCurrency(stats.selfAmount)}
              </span>
            </div>
          </div>

          {/* Duplicate Prevention Stats */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Duplicate Prevention</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Linked Transactions</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{stats.linked} pairs</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Duplicates Excluded</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">{stats.duplicatesFound}</span>
              </div>
            </div>
          </div>

          {/* Audit Readiness Tip */}
          {strongPercent < 70 && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <span className="text-amber-600 dark:text-amber-400">💡</span>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>Tip:</strong> Link more check-to-deposit pairs to improve audit readiness. 
                  Aim for 70%+ strong verification for best IRS defense.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
