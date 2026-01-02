# Metrics Grid Enhancement Specification

## Current State Audit

### Dashboard (`/`)
**Existing Metrics (3 cards):**
- Total Income
- Total Expenses  
- Net Profit

**Missing Valuable Metrics:**
- Receipt scanning stats (total scanned, linked %)
- XP progress summary
- Income verification quality score
- Upcoming tax deadlines
- Month-over-month trends

---

### Tax Page (`/tax`)
**Existing Metrics (4 cards):**
- Projected Annual Tax
- Quarterly Payment
- Self-Employment Tax
- (4th card not visible in preview)

**Enhancement Opportunities:**
- Quarter completion status (4 quarters with checkmarks)
- Tax savings from deductions
- Compared to last year
- Days until next deadline

---

### Insights Page (`/insights`)
**Existing Metrics:**
- Current vs Previous month comparison
- Category breakdowns

**Enhancement Opportunities:**
- Average transaction size
- Largest expense/income
- Most frequent vendor
- Spending velocity ($/day average)
- Category trends (up/down arrows)

---

### Receipts Page (`/receipts`)
**Existing Metrics:**
- None! Just a list

**Needed Metrics:**
- Total receipts scanned
- Scanned this month
- Unlinked receipts count
- Total amount captured
- Average receipt amount
- OCR confidence average

---

### Transactions Page (`/transactions`)
**Existing Metrics:**
- None! Just filters and list

**Needed Metrics:**
- Total transactions
- Verified income % (Strong/Bank/Self breakdown)
- Potential duplicates detected
- Most common category
- Average transaction amount

---

### Mileage Page (`/mileage`)
**Existing Metrics (4 cards):**
- Business Miles YTD
- Estimated Deduction
- Business Trips
- (4th card not visible)

**Enhancement Opportunities:**
- Average miles per trip
- This month vs last month
- Personal vs Business ratio
- $ saved vs actual fuel costs

---

### Invoices Page (`/invoices`)
**Existing Metrics:**
- None! Just a list

**Needed Metrics:**
- Total outstanding amount
- Overdue invoices count
- Paid this month
- Average payment time (days)
- Collection rate %

---

### Reports Page (`/reports`)
**Existing Metrics:**
- Business Summary (Income, Expenses, Profit)
- Receipt Summary (Count, Total, Tax, Linked)

**Enhancement Opportunities:**
- Top expense category this period
- Biggest single expense
- Income sources breakdown
- Document completeness score

---

## Enhancement Priority Matrix

### 🔥 High Priority (User visits frequently, high value)
1. **Dashboard** - Add 3 more cards:
   - Receipt Activity (scanned this month, YTD total)
   - Income Verification Quality (Strong/Bank/Self %)
   - Quick Stats (avg transaction, largest expense)

2. **Transactions Page** - Add 4-card header:
   - Total Transactions
   - Verified Income Quality Score
   - Unlinked Receipts Alert
   - Category Breakdown Preview

3. **Receipts Page** - Add 4-card header:
   - Total Scanned
   - Scanned This Month
   - Unlinked Count (clickable to filter)
   - Total $ Captured

### 🟡 Medium Priority
4. **Invoices Page** - Add 3-card header:
   - Total Outstanding
   - Overdue Count (red if >0)
   - Paid This Month

5. **Insights Page** - Enhance existing metrics:
   - Add trend arrows to existing cards
   - Add "Top Vendor" card
   - Add "Biggest Expense This Month" card

### 🟢 Lower Priority (Already decent)
6. **Tax Page** - Minor enhancements
7. **Mileage Page** - Minor enhancements
8. **Reports Page** - Already comprehensive

---

## Design Philosophy

### Visual Consistency
- All metric cards use same Card component
- Color coding: Green (income/positive), Red (expenses/negative), Blue (neutral/info)
- Icons from lucide-react for visual hierarchy
- Large bold numbers, small descriptive labels

### Gamification Integration
- XP-related metrics where relevant
- Achievement unlocks tied to metrics (e.g., "Scan 100 receipts")
- Progress bars for goals
- Trend indicators (🔺🔻)

### Actionability
- Clickable metrics that filter/navigate
- "Unlinked Receipts" → filters receipts page
- "Overdue Invoices" → filters to overdue
- Alerts for items needing attention (red badges)

### Performance
- All calculations done client-side (store data)
- No additional API calls
- Memoized calculations where possible

---

## Implementation Order

1. **Dashboard Enhancement** (30 min)
2. **Transactions Page Metrics** (20 min)
3. **Receipts Page Metrics** (20 min)
4. **Invoices Page Metrics** (15 min)
5. **Insights Page Enhancements** (15 min)

**Total Implementation Time: ~2 hours**
