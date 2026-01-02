# Deposit & Income Verification - Future Implementation Notes

## Problem Statement

### Double-Counting Risk
Thomas has deposit receipts (bank statements showing deposits) that represent income. There's a risk of accidentally counting income twice if:
1. A check receipt exists for a payment
2. A deposit receipt exists showing that check being deposited
3. Both are surfaced as separate income transactions

**Example scenario:**
- Client pays Thomas with a check for $5,000 (Check receipt dated 4/10/2025)
- Thomas deposits the check (Deposit receipt dated 4/12/2025)
- Without proper linking, both could appear as separate $5,000 income entries

### Income Verification Standards

**Question:** For small business accounting and IRS purposes, does a bank statement/deposit receipt count as sufficient verification for income?

**Context:**
- Cash payments often have no paper trail except the bank deposit
- No invoice or check associated with cash income
- Bank statement is the only record that the deposit occurred

**Current uncertainty:** Whether IRS accepts bank statements alone as income verification, or if additional documentation is required.

## Proposed Solutions

### 1. Check-to-Deposit Linking System

Implement smart linking between checks and deposits:

**Matching criteria:**
- Similar amounts (within tolerance, e.g., ±$50)
- Date proximity (deposit typically 1-5 business days after check date)
- Optional: payee/vendor matching if available

**UI Indicators:**
- Flag potential duplicates with warning icon
- Show "Possible match" in transaction list
- Provide quick action to link transactions
- Mark linked transactions as "Linked to Check #123" or "Linked to Deposit #456"

**Rules:**
- Only count one transaction toward income when linked
- Keep both records visible for audit trail
- Allow manual override if auto-matching is incorrect

### 2. Income Source Tracking

Add `incomeSource` field to transactions:
```typescript
incomeSource?: 'check' | 'cash' | 'bank_transfer' | 'deposit' | 'other'
linkedTransactionId?: string // Reference to paired check/deposit
```

**Benefits:**
- Clearer audit trail
- Easier to identify cash-only income (bank statement verification)
- Better duplicate detection

### 3. Verification Levels

Implement tiered verification system:

**Level 1: Strongly Verified**
- Invoice + Payment Receipt
- Check + Deposit Statement (linked)
- Credit card transaction with receipt

**Level 2: Bank Verified**
- Bank statement/deposit record only
- No corresponding invoice or check
- Common for cash income

**Level 3: Self-Reported**
- Manual entry without supporting docs
- Requires additional documentation for IRS audit

### 4. Deposit Receipt Handling

**Current behavior:** Deposit receipts create income transactions

**Proposed enhancement:**
1. When scanning deposit receipt, check for matching check transactions
2. If match found, offer to link instead of creating duplicate
3. If no match and amount is significant, prompt: "Is this from a check/invoice we already recorded?"
4. For cash deposits, mark as "Cash Income - Bank Verified"

## IRS & Accounting Best Practices Research Needed

### Questions to address:
1. Does IRS accept bank statements as sole documentation for cash income?
2. What additional records should be kept for cash transactions?
3. Are there specific requirements for linking checks to deposits?
4. Should deposits be recorded separately even if linked to checks?
5. What's the recommended audit trail format?

### Resources to consult:
- IRS Publication 583 (Starting a Business and Keeping Records)
- IRS Publication 463 (Travel, Gift, and Car Expenses)
- Small business accountant consultation
- Industry best practices for contractor bookkeeping

## Implementation Priority

**Phase 1 ✅ COMPLETED (Dec 2024):**
- ✅ Duplicate detection warning system with AI scoring
- ✅ One-click linking UI for checks/deposits
- ✅ Income source field with dropdown classification
- ✅ Bank statement identification and guidance modal
- ✅ Real-time duplicate detection as user edits

**Phase 2 ✅ COMPLETED (Dec 2024):**
- ✅ Automatic check-to-deposit matching algorithm
- ✅ Verification level badges (Strong/Bank/Self)
- ✅ Enhanced deposit handling with audit guidance
- ✅ Visual grouping of linked transactions in table
- ✅ Duplicate-aware income totals across all reports

**Phase 3 ✅ COMPLETED (Dec 2024):**
- [x] IRS audit report generation with verification breakdown
- [x] Income verification summary dashboard widget
- [x] Reconciliation tools with bulk linking suggestions
- [x] AI system prompts enhanced with duplicate detection intelligence
- [x] Link/unlink actions tracked in corrections JSON for AI learning
- [x] Comprehensive AI confidence scoring with verification weighting
- [x] Export audit-ready income documentation (JSON format)

## Technical Notes

### Database Schema Changes
```typescript
interface Transaction {
  // ... existing fields
  incomeSource?: 'check' | 'cash' | 'bank_transfer' | 'deposit' | 'other'
  linkedTransactionId?: string
  verificationLevel?: 'strong' | 'bank' | 'self_reported'
  isDuplicateOfLinked?: boolean // Don't count toward totals if true
}
```

### Matching Algorithm Pseudocode
```typescript
function findPotentialCheckDepositMatches(deposit: Transaction) {
  const checks = transactions.filter(t => 
    t.type === 'income' &&
    t.incomeSource === 'check' &&
    !t.linkedTransactionId &&
    Math.abs(t.amount - deposit.amount) <= 50 &&
    daysBetween(t.date, deposit.date) <= 5
  )
  return checks
}
```

## Related Files
- `src/types/index.ts` - Transaction interface
- `src/app/transactions/page.tsx` - Transaction table display
- `src/components/modals/ReceiptImageModal.tsx` - Transaction editing
- `src/lib/gemini-categorization.ts` - AI categorization logic

---

**Last Updated:** December 30, 2024  
**Status:** Phase 1, 2 & 3 COMPLETE - Production Ready  
**Owner:** Thomas Books Project
**Market Impact:** First bookkeeping software with:
- AI-powered income duplicate prevention
- Intelligent linking with corrections-based learning
- Comprehensive audit readiness scoring
