/**
 * Achievement System - Badges and milestones
 */

export type AchievementId =
  | 'first_transaction'
  | 'first_receipt'
  | 'first_export'
  | 'categorize_10'
  | 'categorize_50'
  | 'categorize_100'
  | 'receipt_master'
  | 'tax_ready'
  | 'level_3'
  | 'level_6'
  | 'mileage_warrior'
  | 'onboarding_complete'
  | 'job_type_selected'
  | 'api_connected'
  | 'first_week'
  | 'first_month'
  | 'organized'
  | 'power_user'
  | 'quality_control'
  | 'perfectionist'
  | 'duplicate_detective'
  | 'efficiency_expert'
  | 'automation_master'
  | 'first_invoice'
  | 'invoice_pro'
  | 'supporting_docs'
  | 'category_trainer'
  | 'batch_scanner'
  | 'report_generator'

export interface Achievement {
  id: AchievementId
  title: string
  description: string
  icon: string
  category: 'getting_started' | 'progress' | 'mastery' | 'milestones'
  xpReward: number
  unlockedAt?: string
  hidden?: boolean // Don't show until unlocked
}

export const ACHIEVEMENTS: Record<AchievementId, Omit<Achievement, 'id' | 'unlockedAt'>> = {
  // Getting Started
  onboarding_complete: {
    title: 'Welcome Aboard',
    description: 'Complete the onboarding process',
    icon: '🎉',
    category: 'getting_started',
    xpReward: 15
  },
  job_type_selected: {
    title: 'Business Identity',
    description: 'Select your job type in settings',
    icon: '🎯',
    category: 'getting_started',
    xpReward: 10
  },
  api_connected: {
    title: 'AI Powered',
    description: 'Connect your Gemini API key',
    icon: '🤖',
    category: 'getting_started',
    xpReward: 15
  },
  first_transaction: {
    title: 'First Entry',
    description: 'Add your first transaction',
    icon: '💰',
    category: 'getting_started',
    xpReward: 50
  },
  first_receipt: {
    title: 'Receipt Keeper',
    description: 'Upload your first receipt',
    icon: '📄',
    category: 'getting_started',
    xpReward: 50
  },

  // Progress
  categorize_10: {
    title: 'Getting Organized',
    description: 'Categorize 10 transactions',
    icon: '📂',
    category: 'progress',
    xpReward: 100
  },
  categorize_50: {
    title: 'Organization Expert',
    description: 'Categorize 50 transactions',
    icon: '📚',
    category: 'progress',
    xpReward: 200
  },
  categorize_100: {
    title: 'Master Organizer',
    description: 'Categorize 100 transactions',
    icon: '🏆',
    category: 'progress',
    xpReward: 500,
    hidden: true
  },
  receipt_master: {
    title: 'Receipt Master',
    description: 'Upload 25 receipts',
    icon: '📸',
    category: 'progress',
    xpReward: 250
  },

  // Mastery
  first_export: {
    title: 'Tax Ready',
    description: 'Export your first report',
    icon: '📊',
    category: 'mastery',
    xpReward: 150
  },
  tax_ready: {
    title: 'Compliance Pro',
    description: 'Generate a Schedule C export',
    icon: '📋',
    category: 'mastery',
    xpReward: 300
  },
  mileage_warrior: {
    title: 'Mile High Club',
    description: 'Track 100 business miles',
    icon: '🚗',
    category: 'mastery',
    xpReward: 200
  },
  organized: {
    title: 'Organized Business',
    description: 'Maintain all transactions categorized for 30 days',
    icon: '✨',
    category: 'mastery',
    xpReward: 500,
    hidden: true
  },
  quality_control: {
    title: 'Quality Control',
    description: 'Validate 10 receipts for accuracy',
    icon: '✓',
    category: 'mastery',
    xpReward: 100
  },
  perfectionist: {
    title: 'The Perfectionist',
    description: 'Catch and correct 5 OCR errors',
    icon: '🔍',
    category: 'mastery',
    xpReward: 150
  },
  duplicate_detective: {
    title: 'Duplicate Detective',
    description: 'Link 10 receipts to transactions',
    icon: '🔗',
    category: 'mastery',
    xpReward: 100
  },
  efficiency_expert: {
    title: 'Efficiency Expert',
    description: 'Use bulk recategorization tools',
    icon: '⚡',
    category: 'mastery',
    xpReward: 100
  },
  automation_master: {
    title: 'Automation Master',
    description: 'Create 5 vendor category defaults',
    icon: '🤖',
    category: 'mastery',
    xpReward: 150
  },

  // Milestones
  level_3: {
    title: 'Getting Started',
    description: 'Reach Level 3 - Validator',
    icon: '⭐',
    category: 'milestones',
    xpReward: 100
  },
  level_6: {
    title: 'Master of Books',
    description: 'Reach Max Level 6 - Full Access',
    icon: '👑',
    category: 'milestones',
    xpReward: 500
  },
  first_week: {
    title: 'Week One Down',
    description: 'Use the app for 7 consecutive days',
    icon: '📅',
    category: 'milestones',
    xpReward: 150
  },
  first_month: {
    title: 'Monthly Milestone',
    description: 'Use the app for 30 days',
    icon: '🗓️',
    category: 'milestones',
    xpReward: 500,
    hidden: true
  },
  power_user: {
    title: 'Power User',
    description: 'Use all major features',
    icon: '⚡',
    category: 'milestones',
    xpReward: 750,
    hidden: true
  },

  // New achievements for niche workflows
  first_invoice: {
    title: 'Invoice Creator',
    description: 'Create your first client invoice',
    icon: '📝',
    category: 'getting_started',
    xpReward: 75
  },
  invoice_pro: {
    title: 'Invoice Pro',
    description: 'Create 10 client invoices',
    icon: '💸',
    category: 'progress',
    xpReward: 200
  },
  supporting_docs: {
    title: 'Document Keeper',
    description: 'Upload your first supporting document',
    icon: '📁',
    category: 'getting_started',
    xpReward: 50
  },
  category_trainer: {
    title: 'AI Trainer',
    description: 'Make 10 categorization corrections to train the AI',
    icon: '🧠',
    category: 'mastery',
    xpReward: 150
  },
  batch_scanner: {
    title: 'Batch Master',
    description: 'Scan 10 receipts in a single batch upload',
    icon: '📷',
    category: 'mastery',
    xpReward: 100
  },
  report_generator: {
    title: 'Report Builder',
    description: 'Generate your first expense report',
    icon: '📊',
    category: 'mastery',
    xpReward: 100
  }
}

