import { cn } from '@/lib/utils'

interface ConfidenceBadgeProps {
  confidence: number // 0-1
  showPercentage?: boolean
  className?: string
}

export function ConfidenceBadge({ confidence, showPercentage = true, className }: ConfidenceBadgeProps) {
  const percentage = Math.round(confidence * 100)
  
  const getColor = () => {
    if (confidence >= 0.8) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700'
    if (confidence >= 0.6) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700'
    if (confidence >= 0.4) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700'
  }

  const getLabel = () => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.6) return 'Med'
    if (confidence >= 0.4) return 'Low'
    return 'Very Low'
  }

  const getIcon = () => {
    if (confidence >= 0.8) return '✓'
    if (confidence >= 0.6) return '~'
    if (confidence >= 0.4) return '?'
    return '⚠'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border',
        getColor(),
        className
      )}
      title={`AI Confidence: ${percentage}% - ${confidence >= 0.8 ? 'High confidence categorization' : confidence >= 0.6 ? 'Medium confidence, may need review' : 'Low confidence, please verify'}`}
    >
      <span>{getIcon()}</span>
      {showPercentage ? `${percentage}%` : getLabel()}
    </span>
  )
}
