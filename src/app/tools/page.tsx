'use client'

import dynamic from 'next/dynamic'

const HeicConverter = dynamic(
  () => import('@/components/tools/HeicConverter'),
  { ssr: false }
)

export default function ToolsPage() {
  const handleConvertedFiles = (files: File[]) => {
    console.log('Converted files ready for use:', files)
    // Auto-download each converted file
    files.forEach(file => {
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tools</h1>
        <p className="text-gray-600 mt-1">Utility tools for file conversion and processing</p>
      </div>

      <div className="max-w-2xl">
        <HeicConverter onConvertedFiles={handleConvertedFiles} />
      </div>
    </div>
  )
}

