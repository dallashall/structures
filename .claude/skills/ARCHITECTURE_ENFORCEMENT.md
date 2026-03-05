# Architecture Enforcement Skills

This document explains the custom Claude Code skills for enforcing this repository's strict architectural principles.

## Available Skills

### 1. `/arch-review` - Pre-Implementation Plan Review

**When to use:** Before implementing a feature, after creating a plan.

**What it does:**
- Analyzes implementation plans against CLAUDE.md architectural principles
- Identifies violations BEFORE code is written
- Prevents React anti-patterns common in training data
- Provides specific fixes for architectural issues

**How to use:**

```
# After creating a plan in plan mode:
/arch-review
```

Or Claude may automatically suggest it when appropriate.

**What it checks:**
- ✅ Business logic in singletons (not React components)
- ✅ State management via HOCs (not direct hooks)
- ✅ Named callbacks (no inline anonymous functions)
- ✅ One component per file
- ✅ MUI component usage priority
- ✅ Correct folder organization
- ✅ Component size limits (350 lines)
- ✅ Singleton and HOC patterns

**Output:**
Provides a structured report with:
- ✅ Approved aspects
- 🚨 Critical issues (must fix before implementation)
- ⚠️ Recommendations
- 📋 Implementation checklist
- 🟢 Verdict (APPROVED / NEEDS REVISION / BLOCKED)

---

### 2. `/arch-audit` - Post-Change Code Audit

**When to use:** After implementing code changes, before committing.

**What it does:**
- Audits actual code files for architectural violations
- Detects the most common violation: multiple components per file
- Finds inline anonymous callbacks
- Identifies forbidden hook usage
- Checks for missing MUI components
- Provides specific file:line fixes

**How to use:**

```
# After making code changes:
/arch-audit
```

Or:

```
# Audit specific files:
/arch-audit src/components/NewComponent.tsx
```

**What it checks:**
- 🔴 **Multiple components in one file** (MOST COMMON)
- 🔴 Inline anonymous callbacks
- 🔴 React hooks in regular components
- 🔴 Business logic in components
- 🔴 Missing singleton patterns
- 🔴 Direct event subscriptions
- ⚠️ Component size violations
- ⚠️ Missing MUI components
- ⚠️ Incorrect folder placement
- ⚠️ Non-dumb components

**Output:**
Provides a detailed audit report with:
- 📊 Summary (files audited, violation counts)
- 🔴 Critical violations (with file:line:code)
- ⚠️ Moderate violations
- 🟡 Style issues
- ✅ Compliant aspects
- 🎯 Prioritized action items
- 🏁 Audit status (PASS / PASS WITH WARNINGS / FAIL)

---

## Recommended Workflow

### Option 1: Plan-Review-Implement-Audit

```
1. Enter plan mode: plan the feature
2. Exit plan mode: /arch-review (review the plan)
3. Fix any critical issues in the plan
4. Implement the feature
5. /arch-audit (audit the implementation)
6. Fix any violations
7. Commit
```

### Option 2: Implement-Audit-Fix

```
1. Implement the feature
2. /arch-audit (audit the code)
3. Fix violations
4. /arch-audit (verify fixes)
5. Commit
```

### Option 3: Continuous Audit (for large changes)

```
1. Implement part of the feature
2. /arch-audit (audit progress)
3. Fix violations immediately
4. Continue implementing
5. Repeat until complete
6. Final /arch-audit
7. Commit
```

---

## Common Violations and Fixes

### 🔴 Multiple Components in One File

**Violation:**
```typescript
// ❌ BAD - File: src/components/Editor.tsx
function Toolbar() { return <div>...</div> }
function Canvas() { return <div>...</div> }
export function Editor() {
  return (
    <div>
      <Toolbar />
      <Canvas />
    </div>
  );
}
```

**Fix:**
```typescript
// ✅ GOOD - File: src/components/Toolbar.tsx
export function Toolbar() { return <div>...</div> }

// ✅ GOOD - File: src/components/Canvas.tsx
export function Canvas() { return <div>...</div> }

// ✅ GOOD - File: src/components/Editor.tsx
import { Toolbar } from './Toolbar';
import { Canvas } from './Canvas';
export function Editor() {
  return (
    <div>
      <Toolbar />
      <Canvas />
    </div>
  );
}
```

