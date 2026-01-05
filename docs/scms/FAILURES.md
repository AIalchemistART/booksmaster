# Failures Log (L2)

**Project:** Thomas Books  
**Purpose:** Track all failures, bugs, and issues with root cause analysis

---

## Instructions

When a failure occurs:
1. Use `docs/templates/FAILURE_LOG_TEMPLATE.md` for implementation failures (requires 5 Whys)
2. Use `docs/templates/TERMINOLOGY_CORRECTION_TEMPLATE.md` for terminology/definition errors
3. Always complete root cause analysis
4. Update INTEGRITY_CLUSTER.md if terminology was involved (completes self-healing loop)

---

## Failure Log Entries

### [FAILURE-001] Negative Amount Loss Due to Falsy Operator Anti-Pattern

**Date:** 2025-12-30  
**Session ID:** Checkpoint 69+  
**Severity:** Critical  
**Impact:** Production - Data Loss  
**Status:** ✅ Resolved

#### Problem Statement

**What went wrong?**
Negative receipt amounts (returns/refunds) were being converted to `undefined` or `0` during storage and transaction conversion, causing return receipts to be invisible in the conversion queue and preventing proper transaction records.

**Expected Behavior:**
- Return receipts with negative amounts should be stored with their negative values intact
- Negative transactions should display in the transaction list
- Returns should be convertible to transactions with negative amounts

**Actual Behavior:**
- 7 return receipts disappeared from conversion queue (showed 88 instead of 95)
- Converted return receipts created transactions with $0.00 instead of negative amounts
- Transaction filter excluded all negative amounts from display

#### 5 Whys Root Cause Analysis

**Why 1:** Why did negative amounts disappear?
- Code used `||` operator: `data.amount || undefined` and `receipt.ocrAmount || 0`

**Why 2:** Why did the `||` operator cause the problem?
- In JavaScript, negative numbers are falsy values, so `||` evaluates to the right operand

**Why 3:** Why was `||` used instead of `??` (nullish coalescing)?
- Original code was written before negative amounts were a requirement (returns feature added later)

**Why 4:** Why didn't the returns feature implementation catch this?
- Changes were made to OCR parsing and UI display, but storage/conversion layers weren't audited for falsy checks

**Why 5:** Why wasn't there a systematic audit for falsy value handling?
- No established pattern/rule in WORKSPACE_RULES.md about preferring `??` over `||` for numeric values that can be negative or zero

#### Resolution

**Immediate Fix:**
Replaced all instances of `||` with `??` (nullish coalescing) for amount handling across 3 critical paths.

**Files Modified:**
- `src/app/receipts/page.tsx:131` - Receipt storage: `ocrAmount: data.amount ?? undefined`
- `src/app/transactions/page.tsx:204` - Basic conversion: `amount: receipt.ocrAmount ?? 0`
- `src/app/transactions/page.tsx:277` - AI conversion: `amount: receipt.ocrAmount ?? 0`
- `src/app/transactions/page.tsx:384-387` - Transaction filter: Added smart negative amount logic
- `src/app/transactions/page.tsx:235-240` - Auto-classify receipts without amounts as supplemental docs

**Code Changes:**
```typescript
// ANTI-PATTERN (Bug):
ocrAmount: data.amount || undefined  // Negative becomes undefined
amount: receipt.ocrAmount || 0       // Negative becomes 0

// CORRECT PATTERN:
ocrAmount: data.amount ?? undefined  // Preserves negatives, only converts null/undefined
amount: receipt.ocrAmount ?? 0       // Preserves negatives
```

#### Prevention Strategy

**Short-term (This Session):**
- [x] Fixed all amount handling to use `??` operator
- [x] Added smart filter logic to include negatives when threshold = 0
- [x] Added auto-classification for receipts without amounts → supplemental docs

**Long-term (Pattern Promotion):**
- [ ] Add to WORKSPACE_RULES.md: "Use `??` (nullish coalescing) instead of `||` for numeric values that can be negative or zero"
- [ ] Create ESLint rule to detect `|| 0` or `|| undefined` patterns on amount fields
- [ ] Add test coverage for negative amount handling in receipts and transactions

**Related Patterns:**
- Same issue exists in `amountRange` filter logic (also fixed)
- Potential for similar issues with other numeric fields (tax, subtotal, etc.)

#### Lessons Learned

