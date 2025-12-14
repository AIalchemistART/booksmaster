'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useStore, generateId } from '@/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Camera, Upload, Trash2, Link2, ExternalLink, Scan, Loader2 } from 'lucide-react'
import type { Receipt } from '@/types'

// Dynamic import with SSR disabled to avoid ONNX runtime issues
const ReceiptOCR = dynamic(
  () => import('@/components/ocr/ReceiptOCR').then((mod) => mod.ReceiptOCR),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading scanner...</span>
      </div>
    )
  }
)

export default function ReceiptsPage() {
  const { receipts, addReceipt, deleteReceipt, updateReceipt } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [showOCR, setShowOCR] = useState(false)
  const [formData, setFormData] = useState({
    driveUrl: '',
    ocrVendor: '',
    ocrAmount: '',
    ocrDate: '',
  })

  const resetForm = () => {
    setFormData({
      driveUrl: '',
      ocrVendor: '',
      ocrAmount: '',
      ocrDate: '',
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
      ocrVendor: formData.ocrVendor || undefined,
      ocrAmount: formData.ocrAmount ? parseFloat(formData.ocrAmount) : undefined,
      ocrDate: formData.ocrDate || undefined,
      createdAt: new Date().toISOString(),
    }
    
    addReceipt(newReceipt)
    resetForm()
  }

  const handleOCRExtracted = (data: { 
    vendor: string
    amount: number | null
    date: string
    rawText: string
    imageData?: string
    time?: string
    subtotal?: number
    tax?: number
    lineItems?: { description: string; amount: number; sku?: string }[]
    paymentMethod?: string
    storeId?: string
    transactionId?: string
  }) => {
    // Add receipt directly from OCR scan (no Google Drive URL needed)
    const newReceipt: Receipt = {
      id: generateId(),
      driveFileId: `ocr-${generateId()}`, // Placeholder for OCR-scanned receipts
      driveUrl: '', // No Drive URL for direct scans
      imageData: data.imageData, // Store the scanned image
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
    setShowOCR(false) // Close scanner after adding
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

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Receipts</h1>
          <p className="text-gray-600 mt-1">Manage receipts with OCR auto-extraction</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowOCR(!showOCR)}>
            <Scan className="h-4 w-4 mr-2" />
            Scan Receipt
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Add Manual
          </Button>
        </div>
      </div>

      {/* OCR Scanner */}
      {showOCR && (
        <div className="mb-8">
          <ReceiptOCR onExtracted={handleOCRExtracted} />
        </div>
      )}

      {/* Instructions */}
      <Card className="mb-8 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-2">Two Ways to Add Receipts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-blue-800 mb-1">Option 1: Scan with OCR</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Click Scan Receipt above</li>
                <li>Take a photo or upload an image</li>
                <li>OCR will auto-extract vendor, amount, date</li>
                <li>Review and save</li>
              </ol>
            </div>
            <div>
              <p className="font-medium text-blue-800 mb-1">Option 2: Google Drive Link</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Upload receipt to Google Drive</li>
                <li>Get shareable link (Anyone with link)</li>
                <li>Click Add Manual and paste link</li>
                <li>Fill in details manually</li>
              </ol>
            </div>
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
                  label="Vendor (optional)"
                  placeholder="Store name"
                  value={formData.ocrVendor}
                  onChange={(e) => setFormData({ ...formData, ocrVendor: e.target.value })}
                />
                <Input
                  label="Amount (optional)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.ocrAmount}
                  onChange={(e) => setFormData({ ...formData, ocrAmount: e.target.value })}
                />
                <Input
                  label="Date (optional)"
                  type="date"
                  value={formData.ocrDate}
                  onChange={(e) => setFormData({ ...formData, ocrDate: e.target.value })}
                />
              </div>
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
          {receipts.map((receipt) => (
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
    </div>
  )
}
