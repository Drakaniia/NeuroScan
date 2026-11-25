# Visual Design System

**Session:** Colors, Typography & Visual Foundation  
**Status:** Draft v1  
**Date:** 2026-09-25  

---

## Color Palette

### Primary Colors (Medical Blue Theme)

| Color | Hex | Usage |
|-------|-----|-------|
| **Primary Blue** | `#0066CC` | Main actions, navigation highlights |
| **Secondary Blue** | `#004C99` | Hover states, active elements |
| **Light Blue** | `#E6F0FF` | Backgrounds, subtle highlights |
| **Dark Blue** | `#003366` | Text, headings, important information |

### Neutral Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **White** | `#FFFFFF` | Main backgrounds, cards |
| **Light Gray** | `#F5F5F5` | Alternative backgrounds |
| **Medium Gray** | `#CCCCCC` | Borders, dividers |
| **Dark Gray** | `#333333` | Body text, secondary information |

### Status Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **Success (No Tumor)** | `#28A745` | Green for negative results |
| **Warning (Low Confidence)** | `#FFC107` | Amber for borderline cases |
| **Danger (Tumor Detected)** | `#DC3545` | Red for positive results |
| **Info** | `#17A2B8` | Informational content |
| **Error** | `#DC3545` | Error states and failures |

### Heatmap Colormaps

- **Default:** Inferno (black-purple-orange-yellow)
- **Alternatives:** Viridis, Plasma, Magma, Coolwarm

### Color Contrast Validation

Current palette meets WCAG AA standards:
- Primary Blue on White: 5.4:1 ✓
- Dark Gray on White: 12.6:1 ✓
- White on Primary Blue: 5.4:1 ✓

---

## Typography

### Font Family

- **Primary:** Professional Sans-Serif (Helvetica, Arial, system-ui)
- **Headings:** Bold weight, 1.2-1.5x body size
- **Body:** Regular weight, 14-16px base size
- **Data/Metrics:** Monospace for numerical data

### Type Scale

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| **H1 (App Title)** | 24px | Bold | Dark Blue |
| **H2 (Screen Titles)** | 20px | Semibold | Dark Blue |
| **H3 (Card Titles)** | 18px | Semibold | Dark Blue |
| **Body (Primary)** | 16px | Regular | Dark Gray |
| **Body (Secondary)** | 14px | Regular | Medium Gray |
| **Caption/Labels** | 12px | Regular | Medium Gray |
| **Data/Metrics** | 14px | Monospace | Dark Gray |

### Apple Typography Guidelines

Following Apple's *The Details of UI Typography*:

#### Optical Sizing
- **Large display text:** Negative tracking (letters read too far apart as they grow)
- **Small text:** Slightly positive tracking for legibility
- **Never fixed letter-spacing** - Always size-specific

#### Leading (Line Height)
- **Tight on large headings** - Proportional to size
- **Looser on body copy** - Comfortable reading
- **Tighten for dense UI** - Information-heavy interfaces

#### Hierarchy Building
- **Weight + size + leading as a set** - Not size alone
- **Emphasize with weight** - Adds presence without space
- **Respect user text-size settings** - Scale layout with text (rem/em)

#### System Font Priority
- **Default to platform system font** - Ships optical sizing and legibility tuning
- **Override only with reason** - Custom faces must justify their presence

```css
:root { 
  font: 100%/1.5 system-ui, sans-serif; /* Body: system font, comfortable leading */
}

.display {
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1.05;        /* Tight leading for large text */
  letter-spacing: -0.02em;  /* Negative tracking as it grows */
  font-optical-sizing: auto;
}
```

---

## Icon Style

### Mixed Icon Approach

- **Navigation Icons:** Line icons (outline style) for sidebar/dashboard
- **Action Icons:** Solid icons for primary actions (export, save, etc.)
- **Status Icons:** Mixed style based on context (success, warning, error)

### Icon Library

**Recommended:** Lucide React or Heroicons
- Consistent, modern, medical-appropriate
- Well-maintained and accessible
- Both line and solid variants available

---

## Spacing & Layout

### Spacing Scale

