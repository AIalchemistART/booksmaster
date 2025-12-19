'use client'

import { useState, useCallback, useRef } from 'react'
import { createWorker } from 'tesseract.js'
// SAM is loaded dynamically to avoid SSR issues with ONNX runtime
let samModule: typeof import('@/lib/sam-segmentation') | null = null
const loadSAMModule = async () => {
  if (!samModule) {
    samModule = await import('@/lib/sam-segmentation')
  }
  return samModule
}

interface Word {
  text: string
  bbox: { x0: number; y0: number; x1: number; y1: number }
  confidence: number
}
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Loader2, Camera, Check, ChevronLeft, ChevronRight, Scissors, Plus, Sparkles, Zap, Pencil } from 'lucide-react'

interface LineItem {
  description: string
  amount: number
  sku?: string
}

interface ExtractedData {
  vendor: string
  amount: number | null
  date: string
  rawText: string
  boundingBox?: { x0: number; y0: number; x1: number; y1: number }
  imageData?: string // Base64 data URL of the receipt image
  // Enhanced fields
  subtotal?: number
  tax?: number
  lineItems?: LineItem[]
  paymentMethod?: string
  storeId?: string
  transactionId?: string
  time?: string
}

interface ReceiptOCRProps {
  onExtracted: (data: ExtractedData) => void
}

interface ReceiptCluster {
  id: number
  words: Word[]
  text: string
  boundingBox: { x0: number; y0: number; x1: number; y1: number }
  extracted: ExtractedData
  croppedImage?: string // For SAM-segmented receipts
}

type SegmentationMode = 'fast' | 'sam'

