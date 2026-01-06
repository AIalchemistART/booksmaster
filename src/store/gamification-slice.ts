import { StateCreator } from 'zustand'
import type { UserProgress, TechTreePath, UserLevel } from '@/lib/gamification/leveling-system'
import { awardXP, XP_REWARDS, REPEATABLE_XP_REWARDS, ONE_TIME_XP_REWARDS, BATCH_XP_REWARDS, DAILY_XP_REWARDS, getUnlockedFeaturesAtLevel, calculateLevel, LEVELS } from '@/lib/gamification/leveling-system'
import type { AchievementId, Achievement } from '@/lib/gamification/achievements'
import { ACHIEVEMENTS, checkAchievements } from '@/lib/gamification/achievements'
import { saveGamificationData, loadGamificationData, deleteGamificationData } from '@/lib/file-system/gamification-persistence'
import type { QuestProgress, QuestId, Quest } from '@/lib/gamification/quest-system'
import { getActiveQuests, canTransactionTriggerQuest, isMilestoneQuestComplete } from '@/lib/gamification/quest-system'

// Track daily batch operations to prevent XP boosting
interface DailyBatchTracker {
  date: string  // YYYY-MM-DD
  parseCount: number
  validateCount: number
}

export interface GamificationSlice {
  userProgress: UserProgress
  unlockedAchievements: Achievement[]
  pendingAchievement: Achievement | null
  pendingLevelUp: UserLevel | null  // Track pending level-up for notification
  lastUnlockedFeature: string | null  // Track which feature was just unlocked for display
  dailyBatchTracker: DailyBatchTracker
  questProgress: QuestProgress  // Quest system state
  
  // Actions
  initializeUserProgress: () => void
  selectTechPath: (path: TechTreePath) => void
  selectCustomPath: (nodeIds: string[]) => void
  manualLevelUp: (unlockedFeature?: string) => void  // Manually increment level by 1, optionally specify feature unlocked
  completeAction: (action: keyof typeof XP_REWARDS) => { leveledUp: boolean; newLevel?: UserLevel; xpGained: number }
  completeBatchAction: (type: 'parse' | 'validate', count: number) => { leveledUp: boolean; newLevel?: UserLevel; xpGained: number }
  completeOnboarding: () => void
  isFeatureUnlocked: (feature: string) => boolean
  unlockAchievement: (id: AchievementId) => void
  dismissAchievement: () => void
  dismissLevelUp: () => void  // Dismiss level-up notification
  checkAndUnlockAchievements: () => void
  resetProgress: () => void
  
  // Quest actions
  completeQuest: (questId: QuestId) => void
  markTransactionUsedForQuest: (transactionId: string, questType: 'edit_transaction' | 'validate_transaction') => void
  incrementMilestone: (type: 'validatedTransactions' | 'supplementalDocs' | 'categorizations') => void
  getActiveQuests: () => Quest[]
}

const DEFAULT_USER_PROGRESS: UserProgress = {
  currentLevel: 1,
  currentXP: 0,
  totalXP: 0,
  completedActions: [],
  unlockedFeatures: ['settings', 'dashboard'],
  onboardingComplete: false
}

const DEFAULT_QUEST_PROGRESS: QuestProgress = {
  completedQuests: [],
  activeQuests: ['start_scanning'],
  transactionIdsUsedForQuests: {},
  milestoneProgress: {
    validatedTransactions: 0,
    supplementalDocs: 0,
    categorizations: 0
  }
}

export const createGamificationSlice: StateCreator<
  GamificationSlice
