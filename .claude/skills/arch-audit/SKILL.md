---
name: arch-audit
description: Audit recently changed code against architectural principles and detect violations
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Bash
---

# Architecture Code Audit

You are conducting a **post-implementation architectural audit** of recently changed code. Your job is to detect violations of this repository's strict architectural principles in the actual code.

## Audit Process

### Step 1: Read the Architectural Guidelines

Read these files to understand the principles:
- `/Users/dallashall/code/mc/structures/CLAUDE.md` - Core architectural rules and coding standards
- `/Users/dallashall/code/mc/structures/.claude/skills/ARCHITECTURE_PATTERNS.md` - Core patterns (Event Sourcing, DraftingService, Tool system)
- `/Users/dallashall/code/mc/structures/MACRO_COMPONENTS.md` - Component architecture and data flow specifications

### Step 2: Identify Changed Files

Use Git to find recently changed files:

```bash
# Get list of modified and new files
git status --short
```

Or if specific files are mentioned in the context, focus on those.

### Step 3: Audit Each Changed File

For each changed file, read it completely and check for violations:

#### 🔴 CRITICAL VIOLATIONS (Must fix immediately)

1. **Multiple Components in One File** ⚠️ MOST COMMON VIOLATION
   - Search for multiple function/class definitions that return JSX
   - Patterns: `function ComponentName()`, `const ComponentName = ()`, `class ComponentName`
   - **CRITICAL:** After every TSX file edit, count component definitions
   - **FIX:** Extract each component into its own file immediately

2. **Inline Anonymous Callbacks**
   - Search for: `.map((`, `.filter((`, `onClick={() =>`
   - Search for: `=>(`, arrow functions without names
   - **FIX:** Convert to named functions

3. **React Hooks in Regular Components**
   - Search for: `useState`, `useEffect`, `useReducer`, `useCallback`, `useMemo`
   - Only allowed in:
     - HOC files (`src/hocs/withXxx.tsx`)
     - When provided by external libraries
   - **FIX:** Move state management to singleton + HOC pattern

4. **Business Logic in Components**
   - Look for complex calculations, state mutations, data transformations
   - Look for direct singleton method calls inside components (except via callbacks)
   - **FIX:** Move logic to singleton classes, expose via HOC props

5. **Missing Singleton Pattern**
   - Check `src/core/*.ts` files
   - Must extend `EventEmitter`
   - Must have private constructor + `getInstance()`
   - Must emit events on state changes
   - **FIX:** Implement singleton pattern correctly

6. **Direct Event Subscriptions in Components**
   - Search for: `.on(`, `addEventListener` in regular components
   - Only allowed in HOCs
   - **FIX:** Create/use HOC to inject state as props

7. **Generic Event Names** ⚠️ CRITICAL ARCHITECTURE VIOLATION
   - Search for: `.emit('.*:changed`, `.emit('.*:updated`, `.emit('.*:modified`, `.emit('.*:loaded`
   - Events MUST be specific and convey meaning
   - **FORBIDDEN:** `:changed`, `:updated`, `:modified`, `:loaded` suffixes
   - **REQUIRED:** Specific action names like `:created`, `:renamed`, `:placed`, `:removed`
   - **FIX:** Replace generic events with specific event names that convey exactly what changed
   - **Example violations:**
     - ❌ `this.emit('project:changed', project)` → ✅ `this.emit('project:renamed', { previousName, newName })`
     - ❌ `this.emit('editor:updated', state)` → ✅ `this.emit('layer:changed', { axis, layer })`
     - ❌ `this.emit('draft:changed', event)` → ✅ `this.emit('draft:updated', event)` (if updating draft)
     - ❌ `projectManager.on('project:changed', ...)` → ✅ Subscribe to specific events like `'block:placed'`, `'project:renamed'`

8. **Conflating Event Sourcing and Event-Driven Patterns** ⚠️ CRITICAL ARCHITECTURE VIOLATION
   - **Event Sourcing** = Persisted events in ModelHistory for state reconstruction
   - **Event-Driven** = Ephemeral notifications via EventEmitter for loose coupling
   - **Commands** = Imperative method calls (setBlock, createProject, etc.)
   - These are THREE DISTINCT PATTERNS that must not be mixed
   - **Check for violations:**
     - Look for persisted events (with `eventId`, `version`, `timestamp`) being emitted as notifications
     - Look for EventEmitter notifications being used for state reconstruction
     - Look for notification events being persisted to ModelHistory
   - **Example violations:**
     - ❌ `modelHistory.on('event:appended', (e) => this.emit(e.type, e))` - Broadcasting persisted events
     - ❌ `const state = emittedEvents.reduce(reducer, null)` - Using notifications for state
     - ❌ `modelHistory.appendEvent(notificationEvent)` - Persisting notifications
   - **CORRECT Pattern:**
     ```typescript
     // 1. Command: User calls method
     draftingService.finalize();

     // 2. Event Sourcing: Persist to ModelHistory
     modelHistory.write(blocks);  // Creates event internally

     // 3. Event-Driven: Emit notification (separate from persisted event)
     this.emit('model:updated');

     // 4. State: Computed from ModelHistory, not from notifications
     const model = modelHistory.replay(projectId);
     ```

