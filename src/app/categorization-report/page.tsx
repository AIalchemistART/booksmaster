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

  // Determine which columns to show based on actual changes
  const columnsToShow = useMemo(() => {
    const hasTypeChanges = manuallyEditedTransactions.some(t => 
      t.originalType && t.originalType !== t.type
    )
    const hasCategoryChanges = manuallyEditedTransactions.some(t => 
      t.originalCategory && t.originalCategory !== t.category
    )
    const hasPaymentMethodChanges = manuallyEditedTransactions.some(t => 
      (t.originalPaymentMethod || '') !== (t.paymentMethod || '')
    )
    const hasItemizationChanges = manuallyEditedTransactions.some(t => 
      t.originalAmount !== undefined // Proxy: if we track original amount, we likely have itemization changes tracked too
    )
    
    return {
      type: hasTypeChanges,
      category: hasCategoryChanges,
      paymentMethod: hasPaymentMethodChanges,
      itemization: hasItemizationChanges
    }
  }, [manuallyEditedTransactions])

  const categorizationStats = useMemo(() => {
    const stats = {
      totalEdited: manuallyEditedTransactions.length,
      typeChanges: 0,
      categoryChanges: 0,
      incomeToExpense: 0,
      expenseToIncome: 0
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
    })

    return stats
  }, [manuallyEditedTransactions])

  // Dynamic pattern detection - vendor and category learning
  const detectedPatterns = useMemo(() => {
    const vendorPatterns = new Map<string, { category: string, count: number }>()
    const categoryCorrections = new Map<string, { from: string, to: string, count: number }>()
    
    manuallyEditedTransactions.forEach(t => {
      // Track vendor → category corrections
      if (t.category !== t.originalCategory && t.description) {
        const vendor = t.description.toLowerCase()
        const existing = vendorPatterns.get(vendor)
        if (existing && existing.category === t.category) {
          vendorPatterns.set(vendor, { category: t.category, count: existing.count + 1 })
        } else if (!existing) {
          vendorPatterns.set(vendor, { category: t.category, count: 1 })
        }
      }
      
      // Track category correction patterns
      if (t.category !== t.originalCategory && t.originalCategory) {
        const key = `${t.originalCategory}→${t.category}`
        const existing = categoryCorrections.get(key)
        if (existing) {
          categoryCorrections.set(key, { from: t.originalCategory, to: t.category, count: existing.count + 1 })
        } else {
          categoryCorrections.set(key, { from: t.originalCategory, to: t.category, count: 1 })
        }
      }
    })
    
    // Get top patterns
    const topVendorPatterns = Array.from(vendorPatterns.entries())
      .filter(([_, data]) => data.count >= 2) // Show vendors with 2+ corrections
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
    
    const topCategoryPatterns = Array.from(categoryCorrections.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
    
    return { vendorPatterns: topVendorPatterns, categoryPatterns: topCategoryPatterns }
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
                    {columnsToShow.type && (
                      <th className="text-left p-2 text-gray-900 dark:text-gray-100">Type Change</th>
                    )}
                    {columnsToShow.category && (
                      <th className="text-left p-2 text-gray-900 dark:text-gray-100">Category Change</th>
                    )}
                    {columnsToShow.paymentMethod && (
                      <th className="text-left p-2 text-gray-900 dark:text-gray-100">Payment Method</th>
                    )}
                    {columnsToShow.itemization && (
                      <th className="text-left p-2 text-gray-900 dark:text-gray-100">Itemization</th>
                    )}
                    <th className="text-left p-2 text-gray-900 dark:text-gray-100">Notes</th>
                    <th className="text-left p-2 text-gray-900 dark:text-gray-100">Edited</th>
                  </tr>
                </thead>
                <tbody>
                  {manuallyEditedTransactions.map(transaction => {
                    const dateChanged = transaction.originalDate && transaction.originalDate !== transaction.date
                    const descChanged = transaction.originalDescription && transaction.originalDescription !== transaction.description
                    const amtChanged = transaction.originalAmount !== undefined && transaction.originalAmount !== transaction.amount
                    const typeChanged = transaction.originalType && transaction.originalType !== transaction.type
                    const catChanged = transaction.originalCategory && transaction.originalCategory !== transaction.category
                    const pmChanged = (transaction.originalPaymentMethod || '') !== (transaction.paymentMethod || '')
                    
                    return (
                      <tr key={transaction.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                        {/* Always show: Date */}
                        <td className="p-2 text-xs">
                          <div className="text-gray-900 dark:text-gray-100">
                            {new Date(transaction.date).toLocaleDateString()}
                          </div>
                          {dateChanged && (
                            <div className="text-orange-500 dark:text-orange-400 text-[10px] mt-1">
                              ← {new Date(transaction.originalDate!).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        
                        {/* Always show: Description */}
                        <td className="p-2 text-xs">
                          <div className="text-gray-900 dark:text-gray-100">
                            {transaction.description}
                          </div>
                          {descChanged && (
                            <div className="text-orange-500 dark:text-orange-400 text-[10px] mt-1">
                              ← {transaction.originalDescription}
                            </div>
                          )}
                        </td>
                        
                        {/* Always show: Amount */}
                        <td className="p-2 text-right text-xs">
                          <div className="font-mono text-gray-900 dark:text-gray-100">
                            {formatAmount(transaction.amount)}
                          </div>
                          {amtChanged && (
                            <div className="text-orange-500 dark:text-orange-400 text-[10px] mt-1">
                              ← {formatAmount(transaction.originalAmount!)}
                            </div>
                          )}
                        </td>
                        
                        {/* Conditional: Type Change */}
                        {columnsToShow.type && (
                          <td className="p-2 text-xs">
                            {typeChanged ? (
                              <div className="space-y-1">
                                <div className="text-gray-500 dark:text-gray-400">
                                  {transaction.originalType === 'income' ? '💰' : '💳'} {transaction.originalType}
                                </div>
                                <div className="text-blue-600 dark:text-blue-400 font-medium">
                                  → {transaction.type === 'income' ? '💰' : '💳'} {transaction.type}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600">-</span>
                            )}
                          </td>
                        )}
                        
                        {/* Conditional: Category Change */}
                        {columnsToShow.category && (
                          <td className="p-2 text-xs">
                            {catChanged ? (
                              <div className="space-y-1">
                                <div className="text-gray-500 dark:text-gray-400">
                                  {formatCategory(transaction.originalCategory || '')}
                                </div>
                                <div className="text-blue-600 dark:text-blue-400 font-medium">
                                  → {formatCategory(transaction.category)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600">-</span>
                            )}
                          </td>
                        )}
                        
                        {/* Conditional: Payment Method */}
                        {columnsToShow.paymentMethod && (
                          <td className="p-2 text-xs">
                            {pmChanged ? (
                              <div className="space-y-1">
                                <div className="text-gray-500 dark:text-gray-400">
                                  {transaction.originalPaymentMethod || 'Not specified'}
                                </div>
                                <div className="text-green-600 dark:text-green-400 font-medium">
                                  → {transaction.paymentMethod || 'Not specified'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600">-</span>
                            )}
                          </td>
                        )}
                        
                        {/* Conditional: Itemization (placeholder for future) */}
                        {columnsToShow.itemization && (
                          <td className="p-2 text-xs">
                            <span className="text-gray-400 dark:text-gray-600">-</span>
                          </td>
                        )}
                        
                        {/* Always show: Notes */}
                        <td className="p-2 text-xs text-gray-600 dark:text-gray-400 max-w-xs">
                          {transaction.notes ? (
                            <div className="truncate" title={transaction.notes}>
                              {transaction.notes}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600">-</span>
                          )}
                        </td>
                        
                        {/* Always show: Edited timestamp */}
                        <td className="p-2 text-xs text-gray-500 dark:text-gray-400">
                          {transaction.editedAt 
                            ? new Date(transaction.editedAt).toLocaleString()
                            : new Date(transaction.updatedAt).toLocaleString()
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Learning Insights</CardTitle>
          <CardDescription>
            How the AI is adapting based on your manual corrections
          </CardDescription>
        </CardHeader>
        <CardContent>
          {manuallyEditedTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pattern data yet - start making corrections to train the AI</p>
          ) : (
            <div className="space-y-6">
              {/* Overall Learning Summary */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📊 Learning Summary</h3>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <p>• Total corrections analyzed: <span className="font-semibold">{manuallyEditedTransactions.length}</span></p>
                  <p>• Type corrections: <span className="font-semibold">{categorizationStats.typeChanges}</span></p>
                  <p>• Category corrections: <span className="font-semibold">{categorizationStats.categoryChanges}</span></p>
                  <p>• Payment method refinements: <span className="font-semibold">{manuallyEditedTransactions.filter(t => (t.originalPaymentMethod || '') !== (t.paymentMethod || '')).length}</span></p>
                </div>
              </div>

              {/* Pattern Analysis - Dynamic insights from actual corrections */}
              <div className="border-l-4 border-purple-500 dark:border-purple-600 pl-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">🧠 Detected Patterns</h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                  {/* Vendor-specific category learning */}
                  {detectedPatterns.vendorPatterns.length > 0 && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-3">
                      <div className="font-medium text-purple-900 dark:text-purple-100 mb-2">📍 Vendor Category Learning:</div>
                      <ul className="space-y-1.5 text-xs">
                        {detectedPatterns.vendorPatterns.map(([vendor, data]) => (
                          <li key={vendor} className="flex items-start gap-2">
                            <span className="text-purple-600 dark:text-purple-400 mt-0.5">→</span>
                            <span>
                              <span className="font-semibold">{vendor}</span> corrected to <span className="font-semibold">{formatCategory(data.category)}</span> <span className="text-purple-600 dark:text-purple-400">×{data.count}</span>
                              {data.count >= 3 && <span className="ml-1 text-green-600 dark:text-green-400">✓ Pattern learned</span>}
                              {data.count === 2 && <span className="ml-1 text-amber-600 dark:text-amber-400">↗ Learning...</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs text-purple-700 dark:text-purple-300 italic">
                        The AI will remember these vendor preferences and apply them to future transactions.
                      </p>
                    </div>
                  )}
                  
                  {/* Category correction patterns */}
                  {detectedPatterns.categoryPatterns.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
                      <div className="font-medium text-blue-900 dark:text-blue-100 mb-2">🔄 Common Category Corrections:</div>
                      <ul className="space-y-1.5 text-xs">
                        {detectedPatterns.categoryPatterns.map(([key, data]) => (
                          <li key={key} className="flex items-center gap-2">
                            <span className="text-red-500">❌ {formatCategory(data.from)}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-green-600">✓ {formatCategory(data.to)}</span>
                            <span className="text-blue-600 dark:text-blue-400 ml-auto">({data.count}×)</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Type changes */}
                  {categorizationStats.typeChanges > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">💱 Transaction Type Adjustments:</div>
                      <ul className="mt-1 space-y-1 text-xs">
                        {categorizationStats.incomeToExpense > 0 && (
                          <li>• {categorizationStats.incomeToExpense} incorrectly classified as Income → corrected to Expense</li>
                        )}
                        {categorizationStats.expenseToIncome > 0 && (
                          <li>• {categorizationStats.expenseToIncome} incorrectly classified as Expense → corrected to Income</li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  {/* Payment method learning */}
                  {manuallyEditedTransactions.filter(t => (t.originalPaymentMethod || '') !== (t.paymentMethod || '')).length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">💳 Payment Method Recognition:</div>
                      <p className="mt-1 text-xs">
                        {manuallyEditedTransactions.filter(t => (t.originalPaymentMethod || '') !== (t.paymentMethod || '')).length} correction{manuallyEditedTransactions.filter(t => (t.originalPaymentMethod || '') !== (t.paymentMethod || '')).length > 1 ? 's' : ''} recorded - improving OCR detection of payment methods from receipts.
                      </p>
                    </div>
                  )}
                  
                  {/* Show placeholder if no patterns yet */}
                  {detectedPatterns.vendorPatterns.length === 0 && detectedPatterns.categoryPatterns.length === 0 && categorizationStats.typeChanges === 0 && (
                    <p className="italic text-gray-500 dark:text-gray-400">
                      Pattern analysis will appear here as you make corrections. The system identifies trends after 2+ similar corrections.
                    </p>
                  )}
                </div>
              </div>

              {/* Dynamic adaptation strategy based on learning progress */}
              <div className="border-l-4 border-green-500 dark:border-green-600 pl-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">🎯 Adaptation Strategy</h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                  {manuallyEditedTransactions.length < 3 && (
                    <p className="text-amber-600 dark:text-amber-400">
                      <strong>Early Learning Phase:</strong> The AI is collecting initial correction data. 
                      Make {3 - manuallyEditedTransactions.length} more correction{3 - manuallyEditedTransactions.length > 1 ? 's' : ''} to begin pattern recognition.
                    </p>
                  )}
                  
                  {manuallyEditedTransactions.length >= 3 && manuallyEditedTransactions.length < 10 && (
                    <div>
                      <p className="text-blue-600 dark:text-blue-400 mb-2">
                        <strong>Pattern Recognition Active:</strong> The AI is identifying your categorization preferences.
                      </p>
                      <ul className="text-xs space-y-1 ml-4">
                        <li>• Vendor patterns will be learned after 3+ identical corrections</li>
                        <li>• Category preferences are being tracked across transactions</li>
                        <li>• Continue making corrections to strengthen learning</li>
                      </ul>
                    </div>
                  )}
                  
                  {manuallyEditedTransactions.length >= 10 && detectedPatterns.vendorPatterns.length === 0 && (
                    <div>
                      <p className="text-green-600 dark:text-green-400 mb-2">
                        <strong>Learning Established:</strong> {manuallyEditedTransactions.length} corrections analyzed.
                      </p>
                      <p className="text-xs">
                        The AI has processed your correction history. Vendor-specific patterns will emerge as you correct the same vendors multiple times.
                      </p>
                    </div>
                  )}
                  
                  {detectedPatterns.vendorPatterns.length > 0 && (
                    <div>
                      <p className="text-green-600 dark:text-green-400 mb-2">
                        <strong>Active Learning:</strong> {detectedPatterns.vendorPatterns.length} vendor pattern{detectedPatterns.vendorPatterns.length > 1 ? 's' : ''} detected.
                      </p>
                      <ul className="text-xs space-y-1 ml-4">
                        <li>✓ Vendor preferences are being applied to new transactions</li>
                        <li>✓ Category corrections inform future AI suggestions</li>
                        <li>✓ System confidence increases with each validation</li>
                      </ul>
                      {detectedPatterns.vendorPatterns.some(([_, data]) => data.count >= 3) && (
                        <p className="text-xs mt-2 text-green-700 dark:text-green-300 italic">
                          Strong patterns established - the AI will now auto-apply these categorizations with high confidence.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
