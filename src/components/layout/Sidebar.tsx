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
  Wrench
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Transactions', href: '/transactions', icon: Receipt },
  { name: 'Custody', href: '/custody', icon: Users },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Receipts', href: '/receipts', icon: Camera },
  { name: 'Reports', href: '/reports', icon: TrendingUp },
  { name: 'Bank Accounts', href: '/bank-accounts', icon: CreditCard },
  // { name: 'Tools', href: '/tools', icon: Wrench },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900">
      <div className="flex h-16 items-center justify-center border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">Thomas Books</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
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
