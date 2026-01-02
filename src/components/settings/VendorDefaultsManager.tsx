'use client'

import { useState } from 'react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Trash2, Plus, Store } from 'lucide-react'
import type { ExpenseCategory, IncomeCategory } from '@/types'

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

export function VendorDefaultsManager() {
  const store = useStore()
  const { vendorDefaults, addVendorDefault, removeVendorDefault } = store
  const [newVendor, setNewVendor] = useState('')
  const [newType, setNewType] = useState<'income' | 'expense'>('expense')
  const [newCategory, setNewCategory] = useState<string>('materials')

  const vendorEntries = Object.entries(vendorDefaults) as [string, { category: string; type: string }][]

  const handleAdd = async () => {
    if (!newVendor.trim()) return
    
    addVendorDefault(newVendor.trim(), newCategory, newType)
    
    // Award XP for creating vendor default
    await store.completeAction('addVendorDefault')
    
    // Check for achievement (after adding, so check current count + 1)
    const defaultsCount = Object.keys(vendorDefaults).length + 1
    if (defaultsCount === 5) {
      store.unlockAchievement('automation_master')
    }
    
    setNewVendor('')
    setNewCategory('materials')
    setNewType('expense')
  }

  const availableCategories = newType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Store className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Set default categories for frequently used vendors. These will be auto-applied when receipts are scanned.
        </p>
      </div>

      {/* Add New Vendor Default */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Add Vendor Rule</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            label="Vendor Name"
            value={newVendor}
            onChange={(e) => setNewVendor(e.target.value)}
            placeholder="e.g., Home Depot"
          />
          <Select
            label="Type"
            value={newType}
            onChange={(e) => {
              setNewType(e.target.value as 'income' | 'expense')
              setNewCategory(e.target.value === 'income' ? 'residential_job' : 'materials')
            }}
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' }
            ]}
          />
          <Select
            label="Category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            options={availableCategories.map(cat => ({
              value: cat,
              label: categoryLabels[cat]
            }))}
          />
          <div className="flex items-end">
            <Button
              onClick={handleAdd}
              disabled={!newVendor.trim()}
              className="w-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </div>
      </div>

      {/* Existing Vendor Defaults */}
      {vendorEntries.length > 0 ? (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
            Active Vendor Rules ({vendorEntries.length})
          </h4>
          <div className="space-y-2">
            {vendorEntries.map(([vendor, { category, type }]: [string, { category: string; type: string }]) => (
              <div
                key={vendor}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vendor</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {vendor}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Type</p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        type === 'income'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                      }`}
                    >
                      {type}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Category</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {categoryLabels[category]}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeVendorDefault(vendor)}
                  className="ml-4 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          <Store className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No vendor rules configured yet</p>
          <p className="text-xs mt-1">Add your first rule above to auto-categorize receipts</p>
        </div>
      )}
    </div>
  )
}
