'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Upload, 
  Camera, 
  Loader2, 
  Check, 
  X, 
  Trash2, 
  Play,
  Pause,
  Settings,
  Image as ImageIcon,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { 
  ReceiptProcessorQueue, 
  ProcessedReceipt, 
  ExtractedReceiptData,
  ProcessingOptions 
} from '@/lib/receipt-processor'
import { getGlobalReceiptProcessor } from '@/lib/global-receipt-processor'

interface BatchReceiptScannerProps {
  onReceiptProcessed: (data: ExtractedReceiptData) => void
  onBatchComplete?: (count: number) => void  // Called when "Use All" completes
}

export function BatchReceiptScanner({ onReceiptProcessed, onBatchComplete }: BatchReceiptScannerProps) {
  const [queue, setQueue] = useState<ProcessedReceipt[]>([])
  const [stats, setStats] = useState({ pending: 0, processing: 0, done: 0, error: 0, total: 0 })
  const [showSettings, setShowSettings] = useState(false)
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null)
  const [options, setOptions] = useState<ProcessingOptions>({
    useSAM: false, // Disabled: too aggressive, crops out important receipt content
    enhanceContrast: true, // Always enabled automatically for better OCR results
    ocrMode: 'accurate', // Always use Gemini 3 Flash for best results
  })
  
  const processorRef = useRef<ReceiptProcessorQueue | null>(null)

  // Initialize processor - use global singleton that persists across navigation
  useEffect(() => {
    processorRef.current = getGlobalReceiptProcessor()
    
    // Update options if needed
    processorRef.current.setOptions(options)
    
    // Restore current state from processor
    setQueue(processorRef.current.getQueue())
    setStats(processorRef.current.getStats())
    
    processorRef.current.setOnProgress((receipt) => {
      setQueue(processorRef.current!.getQueue())
      setStats(processorRef.current!.getStats())
    })

    processorRef.current.setOnComplete((receipt) => {
      setQueue(processorRef.current!.getQueue())
      setStats(processorRef.current!.getStats())
    })

    // Don't destroy processor on unmount - let it continue in background
    return () => {
      console.log('[BATCH SCANNER] Component unmounting, processor continues in background')
    }
  }, [])

  // Update processor options when they change
  useEffect(() => {
    if (processorRef.current) {
      processorRef.current.setOptions(options)
    }
  }, [options])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0 && processorRef.current) {
      processorRef.current.addFiles(files)
      setQueue(processorRef.current.getQueue())
      setStats(processorRef.current.getStats())
    }
    e.target.value = ''
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length > 0 && processorRef.current) {
      processorRef.current.addFiles(files)
      setQueue(processorRef.current.getQueue())
      setStats(processorRef.current.getStats())
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleRemove = (id: string) => {
    if (processorRef.current) {
      processorRef.current.removeFromQueue(id)
      setQueue(processorRef.current.getQueue())
      setStats(processorRef.current.getStats())
    }
  }

  const handleClearCompleted = () => {
    if (processorRef.current) {
      processorRef.current.clearCompleted()
      setQueue(processorRef.current.getQueue())
      setStats(processorRef.current.getStats())
    }
  }

  const handleUseReceipt = (receipt: ProcessedReceipt) => {
    if (receipt.status === 'done') {
      onReceiptProcessed(receipt.extractedData)
      // Auto-clear receipt after use
      if (processorRef.current) {
        processorRef.current.removeFromQueue(receipt.id)
        setQueue(processorRef.current.getQueue())
        setStats(processorRef.current.getStats())
      }
    }
  }

  const handleUseAll = async () => {
    // Process receipts with small delays to avoid overwhelming the system
    const successfulReceipts = queue.filter(r => r.status === 'done')
    const failedReceipts = queue.filter(r => r.status === 'error')
    
    console.log(`Processing ${successfulReceipts.length} successful and ${failedReceipts.length} failed receipts`)
    
    // Process successful receipts with delay
    for (const receipt of successfulReceipts) {
      try {
        onReceiptProcessed(receipt.extractedData)
        // Small delay to prevent overwhelming localStorage/file system
        await new Promise(resolve => setTimeout(resolve, 50))
      } catch (error) {
        console.error('Error processing receipt:', error)
      }
    }
    
    // Process failed receipts - create placeholder receipts for manual entry
    for (const receipt of failedReceipts) {
      try {
        onReceiptProcessed({
          vendor: receipt.originalFile.name.replace(/\.(jpg|jpeg|png|heic|heif|webp)$/i, ''),
          amount: null,
          date: new Date().toISOString().split('T')[0],
          rawText: receipt.error || 'OCR processing failed',
          imageData: receipt.processedImageUrl || '',
          ocrFailed: true
        } as any)
        await new Promise(resolve => setTimeout(resolve, 50))
      } catch (error) {
        console.error('Error processing failed receipt:', error)
      }
    }
    
    const totalProcessed = successfulReceipts.length + failedReceipts.length
    console.log(`All ${totalProcessed} receipts processed`)
    
    // Notify parent about batch completion for XP award
    if (onBatchComplete && totalProcessed > 0) {
      onBatchComplete(totalProcessed)
    }
    
    handleClearCompleted()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Batch Receipt Scanner
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
            (Auto-contrast enabled)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Upload Area */}
        <div 
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer dark:bg-gray-800/50"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => document.getElementById('batch-receipt-upload')?.click()}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="batch-receipt-upload"
          />
          <Upload className="h-10 w-10 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">Drop receipt images here</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">or click to select files (batch supported)</p>
        </div>

        {/* Stats Bar */}
        {stats.total > 0 && (
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-4 text-sm">
              {stats.pending > 0 && (
                <span className="text-gray-600 dark:text-gray-400">{stats.pending} pending</span>
              )}
              {stats.processing > 0 && (
                <span className="text-blue-600 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {stats.processing} processing
                </span>
              )}
              {stats.done > 0 && (
                <span className="text-green-600">{stats.done} complete</span>
              )}
              {stats.error > 0 && (
                <span className="text-red-600">{stats.error} failed</span>
              )}
            </div>
            <div className="flex gap-2">
              {stats.done > 0 && (
                <>
                  <Button size="sm" onClick={handleUseAll}>
                    Add All {stats.done} Receipts
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleClearCompleted}>
                    Clear Done
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Queue List */}
        {queue.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {queue.map(receipt => (
              <div 
                key={receipt.id}
                className={`border rounded-lg overflow-hidden transition-all ${
                  receipt.status === 'done' ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20' :
                  receipt.status === 'error' ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20' :
                  receipt.status === 'processing' ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20' :
                  'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                }`}
              >
                {/* Header */}
                <div className="flex items-center gap-3 p-3">
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded bg-white dark:bg-gray-700 border dark:border-gray-600 flex-shrink-0 overflow-hidden">
                    {receipt.processedImageUrl ? (
                      <img 
                        src={receipt.processedImageUrl} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-300 dark:text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">{receipt.originalFile.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(receipt.originalFile.size)}
                      {receipt.status === 'done' && receipt.extractedData.vendor && (
                        <span className="ml-2">• {receipt.extractedData.vendor}</span>
                      )}
                    </p>
                    {receipt.status === 'processing' && (
                      <div className="mt-1">
                        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                          <span>{receipt.progressStatus}</span>
                        </div>
                        <div className="h-1 bg-blue-200 dark:bg-blue-900 rounded-full mt-1 overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all"
                            style={{ width: `${receipt.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {receipt.status === 'error' && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{receipt.error}</p>
                    )}
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {receipt.status === 'processing' && (
                      <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    )}
                    {receipt.status === 'done' && (
                      <>
                        <Check className="h-5 w-5 text-green-500" />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExpandedReceipt(
                            expandedReceipt === receipt.id ? null : receipt.id
                          )}
                        >
                          {expandedReceipt === receipt.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUseReceipt(receipt)}
                        >
                          Use
                        </Button>
                      </>
                    )}
                    {receipt.status === 'error' && (
                      <X className="h-5 w-5 text-red-500" />
                    )}
                    {receipt.status !== 'processing' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemove(receipt.id)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedReceipt === receipt.id && receipt.status === 'done' && (
                  <div className="border-t border-green-200 dark:border-green-800 p-4 bg-white dark:bg-gray-900">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Processed Image */}
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Processed Image</p>
                        <img 
                          src={receipt.processedImageUrl} 
                          alt="Processed receipt"
                          className="w-full rounded border"
                        />
                      </div>

                      {/* Extracted Data */}
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Vendor</p>
                          <p className="font-medium">{receipt.extractedData.vendor}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Total</p>
                            <p className="font-medium">
                              {receipt.extractedData.amount 
                                ? `$${receipt.extractedData.amount.toFixed(2)}`
                                : 'Not detected'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Date</p>
                            <p>{receipt.extractedData.date}</p>
                          </div>
                        </div>
                        {(receipt.extractedData.subtotal || receipt.extractedData.tax) && (
                          <div className="grid grid-cols-2 gap-2">
                            {receipt.extractedData.subtotal && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Subtotal</p>
                                <p>${receipt.extractedData.subtotal.toFixed(2)}</p>
                              </div>
                            )}
                            {receipt.extractedData.tax !== undefined && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Tax</p>
                                <p>${receipt.extractedData.tax.toFixed(2)}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {receipt.extractedData.paymentMethod && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Payment</p>
                            <p>{receipt.extractedData.paymentMethod}</p>
                          </div>
                        )}
                        {receipt.extractedData.lineItems && receipt.extractedData.lineItems.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">
                              Items ({receipt.extractedData.lineItems.length})
                            </p>
                            <div className="text-xs space-y-1 max-h-24 overflow-y-auto">
                              {receipt.extractedData.lineItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between">
                                  <span className="truncate">{item.description}</span>
                                  <span className="ml-2">${item.amount.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {queue.length === 0 && (
          <p className="text-center text-gray-400 dark:text-gray-300 text-sm py-4">
            No receipts in queue. Upload images to get started.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default BatchReceiptScanner
