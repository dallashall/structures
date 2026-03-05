---
name: arch-review
description: Review implementation plans against architectural principles before execution
disable-model-invocation: false
allowed-tools: Read, Grep, Glob
---

# Architecture Plan Review

You are conducting a **pre-implementation architectural review** of a proposed plan. Your job is to identify violations of this repository's strict architectural principles BEFORE code is written.

## Review Process

### Step 1: Read the Architectural Guidelines

Read these files to understand the principles:
- `/Users/dallashall/code/mc/structures/CLAUDE.md` - Core architectural rules and coding standards
- `/Users/dallashall/code/mc/structures/MACRO_COMPONENTS.md` - Component architecture and data flow specifications
- `/Users/dallashall/code/mc/structures/PROJECT.md` - Project overview and requirements

### Step 2: Analyze the Plan

Review the proposed implementation plan (it will be in the conversation context) and check for:

#### 🚨 CRITICAL VIOLATIONS (Block implementation if found)

1. **Business logic in React components**
   - ❌ State management directly in components
   - ❌ Direct event subscriptions in regular components (not HOCs)
   - ✅ All business logic must be in singleton classes (`src/core/`)
   - ✅ State injection via HOCs only

2. **Inline anonymous callbacks**
   - ❌ `.map((item) => ...)`
   - ❌ `.filter(x => x.active)`
   - ❌ `onClick={() => doSomething()}`
   - ✅ All callbacks must be named functions

3. **Multiple components in one file**
   - ❌ More than one React component per `.tsx` file
   - ✅ Strictly one component per file (NO EXCEPTIONS)

4. **Forbidden React hooks usage**
   - ❌ `useState`, `useEffect`, `useReducer` in regular components
   - ✅ Hooks only allowed in HOCs or when provided by external libraries
   - ✅ Use HOCs to bridge singletons to components instead

5. **Missing MUI components**
   - ❌ Custom div/span structures when MUI components exist
   - ❌ Reinventing buttons, dialogs, forms, layouts
   - ✅ Always check MUI first (Box, Stack, Typography, Button, etc.)

#### ⚠️ MODERATE VIOLATIONS (Warn but don't block)

6. **Component size**
   - Components should stay under 350 lines
   - If plan suggests large components, recommend extraction

7. **Folder organization**
   - `src/components/` - Atomic UI components
   - `src/layouts/` - Composed functional blocks
   - `src/panels/` - Canvas/viewport components
   - `src/views/` - Top-level screens
   - `src/hocs/` - Higher-order components
   - `src/core/` - Singleton classes

8. **Singleton pattern violations**
   - New singletons must extend `EventEmitter`
   - Must use getInstance() pattern
   - Must emit events on state changes

9. **HOC pattern violations**
   - HOCs must follow `withXxxState` naming
   - Must subscribe to singleton events in `useEffect`
   - Must pass data as props only

10. **Dumb component violations**
    - Components should be pure rendering
    - Props in, callbacks out
    - No complex logic, calculations, or transformations

### Step 3: Check Specific File Types

**If creating/modifying a singleton (`src/core/`):**
- Must extend EventEmitter
- Must use private constructor + getInstance()
- Must emit events on all state changes
- No rendering logic

**If creating/modifying an HOC (`src/hocs/`):**
- Must follow `withXxxState` naming pattern
- Must use `useEffect` to subscribe to singleton events
- Must pass data as props to wrapped component
- No business logic

**If creating/modifying a component:**
- Must receive all data via props
- Must use callbacks passed as props
- No direct singleton access (use HOCs)
- No `useState`/`useEffect` (use HOCs instead)
- Check MUI component library first
- No inline anonymous callbacks

**If creating/modifying a view (`src/views/`):**
- Can compose multiple HOCs
- Orchestrates data flow between subsystems
- No business logic

### Step 4: Generate Review Report

Provide a structured report with:

**✅ APPROVED ASPECTS**
List architectural decisions that align with principles.

**🚨 CRITICAL ISSUES**
List violations that MUST be fixed before implementation. For each:
- What violates the principles
- Why it's problematic
- Specific architectural fix required

**⚠️ RECOMMENDATIONS**
List improvements to better align with architecture:
- Suggested extractions
- Better MUI component usage
- Singleton/HOC opportunities

**📋 IMPLEMENTATION CHECKLIST**
Provide specific reminders:
- [ ] All callbacks are named functions
- [ ] Business logic in singletons only
- [ ] State via HOCs only
- [ ] One component per file
- [ ] MUI components used where applicable
- [ ] Correct folder placement
- [ ] Component under 350 lines

## Response Format

```markdown
# 🏗️ Architecture Review: [Feature Name]

## ✅ Approved Aspects
- [List what looks good]

## 🚨 Critical Issues (MUST FIX)
### Issue 1: [Title]
**Problem:** [Description]
**Violation:** [Which principle]
**Fix:** [Specific solution]

## ⚠️ Recommendations
- [Suggested improvements]

## 📋 Pre-Implementation Checklist
- [ ] All callbacks are named functions
- [ ] Business logic in singletons only
- [ ] State via HOCs only
- [ ] One component per file
- [ ] MUI components prioritized
- [ ] Correct folder placement
- [ ] Component size < 350 lines

## 🟢 Verdict
[APPROVED / NEEDS REVISION / BLOCKED]

[If BLOCKED or NEEDS REVISION, provide clear next steps]
```

## Important Notes

- Be thorough but constructive
- Provide specific fixes, not just criticism
- Reference CLAUDE.md sections when citing violations
- Focus on architectural correctness over style preferences
- Remember: this repo intentionally uses a non-mainstream, strict architecture
- The goal is to prevent React anti-patterns common in training data
