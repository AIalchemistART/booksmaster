'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { CheckCircle2, Circle, Sparkles, ChevronRight } from 'lucide-react'
import type { Quest } from '@/lib/gamification/quest-system'

interface QuestCardProps {
  quest: Quest
  onAction?: () => void
}

export function QuestCard({ quest, onAction }: QuestCardProps) {
  const isCompleted = quest.status === 'completed'
  const isActive = quest.status === 'active'

  return (
    <Card className={`transition-all ${
      isCompleted 
        ? 'opacity-60 border-green-500/50' 
        : isActive 
          ? 'border-purple-500 shadow-lg shadow-purple-500/20' 
          : 'opacity-40 border-gray-700'
    }`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Quest Icon */}
          <div className={`flex-shrink-0 p-4 rounded-full ${
            isCompleted 
              ? 'bg-green-500/20' 
              : isActive 
                ? 'bg-gradient-to-br from-purple-500 to-indigo-500' 
                : 'bg-gray-700'
          }`}>
            <span className="text-3xl">{quest.icon}</span>
          </div>

          {/* Quest Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {quest.title}
              </h3>
              {isCompleted && (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              )}
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {quest.description}
            </p>

            {/* Progress Bar for Milestone Quest */}
            {quest.progress && isActive && (
              <div className="mb-3 space-y-2">
                <Progress 
                  value={(quest.progress.current / quest.progress.target) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {quest.progress.label}
                </p>
              </div>
            )}

            {/* Unlock Badge */}
            <div className="flex items-center justify-between">
              <Badge 
                variant="outline" 
                className={
                  isCompleted 
                    ? 'border-green-500 text-green-700 dark:text-green-400'
                    : 'border-purple-500 text-purple-700 dark:text-purple-400'
                }
              >
                {isCompleted ? 'Completed' : `Unlocks ${quest.unlocks}`}
              </Badge>

              {/* Action Button for Start Scanning Quest */}
              {isActive && quest.id === 'start_scanning' && onAction && (
                <Button
                  onClick={onAction}
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
                >
                  <span className="mr-1">Start</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface QuestListProps {
  quests: Quest[]
  onStartScanning?: () => void
}

export function QuestList({ quests, onStartScanning }: QuestListProps) {
  if (quests.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-purple-500" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {quests.length === 1 ? 'Your Next Quest' : 'Active Quests'}
        </h2>
      </div>

      <div className="space-y-3">
        {quests.map(quest => (
          <QuestCard 
            key={quest.id} 
            quest={quest}
            onAction={quest.id === 'start_scanning' ? onStartScanning : undefined}
          />
        ))}
      </div>
    </div>
  )
}
