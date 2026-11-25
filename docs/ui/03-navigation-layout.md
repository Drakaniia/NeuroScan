# Navigation & Layout

**Session:** Screen Structure & Navigation Patterns  
**Status:** Draft v1  
**Date:** 2026-09-25  

---

## Overall Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Header: NeuroScan Logo + Window Controls                │
├─────────────────────────────────────────────────────────┤
│ Main Content Area (Dashboard or Specific Screen)        │
│                                                         │
│ [ Screen-Specific Content ]                             │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Footer: Status Bar + Optional Quick Actions             │
└─────────────────────────────────────────────────────────┘
```

### Layout Principles

Following Apple's spatial consistency principles:

- **Enter/exit along same path** - Panels follow predictable motion paths
- **Anchor to source** - Navigation originates from triggering elements
- **Mirror easing on reversals** - Return paths match entry timing
- **Material depth** - Translucent layers with backdrop blur

---

## Navigation Pattern: Card-Based Dashboard

### Home Screen Layout

- **4 Equal Cards** in a 2x2 grid
- Each card represents a major workflow
- Cards have consistent size and visual weight
- Hover effects indicate interactivity

### Dashboard Cards

| Card | Icon Style | Title | Description |
|------|------------|-------|-------------|
| **Single Screening** | Line icon | Single Screening | Analyze individual MRI scans |
| **Batch Processing** | Line icon | Batch Processing | Process entire folders of scans |
| **View History** | Line icon | View History | Browse past screening results |
| **About/Help** | Line icon | About & Help | App information and documentation |

### Card Design Specifications

- **Background:** White with subtle shadow
- **Hover:** Lift effect + stronger shadow
- **Content:** Icon + Title + Brief description
- **Size:** 280x200px (minimum), flexible with container
- **Cursor:** Pointer for interactive cards
- **Transition:** 200ms ease-in-out (critically damped spring)
- **Active State:** Slight scale down on press

### Apple Motion for Cards

```css
.card {
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.card:active {
  transform: translateY(-2px) scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .card {
    transition: opacity 200ms ease;
    transform: none !important;
  }
}
```

---

## Screen Hierarchy

### Navigation Flow

```
Dashboard (Home)
├── Single Screening
├── Batch Processing
├── History View
└── About/Help
```

### Back Navigation

- **Consistent "Back to Dashboard" button** in each screen
- **Keyboard shortcut:** Escape or Ctrl+H
- **Breadcrumb navigation** in header
- **Spatial consistency:** Return path matches entry path

### Apple Navigation Principles

- **Wayfinding** - Every screen answers: Where am I? Where can I go? What's there? How do I get out?
- **Never trap the user** - Always provide clear exit paths
- **Direct, specific labels** - "History" not "Home", "Single Screening" not "Analyze"
- **Predictable placement** - Back button always in same position

---

## Responsive Layout Behavior

### Window Resizing (Fluid Layout)

| Window Size | Layout Adaptation |
|-------------|-------------------|
| **Minimum:** 800x600px | Base constraint |
| **Preferred:** 1200x800px | Optimal experience |
| **Maximum:** No limit | Maximize to screen |

### Layout Adaptations

- **Narrow Windows (< 1000px):** Stack split views vertically
- **Very Narrow (< 800px):** Hide secondary panels, show drawer
- **Short Windows (< 600px):** Enable scrolling, compact headers

### Dashboard Grid Scaling

| Width | Grid Layout |
|-------|-------------|
| **Wide** | 4 columns, 1 row |
| **Medium** | 2 columns, 2 rows |
| **Narrow** | 1 column, 4 rows (scrollable) |

### Batch Split View Scaling

| Width | Split Ratio |
|-------|-------------|
| **Wide** | 60/40 split (table/preview) |
| **Narrow** | 50/50 split |
| **Very Narrow** | Stacked (table top, preview bottom) |

---

## Material Layers & Depth

### Header/Toolbar

```css
.header {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 10;
}
```

### Floating Panels

```css
.floating-panel {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  border-radius: 8px;
}
```

### Modal/Sheet Materials

```css
.modal {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(24px);
  box-shadow: 0 16px 48px rgba(0,0,0,0.25);
}

.modal-backdrop {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}
```

### Accessibility: Reduced Transparency

```css
@media (prefers-reduced-transparency: reduce) {
  .header { background: white; backdrop-filter: none; }
  .floating-panel { background: white; backdrop-filter: none; }
  .modal { background: white; backdrop-filter: none; }
}
```

---

## Layout Components

### Header Structure

```tsx
<header className="header">
  <div className="header-content">
    <button className="back-button">
      <ArrowLeftIcon />
    </button>
    <h1 className="screen-title">Screen Title</h1>
    <div className="window-controls">
      {/* Tauri window controls */}
    </div>
  </div>
</header>
```

### Footer Structure

```tsx
<footer className="footer">
  <div className="status-bar">
    <span className="status-text">Ready</span>
  </div>
  <div className="quick-actions">
    {/* Optional quick action buttons */}
  </div>
</footer>
```

### Main Content Area

```tsx
<main className="main-content">
  {/* Screen-specific content */}
</main>
```

---

## Keyboard Navigation

### Tab Order

- Logical flow through interactive elements
- Visible focus indicators (Primary Blue outline)
- Skip to main content option

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open file/folder |
| `Ctrl+N` | New screening |
| `Ctrl+H` | Go to history |
| `Ctrl+E` | Export |
| `Escape` | Cancel/Go back |
| `Ctrl+Q` | Quit application |
| `F1` | Open help |
| `Ctrl+F` | Search in history |
| `Ctrl+Shift+C` | Clear history |
| `Space` | Toggle heatmap in single view |

### Focus Indicators

```css
:focus-visible {
  outline: 2px solid #0066CC;
  outline-offset: 2px;
}

:focus:not(:focus-visible) {
  outline: none;
}
```

---

## Animation Timing

### Transition Durations

| Transition Type | Duration | Spring Parameters |
|----------------|----------|-------------------|
| **Card hover** | 200ms | damping 1.0, response 0.3s |
| **Panel slide** | 200ms | damping 1.0, response 0.3s |
| **Page transition** | 150ms | cross-fade (reduced motion) |
| **Modal open** | 300ms | damping 0.8, response 0.4s |
| **Modal close** | 200ms | damping 1.0, response 0.3s |

### Panel Slide Animation

```tsx
// Using spring physics for panel slides
import { animate } from 'motion';

const slidePanel = (panel: HTMLElement, direction: 'in' | 'out') => {
  const target = direction === 'in' ? 0 : 300; // 300px off-screen
  
  animate(panel, { 
    x: target 
  }, { 
    type: 'spring',
    damping: 1.0,
    stiffness: 300,
    mass: 0.8
  });
};
```

---

## Layout Implementation Notes

### Container Constraints

```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.grid {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(2, 1fr);
}

@media (min-width: 1200px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 800px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

### Scroll Behavior

```css
.main-content {
  overflow-y: auto;
  scroll-behavior: smooth;
}

/* Custom scrollbar for consistent feel */
.main-content::-webkit-scrollbar {
  width: 8px;
}

.main-content::-webkit-scrollbar-track {
  background: #F5F5F5;
}

.main-content::-webkit-scrollbar-thumb {
  background: #CCCCCC;
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: #0066CC;
}
```

---

**Next:** [Screen Specifications](./04-screen-specifications.md)