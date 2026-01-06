import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Transaction, CustodyExpense, Invoice, BankAccount, Receipt, CategorizationCorrection } from '@/types'
import type { GamificationSlice } from './gamification-slice'
import { createGamificationSlice } from './gamification-slice'
import type { MileageSlice } from './mileage-slice'
import { createMileageSlice } from './mileage-slice'
import type { AIAccuracySlice } from './ai-accuracy-slice'
import { createAIAccuracySlice } from './ai-accuracy-slice'
import type { UserLevel } from '@/lib/gamification/leveling-system'
import { 
  saveReceiptsToFileSystem,
  saveInvoicesToFileSystem,
  saveTransactionsToFileSystem,
  saveCustodyExpensesToFileSystem,
  createFullBackup,
  loadReceiptImagesFromFileSystem
} from '@/lib/file-system-adapter'
import { processReceiptDocuments } from '@/lib/document-linking'

// Debounce timer for file system saves
let receiptSaveTimer: NodeJS.Timeout | null = null
const RECEIPT_SAVE_DEBOUNCE_MS = 1000 // Wait 1 second after last receipt before saving

// Debounced save function
function debouncedSaveReceipts(receipts: Receipt[]) {
  if (receiptSaveTimer) {
    clearTimeout(receiptSaveTimer)
  }
  
  receiptSaveTimer = setTimeout(() => {
    console.log(`Debounced save: Saving ${receipts.length} receipts to file system`)
    saveReceiptsToFileSystem(receipts).catch((error) => {
      console.error('Debounced file system save failed, but receipts saved to memory:', error)
    })
    receiptSaveTimer = null
  }, RECEIPT_SAVE_DEBOUNCE_MS)
}

interface AppState extends GamificationSlice, MileageSlice, AIAccuracySlice {
  // Business Info
  businessName: string
  businessType: string
  setBusinessName: (name: string) => void
  setBusinessType: (type: string) => void

  // Fiscal Year Configuration
  fiscalYearType: 'calendar' | 'custom'
  fiscalYearStartMonth: number // 1-12 (1 = January)
  setFiscalYearType: (type: 'calendar' | 'custom') => void
  setFiscalYearStartMonth: (month: number) => void

  // Vendor Defaults (auto-categorization rules)
  vendorDefaults: Record<string, { category: string; type: 'income' | 'expense' }>
  addVendorDefault: (vendor: string, category: string, type: 'income' | 'expense') => void
  removeVendorDefault: (vendor: string) => void
  getVendorDefault: (vendor: string) => { category: string; type: 'income' | 'expense' } | undefined

  // UI Preferences
  darkMode: boolean
  toggleDarkMode: () => void

  // Transactions
  transactions: Transaction[]
  addTransaction: (transaction: Transaction) => void
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void

  // Custody Expenses
  custodyExpenses: CustodyExpense[]
  addCustodyExpense: (expense: CustodyExpense) => void
  updateCustodyExpense: (id: string, updates: Partial<CustodyExpense>) => void
  deleteCustodyExpense: (id: string) => void

  // Invoices
  invoices: Invoice[]
  addInvoice: (invoice: Invoice) => void
  updateInvoice: (id: string, updates: Partial<Invoice>) => void
  deleteInvoice: (id: string) => void

  // Bank Accounts
  bankAccounts: BankAccount[]
  addBankAccount: (account: BankAccount) => void
  removeBankAccount: (id: string) => void

  // Receipts
  receipts: Receipt[]
  addReceipt: (receipt: Receipt) => void
  updateReceipt: (id: string, updates: Partial<Receipt>) => void
  deleteReceipt: (id: string) => void
  restoreReceiptImages: () => Promise<void>

  // Categorization Corrections (for self-improving AI)
  categorizationCorrections: CategorizationCorrection[]
  addCorrection: (correction: CategorizationCorrection) => void
  getCorrectionsForContext: () => CategorizationCorrection[]
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Gamification slice
      // @ts-expect-error - StateCreator signature mismatch with persist middleware, runtime works correctly
      ...createGamificationSlice(set, get),
      // Mileage slice
      // @ts-expect-error - StateCreator signature mismatch with persist middleware, runtime works correctly
      ...createMileageSlice(set, get),
      // AI Accuracy slice
      // @ts-expect-error - StateCreator signature mismatch with persist middleware, runtime works correctly
      ...createAIAccuracySlice(set, get),
      // Business Info
      businessName: '',
      businessType: '',
      setBusinessName: (name) => set({ businessName: name }),
      setBusinessType: (type) => set({ businessType: type }),

