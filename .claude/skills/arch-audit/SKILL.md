---
name: arch-audit
description: Audit recently changed code against architectural principles and detect violations
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Bash
---

# Architecture Code Audit

You are auditing recently changed code after implementation. Find violations of this repository's architectural rules in the actual code.

## Audit Process

### Step 1: Read the Guidelines

Read these files from the repository root:
- `CLAUDE.md`: coding standards and architectural rules
- `.claude/skills/ARCHITECTURE_PATTERNS.md`: the EventLog, commands, projections, undo history, tools, and DraftingService
- `MACRO_COMPONENTS.md`: singletons, HOCs, views, and data flow

### Step 2: Find Changed Files

```bash
git status --short
git diff --name-only HEAD
```

When the context names specific files, audit those.

### Step 3: Audit Each Changed File

Read each changed file completely.

#### CRITICAL (fix before merge)

1. **Multiple components in one file** (the most common violation)
   - Count function or class definitions that return JSX
   - A file may export a `React.memo` wrapper of its one component. That is not a second component.
   - **Fix:** extract each extra component into its own file

2. **Inline anonymous callbacks**
   - Arrow functions passed straight to `.map`, `.filter`, `.forEach`, `.find`, `.some`, `.every`, `.reduce`, `.sort`
   - Arrow functions in JSX props: `onClick={() => ...}`
   - The rule covers tests too
   - **Fix:** name the function, then pass the name