**What worked well:**
- User reported the issue with clear symptoms (7 receipts missing)
- Root cause analysis quickly identified the pattern across multiple files
- Nullish coalescing operator (`??`) is the correct tool for this use case

**What to avoid:**
- **ANTI-PATTERN**: Using `||` operator for numeric default values when the number can legitimately be 0 or negative
- Implementing features (returns) without auditing existing code for falsy value assumptions

**Knowledge Gap Filled:**
- JavaScript `||` treats `0`, `-0`, `NaN`, `null`, `undefined`, and `false` as falsy
- For numeric values, always prefer `??` which only checks for `null`/`undefined`
- When adding support for edge cases (negatives), must audit entire data flow path, not just entry/display points

---

### [FAILURE-002] XP-Based Auto-Leveling Bypassing Manual Progression System

**Date:** 2026-01-01  
**Session ID:** Checkpoint 121+  
**Severity:** Critical  
**Impact:** Production - Game Mechanics Broken  
**Status:** ✅ Resolved

#### Problem Statement

**What went wrong?**
Users were immediately jumping to Level 6 (max level) after completing the onboarding wizard, bypassing all intended progression gates. The manual leveling system was undermined by automatic XP-based level calculation.

**Expected Behavior:**
- Complete wizard → Stay at Level 1
- Progress through levels 2-6 via explicit user actions (dashboard click, receipt validation, etc.)
- Level-up notifications trigger for each milestone

**Actual Behavior:**
- Complete wizard → Jump directly to Level 6
- Level 6 notification appeared immediately after wizard
- All tabs unlocked at once, breaking progressive onboarding flow

#### 5 Whys Root Cause Analysis

**Why 1:** Why did users jump to Level 6 immediately?
- `calculateLevel()` function was still active and returning Level 6 based on XP earned

**Why 2:** Why did XP cause automatic level-up when manual leveling was implemented?
- `calculateLevel()` was called by `awardXP()` function, which updated `currentLevel` based on total XP

**Why 3:** Why were both systems (manual and automatic) active simultaneously?
- Manual leveling (`manualLevelUp()`) was added without disabling the XP-based leveling logic in `calculateLevel()`

**Why 4:** Why didn't the `xpRequired: 0` values prevent this?
- All 6 levels had `xpRequired: 0`, so any XP amount caused `calculateLevel()` to return the highest level (6)

**Why 5:** Why wasn't the automatic leveling system fully disabled when transitioning to manual?
- Implementation focused on adding manual triggers without auditing existing automatic progression paths

#### Resolution

