'use client'

import { useStore } from '@/store'
import { LEVELS, getNextLevelRequirements } from '@/lib/gamification/leveling-system'
import { Card } from '@/components/ui/Card'
import { TrendingUp } from 'lucide-react'

export function LevelProgressBar() {
  const { userProgress } = useStore()
  
  const currentLevelData = LEVELS[userProgress.currentLevel - 1]
  const nextLevel = getNextLevelRequirements(userProgress.currentLevel, userProgress.currentXP)

  if (!nextLevel) {
    // Max level reached
    return (
      <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-2 border-amber-300 dark:border-amber-700">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{currentLevelData.badge}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-amber-800 dark:text-amber-200">
                  Level {userProgress.currentLevel} - {currentLevelData.title}
                </span>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  MAX LEVEL! 🎉
                </span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                You've mastered the entire system!
              </p>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  const progressPercent = (nextLevel.progress * 100).toFixed(0)

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{currentLevelData.badge}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Level {userProgress.currentLevel} - {currentLevelData.title}
              </span>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {userProgress.currentXP.toLocaleString()} XP
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              {currentLevelData.description}
            </p>
            
            {/* Progress bar */}
            <div className="relative">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {nextLevel.xpNeeded.toLocaleString()} XP to Level {nextLevel.nextLevel}
                </span>
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {progressPercent}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Next level preview */}
        <div className="pl-12 pt-2 border-t dark:border-gray-700">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <TrendingUp className="h-3 w-3" />
            <span>
              Next: <span className="font-medium text-gray-900 dark:text-gray-100">{nextLevel.nextLevelTitle}</span>
            </span>
          </div>
          {nextLevel.unlocksFeatures.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Unlocks: {nextLevel.unlocksFeatures.join(', ')}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
