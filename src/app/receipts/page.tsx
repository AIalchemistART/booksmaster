'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useStore, generateId } from '@/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Camera, Upload, Trash2, Link2, ExternalLink, Scan, Loader2, Layers } from 'lucide-react'
import type { Receipt } from '@/types'
import type { ExtractedReceiptData } from '@/lib/receipt-processor'
import { useFileSystemCheck } from '@/hooks/useFileSystemCheck'
import { FileSystemRequiredModal } from '@/components/modals/FileSystemRequiredModal'
import { useGeminiApiKeyCheck } from '@/hooks/useGeminiApiKeyCheck'
import { GeminiApiKeyRequiredModal } from '@/components/modals/GeminiApiKeyRequiredModal'

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
  const { receipts, addReceipt, deleteReceipt, updateReceipt } = useStore()
  const { showModal: showFileSystemModal, requireFileSystem, handleSetupComplete: handleFileSystemSetup, handleCancel: handleFileSystemCancel } = useFileSystemCheck()
  const { showModal: showGeminiModal, requireGeminiApiKey, handleSetupComplete: handleGeminiSetup, handleSkip: handleGeminiSkip } = useGeminiApiKeyCheck()
  const [showForm, setShowForm] = useState(false)
  const [showOCR, setShowOCR] = useState(false)
  const [searchVendor, setSearchVendor] = useState('')
  const [minAmount, setMinAmount] = useState(0)
  const [maxAmount, setMaxAmount] = useState(1000)
  const [selectedVendors, setSelectedVendors] = useState<string[]>([])
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

  const handleSubmit = (e: React.FormEvent) => {
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
    resetForm()
  }

  const handleBatchReceiptProcessed = (data: ExtractedReceiptData) => {
    // Add receipt directly from batch scanner
    const newReceipt: Receipt = {
      id: generateId(),
      driveFileId: `ocr-${generateId()}`,
      driveUrl: '',
      imageData: data.imageData,
      ocrVendor: data.vendor,
      ocrAmount: data.amount || undefined,
      ocrDate: data.date,
      ocrTime: data.time,
      ocrSubtotal: data.subtotal,
      ocrTax: data.tax,
      ocrLineItems: data.lineItems,
      ocrPaymentMethod: data.paymentMethod,
      ocrStoreId: data.storeId,
      ocrTransactionId: data.transactionId,
      ocrRawText: data.rawText,
      processedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
    addReceipt(newReceipt)
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

  // Get unique vendors with counts
  const vendorCounts = receipts.reduce((acc, r) => {
    const vendor = r.ocrVendor || 'Unknown'
    acc[vendor] = (acc[vendor] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Filter receipts
  const filteredReceipts = receipts.filter(r => {
    const amount = r.ocrAmount || 0
    const vendor = (r.ocrVendor || 'Unknown').toLowerCase()
    const matchesSearch = vendor.includes(searchVendor.toLowerCase())
    const matchesAmount = amount >= minAmount && amount <= maxAmount
    const matchesVendor = selectedVendors.length === 0 || selectedVendors.includes(r.ocrVendor || 'Unknown')
    
    return matchesSearch && matchesAmount && matchesVendor
  })

  const toggleVendorFilter = (vendor: string) => {
    setSelectedVendors(prev => 
      prev.includes(vendor) 
        ? prev.filter(v => v !== vendor)
        : [...prev, vendor]
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Receipts</h1>
          <p className="text-gray-600 mt-1">Manage receipts with OCR auto-extraction</p>
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
          <Button onClick={() => requireFileSystem(() => setShowForm(true))}>
            <Upload className="h-4 w-4 mr-2" />
            Add Manual
          </Button>
        </div>
      </div>

      {/* Batch Receipt Scanner */}
      {showOCR && (
        <div className="mb-8">
          <BatchReceiptScanner onReceiptProcessed={handleBatchReceiptProcessed} />
        </div>
      )}

      {/* Search and Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search & Filter Receipts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Search by Vendor"
              placeholder="Type vendor name..."
              value={searchVendor}
              onChange={(e) => setSearchVendor(e.target.value)}
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Amount Range: {formatCurrency(minAmount)} - {formatCurrency(maxAmount)}
              </label>
              <div className="flex gap-4 items-center">
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="10"
                  value={minAmount}
                  onChange={(e) => setMinAmount(Number(e.target.value))}
                  className="flex-1"
                />
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="10"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(Number(e.target.value))}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Vendor Filter Bubbles */}
          {Object.keys(vendorCounts).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Vendor ({Object.keys(vendorCounts).length} unique)
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(vendorCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([vendor, count]) => (
                    <button
                      key={vendor}
                      onClick={() => toggleVendorFilter(vendor)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedVendors.includes(vendor)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {vendor} ({count})
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t">
            <p className="text-sm text-gray-600">
              Showing {filteredReceipts.length} of {receipts.length} receipts
            </p>
            {(searchVendor || selectedVendors.length > 0 || minAmount > 0 || maxAmount < 1000) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchVendor('')
                  setSelectedVendors([])
                  setMinAmount(0)
                  setMaxAmount(1000)
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

      {/* Receipts Grid */}
      {receipts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Camera className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No receipts yet</h3>
            <p className="text-gray-500 mb-4">
              Start by uploading receipt photos to Google Drive and linking them here.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Add Your First Receipt
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReceipts.map((receipt) => (
            <Card key={receipt.id} className="overflow-hidden">
              <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
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
                {receipt.driveUrl && (
                  <a
                    href={receipt.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 p-2 bg-white rounded-full shadow hover:bg-gray-100"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {receipt.ocrVendor && (
                    <p className="font-medium">{receipt.ocrVendor}</p>
                  )}
                  <div className="flex items-baseline justify-between">
                    {receipt.ocrAmount && (
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(receipt.ocrAmount)}
                      </p>
                    )}
                    {receipt.ocrPaymentMethod && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
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
                  
                  {/* Line items preview */}
                  {receipt.ocrLineItems && receipt.ocrLineItems.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                        {receipt.ocrLineItems.length} item{receipt.ocrLineItems.length > 1 ? 's' : ''}
                      </summary>
                      <div className="mt-1 space-y-1 max-h-24 overflow-y-auto bg-gray-50 p-2 rounded">
                        {receipt.ocrLineItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
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
    </div>
  )
}
