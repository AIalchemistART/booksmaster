import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Transaction, CustodyExpense, Invoice, BankAccount, Receipt } from '@/types'
import { 
  saveReceiptsToFileSystem,
  saveInvoicesToFileSystem,
  saveTransactionsToFileSystem,
  saveCustodyExpensesToFileSystem,
  createFullBackup,
  loadReceiptImagesFromFileSystem
} from '@/lib/file-system-storage'

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

interface AppState {
  // Business Info
  businessName: string
  businessType: string
  setBusinessName: (name: string) => void
  setBusinessType: (type: string) => void

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
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Business Info
      businessName: 'Thomas Contracting LLC',
      businessType: 'Residential Contractor',
      setBusinessName: (name) => set({ businessName: name }),
      setBusinessType: (type) => set({ businessType: type }),

      // Transactions
      transactions: [],
      addTransaction: (transaction) =>
        set((state) => {
          const newTransactions = [...state.transactions, transaction]
          saveTransactionsToFileSystem(newTransactions).catch(console.error)
          return { transactions: newTransactions }
        }),
      updateTransaction: (id, updates) =>
        set((state) => {
          const newTransactions = state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          )
          saveTransactionsToFileSystem(newTransactions).catch(console.error)
          return { transactions: newTransactions }
        }),
      deleteTransaction: (id) =>
        set((state) => {
          const newTransactions = state.transactions.filter((t) => t.id !== id)
          saveTransactionsToFileSystem(newTransactions).catch(console.error)
          return { transactions: newTransactions }
        }),

      // Custody Expenses
      custodyExpenses: [],
      addCustodyExpense: (expense) =>
        set((state) => {
          const newExpenses = [...state.custodyExpenses, expense]
          saveCustodyExpensesToFileSystem(newExpenses).catch(console.error)
          return { custodyExpenses: newExpenses }
        }),
      updateCustodyExpense: (id, updates) =>
        set((state) => {
          const newExpenses = state.custodyExpenses.map((e) =>
            e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
          )
          saveCustodyExpensesToFileSystem(newExpenses).catch(console.error)
          return { custodyExpenses: newExpenses }
        }),
      deleteCustodyExpense: (id) =>
        set((state) => {
          const newExpenses = state.custodyExpenses.filter((e) => e.id !== id)
          saveCustodyExpensesToFileSystem(newExpenses).catch(console.error)
          return { custodyExpenses: newExpenses }
        }),

      // Invoices
      invoices: [],
      addInvoice: (invoice) =>
        set((state) => {
          const newInvoices = [...state.invoices, invoice]
          saveInvoicesToFileSystem(newInvoices).catch(console.error)
          return { invoices: newInvoices }
        }),
      updateInvoice: (id, updates) =>
        set((state) => {
          const newInvoices = state.invoices.map((i) =>
            i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i
          )
          saveInvoicesToFileSystem(newInvoices).catch(console.error)
          return { invoices: newInvoices }
        }),
      deleteInvoice: (id) =>
        set((state) => {
          const newInvoices = state.invoices.filter((i) => i.id !== id)
          saveInvoicesToFileSystem(newInvoices).catch(console.error)
          return { invoices: newInvoices }
        }),

      // Bank Accounts
      bankAccounts: [],
      addBankAccount: (account) =>
        set((state) => ({ bankAccounts: [...state.bankAccounts, account] })),
      removeBankAccount: (id) =>
        set((state) => ({
          bankAccounts: state.bankAccounts.filter((a) => a.id !== id),
        })),

      // Receipts
      receipts: [],
      addReceipt: (receipt) =>
        set((state) => {
          const newReceipts = [...state.receipts, receipt]
          // Debounce file system saves to batch operations
          debouncedSaveReceipts(newReceipts)
          return { receipts: newReceipts }
        }),
      updateReceipt: (id, updates) =>
        set((state) => {
          const newReceipts = state.receipts.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          )
          // Debounce file system saves to batch operations
          debouncedSaveReceipts(newReceipts)
          return { receipts: newReceipts }
        }),
      deleteReceipt: (id) =>
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
          const imageMap = await loadReceiptImagesFromFileSystem()
          
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
        // Exclude imageData from receipts to prevent localStorage quota exceeded
        // Images are stored in file system and restored on load
        receipts: state.receipts.map(({ imageData, ...receipt }) => receipt),
      }),
      onRehydrateStorage: () => (state) => {
        // After store is rehydrated from localStorage, restore images from file system
        if (state) {
          console.log('[STORE] Store rehydrated, restoring receipt images...')
          state.restoreReceiptImages()
        }
      },
    }
  )
)

// Helper to generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
