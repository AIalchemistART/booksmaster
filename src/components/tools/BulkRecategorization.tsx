'use client'

import { useState } from 'react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Edit3, X, Check } from 'lucide-react'
import type { Transaction, ExpenseCategory, IncomeCategory } from '@/types'

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'materials',
  'tools',
  'fuel',
  'insurance',
  'permits',
  'subcontractors',
  'office_supplies',
  'marketing',
  'vehicle_maintenance',
  'equipment_rental',
  'professional_services',
  'utilities',
  'other'
]

const INCOME_CATEGORIES: IncomeCategory[] = [
  'residential_job',
  'commercial_job',
  'repairs',
  'consultation',
  'other_income'
]

const categoryLabels: Record<string, string> = {
  materials: 'Materials',
  tools: 'Tools',
  fuel: 'Fuel',
  insurance: 'Insurance',
  permits: 'Permits',
  subcontractors: 'Subcontractors',
  office_supplies: 'Office Supplies',
  marketing: 'Marketing',
  vehicle_maintenance: 'Vehicle Maintenance',
  equipment_rental: 'Equipment Rental',
  professional_services: 'Professional Services',
  utilities: 'Utilities',
  other: 'Other',
  residential_job: 'Residential Job',
  commercial_job: 'Commercial Job',
  repairs: 'Repairs',
  consultation: 'Consultation',
  other_income: 'Other Income'
}

interface BulkRecategorizationProps {
  selectedTransactions?: Transaction[]
  onClose?: () => void
}

export function BulkRecategorization({ selectedTransactions = [], onClose }: BulkRecategorizationProps) {
  const store = useStore()
  const { updateTransaction } = store
  const [newCategory, setNewCategory] = useState<string>('')
  const [newType, setNewType] = useState<'income' | 'expense' | ''>('')

  const handleApply = async () => {
    if (!newCategory && !newType) return
    
    selectedTransactions.forEach(transaction => {
      const updates: Partial<Transaction> = {}
      
      if (newType && newType !== transaction.type) {
        updates.type = newType
      }
      
      if (newCategory && newCategory !== transaction.category) {
        updates.category = newCategory as any
      }
      
      if (Object.keys(updates).length > 0) {
        updateTransaction(transaction.id, updates)
      }
    })
    
    // Award XP for bulk recategorization
    await store.completeAction('bulkCategorize')
    
    // Award achievement (first time using bulk operations)
    store.unlockAchievement('efficiency_expert')
    
    if (onClose) onClose()
  }

  const handleCancel = () => {
    if (onClose) onClose()
  }

  if (selectedTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Bulk Re-categorization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            No transactions selected. Select transactions from the table to bulk update their categories.
          </p>
        </CardContent>
      </Card>
    )
  }

  const types = Array.from(new Set(selectedTransactions.map(t => t.type)))
  const availableCategories = types.length === 1 && types[0] === 'income' 
    ? INCOME_CATEGORIES 
    : types.length === 1 && types[0] === 'expense'
    ? EXPENSE_CATEGORIES
    : [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="h-5 w-5" />
          Bulk Re-categorization ({selectedTransactions.length} transactions)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Preview of selected transactions */}
          <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Selected Transactions:</h4>
            <div className="space-y-2">
              {selectedTransactions.slice(0, 10).map(t => (
                <div key={t.id} className="text-xs flex justify-between items-center p-2 bg-white dark:bg-gray-900 rounded">
                  <span className="flex-1 truncate">{formatDate(t.date)} - {t.description}</span>
                  <span className="ml-2 font-medium">{formatCurrency(t.amount)}</span>
                  <span className="ml-2 text-gray-500 dark:text-gray-400 capitalize text-[10px]">
                    {categoryLabels[t.category] || t.category}
                  </span>
                </div>
              ))}
              {selectedTransactions.length > 10 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  + {selectedTransactions.length - 10} more
                </p>
              )}
            </div>
          </div>

          {/* Re-categorization form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="New Type (optional)"
              value={newType}
              onChange={(e) => {
                setNewType(e.target.value as 'income' | 'expense' | '')
                setNewCategory('') // Reset category when type changes
              }}
              options={[
                { value: '', label: '-- Keep Current --' },
                { value: 'income', label: 'Income' },
                { value: 'expense', label: 'Expense' }
              ]}
            />

            <Select
              label="New Category (optional)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              options={[
                { value: '', label: '-- Keep Current --' },
                ...availableCategories.map(cat => ({
                  value: cat,
                  label: categoryLabels[cat]
                }))
              ]}
            />
          </div>

          {/* Warning */}
          {(newType || newCategory) && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>⚠️ Warning:</strong> This will update {selectedTransactions.length} transaction{selectedTransactions.length > 1 ? 's' : ''}.
                {newType && ` Type will be changed to "${newType}".`}
                {newCategory && ` Category will be changed to "${categoryLabels[newCategory]}".`}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={!newType && !newCategory}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Check className="h-4 w-4" />
              Apply to {selectedTransactions.length} Transaction{selectedTransactions.length > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