3. **React hooks outside HOCs**
   - `useState`, `useEffect`, `useReducer`, `useRef`, `useMemo`, `useCallback`, `useLayoutEffect`, `useContext`
   - Allowed in `src/hocs/`, in `src/preview/`, and for hooks a library provides (MUI's `useTheme`)
   - **Fix:** move the state into a singleton and inject it with an HOC

4. **Business logic in components**
   - Calculations, validation, state mutation, or data transformation inside a component
   - **Fix:** move it to a singleton, command, reducer, or util. Pass results through HOC props.

5. **Singleton shape**
   - Stateful singletons in `src/core/` and `src/projections/` extend `EventEmitter`, have a private constructor, a `private static instance`, and `static getInstance()`
   - Each module exports one camelCase instance (`editorState`, `eventLog`)
   - A singleton that holds UI-visible state emits a notification on each change
   - Command singletons in `src/commands/` export one instance (`renameProjectCommand`). They do not extend `EventEmitter`.

6. **Subscriptions in components**
   - `.on(`, `.off(`, or `addEventListener` in `components/`, `layouts/`, `panels/`, or `views/`
   - Allowed in HOCs and singletons
   - **Fix:** create or reuse an HOC

7. **Generic notification names**
   - Forbidden suffixes: `:changed`, `:updated`, `:modified`, `:loaded`
   - Required: `<entity>:<past-tense-action>`, such as `layer:adjusted`, `screen:shown`, `history:step-undone`
   - **Fix:** name exactly what happened, such as `paintmode:selected` instead of `editor:changed`

8. **Conflating Event Sourcing and Event-Driven**
   - **Event Sourcing:** rows in `eventLog` (IndexedDB) that projections replay
   - **Event-Driven:** ephemeral `EventEmitter` notifications
   - **Commands:** imperative calls such as `shrinkDimensionsCommand.execute('x-')`
   - Violations:
     - ❌ `eventLog.on('event:appended', (e) => x.emit(e.type, e))`: re-broadcasting rows
     - ❌ building state by reducing emitted notifications
     - ❌ `eventLog.append('draft:updated', ...)`: persisting a notification
   - Correct flow:
     ```typescript
     await draftingService.finalize(operations);    // writer appends one paint action
     // EventLog commits, then emits event:appended per row
     // ModelProjection applies rows, then emits model:rebuilt
     const blocks = await blockProjection.getBlocks();  // read from a projection
     ```

9. **Writes that bypass the write side**
   - A tool that calls `eventLog.append*` directly. Tools write only through `draftingService.finalize()`.
   - A command or component that mutates projection state (`blockProjection.getCached().set(...)`)
   - An undoable edit written with `eventLog.append()`. Undoable edits use `appendAction()` so they get an `actionId` and markers.
   - A row that persists derived state (stair corner `shape`, connections). Rows hold user intent only.

10. **Preview state in the log**
    - Preview blocks belong in `draftingService` and are never persisted
    - ❌ appending preview rows, or storing preview blocks in a projection
    - ✅ `draftingService.set(preview)`, then views read `getPreview()` or `getResolvedPreview()`

11. **"Manager" or "Controller" in a name**
    - Name the class by behavior: `EditorState`, `EditHistory`, `ScreenRouter`, `CameraRig`

#### MODERATE (should fix)

12. **Component over 350 lines**
13. **Not using MUI**
    - Raw `<div>`, `<span>`, or `<button>` where MUI has a component
    - `style={{ ... }}` instead of `sx`
14. **Wrong folder**
    - `src/components/`: atomic UI
    - `src/layouts/`: toolbar and panel layouts
    - `src/panels/`: canvas elements
    - `src/views/`: screens
    - `src/hocs/`: singleton-to-props bridges
    - `src/core/`: singletons
    - `src/commands/`: command singletons
    - `src/projections/`: read models
    - `src/reducers/`: pure folds over rows
    - `src/utils/`: pure helpers
15. **Wrong file name**
    - Components PascalCase, HOCs `withXxx.tsx`, singletons PascalCase, commands `XxxCommand.ts`, utils camelCase
16. **HOC shape**
    - Named `withXxx`
    - Subscribes in `useEffect` and unsubscribes in its cleanup
    - Reads the singleton once more right after subscribing
    - Passes props only. No business logic.
17. **Canvas lifecycle in an effect**
    - Canvas singletons attach through a ref callback (`canvas2DMounter.refFor`, `babylon3d.attach`) and follow size with a ResizeObserver. An effect for this is a violation.
18. **Non-dumb components**
    - Data in through props, callbacks out through props, no derived business state

#### STYLE

19. **Emoji in code or comments**
20. **Import order:** external, types, core singletons and projections and commands, HOCs, components, utils, styles
21. **History in comments:** "fixed", "used to", "previously", "formerly", "after the refactor". Comments describe the code as it is.

### Step 4: Pattern Detection

Run from the repository root. The globs are quoted so zsh does not expand them.

```bash
# Inline callbacks in array methods
grep -rnE "\.(map|filter|forEach|find|some|every|reduce|sort)\(\s*\(?[A-Za-z_, ]*\)?\s*=>" src

# Inline arrows in JSX props
grep -rnE "=\{\s*\(?[A-Za-z_, ]*\)?\s*=>" src --include='*.tsx'

# Hooks outside HOCs and the preview gallery
grep -rnE "\buse(State|Effect|Reducer|Ref|Memo|Callback|Context|LayoutEffect)\b" src --include='*.tsx' \
  | grep -v '^src/hocs/' | grep -v '^src/preview/'

# Subscriptions in rendering code
grep -rnE "\.(on|off)\(|addEventListener" src/components src/layouts src/panels src/views

# Files with more than one top-level component (check each hit by hand)
for f in $(find src/components src/layouts src/panels src/views src/hocs -name '*.tsx'); do
  n=$(grep -cE "^(export )?(default )?function [A-Z]" "$f")
  [ "$n" -gt 1 ] && echo "$f $n"
done

# Components over 350 lines
find src -name '*.tsx' -exec wc -l {} + | awk '$1 > 350 && $2 != "total"'

# Inline style objects
grep -rn "style={{" src --include='*.tsx'

# Generic notification names
grep -rnE "\.(emit|on)\(['\"][^'\"]*:(changed|updated|modified|loaded)['\"]" src

# Listeners on persisted rows. Only projections and EditHistory should appear.
grep -rnE "event:appended" src | grep -v "^src/core/EventLog.ts" | grep -v __tests__

# Tools writing to the log directly
grep -rnE "eventLog\.append" src/core/tools src/core/painting

# Manager or Controller names. BabylonJS API names such as postProcessRenderPipelineManager are exempt.
grep -rnE "\b\w+(Manager|Controller)\b" src

# History in comments
grep -rnE "//.*\b(formerly|previously|used to|fixed)\b" src
```

Every hit needs a read in context. A grep hit is a lead, not a verdict.

### Step 5: Write the Report

For each violation give:
- File path and line number
- The code that violates the rule
- The rule, with the CLAUDE.md or ARCHITECTURE_PATTERNS.md section
- The exact fix, with code when it helps

## Response Format

```markdown
# Architecture Audit Report

## Summary
- Files audited: X
- Critical: X
- Moderate: X
- Style: X

## Critical Violations

### 1. Inline anonymous callback
**File:** `src/components/List.tsx:23`
**Rule:** CLAUDE.md, "No Inline Anonymous Callbacks"

\`\`\`typescript
items.map((item) => item.name)
\`\`\`

**Fix:**
\`\`\`typescript
const toItemName = (item: Item) => item.name;
items.map(toItemName)
\`\`\`

## Moderate Violations

[file:line, issue, fix]

## Style Issues

[file:line, issue, fix]

## Compliant

[What the change does correctly]

## Action Items
1. [ ] Fix: [critical issue]
2. [ ] Improve: [moderate issue]

## Status
PASS / PASS WITH WARNINGS / FAIL

[On FAIL, list the blocking issues]
```

## Special Checks

### After editing any .tsx file

1. Read the whole file
2. Count component definitions
3. Extract any extra component into its own file

### After creating or editing a singleton

- Private constructor, `private static instance`, `static getInstance()`
- Extends `EventEmitter` when the UI reads its state
- Emits a specific notification on each state change
- Notification names follow `<entity>:<past-tense-action>`
- The file's header comment lists its notifications

### After creating or editing a command

- Reads state from projections, never from another command
- Throws on invalid input
- Undoable edits use `eventLog.appendAction()` with an `ActionKind`
- Never mutates a projection

### After creating or editing an HOC

- Named `withXxx`
- Subscribes in `useEffect`, unsubscribes in cleanup, reads once after subscribing
- Passes props only

## Reminders

- Give a file:line reference for every violation
- Give an exact fix, not only a description
- Check every changed file completely
- Critical violations block a merge
- This repo uses a strict, non-mainstream architecture on purpose
