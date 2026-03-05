# 🔍 Architecture Audit Report
**Date:** 2025-03-05
**Auditor:** arch-audit skill

## 📊 Summary
- **Files Audited:** 15+
- **Critical Violations:** 🔴 13+
- **Moderate Violations:** ⚠️ 5+
- **Style Issues:** 🟡 2

---

## 🔴 CRITICAL VIOLATIONS (Fix Immediately)

### 1. Multiple Components in One File ⚠️ MOST COMMON VIOLATION

**File:** `src/components/ActionGroup.tsx`
**Lines:** 18, 49
**Violation:** File contains 2 component definitions

**Code:**
```typescript
export function ActionGroupItem({ ... }) {  // First component
  return <ToggleButton ...>...</ToggleButton>;
}

export function ActionGroup({ ... }) {  // Second component
  return <ToggleButtonGroup ...>...</ToggleButtonGroup>;
}
```

**Fix:**
Extract `ActionGroupItem` to `src/components/ActionGroupItem.tsx`:
```typescript
// src/components/ActionGroupItem.tsx
export function ActionGroupItem({ itemKey, children, 'aria-label': ariaLabel }: ActionGroupItemProps) {
  return (
    <ToggleButton value={itemKey} aria-label={ariaLabel}>
      {children}
    </ToggleButton>
  );
}

// src/components/ActionGroup.tsx (import ActionGroupItem)
import { ActionGroupItem } from './ActionGroupItem';
```

---

### 2. React Hooks (useState) in Regular Components

**File:** `src/components/MaterialBrowserModal.tsx`
**Lines:** 43-44
**Violation:** `useState` used directly in component (forbidden - only allowed in HOCs)

**Code:**
```typescript
export function MaterialBrowserModal({ ... }) {
  const [searchQuery, setSearchQuery] = useState('');  // ❌
  const [selectedTab, setSelectedTab] = useState(0);    // ❌
  // ...
}
```

**Architectural Principle Violated:** CLAUDE.md § 6 - "React hooks are ONLY permitted in HOC components"

**Fix:**
This component needs UI-local state (search query, tab selection). According to the architecture, there are two options:

**Option A:** Create a singleton if this state needs to be shared:
```typescript
// src/core/MaterialBrowserStateManager.ts
class MaterialBrowserStateManager extends EventEmitter {
  private searchQuery = '';
  private selectedTab = 0;
  // ... singleton pattern with events
}

// src/hocs/withMaterialBrowserState.tsx
export function withMaterialBrowserState(Component) { /* ... */ }
```

**Option B:** If state is truly local to this dialog, this might be an acceptable exception for dialog-internal state. **Seek architectural guidance** on whether dialog-local state justifies hooks.

---

### 3. React Hooks (useEffect) in View Components

**File:** `src/views/EditorView.tsx`
**Lines:** 75, 78-87, 90-148
**Violation:** `useState` and `useEffect` used in view component

**Code:**
```typescript
function EditorViewComponent(props: EditorViewProps) {
  const [isMaterialBrowserOpen, setIsMaterialBrowserOpen] = React.useState(false);  // ❌

  React.useEffect(() => {  // ❌
    const handleMetaBlockPlaced = () => { /* ... */ };
    projectManager.on('metablock:placed', handleMetaBlockPlaced);
    // ...
  }, []);

  React.useEffect(() => {  // ❌
    const handleKeyDown = (event: KeyboardEvent) => { /* ... */ };
    window.addEventListener('keydown', handleKeyDown);
    // ...
  }, [project, isPlacementMode, quickSelectSlots]);
}
```

**Architectural Principle Violated:** CLAUDE.md § 6 - "React hooks are FORBIDDEN in regular rendering components"

**Fix:**
**For modal state:** Create HOC or singleton to manage modal visibility.
**For event subscriptions:** These should be in HOCs, not views. Views should receive all data via props from HOCs.

```typescript
// src/hocs/withMetaBlockState.tsx
export function withMetaBlockState(Component) {
  return function WithMetaBlockState(props) {
    const [isPlacementMode, setIsPlacementMode] = useState(false);

    useEffect(() => {
      const handleMetaBlockPlaced = () => setIsPlacementMode(false);
      projectManager.on('metablock:placed', handleMetaBlockPlaced);
      return () => projectManager.off('metablock:placed', handleMetaBlockPlaced);
    }, []);

    return <Component {...props} isPlacementMode={isPlacementMode} />;
  };
}
```

