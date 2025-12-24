'use client'

import { useStore } from '@/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Transaction } from '@/types'
import { useMemo } from 'react'

export default function CategorizationReportPage() {
  const { transactions } = useStore()

  const manuallyEditedTransactions = useMemo(() => {
    return transactions
      .filter(t => t.wasManuallyEdited && t.originalType && t.originalCategory)
      .sort((a, b) => (b.editedAt || b.updatedAt).localeCompare(a.editedAt || a.updatedAt))
  }, [transactions])

  const categorizationStats = useMemo(() => {
    const stats = {
      totalEdited: manuallyEditedTransactions.length,
      typeChanges: 0,
      categoryChanges: 0,
      incomeToExpense: 0,
      expenseToIncome: 0,
      categoryBreakdown: {} as Record<string, { original: string; corrected: string; count: number }[]>
    }

    manuallyEditedTransactions.forEach(t => {
      if (t.type !== t.originalType) {
        stats.typeChanges++
        if (t.originalType === 'income' && t.type === 'expense') {
          stats.incomeToExpense++
        } else if (t.originalType === 'expense' && t.type === 'income') {
          stats.expenseToIncome++
        }
      }

      if (t.category !== t.originalCategory) {
        stats.categoryChanges++
      }

      const key = `${t.originalType}:${t.originalCategory} → ${t.type}:${t.category}`
      if (!stats.categoryBreakdown[t.description]) {
        stats.categoryBreakdown[t.description] = []
      }
      stats.categoryBreakdown[t.description].push({
        original: `${t.originalType}/${t.originalCategory}`,
        corrected: `${t.type}/${t.category}`,
        count: 1
      })
    })

    return stats
  }, [manuallyEditedTransactions])

  const formatCategory = (category: string) => {
    return category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Categorization Changes Report</h1>
        <p className="text-gray-600">
          Track manual categorization corrections to improve automatic categorization accuracy
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Edited</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categorizationStats.totalEdited}</div>
            <p className="text-xs text-gray-600 mt-1">Transactions manually corrected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Type Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categorizationStats.typeChanges}</div>
            <p className="text-xs text-gray-600 mt-1">Income/Expense corrections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600">Income → Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{categorizationStats.incomeToExpense}</div>
            <p className="text-xs text-gray-600 mt-1">Incorrectly marked as income</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600">Expense → Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{categorizationStats.expenseToIncome}</div>
            <p className="text-xs text-gray-600 mt-1">Incorrectly marked as expense</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manual Corrections History</CardTitle>
          <CardDescription>
            All transactions where categorization was manually corrected - use this data to improve heuristics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {manuallyEditedTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No manual corrections yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Amount</th>
                    <th className="text-left p-2">Original</th>
                    <th className="text-left p-2">Corrected To</th>
                    <th className="text-left p-2">Edited</th>
                  </tr>
                </thead>
                <tbody>
                  {manuallyEditedTransactions.map(transaction => (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{new Date(transaction.date).toLocaleDateString()}</td>
                      <td className="p-2">{transaction.description}</td>
                      <td className="p-2 text-right font-mono">{formatAmount(transaction.amount)}</td>
                      <td className="p-2">
                        <div className="text-sm">
                          <div className="font-medium text-gray-500">
                            {transaction.originalType === 'income' ? '💰' : '💳'} {transaction.originalType}
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatCategory(transaction.originalCategory || '')}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="text-sm">
                          <div className="font-medium text-blue-600">
                            {transaction.type === 'income' ? '💰' : '💳'} {transaction.type}
                          </div>
                          <div className="text-xs text-blue-400">
                            {formatCategory(transaction.category)}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-xs text-gray-500">
                        {transaction.editedAt 
                          ? new Date(transaction.editedAt).toLocaleString()
                          : new Date(transaction.updatedAt).toLocaleString()
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Patterns to Improve</CardTitle>
          <CardDescription>
            Common vendors/descriptions that need categorization rule improvements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(categorizationStats.categoryBreakdown).map(([description, changes]) => (
              <div key={description} className="border-l-4 border-blue-500 pl-4">
                <div className="font-medium">{description}</div>
                {changes.map((change, idx) => (
                  <div key={idx} className="text-sm text-gray-600 mt-1">
                    ❌ {change.original} → ✅ {change.corrected}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
