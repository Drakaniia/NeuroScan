# Component Specifications

**Session:** UI Components & beUI Integration  
**Status:** Draft v1  
**Date:** 2026-09-25  

---

## Component Library Strategy

### Recommended Stack

**UI Components:**
- **Radix UI** - Accessible primitives
- **shadcn/ui** - Styled components built on Radix
- **beUI (@beui)** - Animated components for motion UI

**Icons:**
- **Lucide React** - Consistent, modern, medical-appropriate

**Styling:**
- **Tailwind CSS** - Utility-first styling (already in project)

**Animations:**
- **Framer Motion** - Subtle polish and spring physics
- **Motion** - Apple-style spring animations

### beUI Component Integration

Using beUI for motion-rich components:

| Component Need | beUI Install Slug | Notes |
|----------------|-------------------|-------|
| Toast notifications | `animated-toast-stack` | Non-blocking alerts |
| Side panel/drawer | `drawer` | Slide-in panels |
| Bottom sheet | `bottom-sheet` | Mobile-style panels |
| Popover | `popover` | Liquid morph effect |
| Dropdown select | `select` | Standard dropdown |
| Searchable select | `combobox` | Cmd+K palette |
| Button with states | `button-stateful` | Loading/success/error |
| Loader/spinner | `loader` | Various styles |
| Range slider | `range-slider` | Tick-dot slider |
| Tooltip | `tooltip` | Standard tooltips |
| Input fields | `input` | Styled input |
| Checkbox/Switch | `checkbox`, `switch` | Form controls |

### beUI Composition Rules

- **Prefer installed beUI source** over custom motion widgets
- **Import named exports** from installed files
- **Use className for layout** - Don't fork internals
- **Keep helpers** like `@/lib/ease`, `@/lib/utils`
- **Gate decorative effects** behind `useHoverCapable()`
- **Animate transform/opacity** - Avoid layout-property animation
- **Use useReducedMotion()** from motion/react for accessibility

---

## Buttons

### Primary Button

