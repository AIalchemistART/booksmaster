'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { findPotentialDuplicates, linkTransactions, type PotentialDuplicate } from '@/lib/duplicate-detection'
import { Link, X } from 'lucide-react'

export function BulkLinkingSuggestions() {
  const { transactions, updateTransaction } = useStore()
  const [suggestions, setSuggestions] = useState<Array<{
    transaction: any
    duplicates: PotentialDuplicate[]
  }>>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Find all unlinked income transactions
    const unlinkedIncome = transactions.filter(t => 
      t.type === 'income' && 
      !t.linkedTransactionId &&
      !t.isDuplicateOfLinked
    )

    // Find potential duplicates for each
    const allSuggestions = unlinkedIncome
      .map(t => ({
        transaction: t,
        duplicates: findPotentialDuplicates(t, transactions)
          .filter(d => d.matchScore >= 75) // Only high-confidence matches
      }))
      .filter(s => s.duplicates.length > 0 && !dismissed.has(s.transaction.id))
      .sort((a, b) => {
        // Sort by highest match score
        const aMax = Math.max(...a.duplicates.map(d => d.matchScore))
        const bMax = Math.max(...b.duplicates.map(d => d.matchScore))
        return bMax - aMax
      })

    setSuggestions(allSuggestions.slice(0, 10)) // Limit to top 10
  }, [transactions, dismissed])

  const handleLink = (primaryId: string, duplicateId: string) => {
    const updatedTransactions = linkTransactions(primaryId, duplicateId, transactions)
    
    const primaryTx = updatedTransactions.find(t => t.id === primaryId)
    const duplicateTx = updatedTransactions.find(t => t.id === duplicateId)
    
    if (primaryTx) {
      updateTransaction(primaryTx.id, {
        linkedTransactionId: primaryTx.linkedTransactionId,
        verificationLevel: primaryTx.verificationLevel,
        isDuplicateOfLinked: primaryTx.isDuplicateOfLinked
      })
    }
    if (duplicateTx) {
      updateTransaction(duplicateTx.id, {
        linkedTransactionId: duplicateTx.linkedTransactionId,
        verificationLevel: duplicateTx.verificationLevel,
        isDuplicateOfLinked: duplicateTx.isDuplicateOfLinked
      })
    }

    // Remove from suggestions
    setDismissed(prev => new Set(Array.from(prev).concat(primaryId)))
  }

  const handleDismiss = (transactionId: string) => {
    setDismissed(prev => new Set(Array.from(prev).concat(transactionId)))
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Linking Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-sm">✅ No high-confidence duplicate matches found</p>
            <p className="text-xs mt-2">All income appears to be properly documented</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Linking Suggestions ({suggestions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          AI-detected potential duplicates with 75%+ match confidence. Review and link to prevent double-counting.
        </p>
        
        <div className="space-y-4">
          {suggestions.map(({ transaction, duplicates }) => (
            <div key={transaction.id} className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatDate(transaction.date)} - {formatCurrency(transaction.amount)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{transaction.description}</div>
                  {transaction.incomeSource && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Source: {transaction.incomeSource}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDismiss(transaction.id)}
                  className="ml-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 pl-4 border-l-2 border-amber-400 dark:border-amber-600">
                {duplicates.slice(0, 2).map(dup => (
                  <div key={dup.transaction.id} className="p-3 bg-white dark:bg-gray-800 rounded border border-amber-300 dark:border-amber-700">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {formatDate(dup.transaction.date)} - {formatCurrency(dup.transaction.amount)}
                          </span>
                          <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded font-semibold">
                            {dup.matchScore}% match
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{dup.transaction.description}</div>
                        <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          {dup.matchReasons.join(' • ')}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleLink(transaction.id, dup.transaction.id)}
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                    >
                      🔗 Link as Duplicate (Primary stays counted)
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {suggestions.length > 10 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
            Showing top 10 suggestions. Link these to see more.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
