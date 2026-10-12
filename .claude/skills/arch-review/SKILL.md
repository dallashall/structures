---
name: arch-review
description: Review implementation plans against architectural principles before execution
disable-model-invocation: false
allowed-tools: Read, Grep, Glob
---

# Architecture Plan Review

You are reviewing a proposed implementation plan before any code is written. Find violations of this repository's architectural rules in the plan.

## Review Process

### Step 1: Read the Guidelines

Read these files from the repository root:
- `CLAUDE.md`: coding standards and architectural rules
- `.claude/skills/ARCHITECTURE_PATTERNS.md`: the EventLog, commands, projections, undo history, tools, and DraftingService
- `MACRO_COMPONENTS.md`: singletons, HOCs, views, and data flow
- `PROJECT.md`: project scope and requirements

### Step 2: Check the Plan

The plan is in the conversation context.

#### CRITICAL (block implementation)

1. **Business logic in React components**
   - ❌ State or rules inside a component
   - ❌ Subscriptions in a component instead of an HOC
   - ✅ Logic in singletons (`src/core/`), commands (`src/commands/`), projections, reducers, or utils
   - ✅ State reaches components through HOCs

2. **Inline anonymous callbacks**
   - ❌ `.map((item) => ...)`, `.filter(x => x.active)`, `onClick={() => doSomething()}`
   - ✅ Named functions everywhere, tests included

3. **More than one component per file**
   - ✅ One component per `.tsx` file, no exceptions

4. **Hooks outside HOCs**
   - ❌ `useState`, `useEffect`, `useReducer`, `useRef` in rendering components
   - ✅ Hooks in `src/hocs/`, in `src/preview/`, or provided by a library (MUI `useTheme`)
   - ✅ Canvas lifecycle through a ref callback, never an effect

5. **Writes that bypass the write side**
   - ❌ A component, HOC, or tool appending to `eventLog` directly
   - ❌ A command mutating projection state
   - ❌ An undoable edit written with `eventLog.append()` instead of `appendAction()`
   - ❌ Persisting preview blocks or derived block state
   - ✅ Tools write through `draftingService.finalize()`. Other edits go through a command.

6. **Generic notification names**
   - ❌ `:changed`, `:updated`, `:modified`, `:loaded`
   - ✅ `<entity>:<past-tense-action>`, such as `layer:adjusted`, `screen:shown`

7. **Not using MUI**
   - ❌ Custom div or span structures where MUI has a component
   - ✅ Check MUI first (Box, Stack, Typography, Button, Dialog)

#### MODERATE (warn, do not block)

8. **Component size:** under 350 lines. Recommend extraction for larger plans.
9. **Folder placement:**
   - `src/components/`: atomic UI
   - `src/layouts/`: toolbar and panel layouts
   - `src/panels/`: canvas elements
   - `src/views/`: screens
   - `src/hocs/`: singleton-to-props bridges
   - `src/core/`: singletons
   - `src/commands/`: command singletons
   - `src/projections/`: read models
   - `src/reducers/`: pure folds over rows
10. **Singleton shape:** private constructor, `getInstance()`, one exported camelCase instance. Extends `EventEmitter` when the UI reads its state.
11. **HOC shape:** named `withXxx`, subscribes in `useEffect`, reads once after subscribing, passes props only.
12. **Dumb components:** props in, callbacks out, no rules or calculations.
13. **Naming:** no "Manager" or "Controller". Name by behavior.

### Step 3: Checks by File Type

**New or changed singleton (`src/core/`, `src/projections/`):**
- Private constructor and `getInstance()`
- Extends `EventEmitter` when it holds UI-visible state
- Emits a specific notification on each change
- No rendering code

**New or changed command (`src/commands/`):**
- Reads projections, validates, throws on invalid input
- Appends rows. Undoable edits use `appendAction()` with an `ActionKind`.
- New persisted row types also need handling in `modelReducer` or `MetadataProjection`, and in `describeAction` when undoable

**New or changed HOC (`src/hocs/`):**
- `withXxx` naming
- Subscribes in `useEffect`, unsubscribes in cleanup
- Passes data as props only

**New or changed component:**
- All data through props
- Callbacks through props
- No direct singleton access (use an HOC)
- No hooks
- MUI first
- Named callbacks only

**New or changed view (`src/views/`):**
- May compose several HOCs
- Wires callbacks to singletons and commands
- No business logic

**New tool (`src/core/tools/`):**
- Extends `ClickDragReleaseTool` or `MultiClickTool`
- Computes positions with a `PaintStrategy` and runs them through `PaintPipeline.process()`
- Previews with `draftingService.set()` and commits with `draftingService.finalize()`
- Registers in `toolRegistry`

### Step 4: Write the Report

- **Approved:** decisions that follow the rules
- **Critical issues:** each with the problem, the rule, and the fix
- **Recommendations:** extractions, MUI usage, singleton or HOC opportunities
- **Checklist:** reminders for implementation

## Response Format

```markdown
# Architecture Review: [Feature Name]

## Approved
- [What follows the rules]

## Critical Issues (must fix)
### Issue 1: [Title]
**Problem:** [Description]
**Rule:** [CLAUDE.md or ARCHITECTURE_PATTERNS.md section]
**Fix:** [Specific change]

## Recommendations
- [Improvements]

## Pre-Implementation Checklist
- [ ] All callbacks are named functions
- [ ] Business logic in singletons, commands, or reducers
- [ ] State reaches components through HOCs
- [ ] One component per file
- [ ] MUI components first
- [ ] Writes go through commands or DraftingService
- [ ] Notification names are specific
- [ ] Correct folder placement
- [ ] Components under 350 lines

## Verdict
APPROVED / NEEDS REVISION / BLOCKED

[For NEEDS REVISION or BLOCKED, list the next steps]
```

## Notes

- Give specific fixes, not only criticism
- Cite the CLAUDE.md or ARCHITECTURE_PATTERNS.md section for each violation
- Prefer architectural correctness over style preferences
- This repo uses a strict, non-mainstream architecture on purpose. The rules exist to prevent React patterns common in training data.
