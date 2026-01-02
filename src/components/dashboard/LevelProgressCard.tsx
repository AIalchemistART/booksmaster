'use client'

import { useStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LEVELS } from '@/lib/gamification/leveling-system'
import { Trophy, Zap } from 'lucide-react'

export function LevelProgressCard() {
  const { userProgress } = useStore()
  
  const currentLevelData = LEVELS.find(l => l.level === userProgress.currentLevel)
  const nextLevelData = LEVELS.find(l => l.level === (userProgress.currentLevel + 1))
  
  if (!currentLevelData) return null
  
  const progressToNextLevel = nextLevelData 
    ? ((userProgress.currentXP - currentLevelData.xpRequired) / (nextLevelData.xpRequired - currentLevelData.xpRequired)) * 100
    : 100
  
  const xpInCurrentLevel = userProgress.currentXP - currentLevelData.xpRequired
  const xpNeededForNext = nextLevelData ? nextLevelData.xpRequired - currentLevelData.xpRequired : 0

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Your Progress
          </span>
          <span className="text-2xl">{currentLevelData.badge}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Level Info */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Level {userProgress.currentLevel}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentLevelData.title}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Zap className="h-4 w-4" />
                  <span className="font-semibold">{userProgress.totalXP} XP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {nextLevelData && (
            <div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>{xpInCurrentLevel} / {xpNeededForNext} XP</span>
                <span>{Math.floor(progressToNextLevel)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                  style={{ width: `${Math.min(progressToNextLevel, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Next: Level {nextLevelData.level} - {nextLevelData.title}
              </p>
            </div>
          )}

          {userProgress.currentLevel === 6 && (
            <div className="text-center p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                👑 Max Level Reached!
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                You've mastered the system
              </p>
            </div>
          )}

          {/* Unlocked Features */}
          {currentLevelData.unlocksFeatures.length > 0 && (
            <div className="pt-3 border-t dark:border-blue-700">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Features at this level:
              </p>
              <div className="flex flex-wrap gap-1">
                {currentLevelData.unlocksFeatures.slice(0, 3).map((feature, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded"
                  >
                    {feature.replace(/_/g, ' ')}
                  </span>
                ))}
                {currentLevelData.unlocksFeatures.length > 3 && (
                  <span className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400">
                    +{currentLevelData.unlocksFeatures.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
