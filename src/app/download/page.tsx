'use client'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Download, Check } from 'lucide-react'

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-8">
      <Card className="max-w-2xl w-full p-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">📚 Booksmaster</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Contractor Bookkeeping Made Simple
          </p>

          <a href="/BooksmasterSetup.exe" download>
            <Button size="lg" className="text-lg px-12 py-6 mb-4">
              <Download className="mr-2 h-5 w-5" />
              Download for Windows
            </Button>
          </a>

          <p className="text-sm text-muted-foreground mb-12">Version 0.2.0</p>

          <div className="text-left">
            <h2 className="text-2xl font-semibold mb-6 text-center">Features</h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Check className="mr-3 h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Track income and expenses with detailed categorization</span>
              </li>
              <li className="flex items-start">
                <Check className="mr-3 h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Manage receipts with AI-powered OCR using Gemini Vision</span>
              </li>
              <li className="flex items-start">
                <Check className="mr-3 h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Generate comprehensive categorization reports</span>
              </li>
              <li className="flex items-start">
                <Check className="mr-3 h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Monitor custody balance in real-time</span>
              </li>
              <li className="flex items-start">
                <Check className="mr-3 h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Create invoices and manage transactions</span>
              </li>
              <li className="flex items-start">
                <Check className="mr-3 h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>All your data stored locally on your machine</span>
              </li>
              <li className="flex items-start">
                <Check className="mr-3 h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Works offline - no internet required after setup</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 p-4 bg-muted rounded-lg text-sm text-left">
            <p className="font-semibold mb-2">System Requirements:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Windows 10 or later (64-bit)</li>
              <li>• 500 MB available disk space</li>
              <li>• Internet connection for initial setup</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
