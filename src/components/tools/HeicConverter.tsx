'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Upload, 
  Download, 
  Image as ImageIcon, 
  Loader2, 
  Check, 
  X,
  Trash2,
  FileImage
} from 'lucide-react'

interface ConvertedFile {
  id: string
  originalName: string
  originalSize: number
  convertedBlob: Blob | null
  convertedUrl: string | null
  status: 'pending' | 'converting' | 'done' | 'error'
  error?: string
}

interface HeicConverterProps {
  onConvertedFiles?: (files: File[]) => void
}

export default function HeicConverter({ onConvertedFiles }: HeicConverterProps) {
  const [files, setFiles] = useState<ConvertedFile[]>([])
  const [quality, setQuality] = useState(90)
  const [isConverting, setIsConverting] = useState(false)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const heicFiles = selectedFiles.filter(f => 
      f.name.toLowerCase().endsWith('.heic') || 
      f.name.toLowerCase().endsWith('.heif')
    )

    const newFiles: ConvertedFile[] = heicFiles.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      originalName: f.name,
      originalSize: f.size,
      originalFile: f,
      convertedBlob: null,
      convertedUrl: null,
      status: 'pending' as const,
    }))

    setFiles(prev => [...prev, ...newFiles])
    
    // Store original files for conversion
    newFiles.forEach((nf, i) => {
      (nf as any).originalFile = heicFiles[i]
    })

    // Reset input
    e.target.value = ''
  }, [])

  const convertFile = async (file: ConvertedFile): Promise<ConvertedFile> => {
    try {
      const originalFile = (file as any).originalFile as File
      if (!originalFile) {
        throw new Error('Original file not found')
      }

      // Dynamic import heic-to for better HEIC support
      const { heicTo } = await import('heic-to')

      // Convert HEIC to JPEG blob
      const convertedBlob = await heicTo({
        blob: originalFile,
        type: 'image/jpeg',
        quality: quality / 100,
      })
      
      if (!convertedBlob) {
        throw new Error('No output from conversion')
      }

      const convertedUrl = URL.createObjectURL(convertedBlob)

      return {
        ...file,
        convertedBlob,
        convertedUrl,
        status: 'done',
      }
    } catch (error: any) {
      console.error('HEIC conversion error:', error)
      
      // Provide more specific error messages
      let errorMsg = 'Conversion failed'
      if (error?.message) {
        if (error.message.includes('not a HEIC') || error.message.includes('Invalid')) {
          errorMsg = 'Not a valid HEIC file'
        } else if (error.message.includes('ArrayBuffer')) {
          errorMsg = 'File read error'
        } else {
          errorMsg = error.message.substring(0, 50)
        }
      }
      
      return {
        ...file,
        status: 'error',
        error: errorMsg,
      }
    }
  }

  const handleConvertAll = async () => {
    setIsConverting(true)
    
    const pendingFiles = files.filter(f => f.status === 'pending')
    
    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i]
      
      // Update status to converting
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'converting' as const } : f
      ))

      const converted = await convertFile(file)
      
      setFiles(prev => prev.map(f => 
        f.id === file.id ? converted : f
      ))
    }

    setIsConverting(false)
  }

  const handleDownload = (file: ConvertedFile) => {
    if (!file.convertedUrl) return
    
    const link = document.createElement('a')
    link.href = file.convertedUrl
    link.download = file.originalName.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg')
    link.click()
  }

  const handleDownloadAll = () => {
    files.filter(f => f.status === 'done').forEach(handleDownload)
  }

  const handleRemove = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file?.convertedUrl) {
        URL.revokeObjectURL(file.convertedUrl)
      }
      return prev.filter(f => f.id !== id)
    })
  }

  const handleClear = () => {
    files.forEach(f => {
      if (f.convertedUrl) URL.revokeObjectURL(f.convertedUrl)
    })
    setFiles([])
  }

  const handleUseForOCR = () => {
    if (!onConvertedFiles) return
    
    const convertedFiles = files
      .filter(f => f.status === 'done' && f.convertedBlob)
      .map(f => new File(
        [f.convertedBlob!], 
        f.originalName.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'),
        { type: 'image/jpeg' }
      ))
    
    onConvertedFiles(convertedFiles)
  }

  const pendingCount = files.filter(f => f.status === 'pending').length
  const doneCount = files.filter(f => f.status === 'done').length
  const errorCount = files.filter(f => f.status === 'error').length

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileImage className="h-5 w-5" />
          HEIC to JPEG Converter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Input */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
          <input
            type="file"
            accept=".heic,.heif"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="heic-input"
          />
          <label htmlFor="heic-input" className="cursor-pointer">
            <Upload className="h-10 w-10 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600">Click to select HEIC/HEIF files</p>
            <p className="text-sm text-gray-400 mt-1">or drag and drop (supports batch)</p>
          </label>
        </div>

        {/* Quality Slider */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Quality:</label>
          <input
            type="range"
            min="10"
            max="100"
            value={quality}
            onChange={(e) => setQuality(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-medium w-12">{quality}%</span>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map(file => (
              <div 
                key={file.id} 
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  file.status === 'done' ? 'bg-green-50 border-green-200' :
                  file.status === 'error' ? 'bg-red-50 border-red-200' :
                  file.status === 'converting' ? 'bg-blue-50 border-blue-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                {/* Thumbnail */}
                {file.convertedUrl ? (
                  <img 
                    src={file.convertedUrl} 
                    alt="" 
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.originalName}</p>
                  <p className="text-xs text-gray-500">{formatSize(file.originalSize)}</p>
                  {file.error && (
                    <p className="text-xs text-red-600">{file.error}</p>
                  )}
                </div>

                {/* Status/Actions */}
                <div className="flex items-center gap-2">
                  {file.status === 'converting' && (
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                  )}
                  {file.status === 'done' && (
                    <>
                      <Check className="h-5 w-5 text-green-500" />
                      <Button size="sm" variant="outline" onClick={() => handleDownload(file)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {file.status === 'error' && (
                    <X className="h-5 w-5 text-red-500" />
                  )}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleRemove(file.id)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary & Actions */}
        {files.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
            <div className="text-sm text-gray-600">
              {pendingCount > 0 && <span className="mr-3">{pendingCount} pending</span>}
              {doneCount > 0 && <span className="mr-3 text-green-600">{doneCount} converted</span>}
              {errorCount > 0 && <span className="text-red-600">{errorCount} failed</span>}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClear}>
                Clear All
              </Button>
              
              {pendingCount > 0 && (
                <Button 
                  onClick={handleConvertAll} 
                  disabled={isConverting}
                  size="sm"
                >
                  {isConverting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>Convert {pendingCount} File{pendingCount > 1 ? 's' : ''}</>
                  )}
                </Button>
              )}
              
              {doneCount > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={handleDownloadAll}>
                    <Download className="h-4 w-4 mr-1" />
                    Download All
                  </Button>
                  
                  {onConvertedFiles && (
                    <Button size="sm" onClick={handleUseForOCR}>
                      Use for OCR Scan
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