      // Fiscal Year Configuration
      fiscalYearType: 'calendar',
      fiscalYearStartMonth: 1, // January
      setFiscalYearType: (type) => set({ fiscalYearType: type }),
      setFiscalYearStartMonth: (month) => set({ fiscalYearStartMonth: month }),

      // Vendor Defaults
      vendorDefaults: {},
      addVendorDefault: (vendor, category, type) =>
        set((state) => ({
          vendorDefaults: {
            ...state.vendorDefaults,
            [vendor.toLowerCase().trim()]: { category, type }
          }
        })),
      removeVendorDefault: (vendor) =>
        set((state) => {
          const newDefaults = { ...state.vendorDefaults }
          delete newDefaults[vendor.toLowerCase().trim()]
          return { vendorDefaults: newDefaults }
        }),
      getVendorDefault: (vendor: string): { category: string; type: 'income' | 'expense' } | undefined => {
        return useStore.getState().vendorDefaults[vendor.toLowerCase().trim()]
      },

      // UI Preferences
      darkMode: false,
      toggleDarkMode: () => set((state) => {
        const newDarkMode = !state.darkMode
        // Apply dark mode class to document root
        if (typeof document !== 'undefined') {
          if (newDarkMode) {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
        }
        return { darkMode: newDarkMode }
      }),

      // Transactions
      transactions: [],
      addTransaction: (transaction: Transaction) =>
        set((state) => {
          const newTransactions = [...state.transactions, transaction]
          saveTransactionsToFileSystem(newTransactions).catch(console.error)
          return { transactions: newTransactions }
        }),
      updateTransaction: (id: string, updates: Partial<Transaction>) =>
        set((state) => {
          const newTransactions = state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          )
          saveTransactionsToFileSystem(newTransactions).catch(console.error)
          return { transactions: newTransactions }
        }),
      deleteTransaction: (id: string) =>
        set((state) => {
          const newTransactions = state.transactions.filter((t) => t.id !== id)
          saveTransactionsToFileSystem(newTransactions).catch(console.error)
          return { transactions: newTransactions }
        }),

      // Custody Expenses
      custodyExpenses: [],
      addCustodyExpense: (expense: CustodyExpense) =>
        set((state) => {
          const newExpenses = [...state.custodyExpenses, expense]
          saveCustodyExpensesToFileSystem(newExpenses).catch(console.error)
          return { custodyExpenses: newExpenses }
        }),
      updateCustodyExpense: (id: string, updates: Partial<CustodyExpense>) =>
        set((state) => {
          const newExpenses = state.custodyExpenses.map((e) =>
            e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
          )
          saveCustodyExpensesToFileSystem(newExpenses).catch(console.error)
          return { custodyExpenses: newExpenses }
        }),
      deleteCustodyExpense: (id: string) =>
        set((state) => {
          const newExpenses = state.custodyExpenses.filter((e) => e.id !== id)
          saveCustodyExpensesToFileSystem(newExpenses).catch(console.error)
          return { custodyExpenses: newExpenses }
        }),

      // Invoices
      invoices: [],
      addInvoice: (invoice: Invoice) =>
        set((state) => {
          const newInvoices = [...state.invoices, invoice]
          saveInvoicesToFileSystem(newInvoices).catch(console.error)
          return { invoices: newInvoices }
        }),
      updateInvoice: (id: string, updates: Partial<Invoice>) =>
        set((state) => {
          const newInvoices = state.invoices.map((i) =>
            i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i
          )
          saveInvoicesToFileSystem(newInvoices).catch(console.error)
          return { invoices: newInvoices }
        }),
      deleteInvoice: (id: string) =>
        set((state) => {
          const newInvoices = state.invoices.filter((i) => i.id !== id)
          saveInvoicesToFileSystem(newInvoices).catch(console.error)
          return { invoices: newInvoices }
        }),

      // Bank Accounts
      bankAccounts: [],
      addBankAccount: (account: BankAccount) =>
        set((state) => ({ bankAccounts: [...state.bankAccounts, account] })),
      removeBankAccount: (id: string) =>
        set((state) => ({
          bankAccounts: state.bankAccounts.filter((a) => a.id !== id),
        })),

