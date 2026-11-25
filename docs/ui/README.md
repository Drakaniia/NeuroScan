# NeuroScan UI/UX Documentation

**Comprehensive design documentation for the NeuroScan desktop application, organized by session for focused development work.**

---

## Documentation Structure

This documentation is organized into 12 comprehensive sessions, each covering a specific aspect of the UI/UX design system:

### 📋 Session Overview

| Session | Document | Focus |
|---------|----------|-------|
| **01** | [Design Overview](./01-design-overview.md) | Design philosophy, Apple design foundations, motion principles |
| **02** | [Visual Design System](./02-visual-design-system.md) | Colors, typography, spacing, effects, materials |
| **03** | [Navigation & Layout](./03-navigation-layout.md) | Screen structure, navigation patterns, responsive behavior |
| **04** | [Screen Specifications](./04-screen-specifications.md) | Detailed screen layouts, component specifications |
| **05** | [Component Specifications](./05-component-specifications.md) | UI components, beUI integration, composition rules |
| **06** | [Interaction Patterns](./06-interaction-patterns.md) | User interactions, gesture design, keyboard navigation |
| **07** | [Error Handling & Feedback](./07-error-handling-feedback.md) | Error states, loading states, success feedback |
| **08** | [Accessibility](./08-accessibility.md) | WCAG compliance, screen reader support, reduced motion |
| **09** | [Performance & Animation](./09-performance-animation.md) | Animation guidelines, performance optimization |
| **10** | [Technical Implementation](./10-technical-implementation.md) | Component library, state management, file structure |
| **11** | [Future Enhancements](./11-future-enhancements.md) | v2+ features, extensibility points, roadmap |
| **12** | [Design Validation](./12-design-validation.md) | Testing checklists, review questions, success criteria |

---

## Design Philosophy

NeuroScan follows a **Clean Clinical aesthetic** designed for medical screening applications, built on Apple's design foundations:

### Core Principles

1. **Clinical First** - Medical blue palette, clean lines, professional typography
2. **Workflow-Centric** - Card-based dashboard focusing on core tasks
3. **Data-Rich** - Detailed metrics and comprehensive information display
4. **Forgiving** - Clear error handling with non-blocking notifications
5. **Efficient** - Comprehensive keyboard shortcuts for power users

### Apple Design Integration

Following Apple's *Designing Fluid Interfaces* principles:

- **Response** - Zero latency with instant feedback on pointer-down
- **Direct Manipulation** - 1:1 tracking with gesture velocity
- **Interruptibility** - Every animation reversible and redirectable
- **Spring Physics** - Natural motion with damping and response parameters
- **Spatial Consistency** - Predictable paths and anchored origins
- **Reduced Motion** - Gentle alternatives for vestibular issues

---

## Component Strategy

### Recommended Stack

**UI Components:**
- **Radix UI** - Accessible primitives
- **shadcn/ui** - Styled components built on Radix
- **beUI (@beui)** - Animated components for motion UI

**Icons:**
- **Lucide React** - Consistent, modern, medical-appropriate

**Styling:**
- **Tailwind CSS** - Utility-first styling

**Animations:**
- **Framer Motion** - Subtle polish and spring physics
- **Motion** - Apple-style spring animations

### beUI Integration

Using beUI for motion-rich components:

| Component Need | beUI Install Slug |
|----------------|-------------------|
| Toast notifications | `animated-toast-stack` |
| Side panel/drawer | `drawer` |
| Bottom sheet | `bottom-sheet` |
| Popover | `popover` |
| Dropdown select | `select` |
| Searchable select | `combobox` |
| Button with states | `button-stateful` |
| Loader/spinner | `loader` |
| Range slider | `range-slider` |
| Tooltip | `tooltip` |

---

## Key Design Tokens

### Colors

**Primary (Medical Blue):**
- Primary Blue: `#0066CC`
- Secondary Blue: `#004C99`
- Light Blue: `#E6F0FF`
- Dark Blue: `#003366`

**Status Colors:**
- Success: `#28A745`
- Warning: `#FFC107`
- Danger: `#DC3545`
- Info: `#17A2B8`

