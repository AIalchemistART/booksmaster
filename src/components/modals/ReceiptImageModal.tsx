'use client'

import { useState, useRef, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, RotateCw, CheckCircle2, ChevronLeft, ChevronRight, FileText, Receipt as ReceiptIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useStore, generateId } from '@/store'
import { saveCorrectionsToFileSystem } from '@/lib/file-system-adapter'
import { formatCurrency } from '@/lib/utils'
import type { Transaction, CategorizationCorrection, Receipt } from '@/types'
import { learnCardPaymentType } from '@/lib/payment-type-learning'
import { BankStatementGuidanceModal } from '@/components/modals/BankStatementGuidanceModal'
import { findPotentialDuplicates, getDuplicateWarningMessage, linkTransactions, unlinkTransactions, type PotentialDuplicate } from '@/lib/duplicate-detection'

interface ReceiptImageModalProps {
  imageData: string
  transaction?: Transaction
  onClose: () => void
  onSave?: (transaction: Transaction) => void
  categoryOptions?: Array<{ value: string; label: string }>
  typeOptions?: Array<{ value: string; label: string }>
  onNavigatePrevious?: () => void
  onNavigateNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
}

type ViewMode = 'receipt' | 'documentation'

export function ReceiptImageModal({
  imageData,
  transaction,
  onClose,
  onSave,
  categoryOptions = [],
  typeOptions = [],
  onNavigatePrevious,
  onNavigateNext,
  hasPrevious = false,
  hasNext = false
}: ReceiptImageModalProps) {
  const { addCorrection, categorizationCorrections, receipts, updateReceipt, recordValidation } = useStore()
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const imageRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Get linked receipt for this transaction
  const linkedReceipt = transaction?.receiptId ? receipts.find(r => r.id === transaction.receiptId) : null
  
  // Determine initial view mode based on receipt's supplemental doc status
  const [viewMode, setViewMode] = useState<ViewMode>(
    linkedReceipt?.isSupplementalDoc ? 'documentation' : 'receipt'
  )
  
  // Store initial form state to detect changes made in THIS session only
  const initialFormData = useRef({
    date: transaction?.date || '',
    description: transaction?.description || '',
    amount: transaction?.amount !== undefined ? transaction.amount.toFixed(2) : '',
    type: transaction?.type || 'expense',
    category: transaction?.category || 'other',
    paymentMethod: transaction?.paymentMethod || '',
    incomeSource: transaction?.incomeSource || '',
    itemization: transaction?.itemization || '',
    notes: transaction?.notes || ''
  })

  const [formData, setFormData] = useState({
    date: transaction?.date || '',
    description: transaction?.description || '',
    amount: transaction?.amount !== undefined ? transaction.amount.toFixed(2) : '',
    type: transaction?.type || 'expense',
    category: transaction?.category || 'other',
    paymentMethod: transaction?.paymentMethod || '',
    incomeSource: transaction?.incomeSource || '',
    itemization: transaction?.itemization || '',
    notes: transaction?.notes || ''
  })

  const [isValidated, setIsValidated] = useState(transaction?.userValidated || false)
  const [hasEdits, setHasEdits] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showBankStatementGuidance, setShowBankStatementGuidance] = useState(false)
  const [potentialDuplicates, setPotentialDuplicates] = useState<PotentialDuplicate[]>([])
  const [pendingChanges, setPendingChanges] = useState<{
    dateChanged: boolean
    descriptionChanged: boolean
    amountChanged: boolean
    typeChanged: boolean
    categoryChanged: boolean
    paymentMethodChanged: boolean
    itemizationChanged: boolean
    notesChanged: boolean
  } | null>(null)
  
  // Documentation-specific form state
  const [docFormData, setDocFormData] = useState<{
    documentType: string
    vendor: string
    amount: string
    date: string
    transactionNumber: string
    orderNumber: string
    invoiceNumber: string
    accountNumber: string
    notes: string
  }>({
    documentType: linkedReceipt?.documentType || 'payment_receipt',
    vendor: linkedReceipt?.ocrVendor || '',
    amount: linkedReceipt?.ocrAmount !== undefined ? linkedReceipt.ocrAmount.toFixed(2) : '',
    date: linkedReceipt?.ocrDate || '',
    transactionNumber: linkedReceipt?.transactionNumber || '',
    orderNumber: linkedReceipt?.orderNumber || '',
    invoiceNumber: linkedReceipt?.invoiceNumber || '',
    accountNumber: linkedReceipt?.accountNumber || '',
    notes: transaction?.notes || ''
  })

  // Check if any field has been edited IN THIS SESSION (compare to initial state when modal opened)
  const checkForEdits = () => {
    const initial = initialFormData.current
    const dateChanged = formData.date !== initial.date
    const descriptionChanged = formData.description !== initial.description
    const amountChanged = formData.amount !== initial.amount
    const typeChanged = formData.type !== initial.type
    const categoryChanged = formData.category !== initial.category
    const paymentMethodChanged = formData.paymentMethod !== initial.paymentMethod
    const incomeSourceChanged = formData.incomeSource !== initial.incomeSource
    const itemizationChanged = formData.itemization !== initial.itemization
    const notesChanged = formData.notes !== initial.notes
    
    setHasEdits(dateChanged || descriptionChanged || amountChanged || typeChanged || categoryChanged || paymentMethodChanged || incomeSourceChanged || itemizationChanged || notesChanged)
  }

  // Update initial form data when transaction changes (navigation)
  useEffect(() => {
    if (transaction) {
      initialFormData.current = {
        date: transaction.date || '',
        description: transaction.description || '',
        amount: transaction.amount !== undefined ? transaction.amount.toFixed(2) : '',
        type: transaction.type || 'expense',
        category: transaction.category || 'other',
        paymentMethod: transaction.paymentMethod || '',
        incomeSource: transaction.incomeSource || '',
        itemization: transaction.itemization || '',
        notes: transaction.notes || ''
      }
      setFormData({
        date: transaction.date || '',
        description: transaction.description || '',
        amount: transaction.amount !== undefined ? transaction.amount.toFixed(2) : '',
        type: transaction.type || 'expense',
        category: transaction.category || 'other',
        paymentMethod: transaction.paymentMethod || '',
        incomeSource: transaction.incomeSource || '',
        itemization: transaction.itemization || '',
        notes: transaction.notes || ''
      })
      setIsValidated(transaction.userValidated || false)
      setHasEdits(false) // Reset edits flag when transaction changes
      
      // Check if this is a bank statement transaction and show guidance
      const { receipts } = useStore.getState()
      const linkedReceipt = transaction.receiptId ? receipts.find(r => r.id === transaction.receiptId) : null
      if (linkedReceipt?.documentType === 'bank_statement') {
        setShowBankStatementGuidance(true)
      }
    }
  }, [transaction])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Check for edits whenever formData changes
  useEffect(() => {
    checkForEdits()
  }, [formData])

  // Check for duplicate transactions when income data changes
  useEffect(() => {
    if (!transaction || formData.type !== 'income') {
      setPotentialDuplicates([])
      return
    }

    const { transactions } = useStore.getState()
    
    // Create a temporary transaction object with current form data for duplicate checking
    const tempTransaction: Transaction = {
      ...transaction,
      amount: parseFloat(formData.amount) || 0,
      date: formData.date,
      incomeSource: formData.incomeSource as Transaction['incomeSource'],
      type: 'income'
    }
    
    const duplicates = findPotentialDuplicates(tempTransaction, transactions)
    setPotentialDuplicates(duplicates)
  }, [transaction, formData.amount, formData.date, formData.incomeSource, formData.type])

  const handleLinkToDuplicate = (duplicateId: string) => {
    if (!transaction) return
    
    const { transactions, updateTransaction, addCorrection, categorizationCorrections } = useStore.getState()
    const duplicateTransaction = transactions.find(t => t.id === duplicateId)
    const duplicate = potentialDuplicates.find(d => d.transaction.id === duplicateId)
    
    const updatedTransactions = linkTransactions(transaction.id, duplicateId, transactions)
    
    // Update both transactions in the store
    const primaryTx = updatedTransactions.find(t => t.id === transaction.id)
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
    
    // Track linking action in corrections for AI learning
    const linkingCorrection: CategorizationCorrection = {
      id: generateId(),
      transactionId: transaction.id,
      timestamp: new Date().toISOString(),
      vendor: transaction.description,
      amount: transaction.amount,
      changes: {
        linkedTransactionId: { from: undefined, to: duplicateId },
        verificationLevel: { from: transaction.verificationLevel, to: 'strong' },
        isDuplicateOfLinked: { from: false, to: false }
      },
      linkedTransactionDetails: duplicateTransaction ? {
        id: duplicateTransaction.id,
        description: duplicateTransaction.description,
        amount: duplicateTransaction.amount,
        date: duplicateTransaction.date,
        matchScore: duplicate?.matchScore,
        matchReasons: duplicate?.matchReasons
      } : undefined,
      userNotes: `Linked to duplicate transaction to prevent double-counting. Match score: ${duplicate?.matchScore}%. Reasons: ${duplicate?.matchReasons.join(', ')}`,
      wasAutoCategorizationCorrection: false,
      isLinkingAction: true
    }
    
    addCorrection(linkingCorrection)
    saveCorrectionsToFileSystem([...categorizationCorrections, linkingCorrection]).catch(console.error)
    
    // Clear duplicate warnings since we just linked
    setPotentialDuplicates([])
  }

  const handleUnlinkTransaction = () => {
    if (!transaction?.linkedTransactionId) return
    
    const { transactions, updateTransaction, addCorrection, categorizationCorrections } = useStore.getState()
    const linkedId = transaction.linkedTransactionId
    const linkedTransaction = transactions.find(t => t.id === linkedId)
    const updatedTransactions = unlinkTransactions(transaction.id, linkedId, transactions)
    
    // Update both transactions in the store
    const tx1 = updatedTransactions.find(t => t.id === transaction.id)
    const tx2 = updatedTransactions.find(t => t.id === linkedId)
    
    if (tx1) {
      updateTransaction(tx1.id, {
        linkedTransactionId: undefined,
        isDuplicateOfLinked: false,
        verificationLevel: tx1.verificationLevel
      })
    }
    if (tx2) {
      updateTransaction(tx2.id, {
        linkedTransactionId: undefined,
        isDuplicateOfLinked: false,
        verificationLevel: tx2.verificationLevel
      })
    }
    
    // Track unlinking action in corrections for AI learning
    const unlinkingCorrection: CategorizationCorrection = {
      id: generateId(),
      transactionId: transaction.id,
      timestamp: new Date().toISOString(),
      vendor: transaction.description,
      amount: transaction.amount,
      changes: {
        linkedTransactionId: { from: linkedId, to: undefined },
        verificationLevel: { from: 'strong', to: tx1?.verificationLevel },
        isDuplicateOfLinked: { from: transaction.isDuplicateOfLinked || false, to: false }
      },
      linkedTransactionDetails: linkedTransaction ? {
        id: linkedTransaction.id,
        description: linkedTransaction.description,
        amount: linkedTransaction.amount,
        date: linkedTransaction.date
      } : undefined,
      userNotes: 'Unlinked transactions - user determined they are not duplicates',
      wasAutoCategorizationCorrection: false,
      isLinkingAction: true
    }
    
    addCorrection(unlinkingCorrection)
    saveCorrectionsToFileSystem([...categorizationCorrections, unlinkingCorrection]).catch(console.error)
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 5))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    // Always zoom with scroll wheel (more intuitive for receipt validation)
    const delta = -e.deltaY * 0.01
    setZoom(prev => Math.max(0.5, Math.min(5, prev + delta)))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleInitiateSave = () => {
    if (!transaction || !onSave) return
    
    // Check what changed
    const dateChanged = formData.date !== transaction.date
    const descriptionChanged = formData.description !== transaction.description
    const amountChanged = parseFloat(formData.amount) !== transaction.amount
    const typeChanged = formData.type !== transaction.type
    const categoryChanged = formData.category !== transaction.category
    const paymentMethodChanged = (formData.paymentMethod || '') !== (transaction.paymentMethod || '')
    const itemizationChanged = (formData.itemization || '') !== (transaction.itemization || '')
    const notesChanged = (formData.notes || '') !== (transaction.notes || '')
    
    const anyFieldChanged = dateChanged || descriptionChanged || amountChanged || typeChanged || categoryChanged || paymentMethodChanged || itemizationChanged || notesChanged
    
    // If no changes, just close
    if (!anyFieldChanged && viewMode !== 'documentation') {
      onClose()
      return
    }
    
    // Show confirmation modal with changes
    setPendingChanges({
      dateChanged,
      descriptionChanged,
      amountChanged,
      typeChanged,
      categoryChanged,
      paymentMethodChanged,
      itemizationChanged,
      notesChanged
    })
    setShowConfirmation(true)
  }
  
  const handleConfirmedSave = async (shouldVerify: boolean) => {
    if (!transaction || !onSave) return
    
    // Close confirmation modal
    setShowConfirmation(false)
    
    // Update validation state based on user choice
    const finalValidationState = shouldVerify ? true : isValidated
    
    const { receipts, deleteTransaction } = useStore.getState()
    const now = new Date().toISOString()
    
    // Get linked receipt for payment type learning
    const linkedReceiptData = transaction.receiptId ? receipts.find(r => r.id === transaction.receiptId) : null
    
    // Handle documentation conversion
    if (viewMode === 'documentation' && linkedReceiptData) {
      // Convert receipt to supplemental documentation
      const updatedReceipt: Receipt = {
        ...linkedReceiptData,
        documentType: docFormData.documentType as any,
        isSupplementalDoc: true,
        ocrVendor: docFormData.vendor,
        ocrAmount: docFormData.amount ? parseFloat(docFormData.amount) : undefined,
        ocrDate: docFormData.date || linkedReceiptData.ocrDate,
        transactionNumber: docFormData.transactionNumber || undefined,
        orderNumber: docFormData.orderNumber || undefined,
        invoiceNumber: docFormData.invoiceNumber || undefined,
        accountNumber: docFormData.accountNumber || undefined
      }
      
      // Update receipt in store
      updateReceipt(linkedReceiptData.id, updatedReceipt)
      
      // Track conversion in corrections for AI learning
      const correction: CategorizationCorrection = {
        id: generateId(),
        transactionId: transaction.id,
        timestamp: now,
        vendor: docFormData.vendor,
        amount: docFormData.amount ? parseFloat(docFormData.amount) : transaction.amount,
        changes: {
          description: {
            from: transaction.description,
            to: `[CONVERTED TO ${docFormData.documentType.toUpperCase()}] ${docFormData.vendor}`
          }
        },
        userNotes: `Converted from receipt/expense to supplemental documentation (${docFormData.documentType}). ${docFormData.notes || 'No additional notes.'}`,
        receiptId: linkedReceiptData.id,
        wasAutoCategorizationCorrection: true
      }
      
      addCorrection(correction)
      
      try {
        await saveCorrectionsToFileSystem([...categorizationCorrections, correction])
        console.log('[CONVERSION] Saved receipt-to-documentation conversion to change log')
      } catch (error) {
        console.error('[CONVERSION] Failed to save conversion:', error)
      }
      
      // Delete transaction since this is now supporting documentation only
      deleteTransaction(transaction.id)
      
      onClose()
      return
    }
    
    // Detect if any fields were changed
    const dateChanged = formData.date !== transaction.date
    const descriptionChanged = formData.description !== transaction.description
    const amountChanged = parseFloat(formData.amount) !== transaction.amount
    const typeChanged = formData.type !== transaction.type
    const categoryChanged = formData.category !== transaction.category
    const paymentMethodChanged = (formData.paymentMethod || '') !== (transaction.paymentMethod || '')
    const itemizationChanged = (formData.itemization || '') !== (transaction.itemization || '')
    const notesChanged = (formData.notes || '') !== (transaction.notes || '')
    
    const anyFieldChanged = pendingChanges ? Object.values(pendingChanges).some(v => v) : false
    
    // Track categorization changes for report
    // Set original values if this is the first edit
    const originalType = transaction.originalType || transaction.type
    const originalCategory = transaction.originalCategory || transaction.category
    const originalDate = transaction.originalDate || transaction.date
    const originalDescription = transaction.originalDescription || transaction.description
    const originalAmount = transaction.originalAmount !== undefined ? transaction.originalAmount : transaction.amount
    const originalPaymentMethod = transaction.originalPaymentMethod || transaction.paymentMethod
    
    // Mark as manually edited if type or category changed from original
    const categorizationChanged = (formData.type !== originalType) || (formData.category !== originalCategory)

    const updatedTransaction: Transaction = {
      ...transaction,
      date: formData.date,
      description: formData.description,
      amount: parseFloat(formData.amount) || 0,
      type: formData.type as Transaction['type'],
      category: formData.category as Transaction['category'],
      paymentMethod: formData.paymentMethod ? (formData.paymentMethod as Transaction['paymentMethod']) : undefined,
      incomeSource: formData.incomeSource ? (formData.incomeSource as Transaction['incomeSource']) : undefined,
      itemization: formData.itemization || undefined,
      notes: formData.notes || undefined,
      userValidated: finalValidationState,
      validatedAt: finalValidationState ? new Date().toISOString() : transaction.validatedAt,
      updatedAt: now,
      // Track all original values for learning
      originalType,
      originalCategory,
      originalDate,
      originalDescription,
      originalAmount,
      originalPaymentMethod,
      wasManuallyEdited: categorizationChanged || transaction.wasManuallyEdited || false,
      editedAt: anyFieldChanged ? now : transaction.editedAt
    }

    // Create categorization correction for AI learning if any field changed
    if (anyFieldChanged) {
      const correction: CategorizationCorrection = {
        id: generateId(),
        transactionId: transaction.id,
        timestamp: now,
        vendor: formData.description,
        amount: parseFloat(formData.amount) || 0,
        changes: {
          ...(dateChanged && { date: { from: transaction.date, to: formData.date } }),
          ...(descriptionChanged && { description: { from: transaction.description, to: formData.description } }),
          ...(amountChanged && { amount: { from: transaction.amount, to: parseFloat(formData.amount) || 0 } }),
          ...(typeChanged && { type: { from: transaction.type, to: formData.type as Transaction['type'] } }),
          ...(categoryChanged && { category: { from: transaction.category, to: formData.category as Transaction['category'] } }),
          ...(paymentMethodChanged && { paymentMethod: { from: transaction.paymentMethod || '', to: formData.paymentMethod } }),
          ...(notesChanged && { notes: { from: transaction.notes || '', to: formData.notes } })
        },
        userNotes: formData.notes,
        receiptId: transaction.receiptId,
        wasAutoCategorizationCorrection: categorizationChanged
      }

      // Add to store
      addCorrection(correction)

      // Save all corrections to file system for AI context
      const allCorrections = [...categorizationCorrections, correction]
      try {
        await saveCorrectionsToFileSystem(allCorrections)
        console.log('[CORRECTION] Saved correction to file system for AI learning')
      } catch (error) {
        console.error('[CORRECTION] Failed to save to file system:', error)
      }
      
      // Check for level-ups based on transaction edits
      const { transactions, userProgress, manualLevelUp } = useStore.getState()
      
      // Level 5: First transaction edit/validation
      if (categorizationChanged || anyFieldChanged) {
        const editedTransactions = transactions.filter(t => t.wasManuallyEdited || t.userValidated)
        if (editedTransactions.length === 0) {
          // First edit - unlock Invoices & Reports (Level 5)
          if (userProgress.currentLevel < 5) {
            manualLevelUp(5)
            console.log('[LEVEL UP] First transaction edit - unlocked Level 5 (Invoices & Reports)')
          }
        }
      }
      
      // Level 6: First categorization correction
      if (categorizationChanged) {
        if (categorizationCorrections.length === 0) {
          // First categorization correction - unlock Categorization Changes (Level 6)
          if (userProgress.currentLevel < 6) {
            manualLevelUp(6)
            console.log('[LEVEL UP] First categorization correction - unlocked Level 6 (Categorization Changes)')
          }
        }
      }
    }
    
    // Learn card payment type if user corrected "Card" → "Credit" or "Debit"
    if (linkedReceiptData?.ocrCardLastFour && linkedReceiptData.ocrPaymentMethod) {
      const normalizedOriginal = linkedReceiptData.ocrPaymentMethod.toLowerCase()
      const wasGenericCard = normalizedOriginal === 'card' || 
                             normalizedOriginal.includes('visa') || 
                             normalizedOriginal.includes('mastercard') ||
                             normalizedOriginal.includes('amex') ||
                             normalizedOriginal.includes('discover')
      
      // Check if receipt data shows payment method that's now specific (user must have edited receipt separately)
      // Note: Users would edit payment method through receipt card UI, not transaction modal
      // This is just to catch if the receipt was updated elsewhere
      console.log('[PAYMENT LEARNING] Checking for payment type correction opportunities for card *' + linkedReceiptData.ocrCardLastFour)
    }

    // Track AI parsing accuracy when user validates
    if (finalValidationState && !transaction.userValidated) {
      // First-time validation - track if AI parsing was accurate
      const fieldsEdited: string[] = []
      
      // Check which fields were changed from AI-parsed originals
      if (dateChanged) fieldsEdited.push('date')
      if (descriptionChanged) fieldsEdited.push('vendor')
      if (amountChanged) fieldsEdited.push('amount')
      if (typeChanged) fieldsEdited.push('type')
      if (categoryChanged) fieldsEdited.push('category')
      if (paymentMethodChanged) fieldsEdited.push('paymentMethod')
      
      recordValidation({
        timestamp: now,
        requiresEdit: fieldsEdited.length > 0,
        receiptId: transaction.receiptId || '',
        fieldsEdited: fieldsEdited.length > 0 ? fieldsEdited : undefined,
        transactionId: transaction.id
      })
      
      console.log(`[AI ACCURACY] Validation recorded: ${fieldsEdited.length > 0 ? `EDITED (${fieldsEdited.join(', ')})` : 'PERFECT'}`)
    }

    onSave(updatedTransaction)
    onClose()
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-colors ${
      isValidated 
        ? 'bg-green-900 dark:bg-green-950 bg-opacity-40 dark:bg-opacity-60' 
        : 'bg-red-900 dark:bg-red-950 bg-opacity-40 dark:bg-opacity-60'
    }`}>
      <div className="w-full h-full max-w-7xl max-h-screen p-4 flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between mb-4 rounded-t-lg px-4 py-3 transition-colors ${
          isValidated ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'
        }`}>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Receipt Details</h2>
            {hasPrevious && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onNavigatePrevious}
                disabled={!hasPrevious}
                title="Previous transaction"
                className="ml-4"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex gap-4 bg-white dark:bg-gray-900 rounded-b-lg p-4 overflow-hidden">
          {/* Image Viewer */}
          <div
            ref={containerRef}
            className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative cursor-move"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              ref={imageRef}
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `translate(${position.x}px, ${position.y}px)`
              }}
            >
              <img
                src={imageData}
                alt="Receipt"
                className="max-w-full max-h-full object-contain"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center',
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                }}
                draggable={false}
              />
            </div>
            
            {/* Right Navigation Arrow - positioned in darkened area outside receipt */}
            {hasNext && (
              <button
                onClick={onNavigateNext}
                disabled={!hasNext}
                title="Next transaction"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              </button>
            )}
          </div>

          {/* Receipt/Documentation Toggle */}
          {transaction && onSave && linkedReceipt && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
              <div className="flex bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                <button
                  onClick={() => setViewMode('receipt')}
                  className={`flex items-center gap-2 px-6 py-3 font-semibold transition-all ${
                    viewMode === 'receipt'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <ReceiptIcon className="h-5 w-5" />
                  <span>Receipt</span>
                </button>
                <button
                  onClick={() => setViewMode('documentation')}
                  className={`flex items-center gap-2 px-6 py-3 font-semibold transition-all ${
                    viewMode === 'documentation'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <FileText className="h-5 w-5" />
                  <span>Documentation</span>
                </button>
              </div>
            </div>
          )}

          {/* Edit Form */}
          {transaction && onSave && (
            <div className="w-80 flex flex-col gap-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {viewMode === 'receipt' ? 'Edit Transaction' : 'Edit Documentation'}
                </h3>
                <button
                  onClick={() => setIsValidated(!isValidated)}
                  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all overflow-hidden ${
                    isValidated
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/40'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/40 animate-pulse'
                  }`}
                  title={isValidated ? 'Mark as unvalidated' : 'Mark as validated'}
                >
                  {!isValidated && (
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-red-200/50 dark:via-red-700/30 to-transparent animate-shimmer" />
                  )}
                  <CheckCircle2 className={`h-4 w-4 relative z-10 ${isValidated ? 'fill-current' : ''}`} />
                  <span className="relative z-10">{isValidated ? 'Validated' : 'Not Validated'}</span>
                </button>
              </div>

              {/* Linked Transaction Display */}
              {transaction?.linkedTransactionId && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-600 rounded-lg p-3 mb-4">
                  {(() => {
                    const { transactions } = useStore.getState()
                    const linkedTx = transactions.find(t => t.id === transaction.linkedTransactionId)
                    return linkedTx ? (
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                              🔗 {transaction.isDuplicateOfLinked ? 'Linked as Duplicate' : 'Linked to Another Transaction'}
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                              {transaction.isDuplicateOfLinked 
                                ? 'This transaction is marked as a duplicate and won\'t count toward income totals.' 
                                : 'This transaction is linked for verification but still counts toward totals.'}
                            </p>
                          </div>
                          <Button
                            onClick={handleUnlinkTransaction}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            Unlink
                          </Button>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded p-2 border border-blue-200 dark:border-blue-700">
                          <div className="flex justify-between items-start text-sm">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {new Date(linkedTx.date).toLocaleDateString()} - {formatCurrency(linkedTx.amount)}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{linkedTx.description}</p>
                            </div>
                            {linkedTx.isDuplicateOfLinked && (
                              <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                                Not Counted
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    ) : null
                  })()}
                </div>
              )}
              
              {/* Conditional form based on view mode */}
              {viewMode === 'receipt' ? (
                <>
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
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />

                  {typeOptions.length > 0 && (
                    <Select
                      label="Type"
                      options={typeOptions}
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as Transaction['type'] })}
                      required
                    />
                  )}

                  {categoryOptions.length > 0 && (
                    <Select
                      label="Category"
                      options={categoryOptions}
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as Transaction['category'] })}
                      required
                    />
                  )}

                  <Input
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />

                  <Select
                    label="Payment Method"
                    options={[
                      { value: '', label: 'Not specified' },
                      { value: 'Card', label: 'Card (Generic - unknown if Credit/Debit)' },
                      { value: 'Credit', label: 'Credit Card' },
                      { value: 'Debit', label: 'Debit Card' },
                      { value: 'Cash', label: 'Cash' },
                      { value: 'Check', label: 'Check' }
                    ]}
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  />

                  {/* Income Source - for deposit tracking */}
                  {formData.type === 'income' && (
                    <>
                      <Select
                        label="Income Source (helps prevent duplicates)"
                        options={[
                          { value: '', label: 'Not specified' },
                          { value: 'cash', label: 'Cash (deposited to bank)' },
                          { value: 'check', label: 'Check (may have separate deposit)' },
                          { value: 'card', label: 'Card/Credit Card Payment' },
                          { value: 'bank_transfer', label: 'Bank Transfer/ACH' },
                          { value: 'deposit', label: 'Bank Deposit Statement' },
                          { value: 'other', label: 'Other' }
                        ]}
                        value={formData.incomeSource}
                        onChange={(e) => setFormData({ ...formData, incomeSource: e.target.value })}
                      />
                      
                      {/* Duplicate Detection Warning */}
                      {potentialDuplicates.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-600 rounded-lg p-3">
                          <p className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
                            {getDuplicateWarningMessage(potentialDuplicates)}
                          </p>
                          <div className="space-y-2">
                            {potentialDuplicates.slice(0, 3).map((dup) => (
                              <div key={dup.transaction.id} className="text-sm bg-white dark:bg-gray-800 rounded p-2 border border-amber-200 dark:border-amber-700">
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {new Date(dup.transaction.date).toLocaleDateString()} - {formatCurrency(dup.transaction.amount)}
                                  </span>
                                  <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded">
                                    {dup.matchScore}% match
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">{dup.transaction.description}</p>
                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                  {dup.matchReasons.join(' • ')}
                                </p>
                                <Button
                                  onClick={() => handleLinkToDuplicate(dup.transaction.id)}
                                  className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1"
                                  size="sm"
                                >
                                  🔗 Link as Same Income (Mark as Duplicate)
                                </Button>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-amber-800 dark:text-amber-300 mt-2 italic">
                            💡 Linking will prevent double-counting. This transaction will remain visible but won't be included in income totals.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Itemization Field */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Itemization <span className="text-gray-500 dark:text-gray-400 text-xs font-normal">(Auto-generated from receipt)</span>
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px] dark:bg-gray-800 dark:text-gray-100"
                      value={formData.itemization}
                      onChange={(e) => setFormData({ ...formData, itemization: e.target.value })}
                      placeholder="Line items from receipt..."
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Documentation Form Fields */}
                  <Select
                    label="Document Type"
                    options={[
                      { value: 'payment_receipt', label: '💳 Payment Receipt (Account Payment)' },
                      { value: 'manifest', label: '📦 Manifest/Bill of Lading' },
                      { value: 'invoice', label: '📄 Invoice (Unpaid)' }
                    ]}
                    value={docFormData.documentType}
                    onChange={(e) => setDocFormData({ ...docFormData, documentType: e.target.value })}
                    required
                  />

                  <Input
                    label="Vendor"
                    value={docFormData.vendor}
                    onChange={(e) => setDocFormData({ ...docFormData, vendor: e.target.value })}
                    required
                  />

                  <Input
                    label="Date"
                    type="date"
                    value={docFormData.date}
                    onChange={(e) => setDocFormData({ ...docFormData, date: e.target.value })}
                  />

                  <Input
                    label="Amount"
                    type="number"
                    step="0.01"
                    value={docFormData.amount}
                    onChange={(e) => setDocFormData({ ...docFormData, amount: e.target.value })}
                    placeholder="Optional for manifests"
                  />

                  {/* Document Identifiers */}
                  <div className="space-y-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-2">Document Identifiers</p>
                    
                    <Input
                      label="Transaction Number"
                      value={docFormData.transactionNumber}
                      onChange={(e) => setDocFormData({ ...docFormData, transactionNumber: e.target.value })}
                      placeholder="Reference/Trans #"
                    />

                    <Input
                      label="Order Number"
                      value={docFormData.orderNumber}
                      onChange={(e) => setDocFormData({ ...docFormData, orderNumber: e.target.value })}
                      placeholder="PO/Order #"
                    />

                    <Input
                      label="Invoice Number"
                      value={docFormData.invoiceNumber}
                      onChange={(e) => setDocFormData({ ...docFormData, invoiceNumber: e.target.value })}
                      placeholder="Invoice #"
                    />

                    <Input
                      label="Account Number"
                      value={docFormData.accountNumber}
                      onChange={(e) => setDocFormData({ ...docFormData, accountNumber: e.target.value })}
                      placeholder="Account #"
                    />
                  </div>
                </>
              )}

              {/* Edit Recommendation Banner */}
              {hasEdits && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start gap-2">
                    <div className="text-blue-600 dark:text-blue-400 mt-0.5">💡</div>
                    <div className="flex-1 text-sm">
                      <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">
                        Changes Detected
                      </p>
                      <p className="text-blue-700 dark:text-blue-300">
                        Please add a detailed note below explaining why you made this change. 
                        This helps improve automatic categorization accuracy for similar transactions in the future.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes {hasEdits && <span className="text-blue-600 dark:text-blue-400 font-semibold">(Changelog - Recommended)</span>}
                </label>
                <textarea
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 min-h-[80px] transition-colors dark:bg-gray-800 dark:text-gray-100 ${
                    hasEdits 
                      ? 'border-blue-300 dark:border-blue-700 focus:ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                  }`}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={hasEdits 
                    ? "Explain what you changed and why (e.g., 'Changed from Materials to Tools because this vendor sells primarily power tools')" 
                    : "User notes and change log..."
                  }
                />
              </div>

              <div className="flex gap-2 mt-auto pt-4 border-t dark:border-gray-700">
                <Button onClick={handleInitiateSave} className="flex-1">
                  Save Changes
                </Button>
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-2 text-center text-sm text-gray-400 dark:text-gray-500">
          Use Ctrl+Scroll or pinch to zoom • Drag to pan • ESC to close
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {showConfirmation && pendingChanges && transaction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Confirm Changes
              </h2>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You've made the following changes to this transaction:
              </p>
              
              <div className="space-y-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
                {pendingChanges.dateChanged && (
                  <div className="flex items-start gap-2">
                    <span className="text-orange-600 dark:text-orange-400 font-semibold">📅</span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date:</span>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(transaction.date).toLocaleDateString()} → {new Date(formData.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}
                
                {pendingChanges.descriptionChanged && (
                  <div className="flex items-start gap-2">
                    <span className="text-orange-600 dark:text-orange-400 font-semibold">📝</span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Description:</span>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        "{transaction.description}" → "{formData.description}"
                      </div>
                    </div>
                  </div>
                )}
                
                {pendingChanges.amountChanged && (
                  <div className="flex items-start gap-2">
                    <span className="text-orange-600 dark:text-orange-400 font-semibold">💰</span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount:</span>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {formatCurrency(transaction.amount)} → {formatCurrency(parseFloat(formData.amount))}
                      </div>
                    </div>
                  </div>
                )}
                
                {pendingChanges.typeChanged && (
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">🔄</span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</span>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {transaction.type} → {formData.type}
                      </div>
                    </div>
                  </div>
                )}
                
                {pendingChanges.categoryChanged && (
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">🏷️</span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Category:</span>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {transaction.category.replace(/_/g, ' ')} → {formData.category.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                )}
                
                {pendingChanges.paymentMethodChanged && (
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 font-semibold">💳</span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method:</span>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {transaction.paymentMethod || 'Not specified'} → {formData.paymentMethod || 'Not specified'}
                      </div>
                    </div>
                  </div>
                )}
                
                {pendingChanges.notesChanged && (
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600 dark:text-purple-400 font-semibold">💡</span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes updated</span>
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 mb-4 font-medium">
                Would you like to mark this transaction as verified?
              </p>
              
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => handleConfirmedSave(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Save & Verify
                </Button>
                
                <Button 
                  onClick={() => handleConfirmedSave(false)}
                  variant="outline"
                  className="w-full"
                >
                  Save Without Verifying
                </Button>
                
                <Button 
                  onClick={() => setShowConfirmation(false)}
                  variant="outline"
                  className="w-full text-gray-600 dark:text-gray-400"
                >
                  Go Back
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank Statement Guidance Modal */}
      {transaction && (
        <BankStatementGuidanceModal
          isOpen={showBankStatementGuidance}
          onClose={() => setShowBankStatementGuidance(false)}
          transactionAmount={transaction.amount}
          transactionDate={transaction.date}
          isLargeAmount={transaction.amount >= 5000}
        />
      )}
    </div>
  )
}
