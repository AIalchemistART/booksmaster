'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  FileText, 
  CreditCard, 
  Settings,
  TrendingUp,
  Camera,
  Wrench,
  GitCompare,
  FolderOpen,
  Loader2,
  Lock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { hasActiveProcessing, getProcessingStats } from '@/lib/global-receipt-processor'
import { useStore } from '@/store'

// MODULE LOAD CHECK - fires when file is imported
console.log('[SIDEBAR MODULE] Sidebar.tsx loaded')

interface NavItem {
  name: string
  href: string
  icon: any
  unlockCondition?: (store: any) => boolean
  alwaysUnlocked?: boolean
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, alwaysUnlocked: true },
  { 
    name: 'Receipts', 
    href: '/receipts', 
    icon: Camera,
    unlockCondition: (store) => store.userProgress.unlockedFeatures.includes('receipts')
  },
  { 
    name: 'Transactions', 
    href: '/transactions', 
    icon: Receipt,
    unlockCondition: (store) => store.userProgress.unlockedFeatures.includes('transactions')
  },
  { 
    name: 'Categorization Changes', 
    href: '/categorization-report', 
    icon: GitCompare,
    unlockCondition: (store) => store.userProgress.unlockedFeatures.includes('categorization_changes')
  },
  { 
    name: 'Invoices', 
    href: '/invoices', 
    icon: FileText,
    unlockCondition: (store) => store.userProgress.unlockedFeatures.includes('invoices')
  },
  { 
    name: 'Supporting Documents', 
    href: '/supporting-documents', 
    icon: FolderOpen,
    unlockCondition: (store) => store.userProgress.unlockedFeatures.includes('supporting_documents')
  },
  { 
    name: 'Reports', 
    href: '/reports', 
    icon: TrendingUp,
    unlockCondition: (store) => store.userProgress.unlockedFeatures.includes('reports')
  },
  { 
    name: 'Bank Accounts', 
    href: '/bank-accounts', 
    icon: CreditCard,
    unlockCondition: () => false // Always locked for now
  },
  { name: 'Settings', href: '/settings', icon: Settings, alwaysUnlocked: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const store = useStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [stats, setStats] = useState({ pending: 0, processing: 0, done: 0, error: 0, total: 0 })

  useEffect(() => {
    console.log('[SIDEBAR MOUNT] Sidebar mounted successfully')
  }, [])

  useEffect(() => {
    console.log('[SIDEBAR RENDER] Level:', store.userProgress.currentLevel, 'Features:', store.userProgress.unlockedFeatures, 'Receipts:', store.receipts.length)
  })

  useEffect(() => {
    console.log('[SIDEBAR] Current Level:', store.userProgress.currentLevel)
    console.log('[SIDEBAR] Unlocked Features:', store.userProgress.unlockedFeatures)
    console.log('[SIDEBAR] Receipt Count:', store.receipts.length)
    console.log('[SIDEBAR] Onboarding Complete:', store.userProgress.onboardingComplete)
    
    navigation.forEach(item => {
      if (!item.alwaysUnlocked && item.unlockCondition) {
        const isUnlocked = item.unlockCondition(store)
        console.log(`[SIDEBAR] ${item.name} unlocked:`, isUnlocked)
      }
    })
  }, [store.userProgress.currentLevel, store.userProgress.unlockedFeatures, store.receipts.length, store.userProgress.onboardingComplete])

  useEffect(() => {
    const checkProcessing = () => {
      const active = hasActiveProcessing()
      setIsProcessing(active)
      if (active) {
        setStats(getProcessingStats())
      }
    }
    
    checkProcessing()
    const interval = setInterval(checkProcessing, 2000)
    
    return () => clearInterval(interval)
  }, [])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isProcessing && pathname !== href) {
      const confirmLeave = window.confirm(
        `Receipt processing is in progress (${stats.pending + stats.processing} remaining).\n\n` +
        `If you navigate away, the page will reload and unfinished receipts will be lost.\n\n` +
        `Are you sure you want to leave?`
      )
      if (!confirmLeave) {
        e.preventDefault()
      }
    }
  }

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900">
      <div className="flex h-16 items-center justify-center border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">Booksmaster</h1>
      </div>
      {/* DEBUG: Visual store state display */}
      <div className="bg-red-900 text-white text-xs p-2 border-b border-red-700">
        <div><strong>DEBUG Level:</strong> {store.userProgress.currentLevel}</div>
        <div><strong>Features:</strong> {store.userProgress.unlockedFeatures.join(', ')}</div>
        <div><strong>Receipts Count:</strong> {store.receipts.length}</div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {isProcessing && (
          <div className="mb-3 rounded-lg bg-blue-900/30 border border-blue-700 p-3">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-medium mb-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing Receipts
            </div>
            <div className="text-xs text-blue-300">
              {stats.done} done, {stats.pending + stats.processing} remaining
            </div>
            <div className="text-xs text-blue-400 mt-1">
              ⚠️ Don&apos;t navigate away
            </div>
          </div>
        )}
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const isUnlocked = item.alwaysUnlocked || (item.unlockCondition && item.unlockCondition(store))
          
          if (!isUnlocked) {
            return (
              <div
                key={item.name}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 cursor-not-allowed opacity-50"
                title="Complete required actions to unlock this feature"
              >
                <Lock className="h-4 w-4" />
                {item.name}
              </div>
            )
          }
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-slate-700 p-4">
        <div className="text-xs text-slate-500">
          LLC Contractor Bookkeeping
        </div>
      </div>
    </div>
  )
}
