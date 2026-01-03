'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useStore, generateId } from '@/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { sliderToAmount, amountToSlider } from '@/lib/logarithmic-scale'
import { Camera, Upload, Trash2, Link2, ExternalLink, Scan, Loader2, Layers, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Calendar, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react'
import type { Receipt, TransactionType, ExpenseCategory } from '@/types'
import type { ExtractedReceiptData } from '@/lib/receipt-processor'
import { useFileSystemCheck } from '@/hooks/useFileSystemCheck'
import { FileSystemRequiredModal } from '@/components/modals/FileSystemRequiredModal'
import { useGeminiApiKeyCheck } from '@/hooks/useGeminiApiKeyCheck'
import { GeminiApiKeyRequiredModal } from '@/components/modals/GeminiApiKeyRequiredModal'
import { Select } from '@/components/ui/Select'
import { learnCardPaymentType } from '@/lib/payment-type-learning'
import { FirstVisitIntro, useFirstVisit } from '@/components/gamification/FirstVisitIntro'

// Dynamic import with SSR disabled to avoid ONNX runtime issues
const BatchReceiptScanner = dynamic(
  () => import('@/components/ocr/BatchReceiptScanner'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading batch scanner...</span>
      </div>
    )
  }
)

export default function ReceiptsPage() {
  const { receipts, addReceipt, deleteReceipt, updateReceipt, completeAction, completeBatchAction, unlockAchievement } = useStore()
  const { showIntro, closeIntro } = useFirstVisit('receipts')
  const { showModal: showFileSystemModal, requireFileSystem, handleSetupComplete: handleFileSystemSetup, handleCancel: handleFileSystemCancel } = useFileSystemCheck()
  const { showModal: showGeminiModal, requireGeminiApiKey, handleSetupComplete: handleGeminiSetup, handleSkip: handleGeminiSkip } = useGeminiApiKeyCheck()
  const [showForm, setShowForm] = useState(false)
  const [showOCR, setShowOCR] = useState(true)
  const [searchVendor, setSearchVendor] = useState('')
  const [amountRange, setAmountRange] = useState<[number, number]>([0, 100000])
  const [sliderRange, setSliderRange] = useState<[number, number]>([0, 1000])
  const [activeSlider, setActiveSlider] = useState<'low' | 'high' | null>(null)
  const [selectedVendors, setSelectedVendors] = useState<string[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'returns' | 'documentation'>('all')
  const [filterVerificationStatus, setFilterVerificationStatus] = useState<'all' | 'verified' | 'unverified'>('all')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<'all' | string>('all')
  const [sortBy, setSortBy] = useState<'filename' | 'amount' | 'date'>('filename')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null)
  const [imageZoom, setImageZoom] = useState(0.7)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showInstructions, setShowInstructions] = useState(true)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [allowMultipleDates, setAllowMultipleDates] = useState(false)
  const [groupingMode, setGroupingMode] = useState<'date' | 'batch'>('date')
  const [formData, setFormData] = useState({
    driveUrl: '',
    vendor: '',
    amount: '',
    date: '',
    time: '',
    subtotal: '',
    tax: '',
    paymentMethod: '',
    storeId: '',
    transactionId: '',
    lineItems: [] as Array<{ description: string; amount: number }>,
    rawText: '',
  })

  const resetForm = () => {
    setFormData({
      driveUrl: '',
      vendor: '',
      amount: '',
      date: '',
      time: '',
      subtotal: '',
      tax: '',
      paymentMethod: '',
      storeId: '',
      transactionId: '',
      lineItems: [],
      rawText: '',
    })
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Extract file ID from Google Drive URL
    const driveFileId = extractDriveFileId(formData.driveUrl)
    
    const newReceipt: Receipt = {
      id: generateId(),
      driveFileId: driveFileId || formData.driveUrl,
      driveUrl: formData.driveUrl,
      ocrVendor: formData.vendor || undefined,
      ocrAmount: formData.amount ? parseFloat(formData.amount) : undefined,
      ocrDate: formData.date || undefined,
      ocrTime: formData.time || undefined,
      ocrSubtotal: formData.subtotal ? parseFloat(formData.subtotal) : undefined,
      ocrTax: formData.tax ? parseFloat(formData.tax) : undefined,
      ocrPaymentMethod: formData.paymentMethod || undefined,
      ocrStoreId: formData.storeId || undefined,
      ocrTransactionId: formData.transactionId || undefined,
      ocrLineItems: formData.lineItems.length > 0 ? formData.lineItems : undefined,
      ocrRawText: formData.rawText || undefined,
      createdAt: new Date().toISOString(),
    }
    
    addReceipt(newReceipt)
    
    // Award XP - first receipt gets milestone, then small amounts
    const newReceiptCount = receipts.length + 1
    if (newReceiptCount === 1) {
      await completeAction('uploadFirstReceipt')
      unlockAchievement('first_receipt')
    } else if (newReceiptCount === 25) {
      unlockAchievement('receipt_master')
    } else {
      await completeAction('parseReceipt')
      
      // Milestone rewards
      if (newReceiptCount === 10) {
        await completeAction('process10Receipts')
      } else if (newReceiptCount === 25) {
        await completeAction('process25Receipts')
      } else if (newReceiptCount === 50) {
        await completeAction('process50Receipts')
      }
    }
    
    resetForm()
  }

  const handleBatchReceiptProcessed = async (data: ExtractedReceiptData) => {
    // Add receipt directly from batch scanner
    const newReceipt: Receipt = {
      id: generateId(),
      driveFileId: `ocr-${generateId()}`,
      driveUrl: '',
      imageData: data.imageData,
      sourceFilename: data.sourceFilename,
      ocrVendor: data.vendor,
      ocrAmount: data.amount ?? undefined,
      ocrDate: data.date,
      ocrTime: data.time,
      ocrSubtotal: data.subtotal,
      ocrTax: data.tax,
      ocrLineItems: data.lineItems,
      ocrPaymentMethod: data.paymentMethod,
      ocrStoreId: data.storeId,
      ocrTransactionId: data.transactionId,
      ocrRawText: data.rawText,
      ocrFailed: data.ocrFailed || false,
      // Return receipt tracking
      isReturn: data.isReturn,
      originalReceiptNumber: data.originalReceiptNumber,
      // Document classification
      documentType: data.documentType,
      documentTypeConfidence: data.documentTypeConfidence,
      // Document identifiers
      transactionNumber: data.transactionNumber,
      orderNumber: data.orderNumber,
      invoiceNumber: data.invoiceNumber,
      accountNumber: data.accountNumber,
      processedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
    addReceipt(newReceipt)
    
    // NOTE: XP for batch processing is handled by completeBatchAction in handleBatchComplete
    // First receipt milestone is still tracked
    const newReceiptCount = receipts.length + 1
    if (newReceiptCount === 1) {
      await completeAction('uploadFirstReceipt')
      unlockAchievement('first_receipt')
    } else if (newReceiptCount === 25) {
      unlockAchievement('receipt_master')
    }
    
    // Milestone rewards (these are one-time)
    if (newReceiptCount === 10) {
      await completeAction('process10Receipts')
    } else if (newReceiptCount === 25) {
      await completeAction('process25Receipts')
    } else if (newReceiptCount === 50) {
      await completeAction('process50Receipts')
    } else if (newReceiptCount === 100) {
      await completeAction('process100Receipts')
    }
  }

  const handleBatchComplete = async (count: number) => {
    const result = await completeBatchAction('parse', count)
    if (result.leveledUp) {
      console.log(`🎉 Batch level up! Now level ${result.newLevel}`)
    }
    // Batch scanner achievement - 10+ receipts in single batch
    if (count >= 10) {
      unlockAchievement('batch_scanner')
    }
  }

  const extractDriveFileId = (url: string): string | null => {
    // Handle various Google Drive URL formats
    const patterns = [
      /\/file\/d\/([^\/]+)/,
      /id=([^&]+)/,
      /\/d\/([^\/]+)/,
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const getThumbnailUrl = (driveFileId: string) => {
    return `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w400`
  }

  // Get unique vendors with counts (case-insensitive grouping)
  const vendorCounts = receipts.reduce((acc: Record<string, number>, r: Receipt) => {
    const vendor = r.ocrVendor || 'Unknown'
    const vendorKey = vendor.toUpperCase() // Normalize for grouping
    
    // Find existing entry (case-insensitive)
    const existingKey = Object.keys(acc).find(k => k.toUpperCase() === vendorKey)
    
    if (existingKey) {
      acc[existingKey] = (acc[existingKey] || 0) + 1
    } else {
      acc[vendor] = 1 // Use first occurrence's capitalization
    }
    return acc
  }, {} as Record<string, number>)
  
  // Get unique categories from receipts with AI categorization
  const categories = Array.from(new Set(
    receipts
      .map((r: Receipt) => r.transactionCategory)
      .filter(Boolean)
  )).sort() as string[]
  
  // Normalize payment method to standard types
  const normalizePaymentMethod = (method: string | undefined): string | null => {
    if (!method) return null
    const lower = method.toLowerCase().trim()
    
    // Explicit payment types (only when OCR clearly identifies them)
    if (lower.includes('credit') && !lower.includes('card')) return 'Credit'
    if (lower.includes('debit') && !lower.includes('card')) return 'Debit'
    if (lower === 'credit' || lower === 'credit card') return 'Credit'
    if (lower === 'debit' || lower === 'debit card') return 'Debit'
    
    // Card brands without explicit type → generic "Card" (could be credit or debit)
    if (lower.includes('visa') || lower.includes('mastercard') || lower.includes('amex') || 
        lower.includes('american express') || lower.includes('discover') || lower.includes('card')) {
      return 'Card'
    }
    
    // Unambiguous payment methods
    if (lower.includes('cash')) return 'Cash'
    if (lower.includes('check') || lower.includes('cheque')) return 'Check'
    
    return null // Filter out unrecognized payment methods
  }
  
  // Get unique normalized payment methods from receipts
  const paymentMethods = Array.from(new Set(
    receipts
      .map((r: Receipt) => normalizePaymentMethod(r.ocrPaymentMethod))
      .filter(Boolean)
  )).sort() as string[]

  // Filter and sort receipts
  const filteredReceipts = receipts.filter((r: Receipt) => {
    const amount = r.ocrAmount || 0
    const vendor = (r.ocrVendor || 'Unknown').toLowerCase()
    const receiptDate = r.ocrDate || r.createdAt
    const receiptType = r.transactionType || ''
    const receiptCategory = r.transactionCategory || ''
    const normalizedPaymentMethod = normalizePaymentMethod(r.ocrPaymentMethod) || ''
    
    const matchesSearch = vendor.includes(searchVendor.toLowerCase())
    // Smart filter: when low threshold is 0, include all negative amounts (returns)
    const matchesAmount = amountRange[0] === 0 
      ? (amount < 0 || (amount >= amountRange[0] && amount <= amountRange[1]))
      : (amount >= amountRange[0] && amount <= amountRange[1])
    // Case-insensitive vendor matching
    const matchesVendor = selectedVendors.length === 0 || 
      selectedVendors.some(selected => selected.toUpperCase() === (r.ocrVendor || 'Unknown').toUpperCase())
    const matchesDateRange = (!startDate || receiptDate >= startDate) && (!endDate || receiptDate <= endDate)
    const matchesType = filterType === 'all' || 
      (filterType === 'returns' ? (r.isReturn || amount < 0) : 
       filterType === 'documentation' ? r.isSupplementalDoc : 
       receiptType === filterType)
    const matchesVerificationStatus = filterVerificationStatus === 'all' || 
      (filterVerificationStatus === 'verified' && r.userValidated) ||
      (filterVerificationStatus === 'unverified' && !r.userValidated)
    const matchesPaymentMethod = filterPaymentMethod === 'all' || normalizedPaymentMethod === filterPaymentMethod
    
    return matchesSearch && matchesAmount && matchesVendor && matchesDateRange && matchesType && matchesVerificationStatus && matchesPaymentMethod
  }).sort((a: Receipt, b: Receipt) => {
    // Sort failed receipts to the top first
    if (a.ocrFailed && !b.ocrFailed) return -1
    if (!a.ocrFailed && b.ocrFailed) return 1
    
    // Then sort by selected method
    let comparison = 0
    if (sortBy === 'filename') {
      const filenameA = (a.sourceFilename || '').toLowerCase()
      const filenameB = (b.sourceFilename || '').toLowerCase()
      comparison = filenameA.localeCompare(filenameB)
    } else if (sortBy === 'amount') {
      const amountA = a.ocrAmount || 0
      const amountB = b.ocrAmount || 0
      comparison = amountB - amountA
    } else { // date
      const dateA = new Date(a.ocrDate || a.createdAt).getTime()
      const dateB = new Date(b.ocrDate || b.createdAt).getTime()
      comparison = dateB - dateA
    }
    return sortDirection === 'asc' ? comparison : -comparison
  })

  // Get vendor counts for filter bubbles from filtered receipts
  const filteredVendorCounts = filteredReceipts.reduce((acc: Record<string, number>, receipt: Receipt) => {
    const vendor = receipt.ocrVendor || 'Unknown'
    acc[vendor] = (acc[vendor] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Group receipts by date or batch
  const receiptsByDate = filteredReceipts.reduce((acc: Record<string, Receipt[]>, receipt: Receipt) => {
    let dateKey: string
    if (groupingMode === 'batch') {
      // Group by processedAt date (when batch was processed)
      dateKey = receipt.processedAt?.split('T')[0] || receipt.createdAt?.split('T')[0] || 'Unknown'
    } else {
      // Group by receipt date (original date on receipt)
      dateKey = receipt.ocrDate || receipt.createdAt?.split('T')[0] || 'Unknown'
    }
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(receipt)
    return acc
  }, {} as Record<string, Receipt[]>)

  // Sort date keys (most recent first)
  const sortedDateKeys = Object.keys(receiptsByDate).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime()
  })

  // Auto-expand most recent date on initial load
  if (sortedDateKeys.length > 0 && expandedDates.size === 0) {
    setExpandedDates(new Set([sortedDateKeys[0]]))
  }

  const toggleDateExpansion = (dateKey: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev)
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey)
      } else {
        if (!allowMultipleDates) {
          newSet.clear()
        }
        newSet.add(dateKey)
      }
      return newSet
    })
  }

  const toggleVendorFilter = (vendor: string) => {
    setSelectedVendors(prev => 
      prev.includes(vendor) 
        ? prev.filter(v => v !== vendor)
        : [...prev, vendor]
    )
  }

  // Close receipt modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && viewingReceipt) {
        setViewingReceipt(null)
        setImageZoom(0.7)
        setImagePosition({ x: 0, y: 0 })
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [viewingReceipt])

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Receipts</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">AI-powered receipt parsing with automatic data extraction</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            requireFileSystem(() => {
              requireGeminiApiKey(() => setShowOCR(!showOCR))
            })
          }}>
            <Layers className="h-4 w-4 mr-2" />
            {showOCR ? 'Hide Scanner' : 'Batch Scan'}
          </Button>
          {/* TEMPORARY: Batch Verify for testing - remove before production */}
          <Button 
            variant="outline" 
            onClick={() => {
              const unverifiedReceipts = receipts.filter((r: Receipt) => !r.userValidated)
              unverifiedReceipts.forEach((receipt: Receipt) => {
                updateReceipt(receipt.id, {
                  userValidated: true,
                  validatedAt: new Date().toISOString()
                })
              })
              alert(`Batch verified ${unverifiedReceipts.length} receipts`)
            }}
            className="bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Batch Verify ({receipts.filter((r: Receipt) => !r.userValidated).length})
          </Button>
          <Button onClick={() => requireFileSystem(() => setShowForm(true))}>
            <Upload className="h-4 w-4 mr-2" />
            Add Manual
          </Button>
        </div>
      </div>

      {/* Receipt Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Scanned</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{receipts.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {receipts.filter((r: Receipt) => new Date(r.ocrDate || r.createdAt) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length} this month
                </p>
              </div>
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Camera className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Captured</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(receipts.reduce((sum: number, r: Receipt) => sum + (r.ocrAmount || 0), 0))}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Avg: {formatCurrency(receipts.length > 0 ? receipts.reduce((sum: number, r: Receipt) => sum + (r.ocrAmount || 0), 0) / receipts.length : 0)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Linked to Transactions</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {receipts.filter((r: Receipt) => r.linkedTransactionId).length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {receipts.length > 0 ? Math.round((receipts.filter((r: Receipt) => r.linkedTransactionId).length / receipts.length) * 100) : 0}% linked
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Needs Review</p>
                <p className={`text-2xl font-bold ${receipts.filter((r: Receipt) => !r.userValidated).length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                  {receipts.filter((r: Receipt) => !r.userValidated).length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {receipts.filter((r: Receipt) => r.ocrFailed).length > 0 ? `${receipts.filter((r: Receipt) => r.ocrFailed).length} failed OCR` : 'Unvalidated'}
                </p>
              </div>
              <div className={`p-3 rounded-full ${receipts.filter((r: Receipt) => !r.userValidated).length > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                <AlertTriangle className={`h-6 w-6 ${receipts.filter((r: Receipt) => !r.userValidated).length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Parsing Accuracy Disclaimer */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          <strong>⚠️ Important:</strong> AI-powered OCR and parsing speeds up data entry but is not 100% accurate. 
          After converting receipts to transactions, always verify the data in the Transactions tab. Review vendor names, amounts, dates, 
          and other fields carefully to ensure accuracy.
        </p>
      </div>

      {/* Batch Receipt Scanner */}
      {showOCR && (
        <div className="mb-8">
          <BatchReceiptScanner 
            onReceiptProcessed={handleBatchReceiptProcessed}
            onBatchComplete={(count) => {
              // Award flat XP for batch processing (prevents boosting from large batches)
              completeBatchAction('parse', count)
            }}
          />
        </div>
      )}

      {/* Search and Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search & Filter Receipts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Search by Vendor"
              placeholder="Type vendor name..."
              value={searchVendor}
              onChange={(e) => setSearchVendor(e.target.value)}
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
              options={[
                { value: 'all', label: 'All' },
                { value: 'expense', label: 'Expenses' },
                { value: 'income', label: 'Income' },
                { value: 'returns', label: 'Returns' },
                { value: 'documentation', label: 'Supporting Documentation' }
              ]}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'expense' | 'income' | 'returns' | 'documentation')}
            />
            <Select
              label="Filter by Verification Status"
              options={[
                { value: 'all', label: 'All Receipts' },
                { value: 'verified', label: '✓ Verified' },
                { value: 'unverified', label: '✗ Unverified' }
              ]}
              value={filterVerificationStatus}
              onChange={(e) => setFilterVerificationStatus(e.target.value as 'all' | 'verified' | 'unverified')}
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
                
                // Determine which slider to control
                if (distanceToLow < distanceToHigh) {
                  setActiveSlider('low')
                  const newValue = Math.min(clickValue, sliderRange[1])
                  setSliderRange([newValue, sliderRange[1]])
                  setAmountRange([sliderToAmount(newValue), sliderToAmount(sliderRange[1])])
                  console.log('[SLIDER] Activated LOW slider', { value: newValue.toFixed(0) })
                } else {
                  setActiveSlider('high')
                  const newValue = Math.max(clickValue, sliderRange[0])
                  setSliderRange([sliderRange[0], newValue])
                  setAmountRange([sliderToAmount(sliderRange[0]), sliderToAmount(newValue)])
                  console.log('[SLIDER] Activated HIGH slider', { value: newValue.toFixed(0) })
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
                console.log('[SLIDER] Released slider')
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

          {/* Vendor Filter Bubbles */}
          {Object.keys(vendorCounts).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Vendor ({Object.keys(vendorCounts).length} unique)
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(vendorCounts) as [string, number][])
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([vendor, count]) => (
                    <button
                      key={vendor}
                      onClick={() => toggleVendorFilter(vendor)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedVendors.includes(vendor)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {vendor} ({count})
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t dark:border-gray-700">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredReceipts.length} of {receipts.length} receipts
              </p>
              <div className="flex items-center gap-2">
                <Select
                  label=""
                  options={[
                    { value: 'filename', label: 'Sort by Filename' },
                    { value: 'amount', label: 'Sort by Amount' },
                    { value: 'date', label: 'Sort by Date' }
                  ]}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'filename' | 'amount' | 'date')}
                  className="text-sm"
                />
                <button
                  onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortDirection === 'asc' ? (
                    <ArrowUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            {(searchVendor || selectedVendors.length > 0 || amountRange[0] > 0 || amountRange[1] < 100000 || startDate || endDate || filterType !== 'all' || filterVerificationStatus !== 'all' || filterPaymentMethod !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchVendor('')
                  setSelectedVendors([])
                  setAmountRange([0, 100000])
                  setSliderRange([0, 1000])
                  setStartDate('')
                  setEndDate('')
                  setFilterType('all')
                  setFilterVerificationStatus('all')
                  setFilterPaymentMethod('all')
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Receipt Form */}
      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add Receipt from Google Drive</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Google Drive Link"
                placeholder="https://drive.google.com/file/d/..."
                value={formData.driveUrl}
                onChange={(e) => setFormData({ ...formData, driveUrl: e.target.value })}
                required
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Vendor"
                  placeholder="Store name"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                />
                <Input
                  label="Total Amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
                <Input
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Time (optional)"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
                <Input
                  label="Payment Method (optional)"
                  placeholder="Cash, Credit, Debit"
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Subtotal (optional)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.subtotal}
                  onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                />
                <Input
                  label="Tax (optional)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.tax}
                  onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                />
                <Input
                  label="Transaction ID (optional)"
                  placeholder="Receipt #"
                  value={formData.transactionId}
                  onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                />
              </div>
              <Input
                label="Store ID (optional)"
                placeholder="Store number or location"
                value={formData.storeId}
                onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
              />
              <div className="flex gap-2">
                <Button type="submit">
                  <Link2 className="h-4 w-4 mr-2" />
                  Add Receipt
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Receipt Validation Instructions */}
      {receipts.length > 0 && showInstructions && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 dark:text-blue-400 mt-1 text-2xl">
                📝
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200">
                    Receipt Verification Recommended
                  </h3>
                  <button
                    onClick={() => setShowInstructions(false)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm font-medium"
                  >
                    Hide
                  </button>
                </div>
                <p className="text-base text-blue-700 dark:text-blue-300 mb-3">
                  Compare your digital receipts with your paper receipts to ensure all transactions were properly processed. 
                  Click the validation badge on each receipt card to mark it as verified.
                </p>
                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3 mb-3">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Recommended Method:</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Compare your original folder of receipt images with the processed receipts below. Use filename sorting to quickly 
                    locate receipts by comparing file numbers, making it easy to spot any that failed processing. If receipts continue 
                    to fail, use the manual receipt creation tool.
                  </p>
                </div>
                <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1.5">
                  <li>• <span className="font-semibold">Red borders</span> indicate unverified receipts that need your attention</li>
                  <li>• <span className="font-semibold">Green borders</span> indicate receipts you&apos;ve verified against paper copies</li>
                  <li>• If a receipt is missing, try processing it again or create a manual transaction</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Show Instructions Toggle (when hidden) */}
      {receipts.length > 0 && !showInstructions && (
        <button
          onClick={() => setShowInstructions(true)}
          className="mb-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm font-medium"
        >
          Show Verification Instructions
        </button>
      )}

      {/* Receipts Grid */}
      {receipts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Camera className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No receipts yet</h3>
            <p className="text-gray-500 dark:text-gray-300 mb-4">
              Start by uploading receipt photos to Google Drive and linking them here.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Add Your First Receipt
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* View Mode and Multi-Date Toggles */}
          <div className="flex items-center justify-between mb-4 gap-4">
            {/* Grouping Mode Toggle */}
            <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Group by:</span>
              <button
                onClick={() => setGroupingMode('date')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  groupingMode === 'date'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Receipt Date
              </button>
              <button
                onClick={() => setGroupingMode('batch')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  groupingMode === 'batch'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Batch Processed
              </button>
            </div>

            {/* Allow Multiple Dates Toggle */}
            <label className="flex items-center gap-2.5 text-base text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={allowMultipleDates}
                onChange={(e) => setAllowMultipleDates(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span>Allow multiple dates to be expanded</span>
            </label>
          </div>

          {/* Date-Grouped Receipts */}
          {sortedDateKeys.map((dateKey) => {
            const dateReceipts = receiptsByDate[dateKey]
            const isExpanded = expandedDates.has(dateKey)
            const verifiedCount = dateReceipts.filter((r: Receipt) => r.userValidated).length
            const totalCount = dateReceipts.length

            return (
              <div key={dateKey} className="mb-4">
                {/* Date Header */}
                <button
                  onClick={() => toggleDateExpansion(dateKey)}
                  className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors border-2 border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    )}
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {dateKey}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {totalCount} receipt{totalCount !== 1 ? 's' : ''} • {verifiedCount} verified
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    verifiedCount === totalCount
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    {verifiedCount}/{totalCount}
                  </div>
                </button>

                {/* Receipts Grid for this Date */}
                {isExpanded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    {dateReceipts.map((receipt: Receipt) => (
            <Card 
              key={receipt.id} 
              className={`overflow-hidden transition-all ${
                receipt.ocrFailed 
                  ? 'border-2 border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                  : receipt.userValidated
                    ? 'border-2 border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/10'
                    : 'border-2 border-red-500 dark:border-red-600 animate-pulse'
              }`}
            >
              <div 
                className="aspect-[3/4] bg-gray-100 relative overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setViewingReceipt(receipt)}
                title="Click to view full size"
              >
                {receipt.imageData ? (
                  <img
                    src={receipt.imageData}
                    alt="Receipt"
                    className="w-full h-full object-cover"
                  />
                ) : receipt.driveFileId && !receipt.driveFileId.startsWith('ocr-') ? (
                  <img
                    src={getThumbnailUrl(receipt.driveFileId)}
                    alt="Receipt"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Camera className="h-16 w-16" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  {/* Validation Toggle Button */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      const isNowValidated = !receipt.userValidated
                      
                      updateReceipt(receipt.id, {
                        userValidated: isNowValidated,
                        validatedAt: isNowValidated ? new Date().toISOString() : undefined
                      })
                      
                      // Award XP for validation
                      if (isNowValidated) {
                        await completeAction('validateReceipt')
                        
                        // Check if this is the first validated receipt - unlock Level 3
                        const validatedCount = receipts.filter((r: any) => r.userValidated).length
                        if (validatedCount === 0) {
                          // First validation - unlock Transactions tab (Level 3)
                          const { manualLevelUp, userProgress } = useStore.getState()
                          if (userProgress.currentLevel < 3) {
                            manualLevelUp(3)
                            console.log('[LEVEL UP] First receipt validated - unlocked Level 3 (Transactions)')
                          }
                        }
                        
                        // Check for achievements
                        if (validatedCount + 1 === 10) {
                          unlockAchievement('quality_control')
                        }
                      }
                    }}
                    className={`relative flex items-center gap-2 px-3 py-2 rounded-full font-semibold text-sm transition-all overflow-hidden shadow-lg ${
                      receipt.userValidated
                        ? 'bg-green-200 dark:bg-green-800/80 text-green-800 dark:text-green-100 hover:bg-green-300 dark:hover:bg-green-700/80'
                        : 'bg-red-200 dark:bg-red-800/80 text-red-800 dark:text-red-100 hover:bg-red-300 dark:hover:bg-red-700/80 animate-pulse'
                    }`}
                    title={receipt.userValidated ? 'Mark as unverified' : 'Mark as verified'}
                  >
                    {!receipt.userValidated && (
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-red-300/60 dark:via-red-600/40 to-transparent animate-shimmer" />
                    )}
                    <span className="relative z-10 text-base">{receipt.userValidated ? '✅' : '❌'}</span>
                    <span className="relative z-10">{receipt.userValidated ? 'Verified' : 'Not Verified'}</span>
                  </button>
                  {receipt.driveUrl && (
                    <a
                      href={receipt.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white dark:bg-gray-800 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                {/* DISABLED: SAM segmentation toggle removed (SAM disabled for performance)
                {receipt.originalImageData && receipt.croppedImageData && (
                  <button
                    onClick={() => {
                      const newPreference = !receipt.prefersCropped
                      updateReceipt(receipt.id, {
                        prefersCropped: newPreference,
                        imageData: newPreference ? receipt.croppedImageData : receipt.originalImageData
                      })
                    }}
                    className="absolute bottom-2 left-2 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full shadow text-xs font-medium hover:bg-white transition-colors flex items-center gap-1"
                    title={receipt.prefersCropped ? 'Switch to original' : 'Switch to cropped'}
                  >
                    <Scan className="h-3 w-3" />
                    {receipt.prefersCropped ? 'Original' : 'Cropped'}
                  </button>
                )}
                */}
              </div>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {/* Document Type Badge */}
                  {receipt.documentType && (
                    <div className={`mb-2 px-2 py-1 text-xs font-semibold rounded flex items-center gap-1 ${
                      receipt.documentType === 'bank_deposit_receipt' ? 'bg-green-100 border border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' :
                      receipt.documentType === 'bank_statement' ? 'bg-blue-100 border border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200' :
                      receipt.documentType === 'manifest' ? 'bg-amber-100 border border-amber-300 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200' :
                      receipt.documentType === 'invoice' ? 'bg-teal-100 border border-teal-300 text-teal-800 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-200' :
                      'bg-gray-100 border border-gray-300 text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200'
                    }`}>
                      <span>📄 {receipt.documentType === 'bank_deposit_receipt' ? 'Bank Deposit Receipt' : 
                            receipt.documentType === 'bank_statement' ? 'Bank Statement/Deposit' :
                            receipt.documentType === 'manifest' ? 'Manifest/Bill of Lading' :
                            receipt.documentType === 'invoice' ? 'Invoice' : 'Unknown'}</span>
                      {receipt.documentType === 'bank_statement' && (
                        <span className="ml-1" title="Bank statement detected. Add customer name, job details, and income source in transaction notes to ensure audit-ready documentation.">
                          ℹ️
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Duplicate Warning */}
                  {receipt.isDuplicate && (
                    <div className="mb-2 px-2 py-1 bg-red-100 border border-red-300 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200 text-xs font-semibold rounded flex items-center gap-1">
                      <span>⚠️ Possible Duplicate</span>
                    </div>
                  )}
                  
                  {/* Supplemental Document Notice */}
                  {receipt.isSupplementalDoc && (
                    <div className="mb-2 px-2 py-1 bg-indigo-100 border border-indigo-300 text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-200 text-xs font-semibold rounded flex items-center gap-1">
                      <span>📎 Supporting Document (Not Tracked as Expense)</span>
                    </div>
                  )}
                  
                  {/* Linked Documents */}
                  {receipt.linkedDocumentIds && receipt.linkedDocumentIds.length > 0 && (
                    <div className="mb-2 px-2 py-1 bg-cyan-100 border border-cyan-300 text-cyan-800 dark:bg-cyan-900/20 dark:border-cyan-800 dark:text-cyan-200 text-xs font-semibold rounded flex items-center gap-1">
                      <span>🔗 Linked to {receipt.linkedDocumentIds.length} document{receipt.linkedDocumentIds.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  
                  {receipt.ocrFailed && (
                    <div className="mb-2 px-2 py-1 bg-orange-600 text-white text-xs font-semibold rounded flex items-center gap-1">
                      <span>⚠️ OCR Failed - Manual Entry Required</span>
                    </div>
                  )}
                  {!receipt.linkedTransactionId && !receipt.ocrFailed && !receipt.isSupplementalDoc && (
                    <div className="mb-2 px-2 py-1 bg-blue-100 border border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200 text-xs font-semibold rounded flex items-center gap-1">
                      <span>📋 Not Linked to Transaction</span>
                    </div>
                  )}
                  {/* Filename for easy sorting/matching */}
                  {receipt.sourceFilename && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-mono truncate font-medium" title={receipt.sourceFilename}>
                      📁 {receipt.sourceFilename}
                    </p>
                  )}
                  {receipt.ocrVendor && (
                    <p className="font-medium">
                      {receipt.ocrVendor}
                      {receipt.isReturn && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-semibold">
                          🔄 RETURN
                        </span>
                      )}
                    </p>
                  )}
                  <div className="flex items-baseline justify-between">
                    {receipt.ocrAmount && (
                      <p className={`text-lg font-bold ${receipt.isReturn || receipt.ocrAmount < 0 ? 'text-orange-500 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                        {formatCurrency(receipt.ocrAmount)}
                      </p>
                    )}
                    {receipt.ocrPaymentMethod && (
                      <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {receipt.ocrPaymentMethod}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {receipt.ocrDate && <span>{formatDate(receipt.ocrDate)}</span>}
                    {receipt.ocrTime && <span>• {receipt.ocrTime}</span>}
                  </div>
                  
                  {/* Tax/Subtotal breakdown */}
                  {(receipt.ocrSubtotal || receipt.ocrTax) && (
                    <div className="text-xs text-gray-500 flex gap-3">
                      {receipt.ocrSubtotal && <span>Subtotal: {formatCurrency(receipt.ocrSubtotal)}</span>}
                      {receipt.ocrTax && <span>Tax: {formatCurrency(receipt.ocrTax)}</span>}
                    </div>
                  )}
                  
                  {/* AI Categorization - Read-only (edit in Transactions tab) */}
                  {(receipt.transactionType || receipt.transactionCategory) && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-2">
                      <p className="text-xs font-semibold text-purple-900 dark:text-purple-200 mb-1">AI Categorization</p>
                      <div className="flex gap-2 text-xs text-purple-700 dark:text-purple-300">
                        {receipt.transactionType && (
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 rounded">
                            {receipt.transactionType === 'expense' ? '💸 Expense' : '💰 Income'}
                          </span>
                        )}
                        {receipt.transactionCategory && (
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 rounded">
                            {receipt.transactionCategory}
                          </span>
                        )}
                      </div>
                      {receipt.ocrCardLastFour && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                          💳 Card ending in {receipt.ocrCardLastFour}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Line items preview */}
                  {receipt.ocrLineItems && receipt.ocrLineItems.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                        {receipt.ocrLineItems.length} item{receipt.ocrLineItems.length > 1 ? 's' : ''}
                      </summary>
                      <div className="mt-1 space-y-1 max-h-24 overflow-y-auto bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        {receipt.ocrLineItems.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-gray-900 dark:text-gray-100">
                            <span className="truncate flex-1 mr-2">{item.description}</span>
                            <span className="font-medium">${item.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                  
                  {/* Store/Transaction IDs */}
                  {(receipt.ocrStoreId || receipt.ocrTransactionId) && (
                    <div className="text-xs text-gray-400 flex gap-3">
                      {receipt.ocrStoreId && <span>Store #{receipt.ocrStoreId}</span>}
                      {receipt.ocrTransactionId && <span>Trans #{receipt.ocrTransactionId}</span>}
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-400">
                    Added {formatDate(receipt.createdAt)}
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  {receipt.driveUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(receipt.driveUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteReceipt(receipt.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* File System Setup Modal */}
      {showFileSystemModal && (
        <FileSystemRequiredModal 
          onSetupComplete={handleFileSystemSetup}
          onCancel={handleFileSystemCancel}
        />
      )}

      {/* Gemini API Key Setup Modal */}
      {showGeminiModal && (
        <GeminiApiKeyRequiredModal 
          onSetupComplete={handleGeminiSetup}
          onSkip={handleGeminiSkip}
        />
      )}

      {/* Receipt Image Viewer Modal (View-only with Zoom & Pan) */}
      {viewingReceipt && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => {
            setViewingReceipt(null)
            setImageZoom(0.7)
            setImagePosition({ x: 0, y: 0 })
          }}
        >
          <div 
            className="relative max-w-4xl max-h-full bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {viewingReceipt.ocrVendor || 'Receipt'}
                </h3>
                {viewingReceipt.sourceFilename && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {viewingReceipt.sourceFilename}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {Math.round(imageZoom * 100)}%
                </span>
                <button
                  onClick={() => {
                    setViewingReceipt(null)
                    setImageZoom(0.7)
                    setImagePosition({ x: 0, y: 0 })
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  title="Close"
                >
                  <span className="text-2xl text-gray-500 dark:text-gray-400">×</span>
                </button>
              </div>
            </div>
            <div 
              className="overflow-hidden max-h-[calc(100vh-200px)] relative bg-gray-100 dark:bg-gray-900 flex items-center justify-center"
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              onWheel={(e) => {
                e.preventDefault()
                const delta = e.deltaY > 0 ? -0.06 : 0.06
                setImageZoom(prev => Math.max(0.7, Math.min(1.2, prev + delta)))
              }}
              onMouseDown={(e) => {
                setIsDragging(true)
                setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y })
              }}
              onMouseMove={(e) => {
                if (isDragging) {
                  setImagePosition({
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y
                  })
                }
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
            >
              {viewingReceipt.imageData ? (
                <img
                  src={viewingReceipt.imageData}
                  alt="Receipt"
                  className="w-auto h-auto max-w-full max-h-full"
                  style={{
                    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageZoom})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                  }}
                  draggable={false}
                />
              ) : viewingReceipt.driveFileId && !viewingReceipt.driveFileId.startsWith('ocr-') ? (
                <img
                  src={`https://drive.google.com/uc?id=${viewingReceipt.driveFileId}`}
                  alt="Receipt"
                  className="w-auto h-auto max-w-full max-h-full"
                  style={{
                    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageZoom})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                  }}
                  draggable={false}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getThumbnailUrl(viewingReceipt.driveFileId)
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-400 dark:text-gray-500">
                  <Camera className="h-24 w-24" />
                </div>
              )}
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <div>
                  {viewingReceipt.ocrAmount && (
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(viewingReceipt.ocrAmount)}
                    </span>
                  )}
                  {viewingReceipt.ocrDate && (
                    <span className="ml-3 text-gray-600 dark:text-gray-400">
                      {formatDate(viewingReceipt.ocrDate)}
                    </span>
                  )}
                </div>
                {viewingReceipt.driveUrl && (
                  <a
                    href={viewingReceipt.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    Open in Drive <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* First visit intro modal */}
      <FirstVisitIntro tabId="receipts" isVisible={showIntro} onClose={closeIntro} />
    </div>
  )
}
