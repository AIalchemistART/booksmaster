import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Transaction, CustodyExpense, Invoice, BankAccount, Receipt, CategorizationCorrection } from '@/types'
import type { GamificationSlice } from './gamification-slice'
import { createGamificationSlice } from './gamification-slice'
import type { MileageSlice } from './mileage-slice'
import { createMileageSlice } from './mileage-slice'
import type { AIAccuracySlice } from './ai-accuracy-slice'
import { createAIAccuracySlice } from './ai-accuracy-slice'
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
          // Add the new receipt
          let newReceipts = [...state.receipts, receipt]
          
          // Process all receipts: detect duplicates, link documents, mark supplemental
          newReceipts = processReceiptDocuments(newReceipts)
          
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
          console.log('[PERSIST] businessName:', state.businessName)
          console.log('[PERSIST] darkMode:', state.darkMode)
          
          // MIGRATION DISABLED: The migration was too aggressive and reset legitimate progress
          // Users who have receipts/transactions should keep their level, even after restart
          // The manual level-up system preserves progress correctly via unlockedFeatures
          // if (state.userProgress && state.userProgress.currentLevel > 1) {
          //   const hasValidLevelUp = state.userProgress.unlockedFeatures.includes('receipts')
          //   if (!hasValidLevelUp) {
          //     console.log('[MIGRATION] Resetting invalid level from', state.userProgress.currentLevel, 'to 1 (keeping XP for cosmetic progress)')
          //     state.userProgress.currentLevel = 1
          //     state.userProgress.unlockedFeatures = ['dashboard', 'settings']
          //   }
          // }
          
          state.restoreReceiptImages()
          
          // Recalculate AI accuracy summaries after rehydration
          if (state.calculateSummaries) {
            console.log('[PERSIST] Recalculating AI accuracy summaries...')
            state.calculateSummaries()
          }
          
          // Apply dark mode class if enabled
          if (state.darkMode && typeof document !== 'undefined') {
            document.documentElement.classList.add('dark')
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
