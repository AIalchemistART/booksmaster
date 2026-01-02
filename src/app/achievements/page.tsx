'use client'

import { useStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getAchievementsByCategory, type Achievement, ACHIEVEMENTS } from '@/lib/gamification/achievements'
import { LEVELS, getNextLevelRequirements } from '@/lib/gamification/leveling-system'
import { Trophy, Lock, Zap, Star, Target, Award } from 'lucide-react'
import Link from 'next/link'

export default function AchievementsPage() {
  const { unlockedAchievements, userProgress } = useStore()
  const categories = getAchievementsByCategory()

  const isUnlocked = (id: string) => {
    return unlockedAchievements.some((a: { id: string }) => a.id === id)
  }

  const currentLevelData = LEVELS.find(l => l.level === userProgress.currentLevel)
  const nextLevel = getNextLevelRequirements(userProgress.currentLevel, userProgress.currentXP)

  const totalAchievements = Object.values(categories).flat().length
  const unlockedCount = unlockedAchievements.length
  const progressPercent = Math.round((unlockedCount / totalAchievements) * 100)

  const categoryOrder: Array<keyof typeof categories> = ['getting_started', 'progress', 'mastery', 'milestones']
  const categoryLabels = {
    getting_started: { name: 'Getting Started', icon: '🌱', description: 'Begin your bookkeeping journey' },
    progress: { name: 'Progress', icon: '📈', description: 'Track your growth and consistency' },
    mastery: { name: 'Mastery', icon: '⭐', description: 'Master advanced features' },
    milestones: { name: 'Milestones', icon: '🏆', description: 'Major accomplishments' }
  }

  const renderAchievement = (achievement: Achievement, unlocked: boolean) => {
    const unlockedData = unlockedAchievements.find((a: { id: string; unlockedAt?: string }) => a.id === achievement.id)
    
    return (
      <div
        key={achievement.id}
        className={`p-4 border dark:border-gray-700 rounded-xl transition-all ${
          unlocked
            ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-700 shadow-md'
            : 'bg-gray-50 dark:bg-gray-800/50 opacity-60'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`text-4xl ${unlocked ? 'animate-bounce-slow' : 'grayscale'}`}>
            {achievement.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`font-semibold ${unlocked ? 'text-amber-900 dark:text-amber-100' : 'text-gray-700 dark:text-gray-300'}`}>
                {achievement.title}
              </h4>
              {unlocked && (
                <Trophy className="h-4 w-4 text-amber-500 flex-shrink-0" />
              )}
              {!unlocked && achievement.hidden && (
                <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {achievement.description}
            </p>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                unlocked
                  ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50'
                  : 'text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-700'
              }`}>
                <Zap className="h-3 w-3 inline mr-1" />
                {achievement.xpReward} XP
              </span>
              {unlocked && unlockedData?.unlockedAt && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Unlocked {new Date(unlockedData.unlockedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <Trophy className="h-8 w-8 text-amber-500" />
          Achievements
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track your progress and unlock rewards as you master the system
        </p>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Current Level Card */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <span className="text-5xl block mb-2">{currentLevelData?.badge || '🌱'}</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Level {userProgress.currentLevel}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentLevelData?.title}
              </p>
              <div className="mt-4 flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
                <Zap className="h-5 w-5" />
                <span className="text-2xl font-bold">{userProgress.totalXP.toLocaleString()}</span>
                <span className="text-sm">XP</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievement Progress Card */}
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <Award className="h-12 w-12 mx-auto mb-2 text-amber-500" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {unlockedCount} / {totalAchievements}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Achievements Unlocked
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {progressPercent}% Complete
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Next Level Card */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <Target className="h-12 w-12 mx-auto mb-2 text-purple-500" />
              {nextLevel ? (
                <>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {nextLevel.xpNeeded.toLocaleString()} XP
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Until Level {nextLevel.nextLevel}
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-400 to-pink-500 transition-all duration-500"
                      style={{ width: `${nextLevel.progress * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {Math.round(nextLevel.progress * 100)}% Progress
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    MAX LEVEL! 🎉
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    You've mastered everything!
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievement Categories */}
      <div className="space-y-8">
        {categoryOrder.map(categoryKey => {
          const categoryAchievements = categories[categoryKey]
          const unlockedInCategory = categoryAchievements.filter(a => isUnlocked(a.id)).length
          const categoryInfo = categoryLabels[categoryKey]

          return (
            <Card key={categoryKey}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <span className="text-2xl">{categoryInfo.icon}</span>
                    <div>
                      <span className="text-lg">{categoryInfo.name}</span>
                      <p className="text-sm font-normal text-gray-500 dark:text-gray-400">
                        {categoryInfo.description}
                      </p>
                    </div>
                  </span>
                  <span className="text-sm font-normal bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                    {unlockedInCategory} / {categoryAchievements.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryAchievements.map(achievement => 
                    renderAchievement(achievement, isUnlocked(achievement.id))
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Back to Dashboard */}
      <div className="mt-8 text-center">
        <Link href="/">
          <Button variant="outline">
            ← Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