| Size | Value | Usage |
|------|-------|-------|
| **XS** | 4px | Tight spacing, related elements |
| **SM** | 8px | Default element spacing |
| **MD** | 16px | Component spacing |
| **LG** | 24px | Section spacing |
| **XL** | 32px | Major section breaks |

### Grid System

- **Base Grid:** 8px grid for alignment
- **Container Max Width:** 1200px (matches Tauri config)
- **Card Padding:** 24px
- **Section Padding:** 32px

---

## Effects & Polish

### Shadows

| Element | Shadow Value |
|---------|--------------|
| **Card Shadow** | `0 2px 8px rgba(0,0,0,0.1)` |
| **Hover Shadow** | `0 4px 12px rgba(0,0,0,0.15)` |
| **Modal Shadow** | `0 8px 24px rgba(0,0,0,0.2)` |

### Border Radius

| Element | Radius |
|---------|--------|
| **Cards** | 8px |
| **Buttons** | 4px |
| **Inputs** | 4px |
| **Modals** | 8px |

### Animations (Subtle Polish)

Following Apple's spring physics principles:

| Animation Type | Duration | Easing |
|----------------|----------|--------|
| **Standard Transitions** | 200ms | ease-in-out |
| **Quick Interactions** | 150ms | ease-in-out |
| **Slow Transitions** | 300ms | ease-in-out |
| **Page Transitions** | 150ms | fade-in |

### Apple Motion Guidelines

#### Spring Physics Parameters
- **Default UI:** damping `1.0`, response `0.3-0.4s` (critically damped)
- **Momentum interactions:** damping `~0.8`, response `0.3-0.4s` (slight bounce)
- **Flick gestures:** Project momentum with exponential decay

#### Performance
- **GPU Acceleration:** Animate only `transform` and `opacity`
- **Reduced Motion:** Respect `prefers-reduced-motion` preference
- **Battery Awareness:** Reduce animations on battery power

---

## Materials & Depth

### Translucent Layers

Following Apple's materials approach:

```css
.toolbar {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid rgba(255, 255, 255, 0.4);
}
```

### Material Hierarchy

- **Darker/heavier materials** - Separate structural regions (sidebars)
- **Lighter materials** - Draw attention to interactive elements (buttons)
- **Never stack light on light** - Legibility collapses
- **Bigger surfaces = thicker** - Stronger blur + deeper shadow

### Accessibility Preferences

```css
@media (prefers-reduced-transparency: reduce) {
  .toolbar { 
    background: white; 
    backdrop-filter: none; 
  }
}
```

---

## Design Tokens Implementation

```typescript
// utils/constants.ts
export const designTokens = {
  colors: {
    primary: '#0066CC',
    secondary: '#004C99',
    lightBlue: '#E6F0FF',
    darkBlue: '#003366',
    white: '#FFFFFF',
    lightGray: '#F5F5F5',
    mediumGray: '#CCCCCC',
    darkGray: '#333333',
    success: '#28A745',
    warning: '#FFC107',
    danger: '#DC3545',
    info: '#17A2B8',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  typography: {
    fontFamily: 'Helvetica, Arial, system-ui',
    h1: { fontSize: '24px', fontWeight: 'bold', color: '#003366' },
    h2: { fontSize: '20px', fontWeight: 'semibold', color: '#003366' },
    h3: { fontSize: '18px', fontWeight: 'semibold', color: '#003366' },
    body: { fontSize: '16px', fontWeight: 'regular', color: '#333333' },
    bodySecondary: { fontSize: '14px', fontWeight: 'regular', color: '#CCCCCC' },
    caption: { fontSize: '12px', fontWeight: 'regular', color: '#CCCCCC' },
    data: { fontSize: '14px', fontFamily: 'monospace', color: '#333333' },
  },
  animation: {
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
    },
    easing: 'ease-in-out',
  },
  shadows: {
    card: '0 2px 8px rgba(0,0,0,0.1)',
    hover: '0 4px 12px rgba(0,0,0,0.15)',
    modal: '0 8px 24px rgba(0,0,0,0.2)',
  },
  borderRadius: {
    card: '8px',
    button: '4px',
    input: '4px',
    modal: '8px',
  },
};
```

---

**Next:** [Navigation & Layout](./03-navigation-layout.md)