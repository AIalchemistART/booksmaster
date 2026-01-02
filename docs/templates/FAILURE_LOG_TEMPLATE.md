# Failure Log Template

**Date:** [YYYY-MM-DD]  
**Session ID:** [Checkpoint ID if available]  
**Severity:** [Critical | High | Medium | Low]  
**Impact:** [Production | Development | Testing | Documentation]

---

## Problem Statement

**What went wrong?**
[Clear description of the failure, error message, or unexpected behavior]

**Expected Behavior:**
[What should have happened]

**Actual Behavior:**
[What actually happened]

---

## 5 Whys Root Cause Analysis

**Why 1:** Why did this failure occur?
- [First level cause]

**Why 2:** Why did [Why 1] happen?
- [Second level cause]

**Why 3:** Why did [Why 2] happen?
- [Third level cause]

**Why 4:** Why did [Why 3] happen?
- [Fourth level cause]

**Why 5:** Why did [Why 4] happen?
- [Root cause - typically a process or knowledge gap]

---

## Resolution

**Immediate Fix:**
[What was done to fix the problem right now]

**Files Modified:**
- `path/to/file1.ext` - [description]
- `path/to/file2.ext` - [description]

**Code Changes:**
```language
[Key code snippets if relevant]
```

---

## Prevention Strategy

**Short-term (This Session):**
- [ ] [Action item 1]
- [ ] [Action item 2]

**Long-term (Pattern Promotion):**
- [ ] Consider adding to WORKSPACE_RULES.md if pattern is validated
- [ ] Update INTEGRITY_CLUSTER.md if terminology was involved
- [ ] Create test coverage to prevent regression

**Related Patterns:**
- [Link to similar issues or patterns]

---

## Lessons Learned

**What worked well:**
- [Positive takeaways]

**What to avoid:**
- [Anti-patterns identified]

**Knowledge Gap Filled:**
- [What did we learn that we didn't know before?]

---

**Status:** [ ] Open | [ ] Resolved | [ ] Validated | [ ] Promoted to L1
