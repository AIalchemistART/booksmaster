import type { VerificationLevel } from '@/types'

interface VerificationBadgeProps {
  level?: VerificationLevel
  className?: string
}

export function VerificationBadge({ level, className = '' }: VerificationBadgeProps) {
  if (!level) return null

  const config = {
    strong: {
      icon: '🔒',
      label: 'Strong',
      title: 'Strongly Verified - Linked check + deposit or invoice + payment',
      bg: 'bg-green-100 dark:bg-green-900/30',
      border: 'border-green-300 dark:border-green-700',
      text: 'text-green-800 dark:text-green-200'
    },
    bank: {
      icon: '🏦',
      label: 'Bank',
      title: 'Bank Verified - Has receipt or bank statement',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      border: 'border-blue-300 dark:border-blue-700',
      text: 'text-blue-800 dark:text-blue-200'
    },
    self_reported: {
      icon: '📝',
      label: 'Self',
      title: 'Self-Reported - Manual entry without supporting documents',
      bg: 'bg-gray-100 dark:bg-gray-700',
      border: 'border-gray-300 dark:border-gray-600',
      text: 'text-gray-800 dark:text-gray-200'
    }
  }

  const { icon, label, title, bg, border, text } = config[level]

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${bg} ${border} ${text} ${className}`}
      title={title}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  )
}