---

### 4. Keyboard Shortcuts Managed in React Component (Not Singleton)

**File:** `src/views/EditorView.tsx`
**Lines:** 90-148
**Violation:** Keyboard event handling logic in React component instead of singleton

**Code:**
```typescript
React.useEffect(() => {  // ❌ Event listener in component
  const handleKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    const { shiftKey } = event;

    // Confirm meta block placement with Enter
    if (isPlacementMode && key === 'enter') { /* ... */ }

    // Material selection shortcuts (1-9)
    const numberKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    if (numberKeys.includes(key)) { /* ... */ }

    // Open material browser (M key)
    if (key === 'm') { /* ... */ }

    // Layer navigation (X, Y, Z keys)
    if (key === 'x') { /* ... */ }
    // ...
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [project, isPlacementMode, quickSelectSlots]);
```

**Architectural Principle Violated:**
- CLAUDE.md § 1 - "Business logic lives in singleton classes"
- CLAUDE.md § 6 - "React hooks are FORBIDDEN in regular rendering components"

**Why This is Wrong:**
1. **Tight coupling:** Keyboard shortcuts only work when EditorView is mounted
2. **Not reusable:** Can't use shortcuts from other components
3. **Hard to test:** Can't unit test shortcut logic without mounting component
4. **Violates separation of concerns:** UI component shouldn't manage input handling

**Fix:**
Create a `KeyboardShortcutManager` singleton:

```typescript
// src/core/KeyboardShortcutManager.ts
class KeyboardShortcutManager extends EventEmitter {
  private static instance: KeyboardShortcutManager;
  private shortcuts: Map<string, () => void> = new Map();
  private isListening = false;

  private constructor() {
    super();
  }

  static getInstance(): KeyboardShortcutManager {
    if (!KeyboardShortcutManager.instance) {
      KeyboardShortcutManager.instance = new KeyboardShortcutManager();
    }
    return KeyboardShortcutManager.instance;
  }

  registerShortcut(key: string, handler: () => void): void {
    this.shortcuts.set(key, handler);
  }

  unregisterShortcut(key: string): void {
    this.shortcuts.delete(key);
  }

  startListening(): void {
    if (this.isListening) return;
    window.addEventListener('keydown', this.handleKeyDown);
    this.isListening = true;
  }

  stopListening(): void {
    if (!this.isListening) return;
    window.removeEventListener('keydown', this.handleKeyDown);
    this.isListening = false;
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    const handler = this.shortcuts.get(key);
    if (handler) {
      event.preventDefault();
      handler();
    }
  };
}

export const keyboardShortcutManager = KeyboardShortcutManager.getInstance();
```

Then in EditorStateManager or a dedicated initialization:

```typescript
// src/core/EditorStateManager.ts (or separate initialization)
export function registerEditorShortcuts() {
  const ksm = keyboardShortcutManager;

  // Material selection (1-9)
  for (let i = 1; i <= 9; i++) {
    ksm.registerShortcut(i.toString(), () => {
      const slotIndex = i - 1;
      const blockId = editorStateManager.getQuickSelectSlot(slotIndex);
      if (blockId) editorStateManager.setSelectedBlock(blockId);
    });
  }

  // Open material browser (M)
  ksm.registerShortcut('m', () => {
    editorStateManager.setMaterialBrowserOpen(true);
  });

  // Layer navigation
  ksm.registerShortcut('x', () => editorStateManager.incrementLayer('x'));
  ksm.registerShortcut('y', () => editorStateManager.incrementLayer('y'));
  ksm.registerShortcut('z', () => editorStateManager.incrementLayer('z'));

  ksm.startListening();
}
```

Then EditorView becomes a dumb component - no keyboard handling logic at all.

---

### 5. Inline Anonymous Callbacks - map()

**File:** `src/components/MaterialBrowserModal.tsx`
**Line:** 119
**Violation:** Anonymous arrow function in map

**Code:**
```typescript
{categories.map((category, index) => (  // ❌
  <Tab key={index} label={category.label} />
))}
```

