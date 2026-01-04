# Integrity Cluster (Terminology Guardian)

**Project:** Thomas Books  
**Purpose:** Protected definitions that stabilize AI reasoning (Self-Healing Cognition Loop)

---

## How This Works

When terminology errors occur:
1. **Detect** (L2) - Log in FAILURES.md using TERMINOLOGY_CORRECTION_TEMPLATE.md
2. **Stabilize** (Integrity Cluster) - Add corrected definition here
3. **Align** (Future) - AI references this file to prevent repetition

**This completes the Self-Healing Cognition Loop.**

---

## Core SCMS Definitions

### SCMS = Sparse Contextual Memory Scaffolding
- **NOT** "System" - it's a framework, not software
- **Scaffolding** emphasizes temporary support structure that aids memory formation
- Purpose: Multi-time-scale cognitive framework for AI development

### Memory Tiers
- **L0:** Auto-memories (probabilistic retrieval via Cascade memory system)
- **L1:** Validated patterns (mandatory rules in WORKSPACE_RULES.md)
- **L2:** Failure analysis (logged with 5 Whys)
- **L3:** Pattern promotion (evidence-based validation)
- **L4:** Global rules (user preferences, always active)
- **L5:** Session audit (closure verification)

---

## Project-Specific Terminology

### Thomas Books Core Concepts

**Receipt Parsing:**
- **LLM-based parsing** - Using Google Gemini Vision API (industry first)
- **OCR fallback** - Tesseract.js when Gemini unavailable
- **Batch processing** - Multiple receipts processed simultaneously

**File System Architecture:**
- **File system adapter** - Unified interface that auto-detects web vs Electron
- **Electron IPC** - Inter-process communication for native file operations
- **Local-first** - Data stored locally by default, cloud sync optional

**Pricing & Business:**
- **$70/year pricing** - Standard subscription (not $50, not $75)
- **"Under expense threshold"** - Key positioning (most companies use $75 threshold)
- **Annual-only model** - Prevents tax-season-only subscriptions
- **Affiliate commission** - $35 per signup (50% of first year)

---

## Common Mistakes to Avoid

### ❌ Incorrect: "SCMS System"
✅ Correct: "SCMS framework" or "SCMS" alone (already means Scaffolding)

### ❌ Incorrect: "File System Storage API" for Electron
✅ Correct: "Electron IPC handlers" or "file system adapter"

### ❌ Incorrect: "$75/year pricing"
✅ Correct: "$70/year pricing" (as of Dec 28, 2024)

---

## Technical Terms (Thomas Books)

**Zustand Store:**
- State management library with persistence
- Uses `set()` and `get()` for state access
- Critical: Avoid circular references by using `set()` callback, not `useStore.getState()`

**Next.js Static Export:**
- Build mode: `output: 'export'`
- Generates `out/` directory with static files
- Routes become subdirectories (e.g., `out/receipts/index.html`)

**Electron Protocol Interception:**
- Custom `file://` protocol handler
- Serves Next.js static files from `out/` directory
- Handles route navigation via `will-navigate` event

**Electron Loading Methods:**
- **loadFile()** - Direct file system loading, BYPASSES protocol interceptors
- **loadURL()** - URL-based loading, ALLOWS protocol interceptors to function
- Critical: Must use `loadURL(file:///${path})` for protocol interception to work

**Electron Logging Contexts:**
- **Main process logs** - console.log in main.js, NOT visible in DevTools
- **Renderer process logs** - console.log in renderer/React, visible in DevTools
- **Preload.js logs** - Runs in renderer context, VISIBLE in DevTools (best for debugging)

**Electron ASAR Packaging:**
- **ASAR enabled** - Packages app into single archive, breaks Next.js static asset paths
- **ASAR disabled** - Unpacked files, simplifies path resolution for Next.js exports
- ⚠️ NEVER re-enable ASAR without full path resolution audit for Next.js assets

---

## Definitions Added This Session

### Session 147 (Jan 3, 2026) - Electron Build Fixes
- **loadFile() vs loadURL()** - Critical distinction for protocol interceptor functionality
- **Preload.js logging visibility** - Runs in renderer context, appears in DevTools
- **ASAR packaging constraint** - Incompatible with Next.js static exports without remapping

---

**Last Updated:** January 3, 2026  
**Next Review:** When terminology corrections occur in L2