/**
 * Check if an achievement should be unlocked based on user activity
 */
export function checkAchievements(stats: {
  transactionCount: number
  receiptCount: number
  categorizedCount: number
  exportCount: number
  businessMiles: number
  currentLevel: number
  daysActive: number
  consecutiveDays: number
  hasApiKey: boolean
  hasSelectedPath: boolean
  hasOnboarded: boolean
}): AchievementId[] {
  const toUnlock: AchievementId[] = []

  // Getting Started
  if (stats.hasOnboarded) toUnlock.push('onboarding_complete')
  if (stats.hasSelectedPath) toUnlock.push('job_type_selected')
  if (stats.hasApiKey) toUnlock.push('api_connected')
  if (stats.transactionCount >= 1) toUnlock.push('first_transaction')
  if (stats.receiptCount >= 1) toUnlock.push('first_receipt')

  // Progress
  if (stats.categorizedCount >= 10) toUnlock.push('categorize_10')
  if (stats.categorizedCount >= 50) toUnlock.push('categorize_50')
  if (stats.categorizedCount >= 100) toUnlock.push('categorize_100')
  if (stats.receiptCount >= 25) toUnlock.push('receipt_master')

  // Mastery
  if (stats.exportCount >= 1) toUnlock.push('first_export')
  if (stats.exportCount >= 1) toUnlock.push('tax_ready') // Schedule C export
  if (stats.businessMiles >= 100) toUnlock.push('mileage_warrior')
  
  // Milestones
  if (stats.currentLevel >= 3) toUnlock.push('level_3')
  if (stats.currentLevel >= 6) toUnlock.push('level_6')
  if (stats.consecutiveDays >= 7) toUnlock.push('first_week')
  if (stats.daysActive >= 30) toUnlock.push('first_month')

  return toUnlock
}

/**
 * Get category stats for badge display
 */
export function getAchievementsByCategory() {
  const categories = {
    getting_started: [] as Achievement[],
    progress: [] as Achievement[],
    mastery: [] as Achievement[],
    milestones: [] as Achievement[]
  }

  Object.entries(ACHIEVEMENTS).forEach(([id, achievement]) => {
    categories[achievement.category].push({
      ...achievement,
      id: id as AchievementId
    })
  })

  return categories
}