      // Receipts
      receipts: [],
      addReceipt: (receipt: Receipt) =>
        set((state) => {
          console.log('[STORE] ============================================')
          console.log('[STORE] addReceipt() called - BEFORE')
          console.log('[STORE] Current Level:', state.userProgress.currentLevel)
          console.log('[STORE] Current XP:', state.userProgress.currentXP)
          console.log('[STORE] Unlocked Features:', state.userProgress.unlockedFeatures)
          console.log('[STORE] Receipt count before:', state.receipts.length)
          console.log('[STORE] New receipt ID:', receipt.id)

          // Add the new receipt
          let newReceipts = [...state.receipts, receipt]

          // Process any manifest or invoice documents
          newReceipts = processReceiptDocuments(newReceipts)

          console.log('[STORE] Receipt count after:', newReceipts.length)
          console.log('[STORE] addReceipt() returning - check if level changes...')
          console.log('[STORE] ============================================')

          // Debounce file system saves to batch operations
          debouncedSaveReceipts(newReceipts)
          return { receipts: newReceipts }
        }),
      updateReceipt: (id: string, updates: Partial<Receipt>) =>
        set((state) => {
          // Update the receipt
          let newReceipts = state.receipts.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          )
          
          // Re-process all receipts to update links if identifiers changed
          newReceipts = processReceiptDocuments(newReceipts)
          
          // Debounce file system saves to batch operations
          debouncedSaveReceipts(newReceipts)
          return { receipts: newReceipts }
        }),
      deleteReceipt: (id: string) =>
        set((state) => {
          const newReceipts = state.receipts.filter((r) => r.id !== id)
          // Debounce file system saves to batch operations
          debouncedSaveReceipts(newReceipts)
          return { receipts: newReceipts }
        }),
      
      // Restore receipt images from file system
      restoreReceiptImages: async () => {
        try {
          console.log('[STORE] Restoring receipt images from file system...')
          
          // Get current receipts from the set callback to avoid circular reference
          let currentReceipts: Receipt[] = []
          set((state) => {
            currentReceipts = state.receipts
            return state // No change yet
          })
          
          const imageMap = await loadReceiptImagesFromFileSystem(currentReceipts)
          
          if (imageMap.size === 0) {
            console.log('[STORE] No receipt images found in file system')
            return
          }
          
          set((state) => {
            const updatedReceipts = state.receipts.map(receipt => {
              const imageData = imageMap.get(receipt.id)
              if (imageData && !receipt.imageData) {
                console.log(`[STORE] Restored image for receipt ${receipt.id}`)
                return { ...receipt, imageData }
              }
              return receipt
            })
            
            const restoredCount = updatedReceipts.filter(r => r.imageData).length
            console.log(`[STORE] Restored ${restoredCount} receipt images from file system`)
            
            return { receipts: updatedReceipts }
          })
        } catch (error) {
          console.error('[STORE] Error restoring receipt images:', error)
        }
      },

      // Categorization Corrections
      categorizationCorrections: [],
      addCorrection: (correction: CategorizationCorrection) =>
        set((state) => {
          const newCorrections = [...state.categorizationCorrections, correction]
          // Save to file system will be handled by file-system-adapter
          console.log('[STORE] Added categorization correction:', correction.id)
          return { categorizationCorrections: newCorrections }
        }),
      getCorrectionsForContext: () => {
        let corrections: CategorizationCorrection[] = []
        useStore.getState().categorizationCorrections.forEach((c: CategorizationCorrection) => corrections.push(c))
        return corrections
      },
    }),
    {
      name: 'thomas-books-storage',
      partialize: (state) => ({
        transactions: state.transactions,
        custodyExpenses: state.custodyExpenses,
        invoices: state.invoices,
        bankAccounts: state.bankAccounts,
        businessName: state.businessName,
        businessType: state.businessType,
        fiscalYearType: state.fiscalYearType,
        fiscalYearStartMonth: state.fiscalYearStartMonth,
        vendorDefaults: state.vendorDefaults,
        darkMode: state.darkMode,
        // Exclude imageData from receipts to prevent localStorage quota exceeded
        // Images are stored in file system and restored on load
        receipts: state.receipts.map((r: Receipt) => {
          const { imageData, ...receipt } = r
          return receipt
        }),
        // Store corrections - will also be saved to JSON file for AI context
        categorizationCorrections: state.categorizationCorrections,
        // Gamification progress
        userProgress: state.userProgress,
        unlockedAchievements: state.unlockedAchievements,
        dailyBatchTracker: state.dailyBatchTracker,
        questProgress: state.questProgress,
        // AI Accuracy metrics
        accuracyDataPoints: state.accuracyDataPoints,
        weeklySummaries: state.weeklySummaries,
        monthlySummaries: state.monthlySummaries,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('[PERSIST] onRehydrateStorage callback called')
        // After store is rehydrated from localStorage, restore images from file system
        if (state) {
          console.log('[STORE] Store rehydrated, restoring receipt images...')
          console.log('[PERSIST] userProgress.onboardingComplete:', state.userProgress?.onboardingComplete)
          console.log('[PERSIST] userProgress.currentLevel:', state.userProgress?.currentLevel)
          console.log('[PERSIST] userProgress.totalXP:', state.userProgress?.totalXP)
          console.log('[PERSIST] userProgress.unlockedFeatures:', state.userProgress?.unlockedFeatures)
          console.log('[PERSIST] businessName:', state.businessName)
          console.log('[PERSIST] darkMode:', state.darkMode)
          
          // Debug: Check what's in localStorage
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('thomas-books-storage')
            if (stored) {
              try {
                const parsed = JSON.parse(stored)
                console.log('[PERSIST DEBUG] localStorage userProgress:', parsed.state?.userProgress)
              } catch (e) {
                console.error('[PERSIST DEBUG] Failed to parse localStorage:', e)
              }
            } else {
              console.log('[PERSIST DEBUG] No localStorage data found')
            }
          }
          
          state.restoreReceiptImages()
          
          // LEVEL MIGRATION: Fix stale level 1 when data indicates user progressed further
          // CRITICAL: Must run AFTER restoreReceiptImages so receipt count is accurate
          if (state.userProgress) {
            const { currentLevel, unlockedFeatures, totalXP } = state.userProgress
            let correctedLevel = currentLevel
            const receiptCount = state.receipts?.length || 0
            const transactionCount = state.transactions?.length || 0
            const validatedReceiptCount = state.receipts?.filter((r: any) => r.userValidated === true).length || 0
            
            console.log(`[LEVEL MIGRATION] ========================================`)
            console.log(`[LEVEL MIGRATION] Starting migration check...`)
            console.log(`[LEVEL MIGRATION] Current state - Level: ${currentLevel}, XP: ${totalXP}`)
            console.log(`[LEVEL MIGRATION] Data counts - Receipts: ${receiptCount}, Transactions: ${transactionCount}, Validated: ${validatedReceiptCount}`)
            console.log(`[LEVEL MIGRATION] Unlocked features:`, unlockedFeatures)
            
            // Determine correct level based on unlocked features (manual level-up history)
            if (unlockedFeatures.includes('categorization_report') || unlockedFeatures.includes('bank_accounts')) {
              correctedLevel = Math.max(currentLevel, 6) as UserLevel
              console.log('[LEVEL MIGRATION] Found Level 6 features in unlockedFeatures')
            } else if (unlockedFeatures.includes('invoices') || unlockedFeatures.includes('reports')) {
              correctedLevel = Math.max(currentLevel, 5) as UserLevel
              console.log('[LEVEL MIGRATION] Found Level 5 features in unlockedFeatures')
            } else if (unlockedFeatures.includes('supporting_documents')) {
              correctedLevel = Math.max(currentLevel, 4) as UserLevel
              console.log('[LEVEL MIGRATION] Found Level 4 features in unlockedFeatures')
            } else if (unlockedFeatures.includes('transactions')) {
              correctedLevel = Math.max(currentLevel, 3) as UserLevel
              console.log('[LEVEL MIGRATION] Found Level 3 features in unlockedFeatures')
            } else if (unlockedFeatures.includes('receipts')) {
              correctedLevel = Math.max(currentLevel, 2) as UserLevel
              console.log('[LEVEL MIGRATION] Found Level 2 features in unlockedFeatures')
            }
            
            // Fallback: Check actual data if unlockedFeatures don't indicate level-ups
            // This catches cases where the level was reset but data exists
            if (correctedLevel === 1 && currentLevel === 1) {
              console.log('[LEVEL MIGRATION] Still at Level 1, checking actual data...')
              if (transactionCount > 0) {
                correctedLevel = 3 as UserLevel
                console.log(`[LEVEL MIGRATION] 🔍 Found ${transactionCount} transactions - correcting to Level 3`)
              } else if (validatedReceiptCount > 0) {
                correctedLevel = 3 as UserLevel
                console.log(`[LEVEL MIGRATION] 🔍 Found ${validatedReceiptCount} validated receipts - correcting to Level 3`)
              } else if (receiptCount > 0) {
                correctedLevel = 2 as UserLevel
                console.log(`[LEVEL MIGRATION] 🔍 Found ${receiptCount} receipts - correcting to Level 2`)
              }
            }
            
            if (correctedLevel !== currentLevel) {
              console.log(`[LEVEL MIGRATION] ✅ CORRECTING stale level ${currentLevel} → ${correctedLevel}`)
              state.userProgress.currentLevel = correctedLevel
              
              // Update unlockedFeatures to match corrected level
              // Note: categorization_changes is NOT level-gated - it unlocks via edit quest only
              const newFeatures = ['dashboard', 'settings']
              if (correctedLevel >= 2) newFeatures.push('receipts')
              if (correctedLevel >= 3) newFeatures.push('transactions')
              // categorization_changes: condition-based (edit quest), not level-based
              if (correctedLevel >= 5) newFeatures.push('invoices')
              // supporting_documents: condition-based (validate supplemental), not level-based
              if (correctedLevel >= 7) newFeatures.push('reports')
              state.userProgress.unlockedFeatures = newFeatures
              console.log('[LEVEL MIGRATION] Updated unlockedFeatures:', newFeatures)
              console.log('[LEVEL MIGRATION] Note: Changes will be persisted by Zustand middleware')
            } else {
              console.log('[LEVEL MIGRATION] ✅ Level is correct, no migration needed')
            }
            
            // QUEST MIGRATION: Restore completed quests based on current level
            if (state.questProgress) {
              const completedQuests = [...(state.questProgress.completedQuests || [])]
              let questsUpdated = false
              
              console.log('[QUEST MIGRATION] ========================================')
              console.log('[QUEST MIGRATION] Current completed quests:', completedQuests)
              console.log('[QUEST MIGRATION] User is at Level:', correctedLevel)
              
              // Reconstruct completed quests based on level
              if (correctedLevel >= 2 && !completedQuests.includes('start_scanning')) {
                completedQuests.push('start_scanning')
                questsUpdated = true
                console.log('[QUEST MIGRATION] ✅ Added start_scanning quest (Level 2+)')
              }
              if (correctedLevel >= 3 && !completedQuests.includes('validate_first_receipt')) {
                completedQuests.push('validate_first_receipt')
                questsUpdated = true
                console.log('[QUEST MIGRATION] ✅ Added validate_first_receipt quest (Level 3+)')
              }
              // Note: edit_transaction, validate_transaction, and upload_supplemental are PARALLEL quests (Levels 4-6)
              // They can be completed in any order
              // Cannot infer completion from level alone - must be explicitly completed
              if (correctedLevel >= 7 && !completedQuests.includes('reach_milestones')) {
                completedQuests.push('reach_milestones')
                questsUpdated = true
                console.log('[QUEST MIGRATION] ✅ Added reach_milestones quest (Level 7)')
              }
              
              if (questsUpdated) {
                state.questProgress.completedQuests = completedQuests
                console.log('[QUEST MIGRATION] ✅ Updated questProgress.completedQuests:', completedQuests)
                console.log('[QUEST MIGRATION] Note: Changes will be persisted by Zustand middleware')
              } else {
                console.log('[QUEST MIGRATION] ✅ Quest progress is correct, no migration needed')
              }
              console.log('[QUEST MIGRATION] ========================================')
            }
            console.log(`[LEVEL MIGRATION] ========================================`)
          }
          
          console.log('[PERSIST] Final userProgress.currentLevel:', state.userProgress?.currentLevel)
          console.log('[PERSIST] Final userProgress.unlockedFeatures:', state.userProgress?.unlockedFeatures)
          console.log('[PERSIST] Final darkMode:', state.darkMode)
          
          // Recalculate AI accuracy summaries after rehydration
          if (state.calculateSummaries) {
            console.log('[PERSIST] Recalculating AI accuracy summaries...')
            state.calculateSummaries()
          }
          
          // Apply dark mode class if enabled - CRITICAL: Must run after all state mutations
          if (typeof document !== 'undefined') {
            console.log('[DARK MODE] Current darkMode state:', state.darkMode)
            console.log('[DARK MODE] Current document classes:', document.documentElement.className)
            
            if (state.darkMode) {
              document.documentElement.classList.add('dark')
              console.log('[DARK MODE] ✅ Applied dark class')
            } else {
              document.documentElement.classList.remove('dark')
              console.log('[DARK MODE] ❌ Removed dark class')
            }
            
            console.log('[DARK MODE] Final document classes:', document.documentElement.className)
          }
        } else {
          console.log('[PERSIST] No state to rehydrate - using defaults')
        }
      },
    }
  )
)

// Helper to generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
