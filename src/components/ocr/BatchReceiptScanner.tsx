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

interface BatchReceiptScannerProps {
  onReceiptProcessed: (data: ExtractedReceiptData) => void
}

export function BatchReceiptScanner({ onReceiptProcessed }: BatchReceiptScannerProps) {
  const [queue, setQueue] = useState<ProcessedReceipt[]>([])
  const [stats, setStats] = useState({ pending: 0, processing: 0, done: 0, error: 0, total: 0 })
  const [showSettings, setShowSettings] = useState(false)
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null)
  const [options, setOptions] = useState<ProcessingOptions>({
    useSAM: false, // Disabled: too aggressive, crops out important receipt content
    enhanceContrast: true,
    autoCrop: true,
    ocrMode: 'accurate', // Always use Gemini 3 Flash for best results
  })
  
  const processorRef = useRef<ReceiptProcessorQueue | null>(null)

  // Initialize processor
  useEffect(() => {
    processorRef.current = new ReceiptProcessorQueue(options)
    
    processorRef.current.setOnProgress((receipt) => {
      setQueue(processorRef.current!.getQueue())
      setStats(processorRef.current!.getStats())
    })

    processorRef.current.setOnComplete((receipt) => {
      setQueue(processorRef.current!.getQueue())
      setStats(processorRef.current!.getStats())
    })

    return () => {
      processorRef.current = null
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
    }
  }

  const handleUseAll = () => {
    queue.filter(r => r.status === 'done').forEach(receipt => {
      onReceiptProcessed(receipt.extractedData)
    })
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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Batch Receipt Scanner
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm text-gray-700">Processing Options</h4>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={options.useSAM}
                onChange={(e) => setOptions(prev => ({ ...prev, useSAM: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <div>
                  <span className="text-sm font-medium">SAM AI Border Detection</span>
                  <p className="text-xs text-gray-500">Use AI to detect and crop receipt boundaries (slower but more accurate)</p>
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={options.enhanceContrast}
                onChange={(e) => setOptions(prev => ({ ...prev, enhanceContrast: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <div>
                  <span className="text-sm font-medium">Enhance Contrast</span>
                  <p className="text-xs text-gray-500">Improve text clarity (darker text, whiter background)</p>
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={options.autoCrop}
                onChange={(e) => setOptions(prev => ({ ...prev, autoCrop: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <div>
                <span className="text-sm font-medium">Auto-Crop</span>
                <p className="text-xs text-gray-500">Remove empty space around receipts</p>
              </div>
            </label>

          </div>
        )}

        {/* Upload Area */}
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
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
          <Upload className="h-10 w-10 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-600 font-medium">Drop receipt images here</p>
          <p className="text-sm text-gray-400 mt-1">or click to select files (batch supported)</p>
        </div>

        {/* Stats Bar */}
        {stats.total > 0 && (
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-4 text-sm">
              {stats.pending > 0 && (
                <span className="text-gray-600">{stats.pending} pending</span>
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
                  receipt.status === 'done' ? 'border-green-200 bg-green-50' :
                  receipt.status === 'error' ? 'border-red-200 bg-red-50' :
                  receipt.status === 'processing' ? 'border-blue-200 bg-blue-50' :
                  'border-gray-200 bg-gray-50'
                }`}
              >
                {/* Header */}
                <div className="flex items-center gap-3 p-3">
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded bg-white border flex-shrink-0 overflow-hidden">
                    {receipt.processedImageUrl ? (
                      <img 
                        src={receipt.processedImageUrl} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{receipt.originalFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(receipt.originalFile.size)}
                      {receipt.status === 'done' && receipt.extractedData.vendor && (
                        <span className="ml-2">• {receipt.extractedData.vendor}</span>
                      )}
                    </p>
                    {receipt.status === 'processing' && (
                      <div className="mt-1">
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          <span>{receipt.progressStatus}</span>
                        </div>
                        <div className="h-1 bg-blue-200 rounded-full mt-1 overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${receipt.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {receipt.status === 'error' && (
                      <p className="text-xs text-red-600 mt-1">{receipt.error}</p>
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
                  <div className="border-t border-green-200 p-4 bg-white">
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
          <p className="text-center text-gray-400 text-sm py-4">
            No receipts in queue. Upload images to get started.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default BatchReceiptScanner