**Architectural Principle Violated:** CLAUDE.md § 3 - "NO EXCEPTIONS. ALL callbacks must be named functions"

**Fix:**
```typescript
const renderTab = (category: CategoryType, index: number) => (
  <Tab key={index} label={category.label} />
);

{categories.map(renderTab)}  // ✅
```

---

### 5. Inline Anonymous Callbacks - map() (Block Grid)

**File:** `src/components/MaterialBrowserModal.tsx`
**Line:** 134-176
**Violation:** Anonymous arrow function in map with complex logic

**Code:**
```typescript
{currentCategoryBlocks.map((block) => {  // ❌
  const isSelected = block.id === selectedBlockId;
  return (
    <Box onClick={() => handleMaterialClick(block.id)} ...>  // ❌ Double violation!
      <ColorSwatch color={block.color} size="L" />
      {/* ... */}
    </Box>
  );
})}
```

**Fix:**
```typescript
const renderMaterialBlock = (block: Block) => {
  const isSelected = block.id === selectedBlockId;
  const handleClick = () => handleMaterialClick(block.id);

  return (
    <Box key={block.id} onClick={handleClick} ...>
      <ColorSwatch color={block.color} size="L" />
      {/* ... */}
    </Box>
  );
};

{currentCategoryBlocks.map(renderMaterialBlock)}  // ✅
```

---

### 6. Inline Anonymous Callbacks - filter()

**File:** `src/components/MaterialBrowserModal.tsx`
**Line:** 59
**Violation:** Anonymous arrow function in filter

**Code:**
```typescript
const filteredBlocks = blocks.filter((block) =>  // ❌
  block.name.toLowerCase().includes(searchQuery.toLowerCase())
);
```

**Fix:**
```typescript
const matchesSearchQuery = (block: Block) =>
  block.name.toLowerCase().includes(searchQuery.toLowerCase());

const filteredBlocks = blocks.filter(matchesSearchQuery);  // ✅
```

---

### 7. Inline Anonymous Callbacks - onClick

**File:** `src/components/MaterialQuickSelect.tsx`
**Line:** 63
**Violation:** Anonymous arrow function in onClick

**Code:**
```typescript
<Box
  onClick={() => handleSlotClick(index)}  // ❌
  sx={{ ... }}
>
```

**Fix:**
```typescript
const renderSlot = (blockId: string | null, index: number) => {
  const handleClick = () => handleSlotClick(index);  // ✅
  const block = getBlockById(blockId);
  const isSelected = index === selectedSlotIndex;

  return (
    <Tooltip key={index} title={/* ... */}>
      <Box onClick={handleClick} sx={{ ... }}>
        {/* ... */}
      </Box>
    </Tooltip>
  );
};

{slots.map(renderSlot)}
```

---

### 8. Inline Anonymous Callbacks - find()

**File:** `src/components/MaterialQuickSelect.tsx`
**Line:** 35
**Violation:** Anonymous arrow function in find

**Code:**
```typescript
return blocks.find((b) => b.id === blockId);  // ❌
```

**Fix:**
```typescript
const matchesBlockId = (b: Block) => b.id === blockId;
return blocks.find(matchesBlockId);  // ✅
```

---

### 9. Inline Anonymous Callbacks - findIndex()

**File:** `src/views/EditorView.tsx`
**Line:** 302
**Violation:** Anonymous arrow function in findIndex

**Code:**
```typescript
selectedSlotIndex={quickSelectSlots.findIndex((id) => id === selectedBlock)}  // ❌
```

**Fix:**
```typescript
const matchesSelectedBlock = (id: string | null) => id === selectedBlock;
const selectedSlotIndex = quickSelectSlots.findIndex(matchesSelectedBlock);

<MaterialQuickSelect
  selectedSlotIndex={selectedSlotIndex}
  {/* ... */}
/>
```

---

### 10. Inline Anonymous Callback - Arrow Function Prop

**File:** `src/views/EditorView.tsx`
**Line:** 305
**Violation:** Inline arrow function passed as prop

**Code:**
```typescript
onOpenBrowser={() => setIsMaterialBrowserOpen(true)}  // ❌
```

