'use client'

import { useState, useEffect } from 'react'
import { X, ChevronRight, Sparkles } from 'lucide-react'

// Tab intro content - 80% informative, 20% whimsical
export const TAB_INTROS: Record<string, { title: string; icon: string; heading: string; content: string; tip?: string }> = {
  dashboard: {
    title: 'Dashboard',
    icon: '🎯',
    heading: 'Welcome to Your Command Center!',
    content: 'This is your mission control for contractor bookkeeping. Track your progress, see your XP gains, and keep tabs on what features you\'ve unlocked. The dashboard gives you a bird\'s-eye view of your financial journey.',
    tip: 'Pro tip: Check back here often to see your level progress and unlock new features!'
  },
  receipts: {
    title: 'Receipts',
    icon: '📸',
    heading: 'Receipt Scanning HQ',
    content: 'This is where the magic happens! Upload photos of your receipts and let our AI-powered OCR extract the important details. Review and refine the results to teach the system your preferences—it gets smarter with every correction you make. You can also upload supporting documents like manifests, contracts, or invoices using the same workflow—just upload them here and they\'ll be automatically organized!',
    tip: 'For best results, take clear photos with good lighting. The AI loves crisp images! Supporting docs like manifests are automatically detected and categorized.'
  },
  transactions: {
    title: 'Transactions',
    icon: '💳',
    heading: 'Your Financial Ledger',
    content: 'All your business transactions live here. Review and edit AI-parsed receipts, correct any mistakes, and categorize expenses. The system learns from your manual edits—each correction you make trains the AI to be more accurate for similar transactions in the future. Keep your books organized while teaching the system your preferences!',
    tip: 'Always review AI-parsed data and make manual corrections. Your edits improve accuracy over time and earn you XP!'
  },
  invoices: {
    title: 'Invoices',
    icon: '📄',
    heading: 'Invoice Workshop',
    content: 'Create professional invoices for your clients right from the app. Track what\'s been paid and what\'s outstanding. Your business deserves to look professional!',
    tip: 'Set up your business info in Settings first for polished invoices.'
  },
  reports: {
    title: 'Reports',
    icon: '📊',
    heading: 'Insights & Analytics',
    content: 'Transform your transaction data into meaningful reports. See spending patterns, category breakdowns, and prepare for tax time with confidence. Knowledge is power!',
    tip: 'Export reports as PDF or Excel for your accountant or tax preparer.'
  },
  settings: {
    title: 'Settings',
    icon: '⚙️',
    heading: 'Customize Your Experience',
    content: 'You\'ve already been here during setup! This is where you can fine-tune your business info, manage your API key, adjust your job type, and export/import data. Most of this was configured during the wizard.',
    tip: 'Your data is saved locally - use the export feature for backups!'
  },
  'supporting-documents': {
    title: 'Supporting Documents',
    icon: '📁',
    heading: 'Document Vault',
    content: 'Store important business documents beyond receipts - contracts, licenses, insurance certificates, and more. Keep everything organized in one place for easy access during audits.',
    tip: 'Upload documents before you need them. Future you will thank present you!'
  },
  'categorization-changes': {
    title: 'Categorization Changes',
    icon: '🔄',
    heading: 'Category Audit Trail',
    content: 'Track how your transactions have been categorized over time. See what changed, when it changed, and maintain a clear audit trail for your records.',
    tip: 'Review this periodically to ensure consistent categorization.'
  },
  'bank-accounts': {
    title: 'Bank Accounts',
    icon: '🏦',
    heading: 'Account Management',
    content: 'Link and manage your business bank accounts. Keep track of balances and reconcile transactions with your receipts for accurate bookkeeping.',
    tip: 'Reconciling regularly prevents end-of-year surprises!'
  },
  tax: {
    title: 'Tax Planning',
    icon: '📋',
    heading: 'Tax Preparation Zone',
    content: 'Prepare for tax season with confidence! Review your deductions, estimate quarterly payments, and export Schedule C data. The more organized you are here, the easier tax time becomes.',
    tip: 'Set aside estimated taxes quarterly to avoid a big bill in April!'
  },
  mileage: {
    title: 'Mileage Tracking',
    icon: '🚗',
    heading: 'Miles = Money',
    content: 'Track your business mileage for tax deductions. Log trips, calculate deductions using IRS rates, and maximize your vehicle expense write-offs.',
    tip: 'The 2024 IRS mileage rate is 67 cents per mile. Those miles add up!'
  },
  achievements: {
    title: 'Achievements',
    icon: '🏆',
    heading: 'Trophy Room',
    content: 'View all the achievements you\'ve earned on your bookkeeping journey! From first receipt to tax master, every milestone is celebrated here.',
    tip: 'Some achievements are hidden - keep exploring to find them all!'
  }
}

interface FirstVisitIntroProps {
  tabId: string
  onClose: () => void
  isVisible: boolean
}

export function FirstVisitIntro({ tabId, onClose, isVisible }: FirstVisitIntroProps) {
  const [showContent, setShowContent] = useState(false)
  const intro = TAB_INTROS[tabId]

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShowContent(true), 100)
      return () => clearTimeout(timer)
    } else {
      setShowContent(false)
    }
  }, [isVisible])

  if (!intro || !isVisible) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className={`relative bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg mx-4 shadow-2xl border border-gray-200 dark:border-gray-700 transform transition-all duration-400 ${showContent ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon and title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-2xl">{intro.icon}</span>
          </div>
          <div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Welcome to</p>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{intro.title}</h2>
          </div>
        </div>

        {/* Heading */}
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          {intro.heading}
        </h3>

        {/* Content */}
        <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
          {intro.content}
        </p>

        {/* Tip box */}
        {intro.tip && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-5">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-semibold">💡 {intro.tip}</span>
            </p>
          </div>
        )}

        {/* Got it button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
        >
          Got it, let&apos;s go!
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// Hook to manage first-visit state
export function useFirstVisit(tabId: string) {
  const [hasVisited, setHasVisited] = useState(true) // Default to true to prevent flash
  const [showIntro, setShowIntro] = useState(false)
  
  useEffect(() => {
    // Check localStorage for visited tabs
    const visitedTabs = JSON.parse(localStorage.getItem('booksmaster-visited-tabs') || '{}')
    const visited = visitedTabs[tabId] === true
    
    setHasVisited(visited)
    
    if (!visited) {
      // Small delay before showing intro
      const timer = setTimeout(() => setShowIntro(true), 500)
      return () => clearTimeout(timer)
    }
  }, [tabId])
  
  const markAsVisited = () => {
    const visitedTabs = JSON.parse(localStorage.getItem('booksmaster-visited-tabs') || '{}')
    visitedTabs[tabId] = true
    localStorage.setItem('booksmaster-visited-tabs', JSON.stringify(visitedTabs))
    setHasVisited(true)
    setShowIntro(false)
  }
  
  const closeIntro = () => {
    markAsVisited()
  }
  
  return { hasVisited, showIntro, closeIntro }
}