9. **Putting Preview State in ModelHistory** ⚠️ CRITICAL ARCHITECTURE VIOLATION
   - **Preview/Draft state is ephemeral** - NOT part of model history
   - **Must use DraftingService** for preview state
   - Preview is shared across views but NOT persisted
   - **Check for violations:**
     - Look for draft/preview events in ModelHistory/EventStore
     - Look for `setDraftEvent()` methods on history classes
     - Look for preview blocks stored alongside persisted model state
   - **Example violations:**
     - ❌ `modelHistory.setDraftEvent(previewEvent)` - Preview isn't historical
     - ❌ `eventStore.replayEvents()` including draft events
     - ❌ Preview blocks in same structure as model blocks
   - **CORRECT Pattern:**
     ```typescript
     // Preview managed separately
     draftingService.start();
     draftingService.set(previewBlocks);  // Ephemeral
     draftingService.finalize();  // Persists to ModelHistory

     // Rendering combines both
     const model = modelHistory.replay();  // Persisted
     const preview = draftingService.getPreview();  // Ephemeral
     render(model.blocks.concat(preview));
     ```

10. **Using "Manager" or "Controller" in Names** ⚠️ ARCHITECTURE SMELL
    - These names signal ambiguous purpose or doing too many things
    - **Check for:**
      - Classes named `*Manager` or `*Controller`
    - **Suggest alternatives based on actual responsibility:**
      - ❌ `ProjectManager` → ✅ `ModelHistory` (manages event history)
      - ❌ `EditorStateManager` → ✅ `EditorState` (holds UI state)
      - ❌ `Canvas2DController` → ✅ `Canvas2D` or specific tool names
    - **Exception:** May be acceptable if truly coordinating between systems, but scrutinize

#### ⚠️ MODERATE VIOLATIONS (Should fix)

7. **Component File Size > 350 Lines**
   - Count lines in each component file
   - **FIX:** Extract sub-components or move logic to utilities/singletons

8. **Not Using MUI Components**
   - Look for custom `<div>`, `<span>`, `<button>` when MUI alternatives exist
   - Look for hardcoded styles instead of `sx` prop
   - **FIX:** Replace with MUI components (Box, Stack, Typography, Button, etc.)

9. **Incorrect Folder Placement**
   - Atomic components → `src/components/`
   - Layout compositions → `src/layouts/`
   - Canvas/viewports → `src/panels/`
   - Top-level screens → `src/views/`
   - State bridges → `src/hocs/`
   - Business logic → `src/core/`

10. **Incorrect File Naming**
    - Components: PascalCase (e.g., `MaterialPalette.tsx`)
    - HOCs: camelCase with "with" prefix (e.g., `withProjectState.tsx`)
    - Singletons: PascalCase (e.g., `ProjectManager.ts`)

11. **Missing HOC Pattern**
    - HOCs should be named `withXxx` (camelCase, `with` prefix)
    - Should use `useEffect` to subscribe to singleton events
    - Should only pass props to wrapped component
    - Should not contain business logic

12. **Non-Dumb Components**
    - Components should receive data via props
    - Should invoke callbacks passed as props
    - Should not compute complex derived state
    - Should not make decisions based on business rules

#### 🟡 STYLE VIOLATIONS (Nice to fix)

13. **Emojis in Code**
    - Only allowed if user explicitly requested
    - **FIX:** Remove emojis from comments, strings, etc.

14. **Import Organization**
    - Order: External → Types → Core/Singletons → HOCs → Components → Utils → Styles
    - **FIX:** Reorganize imports

### Step 4: Code Pattern Detection

Use grep/regex to detect common violations:

**Detect inline callbacks:**
```bash
# Find arrow functions in map/filter/etc
grep -r "\.map((.*) =>" src/
grep -r "onClick={() =>" src/
grep -r "\.filter((.*) =>" src/
```

**Detect multiple components per file:**
```bash
# Find files with multiple function/component definitions
# (Manual inspection required after grep)
grep -r "^function [A-Z]" src/**/*.tsx
grep -r "^const [A-Z].*= (" src/**/*.tsx
```

