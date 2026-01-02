# 🎮 XP System Design - Tiered Rewards

## Overview
The XP system now uses a **4-tiered reward structure** that rewards meaningful progress and learning over repetitive actions. This prevents users from grinding levels through simple repetitive tasks.

## Problem Solved
**Before:** Processing 95 receipts × 50 XP = 4,750 XP would reach Level 5-6 without learning anything  
**After:** Processing 95 receipts = 5 XP × 94 + milestone bonuses = realistic progression

---

## Tier Structure

### **Tier 1: Simple Repetitive Actions (3-10 XP)**
Low XP for basic, repetitive tasks that don't require learning.

| Action | XP | Description |
|--------|---:|-------------|
| `parseReceipt` | 5 | OCR scan a receipt |
| `editTransaction` | 5 | Edit existing transaction |
| `categorizeTransaction` | 5 | Categorize single transaction |
| `uploadReceipt` | 8 | Upload receipt image |
| `deleteTransaction` | 3 | Delete/cleanup |

**Philosophy:** These are muscle-memory tasks. Low rewards prevent grinding.

---

### **Tier 2: Moderate Complexity (15-25 XP)**
Tasks requiring understanding and decision-making.

| Action | XP | Description |
|--------|---:|-------------|
| `validateReceipt` | 15 | Manually validate OCR data |
| `linkReceiptToTransaction` | 20 | Link receipt to prevent duplicates ⭐ |
| `addVendorDefault` | 25 | Set up vendor automation |
| `bulkCategorize` | 25 | Bulk recategorization |
| `createInvoice` | 20 | Create client invoice |
| `detectDuplicate` | 15 | Catch and merge duplicate |

**Philosophy:** These demonstrate understanding of the system and prevent data issues.

---

### **Tier 3: Important Milestones (50-150 XP)**
First-time achievements and batch milestones.

#### **Initial Setup**
| Action | XP | Description |
|--------|---:|-------------|
| `completeProfile` | 100 | Complete business profile |
| `connectApiKey` | 150 | Connect Gemini API |
| `setFiscalYear` | 50 | Set fiscal year |
| `completeOnboarding` | 150 | Finish onboarding wizard |

#### **First-Time Achievements**
| Action | XP | Description |
|--------|---:|-------------|
| `uploadFirstReceipt` | 100 | First receipt uploaded |
| `createTransaction` | 50 | First transaction created |
| `firstExport` | 100 | First data export |

#### **Batch Milestones**
| Action | XP | When Triggered |
|--------|---:|----------------|
| `process10Receipts` | 75 | 10 receipts processed |
| `process25Receipts` | 100 | 25 receipts processed |
| `process50Receipts` | 125 | 50 receipts processed |
| `categorize10Transactions` | 75 | 10 transactions categorized |
| `categorize25Transactions` | 100 | 25 transactions categorized |
| `categorize50Transactions` | 125 | 50 transactions categorized |
| `validate10Receipts` | 75 | 10 receipts validated |

#### **Monthly Cycle**
| Action | XP | Description |
|--------|---:|-------------|
| `completeMonth` | 150 | Finish full month of tracking |

**Philosophy:** Celebrate learning milestones and consistent progress.

---

### **Tier 4: Major Achievements (200-600 XP)**
End-of-cycle and mastery achievements.

| Action | XP | Description |
|--------|---:|-------------|
| `reviewQuarterlyTax` | 250 | Complete quarterly tax review |
| `exportScheduleC` | 200 | Export Schedule C for taxes |
| `completeQuarter` | 400 | Finish full quarter tracking |
| `perfectCategorization` | 300 | 95%+ confidence across all transactions |
| `yearEndReview` | 500 | Complete year-end review |
| `exportAllFormats` | 200 | Export in all available formats |
| `track100Transactions` | 300 | Reach 100 tracked transactions |
| `masterAccountant` | 600 | Reach level 12 (max level) |

**Philosophy:** Major accomplishments that demonstrate mastery and completion of business cycles.

---

## Real-World Example: 95 Receipts

### **Old System (Broken)**
- 95 receipts × 50 XP = **4,750 XP**
- Result: Level 6+ without learning anything

### **New System (Balanced)**
- 1st receipt: **100 XP** (uploadFirstReceipt)
- Next 8 receipts: **5 XP each** = 40 XP
- 10th receipt: **75 XP** (process10Receipts milestone)
- Next 14 receipts: **5 XP each** = 70 XP
- 25th receipt: **100 XP** (process25Receipts milestone)
- Next 24 receipts: **5 XP each** = 120 XP
- 50th receipt: **125 XP** (process50Receipts milestone)
- Next 45 receipts: **5 XP each** = 225 XP

**Total: 655 XP** (enough for Level 3, not Level 6)

---

## Integration Points

### **Transactions Page** (`src/app/transactions/page.tsx`)
- First transaction: `createTransaction` (50 XP)
- Subsequent transactions: `editTransaction` (5 XP)
- Milestone at 10, 25, 50, 100 transactions

### **Receipts Page** (`src/app/receipts/page.tsx`)
- First receipt: `uploadFirstReceipt` (100 XP)
- Subsequent receipts: `parseReceipt` (5 XP)
- Milestones at 10, 25, 50 receipts

### **Export Page** (`src/app/export/page.tsx`)
- First export: `firstExport` (100 XP)
- Schedule C export: `exportScheduleC` (200 XP)
- All other exports: `firstExport` (100 XP)

---

## Level Progression Curve

With the new system, reaching higher levels requires:
- **Level 1-3:** Initial setup + basic data entry (250-600 XP)
- **Level 4-6:** Consistent tracking + validation (1000-1700 XP)
- **Level 7-9:** Advanced features + exports (2500-3600 XP)
- **Level 10-12:** Quarterly/yearly mastery (4300-5500 XP)

Users learn the system progressively and are rewarded for **understanding**, not **grinding**.

---

## Future Enhancements

Potential additions:
- **Validation XP multiplier:** +10 XP for catching OCR errors
- **Streak bonuses:** Daily/weekly tracking streaks
- **Accuracy rewards:** High confidence scores earn bonus XP
- **End-of-month report:** Automatic XP for completing monthly reconciliation

---

*Generated: December 30, 2024*  
*Phase 12 Gamification System - Tiered XP Rewards*