**Specifications:**
- **Background:** Primary Blue (#0066CC)
- **Text:** White, bold
- **Hover:** Secondary Blue (#004C99)
- **Active:** Dark Blue (#003366)
- **Border Radius:** 4px
- **Padding:** 8px 16px
- **Shadow:** Subtle on hover

**Apple Motion Integration:**
- **Press feedback:** Scale to 0.97 on pointer-down (instant)
- **Hover lift:** Subtle elevation
- **Spring animation:** damping 1.0, response 0.3s

```tsx
// Using beUI button-stateful for loading states
import { Button } from "@/components/ui/button-stateful"

<PrimaryButton 
  onClick={handleAction}
  loading={isLoading}
  success={isSuccess}
>
  {isLoading ? 'Processing...' : 'Submit'}
</PrimaryButton>
```

### Secondary Button

**Specifications:**
- **Background:** Light Blue (#E6F0FF)
- **Text:** Primary Blue, regular
- **Hover:** Medium Light Blue
- **Border:** 1px Primary Blue

### Danger Button

**Specifications:**
- **Background:** Danger Red (#DC3545)
- **Text:** White, bold
- **Hover:** Darker Red

### Icon Button

**Specifications:**
- **Background:** Transparent
- **Icon:** Dark Gray
- **Hover:** Light Blue background
- **Size:** 32x32px

**beUI Integration:**
```tsx
// Using beUI button-base for icon buttons
import { Button } from "@/components/ui/button-base"

<IconButton onClick={handleAction}>
  <DownloadIcon />
</IconButton>
```

### Button State Management

```tsx
// Custom button with Apple-style press feedback
const PrimaryButton = ({ children, onClick, disabled }) => {
  return (
    <button
      className="primary-button"
      onClick={onClick}
      disabled={disabled}
      style={{
        transition: 'transform 100ms ease-out, background-color 200ms ease',
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {children}
    </button>
  );
};
```

---

## Inputs

### Text Input

**Specifications:**
- **Border:** 1px Medium Gray
- **Border Radius:** 4px
- **Padding:** 8px 12px
- **Focus:** Primary Blue border + subtle shadow
- **Placeholder:** Medium Gray

**beUI Integration:**
```tsx
// Using beUI input component
import { Input } from "@/components/ui/input"

<Input 
  placeholder="Enter filename..."
  className="search-input"
/>
```

### Dropdown/Select

**Specifications:**
- **Border:** 1px Medium Gray
- **Border Radius:** 4px
- **Padding:** 8px 12px
- **Arrow:** Custom styled chevron

**beUI Integration:**
```tsx
// Using beUI select component
import { Select } from "@/components/ui/select"

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select colormap" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="inferno">Inferno</SelectItem>
    <SelectItem value="viridis">Viridis</SelectItem>
    <SelectItem value="plasma">Plasma</SelectItem>
  </SelectContent>
</Select>
```

### Slider

**Specifications:**
- **Track:** Light Gray background
- **Fill:** Primary Blue
- **Thumb:** White circle with shadow
- **Hover:** Slightly larger thumb

**beUI Integration:**
```tsx
// Using beUI range-slider for tick-dot slider
import { Slider } from "@/components/ui/range-slider"

<Slider
  min={0}
  max={100}
  value={[opacity]}
  onValueChange={([value]) => setOpacity(value)}
  className="opacity-slider"
/>
```

---

## Cards

### Standard Card

**Specifications:**
- **Background:** White
- **Border Radius:** 8px
- **Shadow:** `0 2px 8px rgba(0,0,0,0.1)`
- **Padding:** 24px
- **Hover:** Lift effect + stronger shadow

### Interactive Card (Dashboard)

**Specifications:**
- **Cursor:** Pointer
- **Transition:** 200ms ease-in-out
- **Active State:** Slight scale down

**Apple Motion Integration:**
```tsx
const InteractiveCard = ({ children, onClick }) => {
  return (
    <div
      className="interactive-card"
      onClick={onClick}
      style={{
        transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {children}
    </div>
  );
};
```

### beUI Card Options

**3D Tilt Card:**
```tsx
// Using beUI tilt-card for enhanced interactivity
import { TiltCard } from "@/components/ui/tilt-card"

<TiltCard className="dashboard-card">
  <CardIcon />
  <CardTitle>Single Screening</CardTitle>
  <CardDescription>Analyze individual MRI scans</CardDescription>
</TiltCard>
```

---

## Status Indicators

### Verdict Badges

**Specifications:**
- **No Tumor:** Green background, white text, rounded pill
- **Tumor Detected:** Red background, white text, rounded pill
- **Low Confidence:** Amber background, white text, rounded pill
- **Error:** Gray background, white text, rounded pill

```tsx
const VerdictBadge = ({ verdict }) => {
  const colors = {
    'no-tumor': 'bg-green-500 text-white',
    'tumor': 'bg-red-500 text-white',
    'low-confidence': 'bg-amber-500 text-white',
    'error': 'bg-gray-500 text-white',
  };

  return (
    <span className={`verdict-badge ${colors[verdict]} rounded-full px-3 py-1 text-sm`}>
      {verdict.replace('-', ' ').toUpperCase()}
    </span>
  );
};
```

### Progress Indicators

**Linear Progress Bar:**
- Primary Blue fill, light gray track
- Smooth animation with spring physics

**Circular Progress:**
- SVG ring with Primary Blue stroke
- Animated stroke-dashoffset

**Loading Spinner:**
- Subtle rotation, Primary Blue
- beUI loader component

**beUI Integration:**
```tsx
// Using beUI loader for various styles
import { Loader } from "@/components/ui/loader"

<Loader type="spinner" size="md" />
<Loader type="dots" size="sm" />
<Loader type="bars" size="lg" />
```

### Progress Bar Implementation

```tsx
const ProgressBar = ({ progress, label }) => {
  return (
    <div className="progress-bar">
      <div className="progress-track">
        <div 
          className="progress-fill"
          style={{ 
            width: `${progress}%`,
            transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      </div>
      {label && <span className="progress-label">{label}</span>}
    </div>
  );
};
```

---

## Toast Notifications

### Style Specifications

- **Position:** Top-right corner
- **Background:** White with shadow
- **Border Radius:** 4px
- **Padding:** 12px 16px
- **Auto-dismiss:** 5 seconds
- **Animation:** Slide in from right

### Types

- **Success:** Green left border + check icon
- **Error:** Red left border + X icon
- **Warning:** Amber left border + warning icon
- **Info:** Blue left border + info icon

**beUI Integration:**
```tsx
// Using beUI animated-toast-stack
import { Toast } from "@/components/ui/animated-toast-stack"
import { useToast } from "@/hooks/use-toast"

const { toast } = useToast();

toast({
  title: "Screening complete",
  description: "No tumor detected with 95% confidence",
  variant: "success",
});
```

### Toast Implementation

```tsx
const showToast = (message, type = 'info') => {
  const colors = {
    success: 'border-green-500',
    error: 'border-red-500',
    warning: 'border-amber-500',
    info: 'border-blue-500',
  };

  const icons = {
    success: <CheckIcon />,
    error: <XIcon />,
    warning: <WarningIcon />,
    info: <InfoIcon />,
  };

  return (
    <div className={`toast ${colors[type]} border-l-4`}>
      <div className="toast-icon">{icons[type]}</div>
      <div className="toast-message">{message}</div>
    </div>
  );
};
```

---

## Panels & Drawers

### Side Panel (Drawer)

**Specifications:**
- **Position:** Slide-in from right
- **Background:** White with shadow
- **Animation:** Spring slide (damping 0.8, response 0.3s)
- **Backdrop:** Semi-transparent overlay

**beUI Integration:**
```tsx
// Using beUI drawer for side panels
import { Drawer } from "@/components/ui/drawer"

<Drawer open={isOpen} onOpenChange={setIsOpen}>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Heatmap Settings</DrawerTitle>
    </DrawerHeader>
    <div className="drawer-content">
      {/* Settings controls */}
    </div>
  </DrawerContent>
</Drawer>
```

### Bottom Sheet

**Specifications:**
- **Position:** Slide-up from bottom
- **Animation:** Spring slide with momentum
- **Handle:** Drag handle at top
- **Backdrop:** Semi-transparent overlay

**beUI Integration:**
```tsx
// Using beUI bottom-sheet for mobile-style panels
import { BottomSheet } from "@/components/ui/bottom-sheet"

<BottomSheet open={isOpen} onOpenChange={setIsOpen}>
  <BottomSheetContent>
    <BottomSheetHandle />
    <div className="sheet-content">
      {/* Panel content */}
    </div>
  </BottomSheetContent>
</BottomSheet>
```

### Panel Animation

```tsx
// Apple-style spring animation for panels
import { animate } from 'motion';

const animatePanel = (panel: HTMLElement, isOpen: boolean) => {
  const target = isOpen ? 0 : 400; // 400px off-screen
  
  animate(panel, { 
    x: target 
  }, { 
    type: 'spring',
    damping: 0.8,
    stiffness: 300,
    mass: 0.8
  });
};
```

---

## Tables

### Data Table

**Specifications:**
- **Border:** 1px Medium Gray
- **Header:** Light Gray background
- **Rows:** Hover highlight
- **Sorting:** Click headers to sort
- **Pagination:** 25/50/100 items per page

**beUI Integration:**
```tsx
// Using beUI table component
import { Table } from "@/components/ui/table"

<Table>
  <TableHeader>
    <TableRow>
      <TableHead onClick={() => handleSort('filename')}>Filename</TableHead>
      <TableHead onClick={() => handleSort('verdict')}>Verdict</TableHead>
      <TableHead onClick={() => handleSort('probability')}>Probability</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map(item => (
      <TableRow key={item.id}>
        <TableCell>{item.filename}</TableCell>
        <TableCell>{item.verdict}</TableCell>
        <TableCell>{item.probability}%</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Table Features

**Virtual Scrolling:**
- For large datasets
- Efficient rendering
- Smooth scrolling

**Debounced Filtering:**
- 300ms delay for search
- Performance optimization

**Row Selection:**
- Checkbox for bulk operations
- Shift+click for range selection
- Ctrl+click for toggle selection

---

## Tooltips

### Specifications

- **Position:** Near trigger element
- **Background:** Dark Gray with white text
- **Border Radius:** 4px
- **Padding:** 4px 8px
- **Animation:** Fade in/out

**beUI Integration:**
```tsx
// Using beUI tooltip component
import { Tooltip } from "@/components/ui/tooltip"

<Tooltip content="Toggle heatmap overlay">
  <button className="icon-button">
    <HeatmapIcon />
  </button>
</Tooltip>
```

---

## Modal/Dialog

### Specifications

- **Backdrop:** Semi-transparent overlay
- **Content:** White card with shadow
- **Animation:** Scale + fade (spring physics)
- **Close:** X button + Escape key

**beUI Integration:**
```tsx
// Using Radix Dialog with beui styling
import { Dialog } from "@/components/ui/dialog"

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Export Results</DialogTitle>
      <DialogDescription>
        Choose export options
      </DialogDescription>
    </DialogHeader>
    <div className="dialog-content">
      {/* Export options */}
    </div>
    <DialogFooter>
      <Button variant="secondary">Cancel</Button>
      <Button variant="primary">Export</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Modal Animation

```tsx
// Apple-style modal animation
import { animate } from 'motion';

const animateModal = (modal: HTMLElement, isOpen: boolean) => {
  if (isOpen) {
    animate(modal, { 
      opacity: [0, 1],
      scale: [0.95, 1]
    }, { 
      type: 'spring',
      damping: 0.8,
      stiffness: 300,
      mass: 0.8
    });
  } else {
    animate(modal, { 
      opacity: [1, 0],
      scale: [1, 0.95]
    }, { 
      type: 'spring',
      damping: 1.0,
      stiffness: 300,
      mass: 0.8
    });
  }
};
```

---

## Form Controls

### Checkbox

**Specifications:**
- **Custom styled** (not native)
- **Check animation:** Spring scale
- **Focus:** Primary Blue outline

**beUI Integration:**
```tsx
// Using beUI checkbox component
import { Checkbox } from "@/components/ui/checkbox"

<Checkbox 
  id="export-csv"
  checked={exportCsv}
  onCheckedChange={setExportCsv}
/>
<label htmlFor="export-csv">Export CSV</label>
```

### Switch/Toggle

**Specifications:**
- **Track:** Light Gray background
- **Thumb:** White circle with shadow
- **Active:** Primary Blue track
- **Animation:** Spring slide

**beUI Integration:**
```tsx
// Using beUI switch component
import { Switch } from "@/components/ui/switch"

<Switch 
  checked={enabled}
  onCheckedChange={setEnabled}
/>
```

---

## Component Implementation Notes

### Design Tokens Usage

```typescript
// Using centralized design tokens
import { designTokens } from '@/utils/constants';

const buttonStyles = {
  backgroundColor: designTokens.colors.primary,
  color: 'white',
  padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`,
  borderRadius: designTokens.borderRadius.button,
  transition: `transform ${designTokens.animation.duration.fast} ${designTokens.animation.easing}`,
};
```

### Accessibility

- **ARIA labels** for icon-only buttons
- **Focus indicators** for all interactive elements
- **Keyboard navigation** support
- **Screen reader** compatibility
- **Reduced motion** preferences

### Performance

- **GPU acceleration** for animations
- **Virtual scrolling** for large lists
- **Debounced inputs** for search/filter
- **Lazy loading** for images
- **Code splitting** for heavy components

---

**Next:** [Interaction Patterns](./06-interaction-patterns.md)