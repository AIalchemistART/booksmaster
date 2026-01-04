'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useStore, generateId } from '@/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Trash2, Edit2, X, Check, Receipt, ArrowRight, Sparkles, Image as ImageIcon, Scan, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, TrendingUp, Shield, AlertCircle, PieChart } from 'lucide-react'
import type { Receipt as ReceiptType, Transaction, TransactionType, TransactionCategory, ExpenseCategory, IncomeCategory, PaymentMethod } from '@/types'
import { useFileSystemCheck } from '@/hooks/useFileSystemCheck'
import { FileSystemRequiredModal } from '@/components/modals/FileSystemRequiredModal'
import { ReceiptImageModal } from '@/components/modals/ReceiptImageModal'
import { categorizeTransaction, getCategoriesForType } from '@/lib/gemini-categorization'
import { lookupCardPaymentType } from '@/lib/payment-type-learning'
import { VerificationBadge } from '@/components/ui/VerificationBadge'
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge'
import { BulkRecategorization } from '@/components/tools/BulkRecategorization'
import { calculateVerificationLevel } from '@/lib/duplicate-detection'
import { FirstVisitIntro, useFirstVisit } from '@/components/gamification/FirstVisitIntro'

const expenseCategoryOptions = [
  { value: 'materials', label: 'Materials' },
  { value: 'tools', label: 'Tools' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'subcontractors', label: 'Subcontractors' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'permits', label: 'Permits' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'vehicle_maintenance', label: 'Vehicle Maintenance' },
  { value: 'equipment_rental', label: 'Equipment Rental' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'other', label: 'Other' },
]

const incomeCategoryOptions = [
  { value: 'residential_job', label: 'Residential Job' },
  { value: 'commercial_job', label: 'Commercial Job' },
  { value: 'repairs', label: 'Repairs' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'other_income', label: 'Other Income' },
]

const typeOptions = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'returns', label: 'Returns' },
]

