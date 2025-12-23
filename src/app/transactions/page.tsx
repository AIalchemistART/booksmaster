'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useStore, generateId } from '@/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Trash2, Edit2, X, Check, Receipt, ArrowRight, Sparkles } from 'lucide-react'
import type { Transaction, ExpenseCategory, TransactionType, Receipt as ReceiptType } from '@/types'
import { useFileSystemCheck } from '@/hooks/useFileSystemCheck'
import { FileSystemRequiredModal } from '@/components/modals/FileSystemRequiredModal'
import { categorizeTransaction, getCategoriesForType } from '@/lib/gemini-categorization'

const categoryOptions = [
  { value: 'materials', label: 'Materials' },
  { value: 'tools', label: 'Tools' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'subcontractors', label: 'Subcontractors' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'permits', label: 'Permits' },
  { value: 'other', label: 'Other' },
]

const typeOptions = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
]

export default function TransactionsPage() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, receipts, updateReceipt } = useStore()
  const { showModal, requireFileSystem, handleSetupComplete, handleCancel } = useFileSystemCheck()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all')
  const [filterCategory, setFilterCategory] = useState<'all' | ExpenseCategory>('all')
  const [categorizing, setCategorizing] = useState(false)
  
  // Get unlinked receipts (receipts not yet converted to transactions)
  const unlinkedReceipts = receipts.filter(r => !r.linkedTransactionId && r.ocrAmount)

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    type: 'expense' as TransactionType,
    category: 'materials' as ExpenseCategory,
    notes: '',
  })

  const handleSmartCategorize = async () => {
    if (!formData.description || !formData.amount) {
      alert('Please enter a description and amount first')
      return
    }

    setCategorizing(true)
    try {
      const result = await categorizeTransaction(
        formData.description,
        parseFloat(formData.amount) || 0
      )
      
      setFormData({
        ...formData,
        type: result.type,
        category: result.category.toLowerCase().replace(/\s+/g, '_') as ExpenseCategory
      })
    } catch (error) {
      console.error('Categorization error:', error)
      alert('Failed to categorize transaction. Please select manually.')
    } finally {
      setCategorizing(false)
    }
  }

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      description: '',
      type: 'expense',
      category: 'materials',
      notes: '',
    })
    setShowForm(false)
    setEditingId(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const now = new Date().toISOString()

    if (editingId) {
      updateTransaction(editingId, {
        date: formData.date,
        amount: parseFloat(formData.amount),
        description: formData.description,
        type: formData.type,
        category: formData.category,
        notes: formData.notes,
      })
    } else {
      const newTransaction: Transaction = {
        id: generateId(),
        date: formData.date,
        amount: parseFloat(formData.amount),
        description: formData.description,
        type: formData.type,
        category: formData.category,
        notes: formData.notes,
        createdAt: now,
        updatedAt: now,
      }
      addTransaction(newTransaction)
    }
    resetForm()
  }

  const handleEdit = (transaction: Transaction) => {
    setFormData({
      date: transaction.date,
      amount: transaction.amount.toString(),
      description: transaction.description,
      type: transaction.type,
      category: transaction.category,
      notes: transaction.notes || '',
    })
    setEditingId(transaction.id)
    setShowForm(true)
  }

  // Convert receipt to transaction
  const convertReceiptToTransaction = (receipt: ReceiptType) => {
    const now = new Date().toISOString()
    const transactionId = generateId()
    
    const newTransaction: Transaction = {
      id: transactionId,
      date: receipt.ocrDate || new Date().toISOString().split('T')[0],
      amount: receipt.ocrAmount || 0,
      description: receipt.ocrVendor || 'Receipt purchase',
      type: 'expense',
      category: 'materials', // Default category
      notes: receipt.ocrLineItems 
        ? `Items: ${receipt.ocrLineItems.map(i => i.description).join(', ')}`
        : undefined,
      receiptId: receipt.id,
      createdAt: now,
      updatedAt: now,
    }
    
    addTransaction(newTransaction)
    updateReceipt(receipt.id, { linkedTransactionId: transactionId })
  }

  // Filter transactions
  const filteredTransactions = transactions
    .filter((t) => filterType === 'all' || t.type === filterType)
    .filter((t) => filterCategory === 'all' || t.category === filterCategory)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-1">Track income and expenses</p>
        </div>
        <Button onClick={() => requireFileSystem(() => setShowForm(true))}>
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Unlinked Receipts */}
      {unlinkedReceipts.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
              <Receipt className="h-5 w-5" />
              {unlinkedReceipts.length} Receipt{unlinkedReceipts.length > 1 ? 's' : ''} Ready to Convert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unlinkedReceipts.slice(0, 3).map((receipt) => (
                <div key={receipt.id} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                  <div className="flex items-center gap-3">
                    {receipt.imageData ? (
                      <img src={receipt.imageData} alt="" className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{receipt.ocrVendor || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{receipt.ocrDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-green-600">
                      {formatCurrency(receipt.ocrAmount || 0)}
                    </span>
                    <Button size="sm" onClick={() => convertReceiptToTransaction(receipt)}>
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Convert
                    </Button>
                  </div>
                </div>
              ))}
              {unlinkedReceipts.length > 3 && (
                <p className="text-sm text-amber-700 text-center pt-2">
                  +{unlinkedReceipts.length - 3} more receipts
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Transaction' : 'New Transaction'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
                <Input
                  label="Amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
                <Select
                  label="Type"
                  options={typeOptions}
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })}
                />
                <Select
                  label="Category"
                  options={categoryOptions}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                />
              </div>
              <Input
                label="Description"
                placeholder="Enter description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
              
              {/* AI Categorization Button */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Smart Categorization
                    </p>
                    <p className="text-xs text-blue-700">
                      Let AI analyze the description and suggest the best type and category
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSmartCategorize}
                    disabled={categorizing || !formData.description || !formData.amount}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {categorizing ? 'Analyzing...' : 'Auto-Categorize'}
                  </Button>
                </div>
              </div>

              <Input
                label="Notes (optional)"
                placeholder="Additional notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
              <div className="flex gap-2">
                <Button type="submit">
                  <Check className="h-4 w-4 mr-2" />
                  {editingId ? 'Update' : 'Save'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <Select
              label="Filter by Type"
              options={[{ value: 'all', label: 'All Types' }, ...typeOptions]}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | TransactionType)}
            />
            <Select
              label="Filter by Category"
              options={[{ value: 'all', label: 'All Categories' }, ...categoryOptions]}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as 'all' | ExpenseCategory)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardContent className="pt-6">
          {filteredTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No transactions found. Add your first transaction above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Category</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Amount</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{formatDate(transaction.date)}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          {transaction.notes && (
                            <p className="text-sm text-gray-500">{transaction.notes}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 capitalize">{transaction.category}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.type === 'income'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {transaction.type}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-medium ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(transaction)}
                            className="p-1 text-gray-500 hover:text-blue-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteTransaction(transaction.id)}
                            className="p-1 text-gray-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File System Setup Modal */}
      {showModal && (
        <FileSystemRequiredModal 
          onSetupComplete={handleSetupComplete}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