---

### 🔴 Inline Anonymous Callbacks

**Violation:**
```typescript
// ❌ BAD
items.map((item) => item.name)
users.filter(u => u.active)
<button onClick={() => doSomething()}>Click</button>
```

**Fix:**
```typescript
// ✅ GOOD
const toItemName = (item: Item) => item.name;
items.map(toItemName)

const isActive = (user: User) => user.active;
users.filter(isActive)

const handleClick = () => doSomething();
<button onClick={handleClick}>Click</button>
```

---

### 🔴 React Hooks in Regular Components

**Violation:**
```typescript
// ❌ BAD - File: src/components/MaterialPalette.tsx
export function MaterialPalette() {
  const [blocks, setBlocks] = useState<Block[]>([]);

  useEffect(() => {
    // Subscribe to block registry
  }, []);

  return <div>...</div>;
}
```

**Fix:**
```typescript
// ✅ GOOD - File: src/hocs/withBlockRegistry.tsx
export function withBlockRegistry<P extends object>(
  Component: React.ComponentType<P & { blocks: Block[] }>
) {
  return function WithBlockRegistry(props: P) {
    const [blocks, setBlocks] = useState(blockRegistry.getAllBlocks());

    useEffect(() => {
      const handleUpdate = () => setBlocks(blockRegistry.getAllBlocks());
      blockRegistry.on('registry:updated', handleUpdate);
      return () => blockRegistry.off('registry:updated', handleUpdate);
    }, []);

    return <Component {...props} blocks={blocks} />;
  };
}

// ✅ GOOD - File: src/components/MaterialPalette.tsx
interface Props {
  blocks: Block[];
  onSelectBlock: (id: string) => void;
}

export function MaterialPalette({ blocks, onSelectBlock }: Props) {
  return <div>...</div>;
}
```

---

### 🔴 Missing MUI Components

**Violation:**
```typescript
// ❌ BAD
<div style={{ padding: '16px', display: 'flex', gap: '8px' }}>
  <h2 style={{ fontSize: '20px' }}>Title</h2>
  <button onClick={handleClick}>Save</button>
</div>
```

**Fix:**
```typescript
// ✅ GOOD
import { Box, Stack, Typography, Button } from '@mui/material';

<Box sx={{ p: 2 }}>
  <Stack spacing={1}>
    <Typography variant="h5">Title</Typography>
    <Button variant="contained" onClick={handleClick}>Save</Button>
  </Stack>
</Box>
```

---

## Why These Rules?

### Problem: React Training Data Varies Wildly

- Many React tutorials teach inline callbacks (performance issues)
- Common pattern: components with `useState`/`useEffect` everywhere (hard to test)
- Typical approach: business logic scattered in components (coupling)
- Standard practice: custom divs instead of design systems (accessibility issues)

### Solution: Strict Architecture

This repository enforces:
- **Testability:** Business logic in singletons (easy to unit test)
- **Maintainability:** Clear separation of concerns
- **Performance:** Named callbacks enable React.memo
- **Accessibility:** MUI components have built-in ARIA
- **Consistency:** One way to do things (easier onboarding)

### Skills Enforce This

Rather than manually reviewing or relying on developers reading CLAUDE.md:
- `/arch-review` catches issues in planning phase
- `/arch-audit` catches issues in implementation phase
- Automated enforcement prevents drift
- Specific fixes reduce back-and-forth

---

## Tips

1. **Use `/arch-review` early** - Cheaper to fix plans than code
2. **Run `/arch-audit` often** - Don't let violations accumulate
3. **Fix critical issues first** - Moderate issues can wait
4. **Learn the patterns** - After a few audits, violations decrease
5. **Reference CLAUDE.md** - Skills cite specific sections for learning

---

## Skill Configuration

Both skills are stored in `.claude/skills/`:
- `.claude/skills/arch-review/SKILL.md`
- `.claude/skills/arch-audit/SKILL.md`

You can modify these files to adjust the enforcement rules or add project-specific checks.

---

## Future Enhancements

Potential additions:
- `/arch-fix` - Automatically fix common violations
- `/arch-teach` - Explain architectural patterns interactively
- `/arch-stats` - Track violation trends over time
- Pre-commit hook integration