> = (set, get) => ({
  userProgress: DEFAULT_USER_PROGRESS,
  unlockedAchievements: [],
  pendingAchievement: null,
  pendingLevelUp: null,
  lastUnlockedFeature: null,
  dailyBatchTracker: { date: '', parseCount: 0, validateCount: 0 },
  questProgress: DEFAULT_QUEST_PROGRESS,

  initializeUserProgress: async () => {
    // NOTE: This is now handled by zustand persist automatically
    // This function is kept for backward compatibility but does nothing
    // zustand persist will rehydrate userProgress from localStorage on app start
    console.log('[GAMIFICATION] Using zustand persist for state management')
  },

  selectTechPath: (path: TechTreePath) => {
    set((state) => {
      const newProgress = {
        ...state.userProgress,
        selectedTechPath: path,
        isCustomPath: false,
        customSelectedNodes: undefined
      }
      // File system backup only - zustand persist handles localStorage
      saveGamificationData(newProgress, state.unlockedAchievements).catch(console.error)
      return { userProgress: newProgress }
    })
  },
  
  selectCustomPath: (nodeIds: string[]) => {
    set((state) => {
      const newProgress = {
        ...state.userProgress,
        isCustomPath: true,
        customSelectedNodes: nodeIds,
        selectedTechPath: undefined
      }
      // File system backup only - zustand persist handles localStorage
      saveGamificationData(newProgress, state.unlockedAchievements).catch(console.error)
      return { userProgress: newProgress }
    })
  },

  manualLevelUp: (unlockedFeature?: string) => {
    set((state) => {
      const currentLevel = state.userProgress.currentLevel
      
      // Max level check
      if (currentLevel >= 6) {
        console.log('[LEVEL UP] Already at max level 6')
        return state
      }
      
      // Increment by 1
      const newLevel = (currentLevel + 1) as UserLevel
      
      // Get features for the new level
      // If a specific feature is provided, use current features + that feature
      // Otherwise preserve existing features and add default features for the new level
      let newFeatures: string[]
      if (unlockedFeature) {
        // Add the specified feature to existing features (if not already present)
        newFeatures = state.userProgress.unlockedFeatures.includes(unlockedFeature)
          ? state.userProgress.unlockedFeatures
          : [...state.userProgress.unlockedFeatures, unlockedFeature]
      } else {
        // Preserve existing features (including custom ones) and add default features for new level
        const levelData = LEVELS.find(l => l.level === newLevel)
        const defaultFeaturesForLevel = levelData?.unlocksFeatures || []
        // Combine existing + new default features, deduplicate with Set
        const combined = [...state.userProgress.unlockedFeatures, ...defaultFeaturesForLevel]
        newFeatures = Array.from(new Set(combined))
      }
      
      // Award cosmetic XP to match the new level
      const newLevelData = LEVELS.find(l => l.level === newLevel)
      const cosmeticXP = newLevelData ? newLevelData.xpRequired : state.userProgress.totalXP
      
      const newProgress = {
        ...state.userProgress,
        currentLevel: newLevel,
        unlockedFeatures: newFeatures,
        totalXP: Math.max(cosmeticXP, state.userProgress.totalXP),
        currentXP: Math.max(cosmeticXP, state.userProgress.currentXP)
      }
      
      console.log(`[LEVEL UP] Incremented from Level ${currentLevel} → Level ${newLevel} (cosmetic XP: ${cosmeticXP})`)
      console.log(`[LEVEL UP] Feature unlocked:`, unlockedFeature || 'default')
      console.log(`[LEVEL UP] All features unlocked:`, newFeatures)
      
      // File system backup only - zustand persist handles localStorage
      saveGamificationData(newProgress, state.unlockedAchievements).catch(console.error)
      
      // Debug: Verify localStorage after update
      setTimeout(() => {
        const stored = localStorage.getItem('thomas-books-storage')
        if (stored) {
          const parsed = JSON.parse(stored)
          console.log('[LEVEL UP] Verified localStorage currentLevel:', parsed.state?.userProgress?.currentLevel)
        }
      }, 100)
      
      return {
        userProgress: newProgress,
        pendingLevelUp: newLevel,
        lastUnlockedFeature: unlockedFeature || null
      }
    })
    
    // Unlock milestone achievements AFTER state update completes
    const finalLevel = get().userProgress.currentLevel
    if (finalLevel === 3) {
      get().unlockAchievement('level_3')
      console.log('[LEVEL UP] ✅ Unlocked level_3 achievement')
    } else if (finalLevel === 6) {
      get().unlockAchievement('level_6')
      console.log('[LEVEL UP] ✅ Unlocked level_6 achievement')
    }
  },

  completeAction: (action: keyof typeof XP_REWARDS) => {
    const currentProgress = get().userProgress
    
    // Check if this is a one-time action that's already been completed
    const isOneTimeAction = action in ONE_TIME_XP_REWARDS
    const isDailyAction = action in DAILY_XP_REWARDS
    const isBatchAction = action in BATCH_XP_REWARDS
    
    // Skip batch actions here - they should use completeBatchAction
    if (isBatchAction) {
      console.log(`[XP] Skipping batch action ${action} - use completeBatchAction instead`)
      return { leveledUp: false, xpGained: 0 }
    }
    
    if (isOneTimeAction && currentProgress.completedActions.includes(action)) {
      // One-time actions can only award XP once
      return { leveledUp: false, xpGained: 0 }
    }

    // Award cosmetic XP only - PRESERVE manual level
    console.log(`[XP BEFORE] ${action} - Current: Level ${currentProgress.currentLevel}, XP ${currentProgress.totalXP}`)
    const xpGained = XP_REWARDS[action]
    const newTotalXP = currentProgress.totalXP + xpGained
    
    // CAP XP: Don't exceed next level requirement (maintain suspension of disbelief)
    const nextLevelData = LEVELS.find(l => l.level === currentProgress.currentLevel + 1)
    const cappedXP = nextLevelData && newTotalXP >= nextLevelData.xpRequired
      ? Math.floor(nextLevelData.xpRequired * 0.9)
      : newTotalXP
    
    if (cappedXP !== newTotalXP) {
      console.log(`[XP] Capped at ${cappedXP} XP (90% of Level ${nextLevelData?.level} requirement: ${nextLevelData?.xpRequired})`)
    }
    
    // For daily/repeatable actions, don't add to completedActions (to save memory)
    // For one-time actions, track that they've been completed
    const newCompletedActions = isDailyAction 
      ? currentProgress.completedActions 
      : currentProgress.completedActions.includes(action) 
        ? currentProgress.completedActions 
        : [...currentProgress.completedActions, action]
    
    // CRITICAL: Preserve currentLevel - don't call calculateLevel()
    const finalProgress: UserProgress = {
      ...currentProgress,
      totalXP: cappedXP,
      currentXP: cappedXP,
      completedActions: newCompletedActions
      // currentLevel is NOT modified - manual leveling only
    }
    
    console.log(`[XP FINAL] ${action} - Final: Level ${finalProgress.currentLevel}, XP ${finalProgress.totalXP}, unlockedFeatures:`, finalProgress.unlockedFeatures)
    
    const state = get()
    set({ userProgress: finalProgress })
    // File system backup only - zustand persist handles localStorage
    saveGamificationData(finalProgress, state.unlockedAchievements).catch(console.error)
    
    console.log(`[XP] ${action}: +${xpGained} XP (Total: ${finalProgress.totalXP}, Level: ${finalProgress.currentLevel})`)
    console.log(`[XP VERIFY] After set() - store level:`, get().userProgress.currentLevel)

    return {
      leveledUp: false, // Manual leveling system - no auto level-ups
      newLevel: undefined,
      xpGained
    }
  },

  // Handle batch operations with flat XP (prevents boosting from large batches)
  completeBatchAction: (type: 'parse' | 'validate', count: number) => {
    const currentProgress = get().userProgress
    const today = new Date().toISOString().split('T')[0]
    let tracker = get().dailyBatchTracker
    
    // Reset tracker if it's a new day
    if (tracker.date !== today) {
      tracker = { date: today, parseCount: 0, validateCount: 0 }
    }
    
    // Determine XP gain based on type and tracker
    let xpGained: number
    if (type === 'parse') {
      // First batch parse of the day gets bonus, subsequent get small XP
      xpGained = tracker.parseCount === 0 
        ? BATCH_XP_REWARDS.batchParseFirst 
        : BATCH_XP_REWARDS.batchParseSubsequent
      tracker.parseCount++
    } else {
      // First batch validate of the day gets bonus, subsequent get small XP
      xpGained = tracker.validateCount === 0 
        ? BATCH_XP_REWARDS.batchValidateFirst 
        : BATCH_XP_REWARDS.batchValidateSubsequent
      tracker.validateCount++
    }
    
    const newTotalXP = currentProgress.totalXP + xpGained
    console.log(`[BATCH XP BEFORE] ${type} - Current: Level ${currentProgress.currentLevel}, XP ${currentProgress.totalXP}`)
    
    // CAP XP: Don't exceed next level requirement (maintain suspension of disbelief)
    const nextLevelData = LEVELS.find(l => l.level === currentProgress.currentLevel + 1)
    const cappedXP = nextLevelData && newTotalXP >= nextLevelData.xpRequired
      ? Math.floor(nextLevelData.xpRequired * 0.9)
      : newTotalXP
    
    if (cappedXP !== newTotalXP) {
      console.log(`[XP] Capped at ${cappedXP} XP (90% of Level ${nextLevelData?.level} requirement: ${nextLevelData?.xpRequired})`)
    }
    
    // CRITICAL: Preserve currentLevel - don't call calculateLevel()
    const finalProgress: UserProgress = {
      ...currentProgress,
      totalXP: cappedXP,
      currentXP: cappedXP
      // currentLevel is NOT modified - manual leveling only
      // unlockedFeatures stay as-is - manual leveling controls this
    }
    
    console.log(`[BATCH XP FINAL] ${type} - Final: Level ${finalProgress.currentLevel}, XP ${finalProgress.totalXP}`)
    
    const state = get()
    set({ 
      userProgress: finalProgress,
      dailyBatchTracker: tracker
    })
    saveGamificationData(finalProgress, state.unlockedAchievements).catch(console.error)
    
    console.log(`[XP] Batch ${type} (${count} items): +${xpGained} XP (Total: ${finalProgress.totalXP}, Level: ${finalProgress.currentLevel})`)
    console.log(`[BATCH XP VERIFY] After set() - store level:`, get().userProgress.currentLevel)
    
    return {
      leveledUp: false, // Manual leveling system - no auto level-ups
      newLevel: undefined,
      xpGained
    }
  },

  completeOnboarding: () => {
    set((state) => {
      const newProgress = {
        ...state.userProgress,
        onboardingComplete: true
      }
      // File system backup only - zustand persist handles localStorage
      saveGamificationData(newProgress, state.unlockedAchievements).catch(console.error)
      return { userProgress: newProgress }
    })
  },

  isFeatureUnlocked: (feature: string) => {
    return get().userProgress.unlockedFeatures.includes(feature)
  },
  
  unlockAchievement: (id: AchievementId) => {
    const achievementDef = ACHIEVEMENTS[id]
    if (!achievementDef) return
    
    const current = get().unlockedAchievements
    const alreadyUnlocked = current.some(a => a.id === id)
    
    if (alreadyUnlocked) return
    
    const achievement: Achievement = {
      ...achievementDef,
      id,
      unlockedAt: new Date().toISOString()
    }
    
    const newAchievements = [...current, achievement]
    const state = get()
    
    // Award XP from achievement
    const currentProgress = state.userProgress
    const xpGained = achievementDef.xpReward
    const newTotalXP = currentProgress.totalXP + xpGained
    
    // CAP XP: Don't exceed next level requirement (90% cap)
    const nextLevelData = LEVELS.find(l => l.level === currentProgress.currentLevel + 1)
    const cappedXP = nextLevelData && newTotalXP >= nextLevelData.xpRequired
      ? Math.floor(nextLevelData.xpRequired * 0.9)
      : newTotalXP
    
    const updatedProgress: UserProgress = {
      ...currentProgress,
      totalXP: cappedXP,
      currentXP: cappedXP
    }
    
    set({
      unlockedAchievements: newAchievements,
      pendingAchievement: achievement,
      userProgress: updatedProgress
    })
    
    // Save to file system
    saveGamificationData(updatedProgress, newAchievements).catch(console.error)
    
    console.log(`🏆 Achievement Unlocked: ${achievement.title} (+${xpGained} XP)`)
  },
  
  dismissAchievement: () => {
    set({ pendingAchievement: null })
  },
  
  dismissLevelUp: () => {
    set({ pendingLevelUp: null, lastUnlockedFeature: null })
  },
  
  checkAndUnlockAchievements: () => {
    const state = get()
    // This would be called periodically to check for new achievements
    // For now, it's a placeholder - achievements will be unlocked via explicit calls
  },

  resetProgress: () => {
    localStorage.removeItem('thomas-books-user-progress')
    deleteGamificationData().catch(console.error)
    set({ 
      userProgress: DEFAULT_USER_PROGRESS,
      unlockedAchievements: [],
      pendingAchievement: null,
      questProgress: DEFAULT_QUEST_PROGRESS
    })
  },

  // Quest System Actions
  completeQuest: (questId: QuestId) => {
    set((state) => {
      if (state.questProgress.completedQuests.includes(questId)) {
        return state // Already completed
      }

      const newQuestProgress = {
        ...state.questProgress,
        completedQuests: [...state.questProgress.completedQuests, questId],
        activeQuests: state.questProgress.activeQuests.filter(q => q !== questId)
      }

      console.log(`[QUEST] Completed: ${questId}`)
      return { questProgress: newQuestProgress }
    })
  },

  markTransactionUsedForQuest: (transactionId: string, questType: 'edit_transaction' | 'validate_transaction') => {
    set((state) => {
      const newQuestProgress = {
        ...state.questProgress,
        transactionIdsUsedForQuests: {
          ...state.questProgress.transactionIdsUsedForQuests,
          [questType]: [
            ...(state.questProgress.transactionIdsUsedForQuests[questType] || []),
            transactionId
          ]
        }
      }

      console.log(`[QUEST] Transaction ${transactionId} marked for ${questType}`)
      return { questProgress: newQuestProgress }
    })
  },

  incrementMilestone: (type: 'validatedTransactions' | 'supplementalDocs' | 'categorizations') => {
    set((state) => {
      const newQuestProgress = {
        ...state.questProgress,
        milestoneProgress: {
          ...state.questProgress.milestoneProgress,
          [type]: state.questProgress.milestoneProgress[type] + 1
        }
      }

      console.log(`[QUEST] Milestone ${type}: ${newQuestProgress.milestoneProgress[type]}`)

      // Check if milestone quest is complete and trigger level up
      if (isMilestoneQuestComplete(newQuestProgress) && !state.questProgress.completedQuests.includes('reach_milestones')) {
        console.log('[QUEST] Milestone quest complete! Unlocking Reports (Level 7)')
        
        // Complete the quest
        const finalQuestProgress = {
          ...newQuestProgress,
          completedQuests: [...newQuestProgress.completedQuests, 'reach_milestones' as const],
          activeQuests: newQuestProgress.activeQuests.filter(q => q !== 'reach_milestones')
        }
        
        // Level up if at level 6
        if (state.userProgress.currentLevel === 6) {
          const newLevel = 7 as UserLevel
          const newFeatures = getUnlockedFeaturesAtLevel(newLevel)
          const newLevelData = LEVELS.find(l => l.level === newLevel)
          const cosmeticXP = newLevelData ? newLevelData.xpRequired : state.userProgress.totalXP
          
          const newProgress = {
            ...state.userProgress,
            currentLevel: newLevel,
            unlockedFeatures: newFeatures,
            totalXP: Math.max(cosmeticXP, state.userProgress.totalXP),
            currentXP: Math.max(cosmeticXP, state.userProgress.currentXP)
          }
          
          console.log('[QUEST] Advanced from Level 6 → Level 7 (Reports unlocked)')
          
          saveGamificationData(newProgress, state.unlockedAchievements).catch(console.error)
          
          return {
            questProgress: finalQuestProgress,
            userProgress: newProgress,
            pendingLevelUp: newLevel
          }
        }
        
        return { questProgress: finalQuestProgress }
      }

      return { questProgress: newQuestProgress }
    })
  },

  getActiveQuests: () => {
    const state = get()
    return getActiveQuests(state.userProgress.currentLevel, state.questProgress)
  }
})
