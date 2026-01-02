'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useStore } from '@/store'
import { ACHIEVEMENTS, type AchievementId } from '@/lib/gamification/achievements'
import { Lock, Trophy } from 'lucide-react'
import { useState } from 'react'

interface AchievementCardProps {
  id: AchievementId
  isUnlocked: boolean
  unlockedAt?: string
}

function AchievementCard({ id, isUnlocked, unlockedAt }: AchievementCardProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const achievement = ACHIEVEMENTS[id]
  
  if (!achievement) return null

  // Format the unlock hint based on the achievement
  const getUnlockHint = (): string => {
    switch (id) {
      case 'onboarding_complete': return 'Complete the setup wizard'
      case 'job_type_selected': return 'Go to Settings and select your job type'
      case 'api_connected': return 'Add your Gemini API key in Settings'
      case 'first_transaction': return 'Create or import your first transaction'
      case 'first_receipt': return 'Upload and scan your first receipt'
      case 'categorize_10': return 'Categorize 10 transactions correctly'
      case 'categorize_50': return 'Keep categorizing - 50 transactions total'
      case 'categorize_100': return 'Become a categorization master - 100 transactions'
      case 'receipt_master': return 'Upload 25 receipts to the system'
      case 'first_export': return 'Export your data from the Reports page'
      case 'tax_ready': return 'Generate a Schedule C format export'
      case 'mileage_warrior': return 'Track 100+ business miles in Mileage Tracking'
      case 'level_3': return 'Validate your first receipt to reach Level 3'
      case 'level_6': return 'Complete all feature unlocks to reach Level 6'
      case 'first_week': return 'Use the app for 7 consecutive days'
      case 'first_month': return 'Stay active for 30 days'
      case 'organized': return 'Keep all transactions categorized for 30 days'
      case 'power_user': return 'Try all major features in the app'
      case 'quality_control': return 'Validate 10 receipts for accuracy'
      case 'perfectionist': return 'Catch and correct 5 OCR parsing errors'
      case 'duplicate_detective': return 'Link 10 receipts to their transactions'
      case 'efficiency_expert': return 'Use the bulk recategorization tools'
      case 'automation_master': return 'Create 5 vendor category defaults'
      case 'first_invoice': return 'Create your first client invoice'
      case 'invoice_pro': return 'Create 10 invoices for your clients'
      case 'supporting_docs': return 'Upload a payment receipt or manifest'
      case 'category_trainer': return 'Make 10 category corrections to train AI'
      case 'batch_scanner': return 'Scan 10+ receipts in one batch upload'
      case 'report_generator': return 'Generate an expense report'
      default: return achievement.description
    }
  }

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div 
        className={`p-4 rounded-xl border-2 transition-all ${
          isUnlocked 
            ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-300 dark:border-amber-700'
            : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 opacity-75'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`text-3xl ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
            {isUnlocked ? achievement.icon : '🔒'}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold text-sm truncate ${
              isUnlocked 
                ? 'text-gray-900 dark:text-gray-100' 
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {isUnlocked ? achievement.title : '???'}
            </h4>
            <p className={`text-xs truncate ${
              isUnlocked 
                ? 'text-gray-600 dark:text-gray-400' 
                : 'text-gray-400 dark:text-gray-500'
            }`}>
              {isUnlocked ? achievement.description : getUnlockHint()}
            </p>
            {isUnlocked && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                +{achievement.xpReward} XP
              </p>
            )}
          </div>
          {!isUnlocked && (
            <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg shadow-lg max-w-xs whitespace-normal">
          <div className="font-semibold mb-1">
            {isUnlocked ? achievement.title : 'How to unlock:'}
          </div>
          <div>
            {isUnlocked 
              ? `${achievement.description} (+${achievement.xpReward} XP)`
              : getUnlockHint()
            }
          </div>
          {isUnlocked && unlockedAt && (
            <div className="text-gray-400 dark:text-gray-600 mt-1">
              Unlocked: {new Date(unlockedAt).toLocaleDateString()}
            </div>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
        </div>
      )}
    </div>
  )
}

export function AchievementsDisplay() {
  const { unlockedAchievements } = useStore()
  
  // Get all achievement IDs
  const allAchievementIds = Object.keys(ACHIEVEMENTS) as AchievementId[]
  
  // Filter out hidden achievements that aren't unlocked
  const visibleAchievements = allAchievementIds.filter(id => {
    const achievement = ACHIEVEMENTS[id]
    const isUnlocked = unlockedAchievements.some(a => a.id === id)
    return !achievement.hidden || isUnlocked
  })

  // Count unlocked
  const unlockedCount = unlockedAchievements.length
  const totalVisible = visibleAchievements.length

  // Group by category for display
  const categories = [
    { key: 'getting_started', label: 'Getting Started', icon: '🚀' },
    { key: 'progress', label: 'Progress', icon: '📈' },
    { key: 'mastery', label: 'Mastery', icon: '🎓' },
    { key: 'milestones', label: 'Milestones', icon: '🏆' }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Achievements
          </div>
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            {unlockedCount} / {totalVisible} unlocked
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {categories.map(category => {
            const categoryAchievements = visibleAchievements.filter(
              id => ACHIEVEMENTS[id].category === category.key
            )
            
            if (categoryAchievements.length === 0) return null

            return (
              <div key={category.key}>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <span>{category.icon}</span>
                  {category.label}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {categoryAchievements.map(id => {
                    const unlocked = unlockedAchievements.find(a => a.id === id)
                    return (
                      <AchievementCard 
                        key={id}
                        id={id}
                        isUnlocked={!!unlocked}
                        unlockedAt={unlocked?.unlockedAt}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