### Typography

**Font Family:** System sans-serif (Helvetica, Arial, system-ui)

**Type Scale:**
- H1: 24px, Bold
- H2: 20px, Semibold
- H3: 18px, Semibold
- Body: 16px, Regular
- Caption: 12px, Regular

### Spacing

**8px Grid System:**
- XS: 4px
- SM: 8px
- MD: 16px
- LG: 24px
- XL: 32px

### Animation

**Spring Parameters:**
- Default UI: damping 1.0, response 0.3s
- Momentum: damping 0.8, response 0.3s
- Modal: damping 0.7, response 0.4s

---

## Getting Started

### For Developers

1. **Start with Design Overview** - Read [01-design-overview.md](./01-design-overview.md) to understand the philosophy
2. **Review Visual System** - Check [02-visual-design-system.md](./02-visual-design-system.md) for design tokens
3. **Study Screens** - Examine [04-screen-specifications.md](./04-screen-specifications.md) for layout details
4. **Implement Components** - Use [05-component-specifications.md](./05-component-specifications.md) for component guidance
5. **Follow Technical Notes** - Reference [10-technical-implementation.md](./10-technical-implementation.md) for implementation

### For Designers

1. **Understand Philosophy** - Review Apple design principles in [01-design-overview.md](./01-design-overview.md)
2. **Study Visual System** - Learn color palette and typography in [02-visual-design-system.md](./02-visual-design-system.md)
3. **Review Screens** - Examine screen layouts in [04-screen-specifications.md](./04-screen-specifications.md)
4. **Check Interactions** - Study interaction patterns in [06-interaction-patterns.md](./06-interaction-patterns.md)
5. **Validate Design** - Use testing checklists in [12-design-validation.md](./12-design-validation.md)

### For QA/Testers

1. **Review Test Plans** - Check [12-design-validation.md](./12-design-validation.md) for comprehensive testing
2. **Understand Requirements** - Study screen specifications in [04-screen-specifications.md](./04-screen-specifications.md)
3. **Test Interactions** - Verify interaction patterns from [06-interaction-patterns.md](./06-interaction-patterns.md)
4. **Check Accessibility** - Validate WCAG compliance using [08-accessibility.md](./08-accessibility.md)
5. **Test Performance** - Verify performance guidelines from [09-performance-animation.md](./09-performance-animation.md)

---

## Implementation Status

### Current Phase (v1)

**Completed:**
- ✅ Design system foundation
- ✅ Core screen layouts
- ✅ Basic component library
- ✅ Navigation patterns
- ✅ Basic accessibility

**In Progress:**
- 🔄 Component implementation
- 🔄 State management setup
- 🔄 Animation integration
- 🔄 Error handling

**Planned:**
- ⏳ Advanced features (v2+)
- ⏳ Enhanced accessibility
- ⏳ Performance optimization
- ⏳ Plugin architecture

---

## Contributing

When contributing to the UI/UX documentation:

1. **Maintain Consistency** - Follow the established structure and formatting
2. **Update Related Sections** - Changes in one area may affect others
3. **Add Examples** - Include code examples for clarity
4. **Reference Guidelines** - Cite Apple design principles and beUI components
5. **Test Validations** - Ensure changes pass validation checklists

---

## Resources

### Design References

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Apple Designing Fluid Interfaces (WWDC 2018)](https://developer.apple.com/videos/play/wwdc2018/803/)
- [beUI Documentation](https://beui.dev/docs)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)

### Accessibility References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Performance References

- [Web.dev Performance](https://web.dev/performance/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Framer Motion](https://www.framer.com/motion/)

---

## Quick Reference

### Common Patterns

**Button with Apple-style press feedback:**
```tsx
<button
  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
>
  Click me
</button>
```

**Spring animation:**
```tsx
import { animate } from 'motion';

animate(element, { x: 0 }, { 
  type: 'spring', 
  damping: 1.0, 
  stiffness: 300 
});
```

**Reduced motion check:**
```tsx
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

---

**Document Version:** v1.0  
**Last Updated:** 2026-09-25  
**Maintained By:** NeuroScan Design Team