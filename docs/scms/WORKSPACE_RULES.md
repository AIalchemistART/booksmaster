# Workspace Rules (L1 Validated Patterns)

**Project:** Thomas Books  
**Tech Stack:** Next.js 14, React, TypeScript, Electron, Zustand, TailwindCSS, Gemini Vision API  
**Purpose:** Mandatory patterns validated through repeated successful use

---

## L4 Global Rules (Always Active)

These rules come from user preferences and are non-negotiable:

### ✨ 1. Avoid Duplicate Code (DRY)
- **Constraint:** Reuse existing functionality wherever possible
- **Why:** Prevents technical debt and promotes long-term maintainability
- **Action:** Before writing new code, search for similar existing implementations

### ⚡ 2. Avoid Unnecessary Refactors
- **Constraint:** Do not change patterns or architecture of working features unless explicitly directed
- **Why:** Major refactors create risk and regression bugs
- **Action:** Only refactor when asked or when fixing a bug

### 🔒 3. Log All Failures (SCMS Protocol)
- **Constraint:** If a tool fails or a bug is found, STOP and log it in `docs/scms/FAILURES.md`
- **Why:** Silent fixes destroy learning opportunities
- **Action:** Use FAILURE_LOG_TEMPLATE.md or TERMINOLOGY_CORRECTION_TEMPLATE.md

### 💡 4. Write Thorough Tests
- **Constraint:** Ensure tests cover all major functionality
- **Why:** Testing builds confidence and supports AI-assisted workflows
- **Action:** Add tests for new features and bug fixes

### 🚫 5. Mock Data Only for Testing
- **Constraint:** Mock data should never enter dev or production environments
- **Why:** Protects data integrity and runtime safety
- **Action:** Isolate mocks to test files only

### 🛑 6. Read Before Write
- **Constraint:** Never use `edit_file` or `write_to_file` without first reading the target
- **Why:** Prevents tool errors and destructive overwrites
- **Action:** Always call `read_file` before modifications

### 📄 7. Update Documentation with Code
- **Constraint:** When creating/deleting files, immediately update `docs/scms/INDEX.md`
- **Why:** Code without context becomes legacy debt instantly
- **Action:** Update INDEX.md in same session as code changes

### 🧠 8. Retrieval-First Development
- **Constraint:** Check `docs/scms/WORKSPACE_RULES.md` before generating new patterns
- **Why:** Reduces token cost and ensures architectural consistency
- **Action:** Review this file at session start

---

## Project-Specific Architecture

### Tech Stack

**Frontend:**
- Next.js 14.2+ (static export mode)
- React 18+ with TypeScript
- TailwindCSS for styling
- Shadcn/ui component library

**Desktop:**
- Electron 39+ (main process + renderer)
- Protocol interception for static file serving
- IPC for file system operations
- No ASAR packaging (for route accessibility)

**State Management:**
- Zustand with persist middleware
- File system adapters (web vs Electron)
- Debounced saves to prevent performance issues

**AI/ML:**
- Google Gemini Vision API (primary receipt parsing)
- Tesseract OCR (fallback)
- Future: GPT-4V as secondary option

### File System Architecture

**Electron File System:**
- `src/lib/electron-file-system.ts` - Electron IPC handlers
- `src/lib/web-file-system.ts` - Browser File System Access API
- `src/lib/file-system-adapter.ts` - Unified adapter (auto-detects environment)

**Critical Rule:** Always use `file-system-adapter.ts`, never import web/electron implementations directly

### Naming Conventions

**Components:**
- PascalCase for React components
- Files use PascalCase: `ReceiptScanner.tsx`

**Utilities:**
- camelCase for functions and files
- Example: `generateId.ts`, `formatCurrency.ts`

**Types:**
- PascalCase for interfaces/types
- Prefix interfaces with `I` only if needed for clarity
- Example: `Receipt`, `Transaction`, `InvoiceItem`