**Fix:**
```typescript
const handleOpenMaterialBrowser = () => setIsMaterialBrowserOpen(true);

<MaterialQuickSelect
  onOpenBrowser={handleOpenMaterialBrowser}  // ✅
  {/* ... */}
/>
```

---

### 11. Inline Anonymous Callback - Arrow Function Prop

**File:** `src/views/EditorView.tsx`
**Line:** 313
**Violation:** Inline arrow function passed as prop

**Code:**
```typescript
onClose={() => setIsMaterialBrowserOpen(false)}  // ❌
```

**Fix:**
```typescript
const handleCloseMaterialBrowser = () => setIsMaterialBrowserOpen(false);

<MaterialBrowserModal
  onClose={handleCloseMaterialBrowser}  // ✅
  {/* ... */}
/>
```

---

### 12. Inline Anonymous Callback - Complex Arrow Function Prop

**File:** `src/views/EditorView.tsx`
**Lines:** 314-317
**Violation:** Multi-line inline arrow function

**Code:**
```typescript
onSelectMaterial={(blockId: string) => {  // ❌
  editorStateManager.setSelectedBlock(blockId);
  setIsMaterialBrowserOpen(false);
}}
```

**Fix:**
```typescript
const handleSelectMaterial = (blockId: string) => {
  editorStateManager.setSelectedBlock(blockId);
  setIsMaterialBrowserOpen(false);
};

<MaterialBrowserModal
  onSelectMaterial={handleSelectMaterial}  // ✅
  {/* ... */}
/>
```

---

## ⚠️ MODERATE VIOLATIONS

### 1. Complex Business Logic in Component

**File:** `src/components/MaterialBrowserModal.tsx`
**Lines:** 59-71
**Issue:** Filtering and categorization logic embedded in component

**Code:**
```typescript
// Filter blocks by search query
const filteredBlocks = blocks.filter((block) =>
  block.name.toLowerCase().includes(searchQuery.toLowerCase())
);

// Group blocks by category
const categories = [
  { label: 'All', filter: () => true },
  { label: 'Building', filter: (b: Block) => b.name.toLowerCase().includes('stone') || ... },
  // ...
];
```

**Suggestion:**
Move categorization logic to BlockRegistry singleton or a utility module:
```typescript
// src/core/BlockRegistry.ts or src/utils/blockCategories.ts
export const BLOCK_CATEGORIES = [ /* ... */ ];
export function categorizeBlocks(blocks: Block[]): Map<string, Block[]> { /* ... */ }
```

---

### 2. Helper Function in Component

**File:** `src/components/MaterialQuickSelect.tsx`
**Lines:** 33-36
**Issue:** `getBlockById` helper function defined inside component

**Suggestion:**
This could be:
1. A utility function in `src/utils/blockUtils.ts`
2. Passed as a prop from parent (already has `blocks` prop)
3. A method on BlockRegistry singleton

**Current:**
```typescript
const getBlockById = (blockId: string | null) => {
  if (!blockId) return null;
  return blocks.find((b) => b.id === blockId);
};
```

**Better:**
```typescript
// Component receives getBlock as prop from HOC
interface MaterialQuickSelectProps {
  getBlock: (id: string | null) => Block | null;
  // ...
}
```

---

### 3. Hardcoded Category Filters

**File:** `src/components/MaterialBrowserModal.tsx`
**Lines:** 64-69
**Issue:** Category filter logic hardcoded with string matching

**Suggestion:**
Blocks should have a `category` property, and categories should be derived from BlockRegistry:
```typescript
// In BlockRegistry
getCategories(): string[] {
  return Array.from(new Set(this.blocks.map(b => b.category)));
}

filterByCategory(category: string): Block[] {
  return this.blocks.filter(b => b.category === category);
}
```

---

### 4. Incorrect Folder Placement (Potential)

**Files:** `src/views/TabbedEditorView.tsx`, `src/views/QuadEditorView.tsx`
**Issue:** These might belong in `src/layouts/` instead of `src/views/`

**Reasoning:**
- `src/views/` = Top-level screens (EditorView, WelcomeView)
- `src/layouts/` = Layout compositions (TabbedLayout, QuadLayout)

If TabbedEditorView and QuadEditorView are layout strategies, they should be in layouts/.

---

### 5. Non-Descriptive Variable Names

