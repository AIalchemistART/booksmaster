// Expense categories for contractor business
export type ExpenseCategory = 
  | 'materials'
  | 'tools'
  | 'fuel'
  | 'subcontractors'
  | 'insurance'
  | 'permits'
  | 'office_supplies'
  | 'marketing'
  | 'vehicle_maintenance'
  | 'equipment_rental'
  | 'professional_services'
  | 'utilities'
  | 'other'

// Custody expense types
export type CustodyExpenseType =
  | 'child_support'
  | 'medical'
  | 'education'
  | 'childcare'
  | 'activities'
  | 'clothing'
  | 'food'
  | 'other'

// Income categories
export type IncomeCategory =
  | 'residential_job'
  | 'commercial_job'
  | 'repairs'
  | 'consultation'
  | 'other_income'

// Transaction types
export type TransactionType = 'income' | 'expense'

// Transaction category - can be either income or expense category
export type TransactionCategory = ExpenseCategory | IncomeCategory

// Base transaction interface
export interface Transaction {
  id: string
  date: string
  amount: number
  description: string
  type: TransactionType
  category: TransactionCategory
  receiptUrl?: string
  receiptDriveId?: string
  receiptId?: string // Link to scanned receipt
  notes?: string
  createdAt: string
  updatedAt: string
}

// Custody-specific expense
export interface CustodyExpense {
  id: string
  date: string
  amount: number
  description: string
  expenseType: CustodyExpenseType
  paidBy: 'thomas' | 'other_parent'
  splitPercentage: number // Thomas's share percentage (e.g., 50 = 50%)
  thomasOwes: number // Calculated: amount * (splitPercentage/100) if other_parent paid
  otherParentOwes: number // Calculated: amount * ((100-splitPercentage)/100) if thomas paid
  receiptUrl?: string
  receiptDriveId?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// Invoice from clients
export interface Invoice {
  id: string
  clientName: string
  clientEmail?: string
  amount: number
  description: string
  issueDate: string
  dueDate: string
  paidDate?: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  notes?: string
  createdAt: string
  updatedAt: string
}

// Bank account connection (Plaid)
export interface BankAccount {
  id: string
  institutionName: string
  accountName: string
  accountType: string // checking, savings, credit, etc.
  mask: string // Last 4 digits
  plaidAccountId?: string
  balance?: number
  lastSynced?: string
  createdAt: string
  updatedAt: string
}

// Line item from receipt OCR
export interface ReceiptLineItem {
  description: string
  amount: number
  sku?: string
}

// Receipt with OCR data
export interface Receipt {
  id: string
  driveFileId: string
  driveUrl: string
  thumbnailUrl?: string
  imageData?: string // Base64 data URL of scanned receipt image
  ocrVendor?: string
  ocrAmount?: number
  ocrDate?: string
  ocrTime?: string
  ocrSubtotal?: number
  ocrTax?: number
  ocrLineItems?: ReceiptLineItem[]
  ocrPaymentMethod?: string
  ocrStoreId?: string
  ocrTransactionId?: string
  ocrRawText?: string
  processedAt?: string
  linkedTransactionId?: string
  linkedCustodyExpenseId?: string
  // AI-categorized fields for easier transaction conversion
  transactionType?: TransactionType // 'income' or 'expense'
  transactionCategory?: string // Category suggestion from AI
  categorizationConfidence?: number // 0-1 confidence score
  // Failed OCR indicator
  ocrFailed?: boolean // True if OCR processing failed, needs manual entry
  createdAt: string
}

// Summary stats for dashboard
export interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  pendingInvoices: number
  custodyBalance: number // Positive = other parent owes Thomas
  expensesByCategory: Record<ExpenseCategory, number>
}