**State:**
- camelCase for Zustand stores
- Example: `useStore`, `receipts`, `addReceipt`

---

## L1 Validated Patterns

*Patterns will be added here as they are promoted from L0 based on repeated successful use.*

**Current Count:** 0

### Pattern Promotion Criteria
- **Threshold:** Check `MEMORY_STATUS_DASHBOARD.md` for current threshold (n≥2, n≥3, or n≥5)
- **Evidence:** Document use cases with file references
- **Impact:** Show measurable benefit (time saved, bugs prevented, etc.)
- **Template:** Use `docs/templates/PATTERN_PROMOTION_TEMPLATE.md`

---

## Anti-Patterns (Known Issues)

### ❌ 1. Circular References in Zustand
- **Problem:** Calling `useStore.getState()` before store initialization causes errors
- **Solution:** Use `set()` callback to access state, not `getState()`
- **Example:**
```typescript
// ❌ Bad
restoreImages: async () => {
  const state = useStore.getState() // Circular reference!
  const receipts = state.receipts
}

// ✅ Good
restoreImages: async () => {
  let receipts = []
  set((state) => {
    receipts = state.receipts
    return state // No change yet
  })
}
```

### ❌ 2. Direct Web FileSystem Imports in Electron
- **Problem:** Importing `file-system-storage.ts` directly causes browser API errors in Electron
- **Solution:** Always use `file-system-adapter.ts` which detects environment
- **Files affected:** Any component using file operations

### ❌ 3. SAM2 Segmentation Inconsistency
- **Problem:** SAM2 crop tool sometimes removes useful information
- **Solution:** Receipt parsing works fine without segmentation; consider deprecating
- **Status:** Feature may be removed in future

### ❌ 4. Falsy Operator for Numeric Defaults
- **Problem:** Using `||` operator for numeric default values loses negative numbers and zeros
- **Root Cause:** `||` treats `0`, `-0`, negative numbers as falsy, causing data loss
- **Solution:** Use `??` (nullish coalescing) which only checks for `null`/`undefined`
- **Example:**
```typescript
// ❌ Bad - Loses negative amounts
ocrAmount: data.amount || undefined  // -24.99 becomes undefined
amount: receipt.ocrAmount || 0       // -24.99 becomes 0

// ✅ Good - Preserves all numeric values
ocrAmount: data.amount ?? undefined  // -24.99 preserved
amount: receipt.ocrAmount ?? 0       // -24.99 preserved
```
- **Validated:** Fixed 5 instances across receipt storage, transaction conversion, and filtering (2025-12-30)
- **Impact:** Critical for returns/refunds feature - prevented data loss of 7 receipts
- **Related:** See FAILURES.md [FAILURE-001] for full root cause analysis

---

## Build & Deployment Rules

### Next.js Build
- Always use `npm run build` before Electron packaging
- Export mode: `output: 'export'` in `next.config.js`
- All routes must be in `out/` directory structure

### Electron Build
- Fast build: `npm run electron:build:win:fast` (no compression)
- ASAR disabled: Required for Next.js route access
- Installer output: `dist/Thomas Books Setup 0.1.0.exe`
- Public copy: Copy to `public/ThomasBooksSetup.exe` for download

### Debug Logging
- Remove debug console.logs before production builds
- DevTools auto-open disabled in production

---

## Testing Strategy

**Current Status:** No formal test suite yet

**Planned:**
- Unit tests for utilities (parsing, formatting)
- Integration tests for file system operations
- E2E tests for critical flows (receipt upload → parse → save)

---

## Performance Considerations

### Debounced Saves
- File system writes are debounced to prevent excessive I/O
- Current: 1000ms debounce on receipt saves
- Prevents UI lag during bulk operations

### Image Optimization
- Receipts stored as base64 data URLs
- Contrast enhancement applied before OCR
- Future: Consider compression for large images

---

**Last Updated:** December 28, 2024  
**Next Review:** After first pattern promotion