**Detect forbidden hooks:**
```bash
# Find useState/useEffect in non-HOC files
grep -r "useState" src/components/ src/layouts/ src/panels/ src/views/
grep -r "useEffect" src/components/ src/layouts/ src/panels/ src/views/
```

**Detect hardcoded styles:**
```bash
# Find inline style objects
grep -r "style={{" src/
```

**Detect generic event names:**
```bash
# Find forbidden generic event suffixes
grep -r "\.emit('.*:changed'" src/
grep -r "\.emit('.*:updated'" src/
grep -r "\.emit('.*:modified'" src/
grep -r "\.emit('.*:loaded'" src/
grep -r "\.on('.*:changed'" src/
grep -r "\.on('.*:updated'" src/
```

**Detect pattern conflation:**
```bash
# Find potential mixing of Event Sourcing and Event-Driven
grep -r "eventStore\.on.*emit" src/  # EventStore events being re-emitted
grep -r "\.reduce.*emitted" src/     # Using emitted events for state
grep -r "appendEvent.*emit" src/     # Check if emitted events are being persisted

# Find persisted events in emit calls (look for eventId, version, timestamp)
grep -r "\.emit.*eventId" src/
grep -r "\.emit.*version.*:" src/
```

### Step 5: Generate Audit Report

Provide a detailed report with specific fixes:

**📊 AUDIT SUMMARY**
- Files audited: X
- Critical violations: X
- Moderate violations: X
- Style violations: X

**🔴 CRITICAL VIOLATIONS**
For each violation:
- File path and line number
- Code snippet showing violation
- Specific architectural principle violated
- Exact fix required (with code example if helpful)

**⚠️ MODERATE VIOLATIONS**
For each violation:
- File path and line number
- What should be improved
- Suggested fix

**✅ COMPLIANT ASPECTS**
List what was done correctly.

## Response Format

```markdown
# 🔍 Architecture Audit Report

## 📊 Summary
- **Files Audited:** X
- **Critical Violations:** 🔴 X
- **Moderate Violations:** ⚠️ X
- **Style Issues:** 🟡 X

---

## 🔴 CRITICAL VIOLATIONS (Fix Immediately)

### 1. Multiple Components in File
**File:** `src/components/Example.tsx`
**Line:** 45
**Violation:** File contains 2 component definitions

**Code:**
\`\`\`typescript
function ComponentA() { ... }
function ComponentB() { ... }  // <-- Second component
\`\`\`

**Fix:**
Extract `ComponentB` to `src/components/ComponentB.tsx`

---

### 2. Inline Anonymous Callback
**File:** `src/components/List.tsx`
**Line:** 23
**Violation:** Anonymous arrow function in map

**Code:**
\`\`\`typescript
items.map((item) => item.name)  // ❌
\`\`\`

**Fix:**
\`\`\`typescript
const toItemName = (item: Item) => item.name;
items.map(toItemName)  // ✅
\`\`\`

---

## ⚠️ MODERATE VIOLATIONS

[List moderate issues with file:line references]

---

## 🟡 STYLE ISSUES

[List minor style improvements]

---

## ✅ Compliant Aspects

[List what was done correctly]

---

## 🎯 Action Items

Priority fixes in order:
1. [ ] Fix: [Critical issue 1]
2. [ ] Fix: [Critical issue 2]
3. [ ] Improve: [Moderate issue 1]

## 🏁 Audit Status
[PASS / PASS WITH WARNINGS / FAIL]

[If FAIL, list blocking issues]
```

## Special Checks

### After Editing ANY .tsx File

**MANDATORY:** After every component file edit, check for multiple components:

1. Read the entire file
2. Count component definitions:
   - `function ComponentName()`
   - `const ComponentName = ()`
   - `class ComponentName extends`
3. If count > 1, immediately extract into separate files

This is the **MOST COMMON VIOLATION** and must be checked every time.

### After Creating/Editing Singletons

Check:
- Extends `EventEmitter`
- Has `private constructor()`
- Has `static getInstance(): ClassName`
- Has `private static instance: ClassName`
- Emits specific events on state changes (NO generic `:changed`, `:updated`, `:modified` events)
- Event names follow `<entity>:<specific-action>` pattern (e.g., `block:placed`, `project:renamed`)

### After Creating/Editing HOCs

Check:
- Named `withXxx` (camelCase, `with` prefix)
- Uses `useEffect` to subscribe to singleton events
- Only passes props to wrapped component
- No business logic

## Important Reminders

- **Be specific:** Provide file:line references for every violation
- **Be actionable:** Provide exact fixes, not just descriptions
- **Be thorough:** Check every changed file completely
- **Prioritize:** Critical violations must be fixed before merge
- **Reference:** Cite specific sections from CLAUDE.md when explaining violations
- **Remember:** This repo uses a strict, non-mainstream architecture intentionally
