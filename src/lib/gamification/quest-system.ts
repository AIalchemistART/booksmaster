/**
 * Quest System for Progressive Feature Unlocking
 * Guides users through the app by providing clear objectives
 */

export type QuestId = 
  | 'start_scanning'              // Level 1→2: Click "Start Scanning"
  | 'validate_first_receipt'      // Level 2→3: Validate first receipt
  | 'edit_transaction'            // Level 3→4: Edit a transaction
  | 'validate_transaction'        // Level 3→5: Validate a transaction (different from edit)
  | 'upload_supplemental'         // Level 3→6: Upload supplemental document
  | 'reach_milestones'            // Level 6→7: Complete all milestones

export type QuestStatus = 'locked' | 'active' | 'completed'

export interface Quest {
  id: QuestId
  title: string
  description: string
  unlocks: string // Feature name that unlocks on completion
  unlocksLevel: number
  status: QuestStatus
  icon: string
  progress?: {
    current: number
    target: number
    label: string
  }
}

export interface QuestProgress {
  completedQuests: QuestId[]
  activeQuests: QuestId[]
  
  // Track which transactions have been used for which quests
  // Prevents same transaction from completing multiple quests
  transactionIdsUsedForQuests: {
    edit_transaction?: string[]      // Transaction IDs that triggered edit quest
    validate_transaction?: string[]   // Transaction IDs that triggered validate quest
  }
  
  // Milestone tracking for Level 7
  milestoneProgress: {
    validatedTransactions: number
    supplementalDocs: number
    categorizations: number
  }
}

// Quest definitions
export const QUEST_DEFINITIONS: Record<QuestId, Omit<Quest, 'status' | 'progress'>> = {
  start_scanning: {
    id: 'start_scanning',
    title: 'Start Your Bookkeeping Journey',
    description: 'Click "Start Scanning" to unlock Receipt Scanning',
    unlocks: 'receipts',
    unlocksLevel: 2,
    icon: '📸'
  },
  
  validate_first_receipt: {
    id: 'validate_first_receipt',
    title: 'Validate Your First Receipt',
    description: 'Review and validate a scanned receipt to unlock Transactions',
    unlocks: 'transactions',
    unlocksLevel: 3,
    icon: '✅'
  },
  
  edit_transaction: {
    id: 'edit_transaction',
    title: 'Edit a Transaction',
    description: 'Make corrections to a transaction to unlock Categorization Changes',
    unlocks: 'categorization_changes',
    unlocksLevel: 4,
    icon: '✏️'
  },
  
  validate_transaction: {
    id: 'validate_transaction',
    title: 'Validate a Transaction',
    description: 'Confirm a transaction is correct to unlock Invoices',
    unlocks: 'invoices',
    unlocksLevel: 5,
    icon: '📋'
  },
  
  upload_supplemental: {
    id: 'upload_supplemental',
    title: 'Upload a Supplemental Document',
    description: 'Upload a supporting document to unlock Supporting Documents',
    unlocks: 'supporting_documents',
    unlocksLevel: 6,
    icon: '📁'
  },
  
  reach_milestones: {
    id: 'reach_milestones',
    title: 'Master Your Workflow',
    description: 'Complete all milestones to unlock Reports',
    unlocks: 'reports',
    unlocksLevel: 7,
    icon: '📊'
  }
}

/**
 * Get active quests based on current level
 */
export function getActiveQuests(currentLevel: number, questProgress: QuestProgress): Quest[] {
  const quests: Quest[] = []
  
  // Level 1: Show start_scanning quest
  if (currentLevel === 1) {
    quests.push({
      ...QUEST_DEFINITIONS.start_scanning,
      status: 'active'
    })
  }
  
  // Level 2: Show validate_first_receipt quest
  if (currentLevel === 2) {
    quests.push({
      ...QUEST_DEFINITIONS.validate_first_receipt,
      status: 'active'
    })
  }
  
  // Level 3+: Show parallel quests (edit, validate, supplemental)
  if (currentLevel === 3) {
    const parallelQuests: QuestId[] = ['edit_transaction', 'validate_transaction', 'upload_supplemental']
    
    parallelQuests.forEach(questId => {
      if (!questProgress.completedQuests.includes(questId)) {
        quests.push({
          ...QUEST_DEFINITIONS[questId],
          status: 'active'
        })
      }
    })
  }
  
  // Level 4-6: Continue showing incomplete parallel quests
  if (currentLevel >= 4 && currentLevel <= 6) {
    const parallelQuests: QuestId[] = ['edit_transaction', 'validate_transaction', 'upload_supplemental']
    
    parallelQuests.forEach(questId => {
      if (!questProgress.completedQuests.includes(questId)) {
        quests.push({
          ...QUEST_DEFINITIONS[questId],
          status: 'active'
        })
      }
    })
  }
  
  // Level 6+: Show milestone quest if all parallel quests completed
  if (currentLevel === 6) {
    const allParallelComplete = ['edit_transaction', 'validate_transaction', 'upload_supplemental']
      .every(q => questProgress.completedQuests.includes(q as QuestId))
    
    if (allParallelComplete && !questProgress.completedQuests.includes('reach_milestones')) {
      quests.push({
        ...QUEST_DEFINITIONS.reach_milestones,
        status: 'active',
        progress: {
          current: questProgress.milestoneProgress.validatedTransactions + 
                   questProgress.milestoneProgress.supplementalDocs + 
                   questProgress.milestoneProgress.categorizations,
          target: 17, // 10 + 2 + 5
          label: `${questProgress.milestoneProgress.validatedTransactions}/10 validated, ${questProgress.milestoneProgress.supplementalDocs}/2 supp docs, ${questProgress.milestoneProgress.categorizations}/5 corrections`
        }
      })
    }
  }
  
  return quests
}

/**
 * Check if a transaction can be used for a specific quest
 */
export function canTransactionTriggerQuest(
  transactionId: string,
  questId: 'edit_transaction' | 'validate_transaction',
  questProgress: QuestProgress
): boolean {
  // Check if transaction already used for edit quest
  if (questProgress.transactionIdsUsedForQuests.edit_transaction?.includes(transactionId)) {
    return false
  }
  
  // Check if transaction already used for validate quest
  if (questProgress.transactionIdsUsedForQuests.validate_transaction?.includes(transactionId)) {
    return false
  }
  
  return true
}

/**
 * Check if milestone quest is complete
 */
export function isMilestoneQuestComplete(questProgress: QuestProgress): boolean {
  return questProgress.milestoneProgress.validatedTransactions >= 10 &&
         questProgress.milestoneProgress.supplementalDocs >= 2 &&
         questProgress.milestoneProgress.categorizations >= 5
}