export function ReceiptOCR({ onExtracted }: ReceiptOCRProps) {
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressStatus, setProgressStatus] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [receipts, setReceipts] = useState<ReceiptCluster[]>([])
  const [currentReceiptIndex, setCurrentReceiptIndex] = useState(0)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [segmentationMode, setSegmentationMode] = useState<SegmentationMode>('fast')
  const [samLoaded, setSamLoaded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const currentFileRef = useRef<File | null>(null)

  const extractDataFromText = (text: string): Omit<ExtractedData, 'boundingBox'> => {
    const lines = text.split('\n').filter((line) => line.trim())
    
    // Extract vendor (usually first meaningful line or known store names)
    let vendor = ''
    const knownStores = ['home depot', 'walmart', 'target', 'costco', 'lowes', 'amazon', 'walgreens', 'cvs', 'kroger', 'safeway', 'whole foods', 'trader joe']
    const textLower = text.toLowerCase()
    
    for (const store of knownStores) {
      if (textLower.includes(store)) {
        vendor = store.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        break
      }
    }
    
    if (!vendor) {
      for (const line of lines.slice(0, 5)) {
        const cleaned = line.trim()
        if (cleaned.length > 2 && cleaned.length < 50 && !/^\d+$/.test(cleaned)) {
          vendor = cleaned
          break
        }
      }
    }

    // Extract subtotal
    let subtotal: number | undefined
    const subtotalMatch = text.match(/subtotal[:\s]*\$?([\d,]+\.?\d*)/i)
    if (subtotalMatch) {
      const parsed = parseFloat(subtotalMatch[1].replace(',', ''))
      if (!isNaN(parsed) && parsed > 0) subtotal = parsed
    }

    // Extract tax
    let tax: number | undefined
    const taxPatterns = [/\btax[:\s]*\$?([\d,]+\.?\d*)/i, /sales tax[:\s]*\$?([\d,]+\.?\d*)/i]
    for (const pattern of taxPatterns) {
      const match = text.match(pattern)
      if (match) {
        const parsed = parseFloat(match[1].replace(',', ''))
        if (!isNaN(parsed) && parsed >= 0) {
          tax = parsed
          break
        }
      }
    }

    // Extract total amount
    let amount: number | null = null
    const amountPatterns = [
      /\btotal[:\s]*\$?([\d,]+\.?\d*)/i,
      /amount[:\s]*\$?([\d,]+\.?\d*)/i,
      /grand total[:\s]*\$?([\d,]+\.?\d*)/i,
    ]

    for (const pattern of amountPatterns) {
      const match = text.match(pattern)
      if (match) {
        const parsed = parseFloat(match[1].replace(',', ''))
        if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
          amount = parsed
          break
        }
      }
    }

    if (amount === null) {
      const allAmounts = text.match(/\$?\d+\.\d{2}/g) || []
      const numbers = allAmounts
        .map((a) => parseFloat(a.replace('$', '')))
        .filter((n) => !isNaN(n) && n > 0)
      if (numbers.length > 0) {
        amount = Math.max(...numbers)
      }
    }

    // Extract line items (lines with price pattern at end)
    const lineItems: LineItem[] = []
    const itemPattern = /^(.+?)\s+\$?([\d,]+\.\d{2})\s*$/
    const skuPattern = /^(\d{10,})\s+(.+?)\s+\$?([\d,]+\.\d{2})/
    
    for (const line of lines) {
      const skuMatch = line.match(skuPattern)
      if (skuMatch) {
        const itemAmount = parseFloat(skuMatch[3].replace(',', ''))
        if (!isNaN(itemAmount) && itemAmount > 0 && itemAmount < (amount || 10000)) {
          lineItems.push({
            sku: skuMatch[1],
            description: skuMatch[2].trim(),
            amount: itemAmount,
          })
        }
        continue
      }
      
      const itemMatch = line.match(itemPattern)
      if (itemMatch) {
        const desc = itemMatch[1].trim()
        const itemAmount = parseFloat(itemMatch[2].replace(',', ''))
        if (desc.length > 2 && !isNaN(itemAmount) && itemAmount > 0 && itemAmount < (amount || 10000)) {
          if (!/total|subtotal|tax|change|cash|credit|debit/i.test(desc)) {
            lineItems.push({ description: desc, amount: itemAmount })
          }
        }
      }
    }

    // Extract payment method
    let paymentMethod: string | undefined
    if (/visa/i.test(text)) paymentMethod = 'Visa'
    else if (/mastercard|master card/i.test(text)) paymentMethod = 'Mastercard'
    else if (/amex|american express/i.test(text)) paymentMethod = 'American Express'
    else if (/discover/i.test(text)) paymentMethod = 'Discover'
    else if (/debit/i.test(text)) paymentMethod = 'Debit Card'
    else if (/credit/i.test(text)) paymentMethod = 'Credit Card'
    else if (/cash/i.test(text)) paymentMethod = 'Cash'
    else if (/apple pay/i.test(text)) paymentMethod = 'Apple Pay'
    else if (/google pay/i.test(text)) paymentMethod = 'Google Pay'

    // Extract store/transaction ID
    let storeId: string | undefined
    let transactionId: string | undefined
    const storeIdMatch = text.match(/store[#:\s]*(\d+)/i) || text.match(/str[#:\s]*(\d+)/i)
    if (storeIdMatch) storeId = storeIdMatch[1]
    
    const transIdMatch = text.match(/trans(?:action)?[#:\s]*(\d+)/i) || text.match(/receipt[#:\s]*(\d+)/i)
    if (transIdMatch) transactionId = transIdMatch[1]

    // Extract time
    let time: string | undefined
    const timeMatch = text.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i)
    if (timeMatch) time = timeMatch[1]

    // Extract date
    let date = new Date().toISOString().split('T')[0]
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
    ]

    for (const pattern of datePatterns) {
      const match = text.match(pattern)
      if (match) {
        try {
          const parsed = new Date(match[0])
          if (!isNaN(parsed.getTime())) {
            date = parsed.toISOString().split('T')[0]
            break
          }
        } catch {
          if (match[3] && match[3].length === 4) {
            date = `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`
          } else if (match[1] && match[1].length === 4) {
            date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
          }
        }
        break
      }
    }

    return {
      vendor: vendor || 'Unknown Vendor',
      amount,
      date,
      rawText: text,
      subtotal,
      tax,
      lineItems: lineItems.length > 0 ? lineItems : undefined,
      paymentMethod,
      storeId,
      transactionId,
      time,
    }
  }

  const clusterReceiptsByVerticalGaps = (words: Word[], imageHeight: number): ReceiptCluster[] => {
    if (words.length === 0) return []

    // Sort words by vertical position (top of bounding box)
    const sortedWords = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0)

    // Group words into lines based on vertical position
    const lines: { y: number; words: Word[] }[] = []
    let currentLine: Word[] = []
    let currentLineY = sortedWords[0]?.bbox.y0 || 0

    for (const word of sortedWords) {
      const lineThreshold = imageHeight * 0.02 // 2% of image height as line threshold
      if (Math.abs(word.bbox.y0 - currentLineY) < lineThreshold) {
        currentLine.push(word)
      } else {
        if (currentLine.length > 0) {
          lines.push({ y: currentLineY, words: currentLine })
        }
        currentLine = [word]
        currentLineY = word.bbox.y0
      }
    }
    if (currentLine.length > 0) {
      lines.push({ y: currentLineY, words: currentLine })
    }

    // Detect large gaps between lines (potential receipt boundaries)
    const gapThreshold = imageHeight * 0.08 // 8% of image height as gap threshold
    const clusters: ReceiptCluster[] = []
    let currentClusterLines: typeof lines = []
    let clusterId = 0

    for (let i = 0; i < lines.length; i++) {
      currentClusterLines.push(lines[i])
      
      const nextLine = lines[i + 1]
      const currentLineBottom = Math.max(...lines[i].words.map(w => w.bbox.y1))
      const gap = nextLine ? nextLine.y - currentLineBottom : Infinity

      if (gap > gapThreshold || i === lines.length - 1) {
        // End of cluster - create receipt
        const clusterWords = currentClusterLines.flatMap(l => l.words)
        if (clusterWords.length > 0) {
          const x0 = Math.min(...clusterWords.map(w => w.bbox.x0))
          const y0 = Math.min(...clusterWords.map(w => w.bbox.y0))
          const x1 = Math.max(...clusterWords.map(w => w.bbox.x1))
          const y1 = Math.max(...clusterWords.map(w => w.bbox.y1))
          
          // Build text from words (sort by line then by x position)
          const text = currentClusterLines
            .map(line => 
              [...line.words]
                .sort((a, b) => a.bbox.x0 - b.bbox.x0)
                .map(w => w.text)
                .join(' ')
            )
            .join('\n')

          const boundingBox = { x0, y0, x1, y1 }
          const extracted = extractDataFromText(text)

          clusters.push({
            id: clusterId++,
            words: clusterWords,
            text,
            boundingBox,
            extracted: { ...extracted, boundingBox },
          })
        }
        currentClusterLines = []
      }
    }

    return clusters
  }

  // Process with fast text-clustering mode
  const processImageFast = useCallback(async (file: File) => {
    setProgressStatus('Running OCR...')
    
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          setProgress(Math.round(m.progress * 100))
        }
      },
    })

    const result = await worker.recognize(file)
    await worker.terminate()

    // Get image dimensions for clustering
    const img = new Image()
    img.src = URL.createObjectURL(file)
    await new Promise(resolve => img.onload = resolve)

    // Access words from result
    const ocrData = result.data as any
    const words: Word[] = ocrData.words || []
    const text: string = ocrData.text || ''

    // Cluster words into separate receipts
    const clusters = clusterReceiptsByVerticalGaps(words, img.height)
    
    if (clusters.length === 0) {
      const extracted = extractDataFromText(text)
      return [{
        id: 0,
        words: words,
        text: text,
        boundingBox: { x0: 0, y0: 0, x1: img.width, y1: img.height },
        extracted: { ...extracted, boundingBox: { x0: 0, y0: 0, x1: img.width, y1: img.height } },
      }]
    }
    return clusters
  }, [])

  // Process with SAM segmentation
  const processImageSAM = useCallback(async (file: File): Promise<ReceiptCluster[]> => {
    // Load SAM module dynamically
    const sam = await loadSAMModule()
    
    // Run SAM segmentation
    const regions = await sam.segmentReceipts(file, (p: number, status: string) => {
      setProgress(p)
      setProgressStatus(status)
    })

    if (regions.length === 0) {
      // Fall back to fast mode if SAM finds nothing
      setProgressStatus('No regions found, falling back to text clustering...')
      return processImageFast(file)
    }

    // Run OCR on each segmented region
    setProgressStatus('Running OCR on detected receipts...')
    const clusters: ReceiptCluster[] = []

    for (let i = 0; i < regions.length; i++) {
      const region = regions[i]
      setProgressStatus(`OCR on receipt ${i + 1}/${regions.length}...`)
      
      // Convert cropped image to blob for OCR
      const response = await fetch(region.croppedImageData)
      const blob = await response.blob()
      const croppedFile = new File([blob], `receipt-${i}.png`, { type: 'image/png' })

      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const baseProgress = 50 + (i / regions.length) * 50
            setProgress(Math.round(baseProgress + (m.progress * 50 / regions.length)))
          }
        },
      })

      const result = await worker.recognize(croppedFile)
      await worker.terminate()

      const ocrData = result.data as any
      const text: string = ocrData.text || ''
      const extracted = extractDataFromText(text)

      clusters.push({
        id: i,
        words: ocrData.words || [],
        text,
        boundingBox: {
          x0: region.boundingBox.x,
          y0: region.boundingBox.y,
          x1: region.boundingBox.x + region.boundingBox.width,
          y1: region.boundingBox.y + region.boundingBox.height,
        },
        extracted: {
          ...extracted,
          boundingBox: {
            x0: region.boundingBox.x,
            y0: region.boundingBox.y,
            x1: region.boundingBox.x + region.boundingBox.width,
            y1: region.boundingBox.y + region.boundingBox.height,
          },
        },
        croppedImage: region.croppedImageData,
      })
    }

    setSamLoaded(true)
    return clusters
  }, [processImageFast])

  const processImage = useCallback(async (file: File, mode: SegmentationMode = segmentationMode) => {
    setProcessing(true)
    setProgress(0)
    setProgressStatus('')
    setReceipts([])
    setCurrentReceiptIndex(0)
    currentFileRef.current = file

    // Create preview and get image dimensions
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height })
      }
      img.src = e.target?.result as string
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    try {
      let clusters: ReceiptCluster[]
      
      if (mode === 'sam') {
        clusters = await processImageSAM(file)
      } else {
        clusters = await processImageFast(file)
      }
      
      setReceipts(clusters)
    } catch (error) {
      console.error('OCR Error:', error)
      alert('Failed to process receipt. Please try a clearer image.')
    } finally {
      setProcessing(false)
      setProgressStatus('')
    }
  }, [segmentationMode, processImageFast, processImageSAM])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImage(file)
    }
  }

  const reset = () => {
    setPreview(null)
    setReceipts([])
    setCurrentReceiptIndex(0)
    setProgress(0)
  }

  const currentReceipt = receipts[currentReceiptIndex]

  const handleUseReceipt = () => {
    if (currentReceipt) {
      // Include the image data (use cropped image for SAM, or preview for fast mode)
      const imageData = currentReceipt.croppedImage || preview || undefined
      onExtracted({ ...currentReceipt.extracted, imageData })
    }
  }

  const handleUseAllReceipts = () => {
    receipts.forEach(r => {
      const imageData = r.croppedImage || preview || undefined
      onExtracted({ ...r.extracted, imageData })
    })
    reset()
  }

  // Calculate display bounds for current receipt highlight
  const getHighlightStyle = () => {
    if (!currentReceipt || !preview) return {}
    const bb = currentReceipt.boundingBox
    const displayWidth = 400 // approximate display width
    const scale = displayWidth / imageSize.width
    return {
      left: `${bb.x0 * scale}px`,
      top: `${bb.y0 * scale}px`,
      width: `${(bb.x1 - bb.x0) * scale}px`,
      height: `${(bb.y1 - bb.y0) * scale}px`,
    }
  }

  const reprocessWithMode = (mode: SegmentationMode) => {
    setSegmentationMode(mode)
    if (currentFileRef.current) {
      processImage(currentFileRef.current, mode)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Receipt Scanner (AI-Powered OCR)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!preview ? (
          <div className="space-y-4">
            {/* Mode Selection */}
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setSegmentationMode('fast')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  segmentationMode === 'fast'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Zap className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium text-sm">Fast Mode</div>
                  <div className="text-xs opacity-70">Text clustering</div>
                </div>
              </button>
              <button
                onClick={() => setSegmentationMode('sam')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  segmentationMode === 'sam'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium text-sm">SAM AI Mode</div>
                  <div className="text-xs opacity-70">Meta&apos;s Segment Anything</div>
                </div>
              </button>
            </div>

            {segmentationMode === 'sam' && !samLoaded && (
              <p className="text-center text-sm text-purple-600">
                First use will download the SAM model (~25MB)
              </p>
            )}

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Camera className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">
                Upload a photo with one or multiple receipts
              </p>
              <p className="text-gray-500 text-sm mb-4">
                {segmentationMode === 'sam' 
                  ? 'SAM will intelligently detect receipt boundaries'
                  : 'Text clustering will separate vertically-stacked receipts'}
              </p>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
                id="receipt-upload"
              />
              <Button onClick={() => document.getElementById('receipt-upload')?.click()}>
                <Camera className="h-4 w-4 mr-2" />
                Take Photo or Upload
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Image preview with receipt highlight */}
            <div className="relative inline-block">
              <img
                src={preview}
                alt="Receipt preview"
                className="w-full max-w-[400px] object-contain rounded-lg bg-gray-100"
              />
              {processing && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-lg">
                  <Loader2 className="h-8 w-8 text-white animate-spin mb-2" />
                  <p className="text-white text-sm">{progressStatus || `Processing... ${progress}%`}</p>
                  <div className="w-48 h-2 bg-white/30 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
              {/* Highlight current receipt */}
              {currentReceipt && !processing && receipts.length > 1 && (
                <div
                  className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
                  style={getHighlightStyle()}
                />
              )}
            </div>

            {/* Receipt navigation for multiple receipts */}
            {receipts.length > 1 && !processing && (
              <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-blue-600" />
                  <span className="text-blue-800 font-medium">
                    {receipts.length} receipts detected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentReceiptIndex(Math.max(0, currentReceiptIndex - 1))}
                    disabled={currentReceiptIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium px-2">
                    {currentReceiptIndex + 1} / {receipts.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentReceiptIndex(Math.min(receipts.length - 1, currentReceiptIndex + 1))}
                    disabled={currentReceiptIndex === receipts.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Current receipt data */}
            {currentReceipt && !processing && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">
                    Receipt {currentReceiptIndex + 1} Data
                  </span>
                </div>
                
                {/* Primary fields */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <p><strong>Vendor:</strong> {currentReceipt.extracted.vendor}</p>
                  <p>
                    <strong>Total:</strong>{' '}
                    {currentReceipt.extracted.amount
                      ? `$${currentReceipt.extracted.amount.toFixed(2)}`
                      : 'Not detected'}
                  </p>
                  <p><strong>Date:</strong> {currentReceipt.extracted.date}</p>
                  {currentReceipt.extracted.time && (
                    <p><strong>Time:</strong> {currentReceipt.extracted.time}</p>
                  )}
                </div>

                {/* Financial breakdown */}
                {(currentReceipt.extracted.subtotal || currentReceipt.extracted.tax) && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs font-medium text-green-700 mb-2">Breakdown</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {currentReceipt.extracted.subtotal && (
                        <p><strong>Subtotal:</strong> ${currentReceipt.extracted.subtotal.toFixed(2)}</p>
                      )}
                      {currentReceipt.extracted.tax !== undefined && (
                        <p><strong>Tax:</strong> ${currentReceipt.extracted.tax.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Line items */}
                {currentReceipt.extracted.lineItems && currentReceipt.extracted.lineItems.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs font-medium text-green-700 mb-2">
                      Items ({currentReceipt.extracted.lineItems.length})
                    </p>
                    <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                      {currentReceipt.extracted.lineItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="truncate flex-1 mr-2">
                            {item.sku && <span className="text-gray-400 mr-1">{item.sku}</span>}
                            {item.description}
                          </span>
                          <span className="font-medium">${item.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional details */}
                {(currentReceipt.extracted.paymentMethod || currentReceipt.extracted.storeId || currentReceipt.extracted.transactionId) && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs font-medium text-green-700 mb-2">Details</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {currentReceipt.extracted.paymentMethod && (
                        <p><strong>Payment:</strong> {currentReceipt.extracted.paymentMethod}</p>
                      )}
                      {currentReceipt.extracted.storeId && (
                        <p><strong>Store #:</strong> {currentReceipt.extracted.storeId}</p>
                      )}
                      {currentReceipt.extracted.transactionId && (
                        <p><strong>Trans #:</strong> {currentReceipt.extracted.transactionId}</p>
                      )}
                    </div>
                  </div>
                )}

                <details className="mt-3">
                  <summary className="text-xs text-gray-500 cursor-pointer">
                    View raw text
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                    {currentReceipt.text}
                  </pre>
                </details>
              </div>
            )}

            {/* Action buttons */}
            {!processing && receipts.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleUseReceipt}>
                    <Plus className="h-4 w-4 mr-2" />
                    Use This Receipt
                  </Button>
                  {receipts.length > 1 && (
                    <Button variant="secondary" onClick={handleUseAllReceipts}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add All {receipts.length} Receipts
                    </Button>
                  )}
                  <Button variant="outline" onClick={reset}>
                    Scan Another
                  </Button>
                </div>
                
                {/* Reprocess with different mode */}
                <div className="flex items-center gap-2 pt-2 border-t text-sm">
                  <span className="text-gray-500">Try different mode:</span>
                  {segmentationMode === 'fast' ? (
                    <button
                      onClick={() => reprocessWithMode('sam')}
                      className="flex items-center gap-1 text-purple-600 hover:text-purple-800"
                    >
                      <Sparkles className="h-3 w-3" />
                      Reprocess with SAM AI
                    </button>
                  ) : (
                    <button
                      onClick={() => reprocessWithMode('fast')}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                    >
                      <Zap className="h-3 w-3" />
                      Reprocess with Fast Mode
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
