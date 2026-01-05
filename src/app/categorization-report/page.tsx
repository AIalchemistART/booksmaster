'use client'

import { useStore } from '@/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Transaction } from '@/types'
import { useMemo } from 'react'
import { FirstVisitIntro, useFirstVisit } from '@/components/gamification/FirstVisitIntro'

export default function CategorizationReportPage() {
  const { transactions } = useStore()
  const { showIntro, closeIntro } = useFirstVisit('categorization-changes')

  const manuallyEditedTransactions = useMemo(() => {
    console.log('[CATEGORIZATION REPORT] Total transactions:', transactions.length)
    console.log('[CATEGORIZATION REPORT] All transactions:', transactions.map(t => ({
      id: t.id,
      description: t.description,
      wasManuallyEdited: t.wasManuallyEdited,
      originalType: t.originalType,
      originalCategory: t.originalCategory
    })))
    
    const filtered = transactions
      .filter(t => {
        const passes = t.wasManuallyEdited
        console.log('[CATEGORIZATION REPORT] Transaction', t.id, 'passes filter:', passes, {
          wasManuallyEdited: t.wasManuallyEdited,
          originalType: t.originalType,
          type: t.type,
          originalCategory: t.originalCategory,
          category: t.category
        })
        return passes
      })
      .sort((a, b) => (b.editedAt || b.updatedAt).localeCompare(a.editedAt || a.updatedAt))
    
    console.log('[CATEGORIZATION REPORT] Filtered transactions:', filtered.length)
    return filtered
  }, [transactions])

  const categorizationStats = useMemo(() => {
    const stats = {
      totalEdited: manuallyEditedTransactions.length,
      typeChanges: 0,
      categoryChanges: 0,
      incomeToExpense: 0,
      expenseToIncome: 0,
      categoryBreakdown: {} as Record<string, { original: string; corrected: string; count: number; notes?: string }[]>
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
        count: 1,
        notes: t.notes || undefined
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
      <FirstVisitIntro tabId="categorization-changes" isVisible={showIntro} onClose={closeIntro} />
      
      <div>
        <h1 className="text-3xl font-bold mb-2">Categorization Changes Report</h1>
        <p className="text-gray-600 dark:text-gray-300">
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
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left p-2 text-gray-900 dark:text-gray-100">Date</th>
                    <th className="text-left p-2 text-gray-900 dark:text-gray-100">Description</th>
                    <th className="text-right p-2 text-gray-900 dark:text-gray-100">Amount</th>
                    <th className="text-left p-2 text-gray-900 dark:text-gray-100">Original</th>
                    <th className="text-left p-2 text-gray-900 dark:text-gray-100">Corrected To</th>
                    <th className="text-left p-2 text-gray-900 dark:text-gray-100">All Changes</th>
                    <th className="text-left p-2 text-gray-900 dark:text-gray-100">Notes</th>
                    <th className="text-left p-2 text-gray-900 dark:text-gray-100">Edited</th>
                  </tr>
                </thead>
                <tbody>
                  {manuallyEditedTransactions.map(transaction => (
                    <tr key={transaction.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-2 text-gray-900 dark:text-gray-100">{new Date(transaction.date).toLocaleDateString()}</td>
                      <td className="p-2 text-gray-900 dark:text-gray-100">{transaction.description}</td>
                      <td className="p-2 text-right font-mono text-gray-900 dark:text-gray-100">{formatAmount(transaction.amount)}</td>
                      <td className="p-2">
                        {transaction.originalType && (transaction.originalType !== transaction.type || transaction.originalCategory !== transaction.category) ? (
                          <div className="text-sm">
                            <div className="font-medium text-gray-500 dark:text-gray-400">
                              {transaction.originalType === 'income' ? '💰' : '💳'} {transaction.originalType}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {formatCategory(transaction.originalCategory || '')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600 text-sm">-</span>
                        )}
                      </td>
                      <td className="p-2">
                        {transaction.originalType && (transaction.originalType !== transaction.type || transaction.originalCategory !== transaction.category) ? (
                          <div className="text-sm">
                            <div className="font-medium text-blue-600 dark:text-blue-400">
                              {transaction.type === 'income' ? '💰' : '💳'} {transaction.type}
                            </div>
                            <div className="text-xs text-blue-400 dark:text-blue-300">
                              {formatCategory(transaction.category)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600 text-sm">-</span>
                        )}
                      </td>
                      <td className="p-2 text-xs">
                        <div className="space-y-1">
                          {transaction.originalDate && transaction.originalDate !== transaction.date && (
                            <div className="text-orange-600 dark:text-orange-400">
                              📅 Date: {new Date(transaction.originalDate).toLocaleDateString()} → {new Date(transaction.date).toLocaleDateString()}
                            </div>
                          )}
                          {transaction.originalDescription && transaction.originalDescription !== transaction.description && (
                            <div className="text-orange-600 dark:text-orange-400">
                              📝 Desc: {transaction.originalDescription} → {transaction.description}
                            </div>
                          )}
                          {transaction.originalAmount !== undefined && transaction.originalAmount !== transaction.amount && (
                            <div className="text-orange-600 dark:text-orange-400">
                              💰 Amt: {formatAmount(transaction.originalAmount)} → {formatAmount(transaction.amount)}
                            </div>
                          )}
                          {(transaction.originalPaymentMethod || '') !== (transaction.paymentMethod || '') && (
                            <div className="text-green-600 dark:text-green-400">
                              💳 Payment: {transaction.originalPaymentMethod || 'Not specified'} → {transaction.paymentMethod || 'Not specified'}
                            </div>
                          )}
                          {(!transaction.originalDate || transaction.originalDate === transaction.date) &&
                           (!transaction.originalDescription || transaction.originalDescription === transaction.description) &&
                           (transaction.originalAmount === undefined || transaction.originalAmount === transaction.amount) &&
                           ((transaction.originalPaymentMethod || '') === (transaction.paymentMethod || '')) && (
                            <span className="text-gray-400 dark:text-gray-600">Type/Category only</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-xs text-gray-600 dark:text-gray-400 max-w-xs">
                        {transaction.notes ? (
                          <div className="truncate" title={transaction.notes}>
                            {transaction.notes}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600">-</span>
                        )}
                      </td>
                      <td className="p-2 text-xs text-gray-500 dark:text-gray-400">
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
            {manuallyEditedTransactions.map((transaction) => (
              <div key={transaction.id} className="border-l-4 border-blue-500 dark:border-blue-600 pl-4 pb-3">
                <div className="font-medium text-gray-900 dark:text-gray-100">{transaction.description}</div>
                <div className="mt-2 space-y-1 text-sm">
                  {/* Show type/category changes */}
                  {(transaction.originalType !== transaction.type || transaction.originalCategory !== transaction.category) && (
                    <div className="text-gray-600 dark:text-gray-400">
                      ❌ {transaction.originalType}/{transaction.originalCategory?.replace(/_/g, ' ')} → ✅ {transaction.type}/{transaction.category.replace(/_/g, ' ')}
                    </div>
                  )}
                  
                  {/* Show date changes */}
                  {transaction.originalDate && transaction.originalDate !== transaction.date && (
                    <div className="text-orange-600 dark:text-orange-400 text-xs">
                      📅 Date corrected: {new Date(transaction.originalDate).toLocaleDateString()} → {new Date(transaction.date).toLocaleDateString()}
                    </div>
                  )}
                  
                  {/* Show description changes */}
                  {transaction.originalDescription && transaction.originalDescription !== transaction.description && (
                    <div className="text-orange-600 dark:text-orange-400 text-xs">
                      📝 Description corrected: "{transaction.originalDescription}" → "{transaction.description}"
                    </div>
                  )}
                  
                  {/* Show amount changes */}
                  {transaction.originalAmount !== undefined && transaction.originalAmount !== transaction.amount && (
                    <div className="text-orange-600 dark:text-orange-400 text-xs">
                      💰 Amount corrected: {formatAmount(transaction.originalAmount)} → {formatAmount(transaction.amount)}
                    </div>
                  )}
                  
                  {/* Show payment method changes */}
                  {(transaction.originalPaymentMethod || '') !== (transaction.paymentMethod || '') && (
                    <div className="text-green-600 dark:text-green-400 text-xs">
                      💳 Payment method corrected: {transaction.originalPaymentMethod || 'Not specified'} → {transaction.paymentMethod || 'Not specified'}
                    </div>
                  )}
                  
                  {/* Show user notes */}
                  {transaction.notes && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 italic pl-4 mt-1">
                      💡 {transaction.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
