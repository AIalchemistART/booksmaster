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

// Payment method types
export type PaymentMethod = 'Card' | 'Cash' | 'Check' | 'Credit' | 'Debit'

// Income source types for tracking deposit origins
export type IncomeSource = 'check' | 'cash' | 'bank_transfer' | 'deposit' | 'card' | 'other'

// Verification level for income documentation quality
export type VerificationLevel = 'strong' | 'bank' | 'self_reported'

// Base transaction interface
export interface Transaction {
  id: string
  date: string
  amount: number
  description: string
  type: TransactionType
  category: TransactionCategory
  paymentMethod?: PaymentMethod // Payment type from receipt OCR
  incomeSource?: IncomeSource // Source of income for tracking and duplicate prevention
  linkedTransactionId?: string // Reference to paired check/deposit to prevent double-counting
  verificationLevel?: VerificationLevel // Quality of income documentation
  isDuplicateOfLinked?: boolean // Don't count toward totals if true (linked duplicate)
  receiptUrl?: string
  receiptDriveId?: string
  receiptId?: string // Link to scanned receipt
  itemization?: string // Line items from receipt (auto-generated)
  notes?: string // User notes and change log
  categorizationConfidence?: number // AI confidence 0-1 for category assignment
  createdAt: string
  updatedAt: string
  // Categorization tracking for ML/heuristic improvement
  originalType?: TransactionType // Type assigned by OCR/heuristic
  originalCategory?: TransactionCategory // Category assigned by OCR/heuristic
  originalDate?: string // Original date from OCR before user correction
  originalDescription?: string // Original description from OCR before user correction
  originalAmount?: number // Original amount from OCR before user correction
  originalPaymentMethod?: PaymentMethod // Original payment method from OCR before user correction
  wasManuallyEdited?: boolean // True if user changed type or category
  editedAt?: string // Timestamp of last manual edit
  // User validation tracking
  userValidated?: boolean // True if user has reviewed and validated parsed data
  validatedAt?: string // Timestamp of validation
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
  // Link to payment receipt when marked as paid
  linkedReceiptId?: string
  linkedTransactionId?: string
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

// Document classification types
export type DocumentType = 
  | 'payment_receipt'       // Account payment confirmation (no itemization)
  | 'bank_deposit_receipt'  // Bank deposit slip or deposit receipt
  | 'bank_statement'        // Bank statement (potential check or cash income)
  | 'manifest'              // Bill of lading / delivery manifest (no pricing)
  | 'invoice'               // Invoice (from invoicing feature, marked as supplemental doc when paid)
  | 'unknown'               // Unable to classify

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
  imageData?: string // Base64 data URL of scanned receipt image (current view)
  originalImageData?: string // Original image before SAM cropping
  croppedImageData?: string // SAM-cropped image
  prefersCropped?: boolean // User preference for which view to display
  
  // Document classification
  documentType?: DocumentType // AI-classified document type
  documentTypeConfidence?: number // 0-1 confidence in classification
  
  // Document identifiers for linking
  transactionNumber?: string // Transaction/reference number
  orderNumber?: string // Order/PO number
  invoiceNumber?: string // Invoice number
  accountNumber?: string // Account number for payment receipts
  
  // Document linking
  linkedDocumentIds?: string[] // IDs of related receipts (e.g., payment linked to itemized)
  isSupplementalDoc?: boolean // True if this is supporting documentation (don't count as expense)
  primaryDocumentId?: string // If supplemental, ID of the primary expense document
  
  // Duplicate detection
  sourceFilename?: string // Original filename to detect duplicates
  isDuplicate?: boolean // Flagged as potential duplicate
  duplicateOfId?: string // ID of the original if this is a duplicate
  
  // Return receipt tracking
  isReturn?: boolean // True if this is a return/refund receipt
  originalReceiptNumber?: string // Original receipt number for returns
  
  // Multi-page receipt support
  isMultiPage?: boolean
  pageNumber?: number
  totalPages?: number
  
  // Foreign currency support
  currency?: string // ISO code (USD, EUR, GBP, etc.)
  currencySymbol?: string // $ € £ etc.
  
  ocrVendor?: string
  ocrAmount?: number // Can be negative for returns
  ocrDate?: string
  ocrTime?: string
  ocrSubtotal?: number
  ocrTax?: number
  ocrTip?: number
  ocrTaxRate?: number // Calculated percentage
  ocrTipPercentage?: number // Calculated percentage
  ocrLineItems?: ReceiptLineItem[]
  ocrPaymentMethod?: string
  ocrCardLastFour?: string // Last 4 digits of card for payment type learning
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
  // User validation tracking
  userValidated?: boolean // True if user has verified digital receipt matches paper receipt
  validatedAt?: string // Timestamp of validation
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

// Categorization correction for self-improving AI
export interface CategorizationCorrection {
  id: string
  transactionId: string
  timestamp: string
  vendor: string // Description/vendor name
  amount: number
  // What changed
  changes: {
    date?: { from: string; to: string }
    description?: { from: string; to: string }
    amount?: { from: number; to: number }
    type?: { from: TransactionType; to: TransactionType }
    category?: { from: TransactionCategory; to: TransactionCategory }
    notes?: { from: string; to: string }
    paymentMethod?: { from: string; to: string; cardLastFour?: string } // Payment type corrections with card info
    itemization?: { from: string; to: string } // Itemization corrections
    linkedTransactionId?: { from: string | undefined; to: string | undefined } // Link/unlink actions
    verificationLevel?: { from: VerificationLevel | undefined; to: VerificationLevel | undefined }
    isDuplicateOfLinked?: { from: boolean | undefined; to: boolean | undefined }
  }
  // AI-generated pattern analysis (updated after each correction)
  patternAnalysis?: string
  // Linking context
  linkedTransactionDetails?: {
    id: string
    description: string
    amount: number
    date: string
    matchScore?: number
    matchReasons?: string[]
  }
  // User's explanation for the change
  userNotes?: string
  // Context
  receiptId?: string
  wasAutoCategorizationCorrection: boolean // True if correcting AI categorization
  isLinkingAction?: boolean // True if this is a link/unlink action for duplicate prevention
}

// Card payment type mappings stored alongside corrections
export interface CardPaymentTypeMapping {
  cardLastFour: string
  paymentType: 'Credit' | 'Debit'
  learnedAt: string
  learnedFrom: {
    receiptId: string
    vendor: string
    amount: number
  }
  confidence: number
  timesConfirmed: number
}