**File:** `src/components/MaterialQuickSelect.tsx`
**Line:** 35
**Code:**
```typescript
return blocks.find((b) => b.id === blockId);  // 'b' is not descriptive
```

**Minor but worth fixing:**
```typescript
const matchesId = (block: Block) => block.id === blockId;
return blocks.find(matchesId);
```

---

## 🟡 STYLE ISSUES

### 1. Inconsistent Import Organization

**Multiple files**
**Issue:** Imports not consistently organized per CLAUDE.md guidelines

**Expected order:**
1. External dependencies (React, MUI)
2. Type imports
3. Core/Singletons
4. HOCs
5. Components
6. Utils

**Example violation (EditorView.tsx lines 1-21):**
Types, HOCs, components, singletons, and React are mixed.

---

### 2. Emoji in Code

**File:** `src/components/ToolPanel.tsx`
**Line:** 98
**Code:**
```typescript
<Box sx={{ fontSize: '1.2rem', fontWeight: 'bold' }}>⌒</Box>
```

**CLAUDE.md § 13:** "Only use emojis if the user explicitly requests it"

**Note:** This is a special character (arch symbol), not technically an emoji, so may be acceptable. But worth noting.

---

## ✅ Compliant Aspects

1. **✅ MUI Components Usage** - Excellent use of MUI components (Box, Stack, Typography, Dialog, etc.) throughout
2. **✅ Component Size** - All components under 350 lines (largest is EditorView at 331 lines)
3. **✅ File Naming** - Proper PascalCase for components, camelCase for HOCs
4. **✅ Singleton Pattern** - Core singletons properly extend EventEmitter (where checked)
5. **✅ HOC Pattern** - HOCs follow `withXxxState` naming and use hooks correctly
6. **✅ Props-Based Components** - Components receive data via props and use callbacks
7. **✅ Type Safety** - Consistent TypeScript usage with proper interfaces

---

## 🎯 Action Items

**Priority fixes in order:**

### Immediate (Block Commit):
1. [ ] **Extract ActionGroupItem** to separate file (`ActionGroupItem.tsx`)
2. [ ] **Remove all inline anonymous callbacks** - Convert to named functions (13+ instances)
3. [ ] **Move keyboard shortcut handling to singleton** - Create KeyboardShortcutManager
4. [ ] **Move useState/useEffect from EditorView** to HOCs or singletons
5. [ ] **Resolve MaterialBrowserModal hooks** - Create HOC or justify exception

### High Priority:
5. [ ] Move filtering/categorization logic from MaterialBrowserModal to BlockRegistry
6. [ ] Remove helper function from MaterialQuickSelect (pass as prop or use util)
7. [ ] Fix inline callbacks in remaining files (grep showed 20+ more instances)

### Medium Priority:
8. [ ] Reorganize imports in all modified files
9. [ ] Consider moving TabbedEditorView/QuadEditorView to layouts/
10. [ ] Add category property to Block type, update BlockRegistry

---

## 🏁 Audit Status

**FAIL** - Multiple critical violations must be fixed before merge.

### Blocking Issues:
1. Multiple components in ActionGroup.tsx
2. 13+ inline anonymous callbacks across multiple files
3. Keyboard shortcut handling in React component instead of singleton (EditorView.tsx)
4. Direct useState/useEffect usage in EditorView.tsx and MaterialBrowserModal.tsx violating HOC-only hooks rule

### Recommendation:
Fix the critical violations in order of impact:
1. **Easiest:** Extract ActionGroupItem (5 minutes)
2. **High impact:** Convert all inline callbacks to named functions (30-45 minutes)
3. **Architectural:** Refactor EditorView hooks to HOCs/singletons (1-2 hours)

After fixing critical violations, re-run `/arch-audit` to verify compliance.

---

## 📚 References

- **CLAUDE.md § 3:** No inline anonymous callbacks
- **CLAUDE.md § 4:** One component per file (NO EXCEPTIONS)
- **CLAUDE.md § 6:** Hooks only in HOCs or external libraries
- **CLAUDE.md § 7:** Dumb components (props in, callbacks out)
- **MACRO_COMPONENTS.md:** Data flow pattern (Singletons → Events → HOCs → Props → Components)
