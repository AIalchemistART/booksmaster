'use client'

import dynamic from 'next/dynamic'

const HeicConverter = dynamic(
  () => import('@/components/tools/HeicConverter'),
  { ssr: false }
)

export default function ToolsPage() {
  const handleConvertedFiles = (files: File[]) => {
    console.log('Converted files ready for use:', files)
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