export default function TransactionsPage() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, receipts, updateReceipt, completeAction, unlockAchievement, getLatestAccuracyRate, userProgress } = useStore()
  const { showIntro, closeIntro } = useFirstVisit('transactions')
  const { showModal, requireFileSystem, handleSetupComplete, handleCancel } = useFileSystemCheck()
  const [showForm, setShowForm] = useState(false)
  const [filterType, setFilterType] = useState<'all' | TransactionType | 'returns'>('all')
  const [filterCategory, setFilterCategory] = useState<'all' | TransactionCategory>('all')
  const [categorizing, setCategorizing] = useState(false)
  const [converting, setConverting] = useState(false)
  const [convertingAll, setConvertingAll] = useState(false)
  const [viewingReceiptImage, setViewingReceiptImage] = useState<string | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editingReceipt, setEditingReceipt] = useState<ReceiptType | null>(null)
  const [paymentMethodMigrated, setPaymentMethodMigrated] = useState(false)

  // Search and filter state
  const [searchDescription, setSearchDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [amountRange, setAmountRange] = useState([0, 100000])
  const [sliderRange, setSliderRange] = useState([0, 1000])
  const [activeSlider, setActiveSlider] = useState<'low' | 'high' | null>(null)
  const [selectedDescriptions, setSelectedDescriptions] = useState<string[]>([])
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<'all' | string>('all')
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<'date' | 'description' | 'category' | 'type' | 'amount' | 'paymentMethod'>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 100
  
  // Selection state for bulk operations
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set())
  const [showBulkRecategorization, setShowBulkRecategorization] = useState(false)
  
  // Get unlinked receipts (receipts not yet converted to transactions)
  // Include receipts with negative amounts (returns)
  const unlinkedReceipts = receipts.filter((r: ReceiptType) => !r.linkedTransactionId && r.ocrAmount !== undefined && r.ocrAmount !== null)
  
  // Helper function to convert slider position (0-1000) to dollar amount (0-100000)
  const sliderToAmount = (sliderValue: number) => {
    return Math.round(sliderValue * 100)
  }
  
  // Toggle description filter
  const toggleDescriptionFilter = (description: string) => {
    setSelectedDescriptions(prev => 
      prev.includes(description) 
        ? prev.filter(d => d !== description)
        : [...prev, description]
    )
  }
  
  // Normalize payment method to standard types (same as receipts page)
  // Migrate paymentMethod from receipts to transactions (one-time fix for existing data)
  useEffect(() => {
    if (paymentMethodMigrated || transactions.length === 0) return
    
    let needsUpdate = false
    transactions.forEach((t: Transaction) => {
      if (!t.paymentMethod && t.receiptId) {
        const linkedReceipt = receipts.find((r: ReceiptType) => r.id === t.receiptId)
        if (linkedReceipt?.ocrPaymentMethod) {
          updateTransaction(t.id, { paymentMethod: linkedReceipt.ocrPaymentMethod as PaymentMethod })
          needsUpdate = true
        }
      }
    })
    
    if (needsUpdate) {
      console.log('[MIGRATION] Updated transactions with paymentMethod from receipts')
    }
    setPaymentMethodMigrated(true)
  }, [transactions, receipts, paymentMethodMigrated, updateTransaction])
  
  const normalizePaymentMethod = (method: string | undefined): string | null => {
    if (!method) return null
    const lower = method.toLowerCase().trim()
    
    // Check for debit vs credit patterns
    if (lower.includes('debit')) return 'Debit'
    if (lower.includes('credit')) return 'Credit'
    
    // Generic "card" defaults to Credit
    if (lower === 'card' || lower.includes('card')) {
      return 'Card'
    }
    
    // Unambiguous payment methods
    if (lower.includes('cash')) return 'Cash'
    if (lower.includes('check') || lower.includes('cheque')) return 'Check'
    
    return null
  }
  
  // Get unique normalized payment methods from transactions and their linked receipts
  const paymentMethods = Array.from(new Set(
    transactions
      .map((t: Transaction) => {
        // First check transaction's own paymentMethod
        if (t.paymentMethod) return normalizePaymentMethod(t.paymentMethod)
        
        // Otherwise check linked receipt's ocrPaymentMethod
        const linkedReceipt = receipts.find((r: ReceiptType) => r.id === t.receiptId)
        return linkedReceipt?.ocrPaymentMethod ? normalizePaymentMethod(linkedReceipt.ocrPaymentMethod) : null
      })
      .filter(Boolean)
  )).sort() as string[]
  
  // Handle column header click for sorting
  const handleSort = (column: typeof sortColumn) => {
    console.log('[SORT] Clicked column:', column, 'Current:', sortColumn, sortDirection)
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc'
      console.log('[SORT] Toggling direction to:', newDirection)
      setSortDirection(newDirection)
    } else {
      // Set new column with default descending for date/amount, ascending for text
      const newDirection = column === 'date' || column === 'amount' ? 'desc' : 'asc'
      console.log('[SORT] New column:', column, 'Direction:', newDirection)
      setSortColumn(column)
      setSortDirection(newDirection)
    }
    // Reset to first page when sorting changes
    setCurrentPage(1)
  }
  
  // Render sort indicator
  const SortIndicator = ({ column }: { column: string }) => {
    if (sortColumn !== column) return null
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4 inline ml-1" />
      : <ChevronDown className="h-4 w-4 inline ml-1" />
  }

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    type: 'expense' as TransactionType,
    category: 'materials' as TransactionCategory,
    notes: '',
  })

  // Get category options based on type
  const categoryOptions = formData.type === 'income' ? incomeCategoryOptions : expenseCategoryOptions

  // Handle type change to reset category appropriately
  const handleTypeChange = (newType: TransactionType) => {
    const defaultCategory = newType === 'income' ? 'residential_job' : 'materials'
    setFormData({
      ...formData,
      type: newType,
      category: defaultCategory as TransactionCategory
    })
  }

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
        category: result.category.toLowerCase().replace(/\s+/g, '_') as TransactionCategory
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
      category: 'materials' as TransactionCategory,
      notes: '',
    })
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const transaction: Transaction = {
      id: generateId(),
      date: formData.date,
      amount: parseFloat(formData.amount),
      description: formData.description,
      type: formData.type,
      category: formData.category,
      notes: formData.notes,
      verificationLevel: 'unverified' as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    addTransaction(transaction)
    
    // Award XP - first transaction gets milestone reward, then batch milestones
    const newCount = transactions.length + 1
    
    if (newCount === 1) {
      // First transaction - milestone XP
      const result = await completeAction('createTransaction')
      if (result.leveledUp) {
        console.log(`🎉 Level up! Now level ${result.newLevel}`)
      }
      unlockAchievement('first_transaction')
    } else {
      // Subsequent transactions get low repetitive XP
      await completeAction('editTransaction')
      
      // Milestone rewards at intervals
      if (newCount === 10) {
        await completeAction('categorize10Transactions')
        unlockAchievement('categorize_10')
      } else if (newCount === 25) {
        await completeAction('categorize25Transactions')
      } else if (newCount === 50) {
        await completeAction('categorize50Transactions')
        unlockAchievement('categorize_50')
      } else if (newCount === 100) {
        await completeAction('track100Transactions')
        unlockAchievement('categorize_100')
      }
    }
    
    resetForm()
  }

  const handleEdit = (transaction: Transaction) => {
    // Open ReceiptImageModal instead of inline edit
    const linkedReceipt = receipts.find((r: ReceiptType) => r.id === transaction.receiptId)
    setEditingTransaction(transaction)
    if (linkedReceipt?.imageData) {
      setViewingReceiptImage(linkedReceipt.imageData)
    }
  }

  // Convert receipt to transaction without categorization
  const convertReceiptToTransaction = async (receipt: ReceiptType) => {
    console.log('[RECEIPT→TRANSACTION] Converting receipt:', {
      receiptId: receipt.id,
      vendor: receipt.ocrVendor,
      amount: receipt.ocrAmount,
      hasExistingLink: !!receipt.linkedTransactionId
    })
    
    const now = new Date().toISOString()
    const transactionId = generateId()
    
    // Use AI categorization if available, otherwise defaults
    const type = receipt.transactionType || 'expense'
    const category = (receipt.transactionCategory?.toLowerCase().replace(/\s+/g, '_') as TransactionCategory) || (type === 'income' ? 'other_income' : 'materials')
    
    // Handle failed OCR receipts with special notes
    const notes = receipt.ocrFailed ? '⚠️ OCR Failed - Please verify and update all fields' : undefined
    const itemization = receipt.ocrLineItems 
      ? `Items: ${receipt.ocrLineItems.map(i => i.description).join(', ')}`
      : undefined
    
    const newTransaction: Transaction = {
      id: transactionId,
      date: receipt.ocrDate || new Date().toISOString().split('T')[0],
      amount: receipt.ocrAmount ?? 0,
      description: receipt.ocrVendor || 'Receipt purchase',
      type,
      category,
      paymentMethod: receipt.ocrPaymentMethod as PaymentMethod,
      itemization,
      notes,
      receiptId: receipt.id,
      createdAt: now,
      updatedAt: now,
      // Track original OCR/heuristic categorization for improvement
      originalType: type,
      originalCategory: category,
      wasManuallyEdited: false,
    }
    
    console.log('[RECEIPT→TRANSACTION] Created transaction:', {
      transactionId,
      linkedToReceipt: receipt.id,
      vendor: newTransaction.description,
      amount: newTransaction.amount
    })
    
    addTransaction(newTransaction)
    updateReceipt(receipt.id, { linkedTransactionId: transactionId })
    
    // Award XP and check achievements
    const newTransactionCount = transactions.length + 1
    
    if (newTransactionCount === 1) {
      // First transaction achievement
      await completeAction('createTransaction')
      unlockAchievement('first_transaction')
    } else {
      // Regular linking XP
      await completeAction('linkReceiptToTransaction')
    }
    
    // Check for linked receipt achievement
    const linkedCount = receipts.filter((r: any) => r.linkedTransactionId).length + 1
    if (linkedCount === 10) {
      unlockAchievement('duplicate_detective')
    }
    
    console.log('[RECEIPT→TRANSACTION] Link established between receipt and transaction')
  }

  // Convert receipt with AI categorization
  const convertWithCategorization = async (receipt: ReceiptType) => {
    // Skip receipts without amounts - mark as supplemental docs instead
    if (!receipt.ocrVendor || receipt.ocrAmount === undefined || receipt.ocrAmount === null) {
      if (receipt.ocrAmount === undefined || receipt.ocrAmount === null || receipt.ocrAmount === 0) {
        // Quest: Upload supplemental document → Level 6 (Supporting Documents)
        // CRITICAL: Check count BEFORE updating receipt
        const suppDocsCount = receipts.filter((r: any) => r.isSupplementalDoc).length
        console.log('[QUEST CHECK] Supplemental doc - Current count:', suppDocsCount, 'Level:', useStore.getState().userProgress.currentLevel)
        
        updateReceipt(receipt.id, { isSupplementalDoc: true })
        console.log('[CONVERSION] Marked receipt without total as supplemental doc:', receipt.id)
        
        // Track milestone for Level 7 quest
        const { incrementMilestone } = useStore.getState()
        incrementMilestone('supplementalDocs')
        
        if (suppDocsCount === 0) {
          const { manualLevelUp, userProgress, completeQuest, questProgress } = useStore.getState()
          console.log('[QUEST CHECK] First supplemental doc - Quest completed:', questProgress.completedQuests.includes('upload_supplemental'))
          if (!questProgress.completedQuests.includes('upload_supplemental') && userProgress.currentLevel >= 3 && userProgress.currentLevel < 7) {
            completeQuest('upload_supplemental')
            manualLevelUp()
            console.log('[QUEST] ✅ Completed upload_supplemental quest - advancing to next level (Supporting Documents)')
          } else {
            console.log('[QUEST CHECK] Quest already completed, level too low, or already at max')
          }
        } else {
          console.log('[QUEST CHECK] Not first supplemental doc, skipping quest trigger')
        }
      }
      return
    }
    
    setConverting(true)
    try {
      // Get AI categorization
      const categorization = await categorizeTransaction(
        receipt.ocrVendor,
        receipt.ocrAmount,
        receipt.ocrVendor
      )
      
      // Apply learned payment type if card number is known
      let finalPaymentMethod = receipt.ocrPaymentMethod
      if (receipt.ocrCardLastFour && receipt.ocrPaymentMethod) {
        const learned = await lookupCardPaymentType(receipt.ocrCardLastFour)
        if (learned && learned.confidence >= 0.7) {
          finalPaymentMethod = learned.paymentType
          console.log(`[CONVERSION] Applied learned payment type for card *${receipt.ocrCardLastFour}: ${learned.paymentType}`)
        }
      }
      
      // Update receipt with categorization and learned payment method
      updateReceipt(receipt.id, {
        transactionType: categorization.type,
        transactionCategory: categorization.category,
        categorizationConfidence: categorization.confidence,
        ...(finalPaymentMethod !== receipt.ocrPaymentMethod && { ocrPaymentMethod: finalPaymentMethod })
      })
      
      // Now convert with the categorization
      const now = new Date().toISOString()
      const transactionId = generateId()
      
      const newTransaction: Transaction = {
        id: transactionId,
        date: receipt.ocrDate || new Date().toISOString().split('T')[0],
        amount: receipt.ocrAmount ?? 0,
        description: receipt.ocrVendor || 'Receipt purchase',
        type: categorization.type,
        category: categorization.category.toLowerCase().replace(/\s+/g, '_') as TransactionCategory,
        paymentMethod: finalPaymentMethod as PaymentMethod,
        itemization: receipt.ocrLineItems 
          ? `Items: ${receipt.ocrLineItems.map(i => i.description).join(', ')}`
          : undefined,
        receiptId: receipt.id,
        createdAt: now,
        updatedAt: now,
        // Track original categorization for improvement
        originalType: categorization.type,
        originalCategory: categorization.category.toLowerCase().replace(/\s+/g, '_') as TransactionCategory,
        wasManuallyEdited: false,
      }
      
      addTransaction(newTransaction)
      updateReceipt(receipt.id, { linkedTransactionId: transactionId })
      
      // Award XP and check achievements
      const newTransactionCount = transactions.length + 1
      
      if (newTransactionCount === 1) {
        // First transaction achievement
        await completeAction('createTransaction')
        unlockAchievement('first_transaction')
      } else {
        // Regular linking XP
        await completeAction('linkReceiptToTransaction')
      }
      
      // Check for linked receipt achievement
      const linkedCount = receipts.filter((r: any) => r.linkedTransactionId).length + 1
      if (linkedCount === 10) {
        unlockAchievement('duplicate_detective')
      }
    } catch (error) {
      console.error('Failed to categorize and convert:', error)
      alert('AI categorization failed. Please try again or use regular convert.')
    } finally {
      setConverting(false)
    }
  }

  // Convert all receipts
  const convertAllReceipts = async () => {
    for (const receipt of unlinkedReceipts) {
      await convertReceiptToTransaction(receipt)
    }
  }

  // Convert all with AI categorization
  const convertAllWithCategorization = async () => {
    setConvertingAll(true)
    try {
      for (const receipt of unlinkedReceipts) {
        if (receipt.ocrVendor && receipt.ocrAmount) {
          await convertWithCategorization(receipt)
        } else {
          // Fallback to basic conversion if no vendor/amount
          convertReceiptToTransaction(receipt)
        }
      }
    } catch (error) {
      console.error('Batch conversion failed:', error)
      alert('Some receipts failed to convert. Please check and try again.')
    } finally {
      setConvertingAll(false)
    }
  }

  // Get unique descriptions with counts (case-insensitive grouping)
  const descriptionCounts = transactions.reduce((acc: Record<string, number>, t: Transaction) => {
    const description = t.description || 'Unknown'
    const descKey = description.toUpperCase()
    
    const existingKey = Object.keys(acc).find(k => k.toUpperCase() === descKey)
    
    if (existingKey) {
      acc[existingKey] = (acc[existingKey] || 0) + 1
    } else {
      acc[description] = 1
    }
    return acc
  }, {} as Record<string, number>)

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter((t: Transaction) => {
      const amount = t.amount || 0
      const description = (t.description || 'Unknown').toLowerCase()
      const transactionDate = t.date
      
      // Get payment method from transaction and normalize it
      const normalizedPaymentMethod = normalizePaymentMethod(t.paymentMethod) || ''
      
      const matchesSearch = description.includes(searchDescription.toLowerCase())
      // Include negative amounts (returns) when low threshold is 0
      const matchesAmount = amountRange[0] === 0 
        ? (amount < 0 || (amount >= amountRange[0] && amount <= amountRange[1]))
        : (amount >= amountRange[0] && amount <= amountRange[1])
      const matchesDescription = selectedDescriptions.length === 0 || 
        selectedDescriptions.some(selected => selected.toUpperCase() === (t.description || 'Unknown').toUpperCase())
      const matchesDateRange = (!startDate || transactionDate >= startDate) && (!endDate || transactionDate <= endDate)
      const matchesType = filterType === 'all' || 
        (filterType === 'returns' ? t.amount < 0 : t.type === filterType)
      const matchesCategory = filterCategory === 'all' || t.category === filterCategory
      const matchesPaymentMethod = filterPaymentMethod === 'all' || normalizedPaymentMethod === filterPaymentMethod
      
      return matchesSearch && matchesAmount && matchesDescription && matchesDateRange && matchesType && matchesCategory && matchesPaymentMethod
    })
    .sort((a: Transaction, b: Transaction) => {
      let comparison = 0
      
      switch (sortColumn) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'amount':
          comparison = a.amount - b.amount
          break
        case 'description':
          comparison = (a.description || '').localeCompare(b.description || '')
          break
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '')
          break
        case 'type':
          comparison = (a.type || '').localeCompare(b.type || '')
          break
        case 'paymentMethod':
          comparison = (a.paymentMethod || '').localeCompare(b.paymentMethod || '')
          break
        default:
          comparison = 0
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })

  const toggleTransactionSelection = (transactionId: string) => {
    setSelectedTransactionIds(prev => {
      const newSet = new Set(Array.from(prev))
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId)
      } else {
        newSet.add(transactionId)
      }
      return newSet
    })
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

  const selectAllOnPage = () => {
    setSelectedTransactionIds(new Set(paginatedTransactions.map((t: Transaction) => t.id)))
  }

  const deselectAll = () => {
    setSelectedTransactionIds(new Set())
  }

  const selectedTransactions = transactions.filter((t: Transaction) => selectedTransactionIds.has(t.id))

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Transactions</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Track income and expenses</p>
        </div>
        <Button onClick={() => requireFileSystem(() => setShowForm(true))}>
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Transaction Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{transactions.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {transactions.filter((t: Transaction) => t.type === 'income').length} income, {transactions.filter((t: Transaction) => t.type === 'expense').length} expense
                </p>
              </div>
              <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
                <TrendingUp className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Verification Quality</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {transactions.filter((t: Transaction) => t.type === 'income' && !t.isDuplicateOfLinked).length > 0 
                    ? Math.round((transactions.filter((t: Transaction) => t.verificationLevel === 'strong').length / 
                        transactions.filter((t: Transaction) => t.type === 'income' && !t.isDuplicateOfLinked).length) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Strong verified income</p>
              </div>
              <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Unlinked Receipts</p>
                <p className={`text-2xl font-bold ${unlinkedReceipts.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                  {unlinkedReceipts.length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {unlinkedReceipts.length > 0 ? 'Ready to convert' : 'All linked!'}
                </p>
              </div>
              <div className={`p-3 rounded-full ${unlinkedReceipts.length > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                <AlertCircle className={`h-6 w-6 ${unlinkedReceipts.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Top Category</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {Object.entries(
                    transactions.filter((t: Transaction) => t.type === 'expense')
                      .reduce((acc: Record<string, number>, t: Transaction) => {
                        acc[t.category] = (acc[t.category] || 0) + t.amount
                        return acc
                      }, {} as Record<string, number>)
                  ).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0]?.replace('_', ' ') || 'N/A'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                  {formatCurrency(Number(Object.entries(
                    transactions.filter((t: Transaction) => t.type === 'expense')
                      .reduce((acc: Record<string, number>, t: Transaction) => {
                        acc[t.category] = (acc[t.category] || 0) + t.amount
                        return acc
                      }, {} as Record<string, number>)
                  ).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[1]) || 0)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <PieChart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Parsing Accuracy Disclaimer */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          <strong>⚠️ Important:</strong> AI-powered parsing increases efficiency but is not 100% accurate. 
          All parsed receipt data <strong>must be validated</strong> by you. Review each transaction carefully, 
          make any necessary corrections, and mark it as validated before relying on the data.
        </p>
      </div>

      {/* Search & Filter Transactions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search & Filter Transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Search by Description"
              placeholder="Type description..."
              value={searchDescription}
              onChange={(e) => setSearchDescription(e.target.value)}
            />
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Filter by Type"
              options={[{ value: 'all', label: 'All Types' }, ...typeOptions]}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | TransactionType | 'returns')}
            />
            <Select
              label="Filter by Category"
              options={[
                { value: 'all', label: 'All Categories' },
                ...expenseCategoryOptions,
                ...incomeCategoryOptions
              ]}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as 'all' | TransactionCategory)}
            />
            <Select
              label="Filter by Payment Method"
              options={[
                { value: 'all', label: 'All Payment Methods' },
                ...paymentMethods.map(pm => ({ value: pm, label: pm }))
              ]}
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
            />
          </div>

          {/* Amount Range Slider */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Amount Range: {formatCurrency(amountRange[0])} - {formatCurrency(amountRange[1])}
            </label>
            <div 
              className="relative pt-1 px-2 cursor-pointer select-none"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => {
                const target = e.currentTarget as HTMLElement
                target.setPointerCapture(e.pointerId)
                
                const rect = target.getBoundingClientRect()
                const clickPositionPercent = (e.clientX - rect.left) / rect.width
                const clickValue = Math.max(0, Math.min(1000, clickPositionPercent * 1000))
                
                const distanceToLow = Math.abs(clickValue - sliderRange[0])
                const distanceToHigh = Math.abs(clickValue - sliderRange[1])
                
                if (distanceToLow < distanceToHigh) {
                  setActiveSlider('low')
                  const newValue = Math.min(clickValue, sliderRange[1])
                  setSliderRange([newValue, sliderRange[1]])
                  setAmountRange([sliderToAmount(newValue), sliderToAmount(sliderRange[1])])
                } else {
                  setActiveSlider('high')
                  const newValue = Math.max(clickValue, sliderRange[0])
                  setSliderRange([sliderRange[0], newValue])
                  setAmountRange([sliderToAmount(sliderRange[0]), sliderToAmount(newValue)])
                }
              }}
              onPointerMove={(e) => {
                if (activeSlider === null) return
                
                const target = e.currentTarget as HTMLElement
                const rect = target.getBoundingClientRect()
                const clickPositionPercent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                const clickValue = clickPositionPercent * 1000
                
                if (activeSlider === 'low') {
                  const newValue = Math.min(clickValue, sliderRange[1])
                  setSliderRange([newValue, sliderRange[1]])
                  setAmountRange([sliderToAmount(newValue), sliderToAmount(sliderRange[1])])
                } else {
                  const newValue = Math.max(clickValue, sliderRange[0])
                  setSliderRange([sliderRange[0], newValue])
                  setAmountRange([sliderToAmount(sliderRange[0]), sliderToAmount(newValue)])
                }
              }}
              onPointerUp={(e) => {
                const target = e.currentTarget as HTMLElement
                target.releasePointerCapture(e.pointerId)
                setActiveSlider(null)
              }}
            >
              {/* Visual slider track */}
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full relative">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{
                    marginLeft: `${(sliderRange[0] / 1000) * 100}%`,
                    width: `${((sliderRange[1] - sliderRange[0]) / 1000) * 100}%`
                  }}
                />
                {/* Low handle */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 border-2 border-white dark:border-gray-900 rounded-full shadow"
                  style={{ left: `${(sliderRange[0] / 1000) * 100}%`, marginLeft: '-8px' }}
                />
                {/* High handle */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 border-2 border-white dark:border-gray-900 rounded-full shadow"
                  style={{ left: `${(sliderRange[1] / 1000) * 100}%`, marginLeft: '-8px' }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 px-2">
              <span>$0</span>
              <span>$100,000</span>
            </div>
          </div>

          {/* Description Filter Bubbles */}
          {Object.keys(descriptionCounts).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Description ({Object.keys(descriptionCounts).length} unique)
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(descriptionCounts) as [string, number][])
                  .sort((a, b) => b[1] - a[1])
                  .map(([description, count]) => (
                    <button
                      key={description}
                      onClick={() => toggleDescriptionFilter(description)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedDescriptions.includes(description)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {description} ({count})
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </p>
            {(searchDescription || selectedDescriptions.length > 0 || amountRange[0] > 0 || amountRange[1] < 100000 || startDate || endDate || filterType !== 'all' || filterCategory !== 'all' || filterPaymentMethod !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchDescription('')
                  setSelectedDescriptions([])
                  setAmountRange([0, 100000])
                  setSliderRange([0, 1000])
                  setStartDate('')
                  setEndDate('')
                  setFilterType('all')
                  setFilterCategory('all')
                  setFilterPaymentMethod('all')
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unlinked Receipts */}
      {unlinkedReceipts.length > 0 && (
        <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <Receipt className="h-5 w-5" />
                  {unlinkedReceipts.length} Receipt{unlinkedReceipts.length > 1 ? 's' : ''} Ready to Convert
                </CardTitle>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  💡 <strong>Tip:</strong> Convert receipts one at a time and validate each to train the AI system for better accuracy
                </p>
              </div>
              <div className="relative group">
                {(() => {
                  const currentAccuracy = getLatestAccuracyRate()
                  const isLevelLocked = userProgress.currentLevel < 6
                  const isAccuracyLocked = currentAccuracy < 90
                  const isLocked = isLevelLocked || isAccuracyLocked
                  
                  return (
                    <>
                      <Button 
                        size="sm"
                        onClick={convertAllWithCategorization}
                        disabled={convertingAll || isLocked}
                        className={isLocked ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        {convertingAll ? 'Converting...' : 'Convert All'}
                      </Button>
                      {isLocked && (
                        <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                          <p className="font-semibold mb-1">🔒 Requires Level 6 + 90% Accuracy</p>
                          <p>Level: {userProgress.currentLevel}/6 {isLevelLocked ? '❌' : '✅'}</p>
                          <p>Accuracy: {currentAccuracy.toFixed(1)}%/90% {isAccuracyLocked ? '❌' : '✅'}</p>
                          <p className="mt-1">Convert and validate receipts one-by-one to train the AI system before unlocking batch processing.</p>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unlinkedReceipts.slice(0, 3).map((receipt: ReceiptType) => (
                <div key={receipt.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    {receipt.imageData ? (
                      <img src={receipt.imageData} alt="" className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{receipt.ocrVendor || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{receipt.ocrDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${(receipt.isReturn || (receipt.ocrAmount && receipt.ocrAmount < 0)) ? 'text-orange-500 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                      {formatCurrency(receipt.ocrAmount || 0)}
                    </span>
                    <Button 
                      size="sm"
                      onClick={() => convertWithCategorization(receipt)}
                      disabled={converting || convertingAll}
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      {converting ? 'Converting...' : 'Convert'}
                    </Button>
                  </div>
                </div>
              ))}
              {unlinkedReceipts.length > 3 && (
                <p className="text-sm text-amber-700 dark:text-amber-300 text-center pt-2">
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
            <CardTitle>New Transaction</CardTitle>
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
                  onChange={(e) => handleTypeChange(e.target.value as TransactionType)}
                />
                <Select
                  label="Category"
                  options={categoryOptions}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as TransactionCategory })}
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
                  Save Transaction
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

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transactions</span>
            <span className="text-sm font-normal text-gray-500">
              Showing {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {filteredTransactions.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No transactions found. Add your first transaction above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              {/* Bulk Actions Bar */}
              {selectedTransactionIds.size > 0 && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      {selectedTransactionIds.size} transaction{selectedTransactionIds.size > 1 ? 's' : ''} selected
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={deselectAll}
                      className="text-xs"
                    >
                      Clear Selection
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowBulkRecategorization(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Bulk Re-categorize
                  </Button>
                </div>
              )}

              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={paginatedTransactions.length > 0 && paginatedTransactions.every((t: Transaction) => selectedTransactionIds.has(t.id))}
                        onChange={(e) => e.target.checked ? selectAllOnPage() : deselectAll()}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Receipt</th>
                    <th 
                      className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 select-none transition-colors rounded"
                      onClick={() => handleSort('date')}
                    >
                      Date<SortIndicator column="date" />
                    </th>
                    <th 
                      className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 select-none transition-colors rounded"
                      onClick={() => handleSort('description')}
                    >
                      Description<SortIndicator column="description" />
                    </th>
                    <th 
                      className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 select-none transition-colors rounded"
                      onClick={() => handleSort('category')}
                    >
                      Category<SortIndicator column="category" />
                    </th>
                    <th 
                      className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 select-none transition-colors rounded"
                      onClick={() => handleSort('type')}
                    >
                      Type<SortIndicator column="type" />
                    </th>
                    <th 
                      className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 select-none transition-colors rounded"
                      onClick={() => handleSort('amount')}
                    >
                      Amount<SortIndicator column="amount" />
                    </th>
                    <th 
                      className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 select-none transition-colors rounded"
                      onClick={() => handleSort('paymentMethod')}
                    >
                      Payment<SortIndicator column="paymentMethod" />
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map((transaction: Transaction) => {
                    const linkedReceipt = transaction.receiptId ? receipts.find((r: ReceiptType) => r.id === transaction.receiptId) : null
                    const linkedTransaction = transaction.linkedTransactionId ? transactions.find((t: Transaction) => t.id === transaction.linkedTransactionId) : null
                    const isLinkedDuplicate = transaction.isDuplicateOfLinked
                    const isPrimary = transaction.linkedTransactionId && !transaction.isDuplicateOfLinked
                    
                    return (
                    <>
                      <tr 
                        key={transaction.id} 
                        className={`border-b dark:border-gray-700 transition-colors ${
                          isLinkedDuplicate 
                            ? 'bg-gray-100/50 dark:bg-gray-800/30 opacity-60' 
                            : transaction.userValidated 
                            ? 'bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30' 
                            : 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30'
                        } ${
                          isLinkedDuplicate ? 'border-l-4 border-l-blue-400 dark:border-l-blue-600' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedTransactionIds.has(transaction.id)}
                            onChange={() => toggleTransactionSelection(transaction.id)}
                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                          {isLinkedDuplicate && (
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-8 h-0.5 bg-blue-400 dark:bg-blue-600"></div>
                              <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold">🔗 Linked Duplicate</span>
                            </div>
                          )}
                          {linkedReceipt?.imageData ? (
                            <div className="relative">
                              <button
                                onClick={() => setViewingReceiptImage(linkedReceipt.imageData!)}
                                className="relative group"
                                title="View receipt image"
                              >
                                <img
                                  src={linkedReceipt.imageData}
                                  alt="Receipt thumbnail"
                                  className="w-12 h-12 object-cover rounded border-2 border-gray-300 hover:border-blue-500 transition-colors cursor-pointer"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded flex items-center justify-center transition-opacity">
                                  <ImageIcon className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </button>
                              {/* DISABLED: SAM segmentation toggle removed (SAM disabled for performance)
                              {linkedReceipt.originalImageData && linkedReceipt.croppedImageData && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const newPreference = !linkedReceipt.prefersCropped
                                    updateReceipt(linkedReceipt.id, {
                                      prefersCropped: newPreference,
                                      imageData: newPreference ? linkedReceipt.croppedImageData : linkedReceipt.originalImageData
                                    })
                                  }}
                                  className="absolute -bottom-1 -right-1 p-0.5 bg-white rounded-full shadow-sm border border-gray-300 hover:border-blue-500 transition-colors"
                                  title={linkedReceipt.prefersCropped ? 'Switch to original' : 'Switch to cropped'}
                                >
                                  <Scan className="h-3 w-3 text-gray-600" />
                                </button>
                              )}
                              */}
                            </div>
                          ) : (
                            <div className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                              <Receipt className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{formatDate(transaction.date)}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{transaction.description}</p>
                            {transaction.notes && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">{transaction.notes}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="capitalize text-gray-900 dark:text-gray-100">
                              {transaction.category.replace(/_/g, ' ')}
                            </span>
                            {transaction.categorizationConfidence && (
                              <ConfidenceBadge 
                                confidence={transaction.categorizationConfidence} 
                                showPercentage={false}
                              />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                transaction.type === 'income'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                              }`}
                            >
                              {transaction.type}
                            </span>
                            {transaction.type === 'income' && (
                              <VerificationBadge level={transaction.verificationLevel || calculateVerificationLevel(transaction)} />
                            )}
                            {transaction.isDuplicateOfLinked && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 italic">Not counted</span>
                            )}
                          </div>
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-medium ${
                            transaction.amount < 0 
                              ? 'text-orange-500 dark:text-orange-400'
                              : transaction.type === 'income' 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {transaction.amount < 0 
                            ? formatCurrency(transaction.amount)
                            : `${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}`
                          }
                        </td>
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                          {transaction.paymentMethod || (linkedReceipt?.ocrPaymentMethod ? normalizePaymentMethod(linkedReceipt.ocrPaymentMethod) : '-')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(transaction)}
                              className={`p-1 ${
                                isLinkedDuplicate 
                                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50' 
                                  : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                              }`}
                              disabled={isLinkedDuplicate}
                              title={isLinkedDuplicate ? 'Unlink from primary transaction to edit' : 'Edit transaction'}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteTransaction(transaction.id)}
                              className={`p-1 ${
                                isLinkedDuplicate 
                                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50' 
                                  : 'text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                              }`}
                              disabled={isLinkedDuplicate}
                              title={isLinkedDuplicate ? 'Unlink from primary transaction to delete' : 'Delete transaction'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </>
                  )})}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {filteredTransactions.length > itemsPerPage && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Image Modal with Edit */}
      {(viewingReceiptImage || editingTransaction) && (() => {
        // Use editingTransaction if available, otherwise find from receipt image
        const transaction = editingTransaction || transactions.find((t: Transaction) => 
          receipts.find((r: ReceiptType) => r.imageData === viewingReceiptImage && r.id === t.receiptId)
        )
        
        // Get receipt image - either from viewingReceiptImage or from transaction's receipt
        let imageData = viewingReceiptImage
        if (!imageData && transaction?.receiptId) {
          const receipt = receipts.find((r: ReceiptType) => r.id === transaction.receiptId)
          imageData = receipt?.imageData || null
        }
        
        // Calculate navigation state
        const currentIndex = transaction ? filteredTransactions.findIndex((t: Transaction) => t.id === transaction.id) : -1
        const hasPrevious = currentIndex > 0
        const hasNext = currentIndex >= 0 && currentIndex < filteredTransactions.length - 1
        
        const handleNavigatePrevious = () => {
          if (hasPrevious) {
            const prevTransaction = filteredTransactions[currentIndex - 1]
            setEditingTransaction(prevTransaction)
            const prevReceipt = receipts.find((r: ReceiptType) => r.id === prevTransaction.receiptId)
            if (prevReceipt?.imageData) {
              setViewingReceiptImage(prevReceipt.imageData)
            }
          }
        }
        
        const handleNavigateNext = () => {
          if (hasNext) {
            const nextTransaction = filteredTransactions[currentIndex + 1]
            setEditingTransaction(nextTransaction)
            const nextReceipt = receipts.find((r: ReceiptType) => r.id === nextTransaction.receiptId)
            if (nextReceipt?.imageData) {
              setViewingReceiptImage(nextReceipt.imageData)
            }
          }
        }
        
        return (
          <ReceiptImageModal
            imageData={imageData || ''}
            transaction={transaction}
            onClose={() => {
              setViewingReceiptImage(null)
              setEditingTransaction(null)
            }}
            onSave={transaction ? (updated) => {
              updateTransaction(updated.id, updated)
              setEditingTransaction(null)
            } : undefined}
            categoryOptions={transaction?.type === 'expense' ? expenseCategoryOptions : incomeCategoryOptions}
            typeOptions={typeOptions}
            onNavigatePrevious={handleNavigatePrevious}
            onNavigateNext={handleNavigateNext}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
          />
        )
      })()}

      {/* Bulk Recategorization Modal */}
      {showBulkRecategorization && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <BulkRecategorization
              selectedTransactions={selectedTransactions}
              onClose={() => {
                setShowBulkRecategorization(false)
                setSelectedTransactionIds(new Set())
              }}
            />
          </div>
        </div>
      )}

      {/* File System Setup Modal */}
      {showModal && (
        <FileSystemRequiredModal 
          onSetupComplete={handleSetupComplete}
          onCancel={handleCancel}
        />
      )}
      
      {/* First visit intro modal */}
      <FirstVisitIntro tabId="transactions" isVisible={showIntro} onClose={closeIntro} />
    </div>
  )
}
