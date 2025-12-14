import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Transaction, CustodyExpense, Invoice, BankAccount, Receipt } from '@/types'

interface AppState {
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
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Transactions
      transactions: [],
      addTransaction: (transaction) =>
        set((state) => ({ transactions: [...state.transactions, transaction] })),
      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          ),
        })),
      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),

      // Custody Expenses
      custodyExpenses: [],
      addCustodyExpense: (expense) =>
        set((state) => ({ custodyExpenses: [...state.custodyExpenses, expense] })),
      updateCustodyExpense: (id, updates) =>
        set((state) => ({
          custodyExpenses: state.custodyExpenses.map((e) =>
            e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
          ),
        })),
      deleteCustodyExpense: (id) =>
        set((state) => ({
          custodyExpenses: state.custodyExpenses.filter((e) => e.id !== id),
        })),

      // Invoices
      invoices: [],
      addInvoice: (invoice) =>
        set((state) => ({ invoices: [...state.invoices, invoice] })),
      updateInvoice: (id, updates) =>
        set((state) => ({
          invoices: state.invoices.map((i) =>
            i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i
          ),
        })),
      deleteInvoice: (id) =>
        set((state) => ({
          invoices: state.invoices.filter((i) => i.id !== id),
        })),

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
        set((state) => ({ receipts: [...state.receipts, receipt] })),
      updateReceipt: (id, updates) =>
        set((state) => ({
          receipts: state.receipts.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),
      deleteReceipt: (id) =>
        set((state) => ({
          receipts: state.receipts.filter((r) => r.id !== id),
        })),
    }),
    {
      name: 'thomas-books-storage',
    }
  )
)

// Helper to generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
