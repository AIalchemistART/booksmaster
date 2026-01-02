'use client'

import { BulkLinkingSuggestions } from '@/components/tools/BulkLinkingSuggestions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useStore } from '@/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { calculateVerificationLevel } from '@/lib/duplicate-detection'
import { Link } from 'lucide-react'

export default function ReconciliationPage() {
  const { transactions } = useStore()

  const linkedPairs = transactions.filter(t => 
    t.linkedTransactionId && !t.isDuplicateOfLinked
  )

  const duplicates = transactions.filter(t => t.isDuplicateOfLinked)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Income Reconciliation</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Review linked transactions and discover potential duplicates
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Linked Pairs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {linkedPairs.length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Active transaction links preventing double-counting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Duplicates Excluded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {duplicates.length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Transactions marked as duplicates (not counted in totals)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Amount Prevented</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(duplicates.reduce((sum, t) => sum + t.amount, 0))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Income that would have been double-counted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Suggestions */}
      <div className="mb-8">
        <BulkLinkingSuggestions />
      </div>

      {/* Existing Linked Pairs */}
      {linkedPairs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Existing Linked Pairs ({linkedPairs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {linkedPairs.map(primary => {
                const duplicate = transactions.find(t => t.id === primary.linkedTransactionId)
                return (
                  <div key={primary.id} className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Primary */}
                      <div className="p-3 bg-white dark:bg-gray-800 rounded border-2 border-green-400 dark:border-green-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase">
                            Primary (Counted)
                          </span>
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                            🔒 Strong
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(primary.amount)}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(primary.date)}
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {primary.description}
                          </div>
                          {primary.incomeSource && (
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                              Source: {primary.incomeSource}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Duplicate */}
                      {duplicate && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded border-2 border-gray-300 dark:border-gray-600 opacity-75">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                              🔗 Linked Duplicate (Excluded)
                            </span>
                            <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                              Not Counted
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="font-semibold text-gray-700 dark:text-gray-300">
                              {formatCurrency(duplicate.amount)}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-500">
                              {formatDate(duplicate.date)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {duplicate.description}
                            </div>
                            {duplicate.incomeSource && (
                              <div className="text-xs text-gray-400 dark:text-gray-600 mt-2">
                                Source: {duplicate.incomeSource}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
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