**Immediate Fix:**
1. Disabled `calculateLevel()` to always return 1 (manual leveling only)
2. Removed XP-awarding actions from wizard (`completeAction()` calls removed)
3. Re-enabled XP awards for cosmetic progress bar (doesn't trigger levels)
4. Added migration logic to reset invalid levels on app startup

**Files Modified:**
- `src/lib/gamification/leveling-system.ts:832-834` - `calculateLevel()` now returns 1 always
- `src/components/onboarding/OnboardingWizard.tsx:46-55` - Removed wizard XP awards, then restored for cosmetic use
- `src/store/gamification-slice.ts:91-122` - `manualLevelUp()` awards cosmetic XP matching target level
- `src/store/index.ts:354-365` - Migration resets invalid levels > 1 without "receipts" feature

**Code Changes:**
```typescript
// ANTI-PATTERN (Bug):
export function calculateLevel(xp: number): UserLevel {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      return LEVELS[i].level  // Returns 6 when all xpRequired = 0
    }
  }
  return 1
}

// CORRECT PATTERN:
export function calculateLevel(xp: number): UserLevel {
  return 1  // Manual leveling only - XP is cosmetic
}
```

#### Prevention Strategy

**Short-term (This Session):**
- [x] Disabled automatic level calculation
- [x] Added migration to fix existing users with invalid levels
- [x] XP system now purely cosmetic (progress bar only)
- [x] Manual level-ups award matching XP for smooth UX

**Long-term (Pattern Promotion):**
- [ ] Document "Manual Progression Pattern" in WORKSPACE_RULES.md if n≥2
- [ ] Add test coverage for level progression flows
- [ ] Consider feature flag system for toggling progression modes

**Related Patterns:**
- Similar risk in achievement unlocking (also uses manual triggers now)
- Migration pattern useful for fixing corrupted user state

#### Lessons Learned

**What worked well:**
- Migration logic automatically fixed existing users without data loss
- Cosmetic XP provides engagement while manual leveling maintains control
- User reported clear symptom ("Level 6 popped up")

**What to avoid:**
- **ANTI-PATTERN**: Running parallel progression systems (automatic + manual) without explicit gates
- Adding features without disabling conflicting legacy code paths
- Assuming XP = 0 prevents level-up when iterator still processes all levels

**Knowledge Gap Filled:**
- When transitioning game mechanics, must audit all code paths that affect the same state
- "Cosmetic" systems still need safeguards (XP capping) to maintain UX illusion
- State migrations are critical for production apps with persistent user data

---

### [FAILURE-003] XP Exceeding Level Cap Breaks Progression Illusion

**Date:** 2026-01-01  
**Session ID:** Checkpoint 121+  
**Severity:** Medium  
**Impact:** User Experience - Suspension of Disbelief  
**Status:** ✅ Resolved

#### Problem Statement

**What went wrong?**
Progress bar displayed 125 XP at Level 1, exceeding Level 2's requirement of 100 XP. This broke the illusion that XP causes leveling, exposing the manual progression system.

**Expected Behavior:**
- XP approaches but never exceeds next level requirement
- Leveling up feels like a natural result of accumulating XP
- Progress bar shows realistic progression (e.g., 90/100 XP)

**Actual Behavior:**
- Wizard awarded 125 XP (50+25+50 from profile, fiscal year, API key)
- Level 2 requires 100 XP
- Progress bar showed "125 / 100 XP" (125%)

#### 5 Whys Root Cause Analysis

**Why 1:** Why did XP exceed the next level cap?
- No maximum cap on XP gains in `completeAction()` function

**Why 2:** Why wasn't there a cap implemented?
- Cosmetic XP system was added without UX safeguards for progression illusion

**Why 3:** Why does exceeding the cap break the illusion?
- Users see they have "enough XP" but level doesn't unlock, revealing manual triggers

**Why 4:** Why is the illusion important if leveling is manual?
- Manual leveling needs to feel natural, not artificial; progression should seem earned

**Why 5:** Why wasn't XP capping considered during cosmetic XP implementation?
- Focus was on making XP visible without thinking through edge cases of manual + cosmetic interaction

#### Resolution

**Immediate Fix:**
Implemented 90% XP cap relative to next level requirement in `completeAction()` function.

**Files Modified:**
- `src/store/gamification-slice.ts:146-155` - Cap XP at 90% of next level's `xpRequired`
- `src/lib/gamification/leveling-system.ts:167` - Adjusted Level 1 `xpRequired` from 0 to 50
- `src/lib/gamification/achievements.ts:54,61,68` - Reduced wizard achievement XP (15, 10, 15)

**Code Changes:**
```typescript
// XP Capping Logic:
const nextLevelData = LEVELS.find(l => l.level === currentProgress.currentLevel + 1)
if (nextLevelData && result.newProgress.totalXP >= nextLevelData.xpRequired) {
  const cappedXP = Math.floor(nextLevelData.xpRequired * 0.9)  // 90% cap
  result.newProgress.totalXP = cappedXP
  result.newProgress.currentXP = cappedXP
}
```

#### Prevention Strategy

**Short-term (This Session):**
- [x] XP now caps at 90% of next level requirement
- [x] Wizard awards ~40 XP total (15+10+15 achievements)
- [x] Level 1 xpRequired changed to 50 (creates visible progress)

**Long-term (Pattern Promotion):**
- [ ] Document "Cosmetic Progression" pattern with cap requirements
- [ ] Apply similar caps to other progression systems (achievements, streaks)
- [ ] Add UI tests for progress bar edge cases

#### Lessons Learned

**What worked well:**
- 90% cap feels natural while preventing overflow
- Adjusting both XP sources (awards) and targets (level requirements) provides flexibility

**What to avoid:**
- **ANTI-PATTERN**: Cosmetic systems without bounds checking
- Assuming users won't notice mathematical inconsistencies in progression UI

**Knowledge Gap Filled:**
- UX illusions require consistent internal logic even if underlying mechanics differ
- Suspension of disbelief is fragile - any inconsistency reveals the "trick"

---

### [FAILURE-004] Tab Conditional Unlocks Not Triggering Level-Up Notifications

**Date:** 2026-01-01  
**Session ID:** Checkpoint 121+  
**Severity:** High  
**Impact:** User Experience - Missing Feedback  
**Status:** ✅ Resolved

#### Problem Statement

**What went wrong?**
Supporting Documents tab unlocked via conditional logic (first supplemental doc) but no Level 4 notification appeared. Progress bar stayed at Level 1 despite user progressing through workflow.

**Expected Behavior:**
- First receipt validation → Level 3 notification + Transactions tab
- First supplemental doc → Level 4 notification + Supporting Docs tab
- First transaction edit → Level 5 notification + Invoices/Reports tabs
- First categorization → Level 6 notification + Categorization Changes tab

**Actual Behavior:**
- Tab unlocked (conditional passed in Sidebar)
- No level-up notification modal
- Progress bar remained at Level 1
- User confused about progression state

#### 5 Whys Root Cause Analysis

**Why 1:** Why didn't the level-up notification trigger?
- Tab unlock conditions only checked features, didn't call `manualLevelUp()`

**Why 2:** Why were tab unlocks and level-ups separate systems?
- Sidebar uses `unlockCondition` to show/hide tabs based on level OR usage
- Level-ups triggered separately via `manualLevelUp()` calls

**Why 3:** Why didn't usage-based unlocks call `manualLevelUp()`?
- Implementation added fallback conditions (`|| receipts.some(...)`) without adding corresponding level-up triggers

**Why 4:** Why were fallbacks added without triggers?
- Focus was on preventing blocking, not maintaining level progression feedback
- Usage conditions were OR'd to level checks, not replacing them

**Why 5:** Why wasn't there a systematic check for level-up triggers?
- No documented pattern linking tab unlocks to level progression
- Manual leveling additions weren't audited against all unlock paths

#### Resolution

**Immediate Fix:**
Added `manualLevelUp()` calls at each conditional unlock point across 4 locations.

**Files Modified:**
- `src/app/receipts/page.tsx:1060-1067` - Level 3 trigger on first receipt validation
- `src/app/transactions/page.tsx:383-390` - Level 4 trigger on first supplemental doc
- `src/components/modals/ReceiptImageModal.tsx:555-575` - Level 5 & 6 triggers on transaction edits

**Code Changes:**
```typescript
// Level 3 Example:
if (isNowValidated) {
  const validatedCount = receipts.filter((r: any) => r.userValidated).length
  if (validatedCount === 0) {  // First validation
    const { manualLevelUp, userProgress } = useStore.getState()
    if (userProgress.currentLevel < 3) {
      manualLevelUp(3)  // Triggers notification + progress bar update
    }
  }
}
```

#### Prevention Strategy

**Short-term (This Session):**
- [x] All tab unlocks now trigger corresponding level-ups
- [x] Level-up checks include current level guard (prevent duplicate notifications)
- [x] Console logging added for debugging level progression

**Long-term (Pattern Promotion):**
- [ ] Document "Tab Unlock = Level Up" pattern in WORKSPACE_RULES.md
- [ ] Create mapping table: Condition → Tab → Level
- [ ] Add E2E tests for full progression flow

**Related Patterns:**
- Achievement unlocking uses similar trigger-on-first pattern
- Level checks prevent duplicate notifications (idempotent triggers)

#### Lessons Learned

**What worked well:**
- Using `useStore.getState()` to access store in event handlers
- Guard clauses (`if (currentLevel < targetLevel)`) prevent duplicate triggers
- First-time checks (`count === 0`) ensure trigger fires exactly once

**What to avoid:**
- **ANTI-PATTERN**: Separating unlock logic from progression feedback
- Adding fallback conditions without corresponding progression triggers
- Assuming UI state updates without explicit notification system calls

**Knowledge Gap Filled:**
- Tab visibility and level progression are coupled but require explicit linking
- Event handlers need store access pattern: `useStore.getState()` not `useStore()`
- Count checks must happen BEFORE state update to catch "first time"

---

### [FAILURE-005] Electron Build CSS/JS Loading Failure - ASAR & Protocol Interceptor Issues

**Date:** 2026-01-03  
**Session ID:** Checkpoint 147  
**Severity:** Critical  
**Impact:** Production - Application Unusable  
**Status:** ✅ Resolved

#### Problem Statement

**What went wrong?**
Electron app displayed white screen with no CSS/JS loading after build. All `/_next/static/` assets returned `net::ERR_FILE_NOT_FOUND` errors. App was completely non-functional in production builds despite working in development.

**Expected Behavior:**
- Production build loads with full CSS styling
- All Next.js static assets (CSS, JS chunks) load correctly
- App displays styled UI matching development environment

**Actual Behavior:**
- White screen or unstyled content
- Console errors: `Failed to load resource: net::ERR_FILE_NOT_FOUND` for all `/_next/` paths
- Paths like `file:///C:/_next/static/css/5af1785099784f90.css` attempted but failed
- Protocol interceptor not triggering despite registration

#### 5 Whys Root Cause Analysis

**Why 1:** Why did CSS/JS files fail to load?
- Electron was attempting to load `file:///C:/_next/static/...` paths which don't exist on filesystem

**Why 2:** Why were these incorrect paths being generated?
- Using `loadFile()` instead of `loadURL()` bypassed the protocol interceptor entirely

**Why 3:** Why didn't the protocol interceptor catch the `/_next/` requests?
- Protocol interceptor was registered but `loadFile()` doesn't trigger protocol handlers - only `loadURL()` does

**Why 4:** Why was ASAR packaging attempted when it caused path resolution issues?
- Tried to minimize build size without understanding Electron's ASAR path resolution requirements for Next.js static exports

**Why 5:** Why did multiple attempted fixes (webSecurity: false, baseURLForDataURL, assetPrefix) fail?
- Root cause was loading method (`loadFile` vs `loadURL`), not security settings or path configuration. Focused on symptoms instead of fundamental loading mechanism.

#### Resolution

**Immediate Fix:**
Changed from `mainWindow.loadFile(indexPath)` to `mainWindow.loadURL(fileUrl)` with proper `file:///` URL format, allowing session protocol interceptor to catch and redirect `/_next/` requests to correct filesystem paths.

**Files Modified:**
- `electron/main.js:70-72` - Changed to `loadURL(file:///${indexPath})` instead of `loadFile(indexPath)`
- `electron/main.js:143-165` - Added session.protocol.interceptFileProtocol after window creation
- `electron/preload.js:3-24` - Added comprehensive PRELOAD logging for debugging CSS loading
- `package.json:82` - Disabled ASAR packaging (`"asar": false`)

**Code Changes:**
```javascript
// ANTI-PATTERN (Bug):
mainWindow.loadFile(indexPath)  // Bypasses protocol interceptor

// CORRECT PATTERN:
const fileUrl = `file:///${indexPath.replace(/\\/g, '/')}`
mainWindow.loadURL(fileUrl)  // Allows protocol interceptor to work

// Protocol Interceptor (registered on session):
const session = mainWindow.webContents.session
session.protocol.interceptFileProtocol('file', (request, callback) => {
  let url = request.url.substr(7)
  url = decodeURIComponent(url)
  
  if (url.includes('/_next/')) {
    const nextPath = url.substring(url.indexOf('/_next/'))
    const fullPath = path.join(process.resourcesPath, 'app', 'out', nextPath)
    callback({ path: fullPath })
    return
  }
  callback({ path: url })
})
```

#### Prevention Strategy

**Short-term (This Session):**
- [x] Changed to `loadURL()` to enable protocol interception
- [x] Disabled ASAR packaging to simplify path resolution
- [x] Added session-based protocol interceptor for `/_next/` paths
- [x] Added preload.js logging for early CSS debugging visibility

**Long-term (Pattern Promotion):**
- [ ] Document "Electron + Next.js Static Export" pattern in WORKSPACE_RULES.md
- [ ] Add to WORKSPACE_RULES: "NEVER re-enable ASAR without full path resolution audit"
- [ ] Add to WORKSPACE_RULES: "Electron: Use loadURL() not loadFile() when protocol interceptors are needed"
- [ ] Create build verification checklist for Electron production builds

**Related Patterns:**
- HEIC conversion dependencies required explicit bundling (extraResources pattern)
- Protocol interceptor pattern critical for serving static assets with custom paths
- Session-scoped protocol handlers more reliable than global handlers

#### Lessons Learned

**What worked well:**
- Preload.js logging provided visibility into renderer console (main process logs invisible in DevTools)
- Incremental debugging revealed exact failure point (`file:///C:/_next/...` paths)
- User persistence in testing multiple builds allowed iteration to solution

**What to avoid:**
- **ANTI-PATTERN**: Enabling ASAR packaging without understanding path resolution impact on static file serving
- **ANTI-PATTERN**: Using `loadFile()` when protocol interceptors are required for asset loading
- **ANTI-PATTERN**: Attempting `assetPrefix: '.'` changes - incompatible with `next/font`
- **ANTI-PATTERN**: Implementing custom `app://` protocol on Windows - caused full white screen
- **ANTI-PATTERN**: Adding logging AFTER page load (did-finish-load) - too late to catch resource errors
- Trying symptom fixes (webSecurity, baseURLForDataURL) without diagnosing root cause
- Repeatedly testing same approach without logging to confirm changes took effect

**Knowledge Gap Filled:**
- `loadFile()` bypasses Electron protocol handlers; must use `loadURL(file://...)` for interception
- Session protocol handlers (`session.protocol`) more reliable than global `protocol` API
- Preload.js runs in renderer context - its console.log appears in DevTools
- Main process logs (console.log in main.js) do NOT appear in renderer DevTools
- ASAR packaging breaks Next.js static asset loading without complex path remapping
- `assetPrefix` in next.config.js incompatible with `next/font` usage
- Protocol interceptors must be registered AFTER window creation when using session scope

---

### [FAILURE-006] Categorization Changes Tab Missing Transactions Due to Incomplete Field Tracking

**Date:** 2026-01-04  
**Session ID:** Checkpoint 163  
**Severity:** High  
**Impact:** Production - Data Loss (AI Learning)  
**Status:** ✅ Resolved

#### Problem Statement

**What went wrong?**
First categorization correction didn't appear in Categorization Changes tab despite quest triggering and correction being saved. User changed payment method but transaction was filtered out because `wasManuallyEdited` flag was `false`.

**Expected Behavior:**
- ANY field edit to a transaction marks it as manually edited
- All manually edited transactions appear in Categorization Changes tab
- AI learning corrections captured for all user modifications

**Actual Behavior:**
- Only type/category changes set `wasManuallyEdited = true`
- Editing other fields (payment method, description, amount, etc.) didn't mark transaction as edited
- Categorization report filtered out transaction: `wasManuallyEdited: false`

#### 5 Whys Root Cause Analysis

**Why 1:** Why didn't the transaction appear in the Categorization Changes tab?
- Categorization report filters by `t.wasManuallyEdited && t.originalType && t.originalCategory`
- The transaction had `wasManuallyEdited: false`

**Why 2:** Why was `wasManuallyEdited` false when the user edited the payment method?
- Code only checked `categorizationChanged` (type/category edits), not `anyFieldChanged`
- `wasManuallyEdited = categorizationChanged || transaction.wasManuallyEdited || false`

**Why 3:** Why was the logic restricted to categorization changes?
- Original implementation focused on AI categorization learning (type/category corrections)
- Payment method field added later without updating the edit tracking logic

**Why 4:** Why wasn't `anyFieldChanged` used instead of `categorizationChanged`?
- The `anyFieldChanged` variable existed but wasn't connected to `wasManuallyEdited` flag
- Variable was used for quest logic but not persistence logic

**Why 5:** Why wasn't field tracking audited when new fields were added?
- No documented pattern linking field change detection to persistence flags
- Adding fields didn't trigger review of edit tracking logic

#### Resolution

**Immediate Fix:**
Changed `wasManuallyEdited` to use `anyFieldChanged` instead of only `categorizationChanged`.

**Files Modified:**
- `src/components/modals/ReceiptImageModal.tsx:505` - `wasManuallyEdited = anyFieldChanged || transaction.wasManuallyEdited`

**Code Changes:**
```typescript
// ANTI-PATTERN (Bug):
const categorizationChanged = (
  (finalType && finalType !== originalType) ||
  (finalCategory && finalCategory !== originalCategory)
)
const wasManuallyEditedValue = categorizationChanged || transaction.wasManuallyEdited || false

// CORRECT PATTERN:
const anyFieldChanged = /* checks ALL fields */
const wasManuallyEditedValue = anyFieldChanged || transaction.wasManuallyEdited || false
```

#### Prevention Strategy

**Short-term (This Session):**
- [x] Fixed `wasManuallyEdited` to track ANY field change
- [x] Confirmed categorization corrections save for all edits

**Long-term (Pattern Promotion):**
- [ ] Document "Complete Field Tracking" pattern in WORKSPACE_RULES.md
- [ ] Create test coverage for all editable transaction fields
- [ ] Add validation that field change detection matches persisted flags

**Related Patterns:**
- Similar risk in validation tracking (should track all changes, not just categorization)
- Quest eligibility uses same `anyFieldChanged` variable correctly

#### Lessons Learned

**What worked well:**
- Diagnostic logging revealed exact filter condition failing
- `anyFieldChanged` variable already existed, just needed to be used correctly
- User provided detailed logs showing exact failure point

**What to avoid:**
- **ANTI-PATTERN**: Using subset field checks (type/category) when "any field" semantics needed
- Adding fields without auditing related tracking/filtering logic
- Assuming variable names indicate all usage (categorizationChanged vs anyFieldChanged)

**Knowledge Gap Filled:**
- Field change tracking must be comprehensive for features that depend on "was edited" semantics
- Variable naming matters - `anyFieldChanged` is more semantically accurate than `categorizationChanged`
- Filter conditions in reports must match flags set during persistence

---

### [FAILURE-007] Validation Quest Counting Bug - Off-by-One Error

**Date:** 2026-01-04  
**Session ID:** Checkpoint 163  
**Severity:** Medium  
**Impact:** Production - Game Mechanics  
**Status:** ✅ Resolved

#### Problem Statement

**What went wrong?**
Validation quest (`validate_transaction`) was marked complete on first transaction instead of second, preventing proper progression. Quest was supposed to trigger on 2nd validation overall but triggered on 1st.

**Expected Behavior:**
- 1st transaction with edit + validate → `edit_transaction` quest only
- 2nd transaction validate → `validate_transaction` quest (Level 5)
- Count PREVIOUS validations, not including current one

**Actual Behavior:**
- 1st transaction validated → both quests marked complete simultaneously
- No quest available for 2nd validation
- User stuck at Level 4 despite completing intended progression

#### 5 Whys Root Cause Analysis

**Why 1:** Why did the validation quest trigger on the first transaction?
- Count included the current transaction being validated in the filter

**Why 2:** Why was the current transaction included in the count?
- Code: `transactions.filter(t => t.userValidated).length` included ALL validated transactions
- State update happens after quest check, but filter read from store

**Why 3:** Why does including current transaction cause off-by-one error?
- Condition: `validatedCount >= 1` evaluates to true when current is 1st and count = 1
- Should be `validatedCount >= 1` where count excludes current (requires current to be 2nd)

**Why 4:** Why wasn't the current transaction explicitly excluded?
- Original implementation didn't anticipate timing issue between quest check and state update
- Filter assumed store state wouldn't include current until after quest logic

**Why 5:** Why wasn't this caught during initial testing?
- Test flow didn't isolate edit vs validate quests (both could trigger on same transaction)
- No explicit test for "2nd validation" progression path

#### Resolution

**Immediate Fix:**
Explicitly exclude current transaction from validated count.

**Files Modified:**
- `src/components/modals/ReceiptImageModal.tsx:609` - `transactions.filter(t => t.userValidated && t.id !== transaction.id).length`

**Code Changes:**
```typescript
// ANTI-PATTERN (Bug):
const validatedCount = transactions.filter(t => t.userValidated).length
// Could include current transaction depending on timing

// CORRECT PATTERN:
const validatedCount = transactions.filter(t => t.userValidated && t.id !== transaction.id).length
// Explicitly excludes current transaction
```

#### Prevention Strategy

**Short-term (This Session):**
- [x] Fixed validation count to exclude current transaction
- [x] Added logging: "Validated count (previous)" for clarity

**Long-term (Pattern Promotion):**
- [ ] Document "Count Previous Events" pattern for quest triggers
- [ ] Add E2E test for sequential quest progression
- [ ] Create quest progression diagram showing all paths

**Related Patterns:**
- First-time checks use `count === 0` before state update (timing-dependent)
- Transaction ID exclusion pattern prevents self-counting

#### Lessons Learned

**What worked well:**
- Explicit ID exclusion prevents timing-dependent bugs
- Logging with "(previous)" clarifies intent in console
- User logs showed quest completing unexpectedly early

**What to avoid:**
- **ANTI-PATTERN**: Counting from store state that's about to change without exclusions
- Assuming state updates happen after quest logic (race conditions)
- Off-by-one errors from inclusive vs exclusive counting

**Knowledge Gap Filled:**
- Quest triggers that count events must explicitly exclude current event
- Store reads during state mutation handlers can include partially updated data
- Clear variable naming ("previous", "excluding current") prevents confusion

---

### [FAILURE-008] Quest Migration Incorrectly Inferring Parallel Quests from Level

**Date:** 2026-01-04  
**Session ID:** Checkpoint 163  
**Severity:** Critical  
**Impact:** Production - Game Mechanics Broken  
**Status:** ✅ Resolved

#### Problem Statement

**What went wrong?**
Quest migration automatically added `validate_transaction` to completed quests when user reached Level 5, even though user reached L5 via `upload_supplemental` quest instead. This caused Invoices tab to unlock prematurely when user clicked Supporting Documents tab.

**Expected Behavior:**
- Level 5 can be reached by EITHER `validate_transaction` OR `upload_supplemental`
- Migration should only infer sequential quests (1→2→3→4)
- Parallel quests must be explicitly completed, not inferred from level

**Actual Behavior:**
- Migration saw Level 5 and added `validate_transaction` to completed quests
- User path was: edit (L4) → supplemental (L5)
- When sidebar re-rendered, Invoices unlocked because quest was in completedQuests

#### 5 Whys Root Cause Analysis

**Why 1:** Why did Invoices unlock when user clicked Supporting Documents?
- Sidebar checked `completedQuests.includes('validate_transaction')` and found it

**Why 2:** Why was `validate_transaction` in completed quests?
- Quest migration added it because `correctedLevel >= 5`

**Why 3:** Why did migration assume Level 5 means validation quest complete?
- Migration logic: `if (correctedLevel >= 5 && !completedQuests.includes('validate_transaction'))`
- Assumed linear progression: L1→L2→L3→L4→L5 where L5 = validate

**Why 4:** Why was linear progression assumed when quests are parallel?
- Migration was written before parallel quest paths (validate OR supplemental) were implemented
- Code wasn't updated when quest system changed from sequential to branching

**Why 5:** Why wasn't migration logic audited when parallel quests were added?
- No systematic review of all level-related code when quest architecture changed
- Migration runs silently on rehydration, not visible during quest implementation testing

#### Resolution

**Immediate Fix:**
Removed incorrect quest inference for parallel quests (L5 and L6).

**Files Modified:**
- `src/store/index.ts:490-498` - Removed `validate_transaction` and `upload_supplemental` from migration logic

**Code Changes:**
```typescript
// ANTI-PATTERN (Bug):
if (correctedLevel >= 5 && !completedQuests.includes('validate_transaction')) {
  completedQuests.push('validate_transaction')  // ❌ WRONG - L5 can also be from supplemental
}
if (correctedLevel >= 6 && !completedQuests.includes('upload_supplemental')) {
  completedQuests.push('upload_supplemental')  // ❌ WRONG - L6 can also be from validation
}

// CORRECT PATTERN:
// Parallel quests (L5, L6) cannot be inferred from level alone
// Only sequential quests (L2, L3, L4, L7) can be migrated
```

#### Prevention Strategy

**Short-term (This Session):**
- [x] Removed parallel quest inference from migration
- [x] Added comment explaining why parallel quests can't be inferred
- [x] Migration now only handles sequential progression

**Long-term (Pattern Promotion):**
- [ ] Document "Sequential vs Parallel Quest Migration" pattern
- [ ] Add validation test: Level 5 should not auto-complete validate_transaction
- [ ] Create quest dependency graph showing parallel paths

**Related Patterns:**
- Level migration pattern works for sequential unlocks only
- Sidebar unlock conditions use OR logic for parallel paths
- Quest completion must be explicit for branching progression

#### Lessons Learned

**What worked well:**
- User testing caught issue immediately (wrong tab unlocked)
- Logs showed migration adding quest: `[QUEST MIGRATION] ✅ Added validate_transaction`
- Fix was simple deletion - no complex logic needed

**What to avoid:**
- **ANTI-PATTERN**: Inferring quest completion from level when multiple paths exist
- Assuming migration logic stays valid when game architecture changes
- Silent state mutations (migrations) without visibility during feature testing

**Knowledge Gap Filled:**
- Linear level progression ≠ linear quest progression when parallel paths exist
- Migration logic must distinguish between sequential and branching unlocks
- State rehydration migrations can introduce bugs invisible during active development

---

**Statistics:**
- Total Failures: 8
- Critical: 4
- High: 2
- Medium: 2
- Low: 0
- Resolved: 8
- Open: 0

---

**Last Updated:** January 4, 2026
