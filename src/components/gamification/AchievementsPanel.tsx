'use client'

import { useStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { getAchievementsByCategory, type Achievement } from '@/lib/gamification/achievements'
import { Trophy, Lock } from 'lucide-react'

export function AchievementsPanel() {
  const { unlockedAchievements } = useStore()
  const categories = getAchievementsByCategory()

  const isUnlocked = (id: string) => {
    return unlockedAchievements.some(a => a.id === id)
  }

  const renderAchievement = (achievement: Achievement, unlocked: boolean) => {
    const unlockedData = unlockedAchievements.find(a => a.id === achievement.id)
    
    return (
      <div
        key={achievement.id}
        className={`p-3 border dark:border-gray-700 rounded-lg transition-all ${
          unlocked
            ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800'
            : 'bg-gray-50 dark:bg-gray-800 opacity-60'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`text-3xl ${unlocked ? '' : 'grayscale'}`}>
            {achievement.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                {achievement.title}
              </h4>
              {unlocked && (
                <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              )}
              {!unlocked && achievement.hidden && (
                <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              {achievement.description}
            </p>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                unlocked
                  ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50'
                  : 'text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-700'
              }`}>
                {achievement.xpReward} XP
              </span>
              {unlocked && unlockedData?.unlockedAt && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(unlockedData.unlockedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const categoryOrder: Array<keyof typeof categories> = ['getting_started', 'progress', 'mastery', 'milestones']
  const categoryLabels = {
    getting_started: 'Getting Started',
    progress: 'Progress',
    mastery: 'Mastery',
    milestones: 'Milestones'
  }

  const totalAchievements = Object.values(categories).flat().length
  const unlockedCount = unlockedAchievements.length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            Achievements
          </span>
          <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
            {unlockedCount} / {totalAchievements}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {categoryOrder.map(categoryKey => {
            const categoryAchievements = categories[categoryKey]
            const unlockedInCategory = categoryAchievements.filter(a => isUnlocked(a.id)).length

            return (
              <div key={categoryKey}>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-between">
                  <span>{categoryLabels[categoryKey]}</span>
                  <span className="text-xs font-normal text-gray-500">
                    {unlockedInCategory} / {categoryAchievements.length}
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryAchievements.map(achievement => 
                    renderAchievement(achievement, isUnlocked(achievement.id))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
