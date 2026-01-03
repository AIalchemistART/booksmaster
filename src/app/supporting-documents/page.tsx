'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useStore, generateId } from '@/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FileText, ExternalLink, Search, Link2, Edit2, ZoomIn, ZoomOut, RotateCw, X, ArrowRight, ChevronLeft, ChevronRight, Save, Trash2 } from 'lucide-react'
import type { Receipt, Transaction, TransactionCategory } from '@/types'
import { findItemizedReceiptForPayment, linkAllReceipts } from '@/lib/document-linking'
import { FirstVisitIntro, useFirstVisit } from '@/components/gamification/FirstVisitIntro'

export default function SupportingDocumentsPage() {
  const { receipts, updateReceipt, deleteReceipt, addTransaction, transactions, completeAction, unlockAchievement } = useStore()
  const { showIntro, closeIntro } = useFirstVisit('supporting-documents')
  const [searchVendor, setSearchVendor] = useState('')
  const [selectedType, setSelectedType] = useState<'all' | 'payment_receipt' | 'manifest'>('all')
  
  // Modal state for viewing/editing documents
  const [viewingDoc, setViewingDoc] = useState<Receipt | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  // Edit form state
  const [editFormData, setEditFormData] = useState({
    documentType: '',
    vendor: '',
    amount: '',
    date: '',
    transactionNumber: '',
    orderNumber: '',
    invoiceNumber: '',
    accountNumber: '',
    notes: '',
    isSupplementalDoc: true
  })

  // Filter to only supporting documents (payment receipts, manifests)
  const supportingDocs = useMemo(() => {
    return receipts.filter((r: Receipt) => 
      r.documentType === 'payment_receipt' || 
      r.documentType === 'manifest' ||
      r.isSupplementalDoc
    )
  }, [receipts])

  // Apply filters
  const filteredDocs = useMemo(() => {
    let filtered = supportingDocs

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter((r: Receipt) => r.documentType === selectedType)
    }

    // Filter by vendor search
    if (searchVendor.trim()) {
      const search = searchVendor.toLowerCase()
      filtered = filtered.filter((r: Receipt) => 
        r.ocrVendor?.toLowerCase().includes(search)
      )
    }

    // Sort by date (newest first)
    filtered.sort((a: Receipt, b: Receipt) => {
      const dateA = a.ocrDate || a.createdAt
      const dateB = b.ocrDate || b.createdAt
      return dateB.localeCompare(dateA)
    })

    return filtered
  }, [supportingDocs, selectedType, searchVendor])

  // Get linked document by ID
  const getLinkedDocument = (id: string): Receipt | undefined => {
    return receipts.find((r: Receipt) => r.id === id)
  }

  // Open document viewer modal
  const openDocViewer = (doc: Receipt) => {
    setViewingDoc(doc)
    setZoom(1)
    setRotation(0)
    setEditMode(false)
    setEditFormData({
      documentType: doc.documentType || 'payment_receipt',
      vendor: doc.ocrVendor || '',
      amount: doc.ocrAmount !== undefined ? doc.ocrAmount.toString() : '',
      date: doc.ocrDate || '',
      transactionNumber: doc.transactionNumber || '',
      orderNumber: doc.orderNumber || '',
      invoiceNumber: doc.invoiceNumber || '',
      accountNumber: doc.accountNumber || '',
      notes: '',
      isSupplementalDoc: doc.isSupplementalDoc !== false
    })
  }

  // Close modal
  const closeDocViewer = () => {
    setViewingDoc(null)
    setEditMode(false)
  }

  // Save document edits
  const saveEdit = () => {
    if (!viewingDoc) return
    
    // Check if user is unchecking "Keep as supplemental" - should convert to transaction
    const wasSupplemental = viewingDoc.isSupplementalDoc
    const nowNotSupplemental = !editFormData.isSupplementalDoc
    
    updateReceipt(viewingDoc.id, {
      documentType: editFormData.documentType as Receipt['documentType'],
      ocrVendor: editFormData.vendor || undefined,
      ocrAmount: parseFloat(editFormData.amount) || undefined,
      ocrDate: editFormData.date || undefined,
      transactionNumber: editFormData.transactionNumber || undefined,
      orderNumber: editFormData.orderNumber || undefined,
      invoiceNumber: editFormData.invoiceNumber || undefined,
      accountNumber: editFormData.accountNumber || undefined,
      isSupplementalDoc: editFormData.isSupplementalDoc
    })
    
    // If unchecking supplemental, convert to transaction
    if (wasSupplemental && nowNotSupplemental && !viewingDoc.linkedTransactionId) {
      const transactionId = generateId()
      const now = new Date().toISOString()
      
      const newTransaction: Transaction = {
        id: transactionId,
        date: editFormData.date || new Date().toISOString().split('T')[0],
        amount: parseFloat(editFormData.amount) || 0,
        description: editFormData.vendor || 'Converted from document',
        type: 'expense',
        category: 'other' as TransactionCategory,
        receiptId: viewingDoc.id,
        createdAt: now,
        updatedAt: now,
        wasManuallyEdited: false,
      }
      
      addTransaction(newTransaction)
      updateReceipt(viewingDoc.id, { 
        linkedTransactionId: transactionId,
        isSupplementalDoc: false 
      })
      
      completeAction('linkReceiptToTransaction')
    }
    
    setEditMode(false)
    // Refresh viewing doc with updated data
    const updatedDoc = receipts.find((r: Receipt) => r.id === viewingDoc.id)
    if (updatedDoc) setViewingDoc(updatedDoc)
  }

  // Convert supplemental doc to transaction
  const convertToTransaction = () => {
    if (!viewingDoc) return
    
    const now = new Date().toISOString()
    const transactionId = generateId()
    
    const newTransaction: Transaction = {
      id: transactionId,
      date: viewingDoc.ocrDate || new Date().toISOString().split('T')[0],
      amount: viewingDoc.ocrAmount ?? 0,
      description: viewingDoc.ocrVendor || 'Converted from document',
      type: 'expense',
      category: 'other' as TransactionCategory,
      receiptId: viewingDoc.id,
      createdAt: now,
      updatedAt: now,
      wasManuallyEdited: false,
    }
    
    addTransaction(newTransaction)
    // Remove from supplemental docs by setting isSupplementalDoc to false
    updateReceipt(viewingDoc.id, { 
      linkedTransactionId: transactionId,
      isSupplementalDoc: false 
    })
    
    // Check if this was the first supplemental doc
    const suppDocsCount = receipts.filter(r => r.isSupplementalDoc).length
    if (suppDocsCount === 1) {
      unlockAchievement('supporting_docs')
    }
    
    // Award XP for linking
    completeAction('linkReceiptToTransaction')
    
    // Close viewer - the document will no longer appear in Supporting Documents list
    closeDocViewer()
  }

  // Try to auto-link document to existing receipt
  const tryAutoLink = () => {
    if (!viewingDoc) return
    
    const match = findItemizedReceiptForPayment(viewingDoc, receipts)
    if (match) {
      updateReceipt(viewingDoc.id, {
        primaryDocumentId: match.id,
        linkedDocumentIds: [match.id]
      })
      
      // Update the matched receipt too
      const existingLinks = match.linkedDocumentIds || []
      updateReceipt(match.id, {
        linkedDocumentIds: [...existingLinks, viewingDoc.id]
      })
      
      // Refresh viewing doc
      const updatedDoc = receipts.find((r: Receipt) => r.id === viewingDoc.id)
      if (updatedDoc) setViewingDoc(updatedDoc)
      
      alert(`Successfully linked to ${match.ocrVendor} receipt!`)
    } else {
      alert('No matching receipt found. Try adjusting the transaction/order numbers or vendor name.')
    }
  }

  // Navigate between documents
  const currentDocIndex = viewingDoc ? filteredDocs.findIndex((d: Receipt) => d.id === viewingDoc.id) : -1
  const hasPreviousDoc = currentDocIndex > 0
  const hasNextDoc = currentDocIndex >= 0 && currentDocIndex < filteredDocs.length - 1

  const navigatePrevious = () => {
    if (hasPreviousDoc) {
      openDocViewer(filteredDocs[currentDocIndex - 1])
    }
  }

  const navigateNext = () => {
    if (hasNextDoc) {
      openDocViewer(filteredDocs[currentDocIndex + 1])
    }
  }

  const getThumbnailUrl = (fileId: string) => {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <FirstVisitIntro tabId="supporting-documents" isVisible={showIntro} onClose={closeIntro} />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Supporting Documents</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Payment confirmations, manifests, and other supplemental documentation
        </p>
      </div>

      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          <strong>Note:</strong> These documents are not counted as expenses. Payment receipts can be linked to their corresponding itemized receipts when matching transaction IDs are found. 
          Manifests and bills of lading are kept for reference only.
        </p>
        <p className="text-sm text-blue-900 dark:text-blue-200 mt-2">
          <strong>💡 Tip:</strong> If a payment receipt (like a bank deposit slip or credit card statement) is your <em>only</em> documentation for an expense, you can convert it to a transaction using the <strong>Convert to Transaction</strong> button in the document details panel.
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Document Type
              </label>
              <div className="flex gap-2">
                <Button
                  variant={selectedType === 'all' ? 'primary' : 'outline'}
                  onClick={() => setSelectedType('all')}
                  className="flex-1"
                >
                  All ({supportingDocs.length})
                </Button>
                <Button
                  variant={selectedType === 'payment_receipt' ? 'primary' : 'outline'}
                  onClick={() => setSelectedType('payment_receipt')}
                  className="flex-1"
                >
                  Payments ({supportingDocs.filter((d: Receipt) => d.documentType === 'payment_receipt').length})
                </Button>
                <Button
                  variant={selectedType === 'manifest' ? 'primary' : 'outline'}
                  onClick={() => setSelectedType('manifest')}
                  className="flex-1"
                >
                  Manifests ({supportingDocs.filter((d: Receipt) => d.documentType === 'manifest').length})
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <Input
                label="Search by Vendor"
                placeholder="Search vendor names..."
                value={searchVendor}
                onChange={(e) => setSearchVendor(e.target.value)}
              />
              <Search className="h-4 w-4 absolute right-3 top-9 text-gray-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Type Explanation */}
      {selectedType === 'payment_receipt' && (
        <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <p className="text-sm text-purple-900 dark:text-purple-200">
            <strong>💳 Payment Receipts</strong> are supporting documentation like bank deposit slips, credit card confirmations, 
            or on-account payment records. These are <em>not</em> the same as expense transactions—they verify that a payment was made. 
            If you have a corresponding itemized receipt, link these together. If this is your only proof of purchase, 
            it may be counted as an expense, but itemized receipts provide stronger documentation.
          </p>
        </div>
      )}
      {selectedType === 'manifest' && (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            <strong>📦 Manifests</strong> are shipping documents, bills of lading, packing slips, or delivery confirmations. 
            These documents verify what items were ordered or delivered but typically don't show prices. 
            Keep them for reference and to match against itemized receipts when verifying large orders.
          </p>
        </div>
      )}
      {selectedType === 'all' && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>📁 All Supporting Documents</strong> includes payment confirmations, manifests, and other supplemental records. 
            These documents support your primary itemized receipts but are not counted as expenses on their own. 
            Use the filters above to view specific document types.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {supportingDocs.filter((d: Receipt) => d.documentType === 'payment_receipt').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Payment Receipts</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {supportingDocs.filter((d: Receipt) => d.documentType === 'manifest').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manifests</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                {supportingDocs.filter((d: Receipt) => d.linkedDocumentIds && d.linkedDocumentIds.length > 0).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Linked Documents</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Grid */}
      {filteredDocs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {supportingDocs.length === 0 ? 'No supporting documents yet' : 'No documents match your filters'}
            </h3>
            <p className="text-gray-500 dark:text-gray-300 mb-4">
              {supportingDocs.length === 0 
                ? 'Payment receipts and manifests will appear here automatically when detected by AI.'
                : 'Try adjusting your filters to see more documents.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc: Receipt) => {
            const linkedDoc = doc.primaryDocumentId ? getLinkedDocument(doc.primaryDocumentId) : null
            
            return (
              <Card key={doc.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => openDocViewer(doc)}>
                <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                  {doc.imageData ? (
                    <img
                      src={doc.imageData}
                      alt="Document"
                      className="w-full h-full object-cover"
                    />
                  ) : doc.driveFileId && !doc.driveFileId.startsWith('ocr-') ? (
                    <img
                      src={getThumbnailUrl(doc.driveFileId)}
                      alt="Document"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <FileText className="h-16 w-16" />
                    </div>
                  )}
                  {/* Edit button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); openDocViewer(doc); setEditMode(true); }}
                    className="absolute top-2 left-2 p-2 bg-white dark:bg-gray-800 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {doc.driveUrl && (
                    <a
                      href={doc.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-2 right-2 p-2 bg-white dark:bg-gray-800 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {/* Document Type Badge */}
                    <div className={`px-2 py-1 text-xs font-semibold rounded flex items-center gap-1 ${
                      doc.documentType === 'payment_receipt' 
                        ? 'bg-purple-100 border border-purple-300 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-200' 
                        : 'bg-amber-100 border border-amber-300 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200'
                    }`}>
                      <span>
                        {doc.documentType === 'payment_receipt' ? '💳 Payment Receipt' : '📦 Manifest/Bill of Lading'}
                      </span>
                    </div>

                    {doc.ocrVendor && (
                      <p className="font-medium text-gray-900 dark:text-gray-100">{doc.ocrVendor}</p>
                    )}
                    
                    {doc.ocrAmount && (
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {formatCurrency(doc.ocrAmount)}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      {doc.ocrDate && <span>{formatDate(doc.ocrDate)}</span>}
                      {doc.ocrTime && <span>• {doc.ocrTime}</span>}
                    </div>

                    {/* Linked Document Info */}
                    {linkedDoc && (
                      <div className="mt-3 p-2 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded">
                        <div className="flex items-start gap-2">
                          <Link2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-cyan-900 dark:text-cyan-200">
                              Linked to Expense Receipt:
                            </p>
                            <p className="text-xs text-cyan-700 dark:text-cyan-300 truncate">
                              {linkedDoc.ocrVendor} - {linkedDoc.ocrAmount ? formatCurrency(linkedDoc.ocrAmount) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Document Identifiers */}
                    {(doc.transactionNumber || doc.orderNumber || doc.accountNumber) && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        {doc.transactionNumber && (
                          <div className="flex justify-between">
                            <span className="font-medium">Transaction #:</span>
                            <span className="font-mono">{doc.transactionNumber}</span>
                          </div>
                        )}
                        {doc.orderNumber && (
                          <div className="flex justify-between">
                            <span className="font-medium">Order #:</span>
                            <span className="font-mono">{doc.orderNumber}</span>
                          </div>
                        )}
                        {doc.accountNumber && (
                          <div className="flex justify-between">
                            <span className="font-medium">Account #:</span>
                            <span className="font-mono">{doc.accountNumber}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black/80 z-50 flex">
          {/* Close button */}
          <button
            onClick={closeDocViewer}
            className="absolute top-4 right-4 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation buttons */}
          {hasPreviousDoc && (
            <button
              onClick={navigatePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white dark:bg-gray-800 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {hasNextDoc && (
            <button
              onClick={navigateNext}
              className="absolute right-[25rem] top-1/2 -translate-y-1/2 z-10 p-3 bg-white dark:bg-gray-800 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Image viewer */}
          <div 
            className="flex-1 flex items-center justify-center p-8 overflow-hidden relative cursor-move"
            onWheel={(e) => {
              e.preventDefault()
              const delta = -e.deltaY * 0.001
              setZoom(prev => Math.max(0.5, Math.min(5, prev + delta)))
            }}
            onMouseDown={(e) => {
              setIsDragging(true)
              setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
            }}
            onMouseMove={(e) => {
              if (isDragging) {
                setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
              }
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            <div
              style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                transition: isDragging ? 'none' : 'transform 0.2s ease'
              }}
              className="max-w-full max-h-full"
            >
              <div
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center',
                  transition: 'transform 0.2s ease'
                }}
              >
                {viewingDoc.imageData ? (
                  <img
                    src={viewingDoc.imageData}
                    alt="Document"
                    className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                    draggable={false}
                  />
                ) : (
                  <div className="w-96 h-96 bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-lg">
                    <FileText className="h-24 w-24 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full shadow px-4 py-2">
            <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <ZoomOut className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium w-16 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(Math.min(3, zoom + 0.25))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <ZoomIn className="h-5 w-5" />
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
            <button onClick={() => setRotation((rotation + 90) % 360)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <RotateCw className="h-5 w-5" />
            </button>
          </div>

          {/* Side panel for editing */}
          <div className="w-96 bg-white dark:bg-gray-900 h-full overflow-y-auto p-6 border-l dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {editMode ? 'Edit Document' : 'Document Details'}
              </h2>
              <Button
                variant={editMode ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setEditMode(!editMode)}
              >
                <Edit2 className="h-4 w-4 mr-1" />
                {editMode ? 'Cancel' : 'Edit'}
              </Button>
            </div>

            {editMode ? (
              <div className="space-y-4">
                <Select
                  label="Document Type"
                  options={[
                    { value: 'payment_receipt', label: '💳 Payment Receipt' },
                    { value: 'bank_deposit_receipt', label: '🏦 Bank Deposit Receipt' },
                    { value: 'manifest', label: '📦 Manifest/Bill of Lading' }
                  ]}
                  value={editFormData.documentType}
                  onChange={(e) => setEditFormData({ ...editFormData, documentType: e.target.value })}
                />
                <Input
                  label="Vendor"
                  value={editFormData.vendor}
                  onChange={(e) => setEditFormData({ ...editFormData, vendor: e.target.value })}
                />
                <Input
                  label="Amount"
                  type="number"
                  step="0.01"
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                />
                <Input
                  label="Date"
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                />
                <Input
                  label="Transaction #"
                  value={editFormData.transactionNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, transactionNumber: e.target.value })}
                />
                <Input
                  label="Order #"
                  value={editFormData.orderNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, orderNumber: e.target.value })}
                />
                <Input
                  label="Invoice #"
                  value={editFormData.invoiceNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, invoiceNumber: e.target.value })}
                />
                <Input
                  label="Account #"
                  value={editFormData.accountNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, accountNumber: e.target.value })}
                />
                
                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="isSupplemental"
                    checked={editFormData.isSupplementalDoc}
                    onChange={(e) => setEditFormData({ ...editFormData, isSupplementalDoc: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="isSupplemental" className="text-sm text-gray-700 dark:text-gray-300">
                    Keep as supplemental (non-expense)
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={saveEdit} className="flex-1">
                    <Save className="h-4 w-4 mr-1" />
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Display fields */}
                <div className={`px-3 py-2 rounded text-sm font-semibold ${
                  viewingDoc.documentType === 'payment_receipt' 
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200' 
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                }`}>
                  {viewingDoc.documentType === 'payment_receipt' ? '💳 Payment Receipt' : '📦 Manifest'}
                </div>

                {viewingDoc.ocrVendor && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Vendor</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{viewingDoc.ocrVendor}</p>
                  </div>
                )}

                {viewingDoc.ocrAmount !== undefined && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Amount</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(viewingDoc.ocrAmount)}</p>
                  </div>
                )}

                {viewingDoc.ocrDate && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(viewingDoc.ocrDate)}</p>
                  </div>
                )}

                {/* Document Identifiers */}
                {(viewingDoc.transactionNumber || viewingDoc.orderNumber || viewingDoc.invoiceNumber || viewingDoc.accountNumber) && (
                  <div className="border-t dark:border-gray-700 pt-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Identifiers</p>
                    {viewingDoc.transactionNumber && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Transaction #:</span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">{viewingDoc.transactionNumber}</span>
                      </div>
                    )}
                    {viewingDoc.orderNumber && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Order #:</span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">{viewingDoc.orderNumber}</span>
                      </div>
                    )}
                    {viewingDoc.invoiceNumber && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Invoice #:</span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">{viewingDoc.invoiceNumber}</span>
                      </div>
                    )}
                    {viewingDoc.accountNumber && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Account #:</span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">{viewingDoc.accountNumber}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Linked Document */}
                {viewingDoc.primaryDocumentId && (
                  <div className="border-t dark:border-gray-700 pt-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Linked To</p>
                    {(() => {
                      const linked = getLinkedDocument(viewingDoc.primaryDocumentId)
                      return linked ? (
                        <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded">
                          <p className="font-medium text-cyan-900 dark:text-cyan-200">{linked.ocrVendor}</p>
                          <p className="text-sm text-cyan-700 dark:text-cyan-300">{linked.ocrAmount ? formatCurrency(linked.ocrAmount) : 'N/A'}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Document not found</p>
                      )
                    })()}
                  </div>
                )}

                {/* Actions */}
                <div className="border-t dark:border-gray-700 pt-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Actions</p>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={tryAutoLink}
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Try Auto-Link to Receipt
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={convertToTransaction}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Convert to Transaction
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => {
                      if (confirm('Delete this document?')) {
                        deleteReceipt(viewingDoc.id)
                        closeDocViewer()
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Document
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
