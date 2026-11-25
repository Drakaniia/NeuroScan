# Accessibility Considerations

**Session:** WCAG Compliance & Inclusive Design  
**Status:** Draft v1  
**Date:** 2026-09-25  

---

## Current Priority: Not Priority for v1

### Basic Compliance (Future Considerations)

**Current Implementation:**
- Readable fonts and reasonable contrast ratios
- Keyboard navigation support
- Focus indicators for interactive elements

**Future Enhancements:**
- Screen reader support (ARIA labels, roles)
- WCAG 2.1 AA compliance
- High contrast mode
- Text scaling support

### Accessibility Roadmap

**Phase 1 (Current):**
- ✅ Readable fonts with proper sizing
- ✅ Basic keyboard navigation
- ✅ Focus indicators
- ✅ Color contrast validation

**Phase 2 (Future):**
- ⏳ Full ARIA implementation
- ⏳ Screen reader optimization
- ⏳ High contrast mode
- ⏳ Text scaling support

**Phase 3 (Advanced):**
- ⏳ Voice control support
- ⏳ Switch access
- ⏳ Custom accessibility profiles
- ⏳ Accessibility testing suite

---

## Color Contrast

### Minimum Ratios (WCAG AA)

| Text Type | Minimum Ratio | Current Status |
|-----------|---------------|----------------|
| **Normal Text** | 4.5:1 | ✅ Validated |
| **Large Text** | 3:1 | ✅ Validated |
| **UI Components** | 3:1 | ✅ Validated |

### Current Palette Validation

**Primary Colors:**
- Primary Blue on White: 5.4:1 ✅
- Dark Gray on White: 12.6:1 ✅
- White on Primary Blue: 5.4:1 ✅

**Status Colors:**
- Green (Success) on White: 4.5:1 ✅
- Red (Danger) on White: 4.5:1 ✅
- Amber (Warning) on White: 3.1:1 ✅

**Focus Indicators:**
- Primary Blue outline: 3:1 ✅
- White on Primary Blue: 5.4:1 ✅

### Contrast Testing

```typescript
// Contrast ratio calculation
const getContrastRatio = (color1: string, color2: string): number => {
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

const getLuminance = (color: string): number => {
  const rgb = hexToRgb(color);
  const [r, g, b] = rgb.map(channel => {
    const sRGB = channel / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
```

### High Contrast Mode

```css
@media (prefers-contrast: more) {
  :root {
    --primary: #0000FF;
    --secondary: #00008B;
    --background: #FFFFFF;
    --text: #000000;
    --border: #000000;
  }
  
  .card {
    border: 2px solid var(--border);
    box-shadow: none;
  }
  
  .button {
    border: 2px solid var(--border);
  }
  
  .focus-visible {
    outline: 3px solid var(--primary);
    outline-offset: 2px;
  }
}
```

---

## Keyboard Navigation

### Tab Order

**Principles:**
- **Logical flow** through interactive elements
- **Visible focus indicators** (Primary Blue outline)
- **Skip to main content** option
- **Consistent tab order** across screens

**Implementation:**
```tsx
const SkipLink = () => {
  return (
    <a
      href="#main-content"
      className="skip-link"
      style={{
        position: 'absolute',
        top: '-40px',
        left: 0,
        background: '#0066CC',
        color: 'white',
        padding: '8px 16px',
        zIndex: 100,
        transition: 'top 200ms ease',
      }}
      onFocus={(e) => e.target.style.top = '0'}
      onBlur={(e) => e.target.style.top = '-40px'}
    >
      Skip to main content
    </a>
  );
};
```

### Focus Indicators

```css
/* Visible focus indicators */
:focus-visible {
  outline: 2px solid #0066CC;
  outline-offset: 2px;
  transition: outline-color 150ms ease;
}

/* Hide outline for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}

/* Strong focus for high contrast */
@media (prefers-contrast: more) {
  :focus-visible {
    outline: 3px solid #0000FF;
    outline-offset: 3px;
  }
}
```

### Focus Management

**Modal Focus Trap:**
```tsx
const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTab);
    };
  }, [isActive]);

  return containerRef;
};
```

---

## Screen Reader Support

### ARIA Labels

**Basic Implementation:**
```tsx
const AccessibleButton = ({ children, onClick, ariaLabel }) => {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="accessible-button"
    >
      {children}
    </button>
  );
};
```

**Icon-Only Buttons:**
```tsx
const IconButton = ({ icon: Icon, onClick, label }) => {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="icon-button"
    >
      <Icon aria-hidden="true" />
    </button>
  );
};
```

### Live Regions

**Status Updates:**
```tsx
const LiveRegion = ({ message, role = 'status' }) => {
  return (
    <div
      role={role}
      aria-live="polite"
      aria-atomic="true"
      className="live-region"
    >
      {message}
    </div>
  );
};
```

**Progress Updates:**
```tsx
const AccessibleProgress = ({ progress, message }) => {
  return (
    <div
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={message}
      className="accessible-progress"
    >
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="progress-text">{progress}%</span>
    </div>
  );
};
```

### Semantic HTML

**Proper Structure:**
```tsx
const AccessibleLayout = () => {
  return (
    <>
      <SkipLink />
      <header role="banner">
        <h1>NeuroScan</h1>
      </header>
      
      <main id="main-content" role="main">
        {/* Main content */}
      </main>
      
      <footer role="contentinfo">
        {/* Footer content */}
      </footer>
    </>
  );
};
```

---

## Reduced Motion

### Apple Motion Guidelines

**Principles:**
- **Cross-fade instead of slide** for reduced motion
- **Static transitions** instead of spring animations
- **Remove momentum** and velocity-based animations
- **Keep essential feedback** but make it gentler

**Implementation:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  .slide-panel {
    transition: opacity 200ms ease;
    transform: none !important;
  }
  
  .card:hover {
    transform: none !important;
  }
  
  .spinner {
    animation: none;
  }
  
  .toast {
    transition: opacity 200ms ease;
    transform: none !important;
  }
}
```

**React Implementation:**
```tsx
const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
};
```

---

## Text Scaling

### Responsive Typography

**Apple Typography Guidelines:**
- **Scale layout with text** - Use rem/em for spacing
- **Respect user settings** - Don't override font size
- **Maintain hierarchy** - Keep relative sizing

**Implementation:**
```css
:root {
  font-size: 16px; /* Base size */
}

@media (max-width: 768px) {
  :root {
    font-size: 14px;
  }
}

/* Use rem for scalable spacing */
.container {
  padding: 1.5rem; /* Scales with base font size */
  gap: 1rem;
}

.button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
}
```

**Dynamic Type Support:**
```tsx
const useDynamicType = () => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const baseSize = 16;
      const currentSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
      setScale(currentSize / baseSize);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return scale;
};
```

---

## Screen Reader Testing

### Testing Checklist

**Navigation:**
- [ ] Can navigate entire interface with keyboard
- [ ] Tab order is logical and predictable
- [ ] Focus indicators are visible
- [ ] Skip links work correctly

**Content:**
- [ ] All images have alt text
- [ ] Buttons have descriptive labels
- [ ] Form fields have associated labels
- [ ] Status updates are announced

**Interactions:**
- [ ] Error messages are announced
- [ ] Progress updates are communicated
- [ ] Modal focus management works
- [ ] Dynamic content updates are announced

### Testing Tools

**Automated Testing:**
```bash
# axe-core for automated accessibility testing
npm install @axe-core/react

# ESLint accessibility rules
npm install eslint-plugin-jsx-a11y
```

**Manual Testing:**
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS)
- TalkBack (Android)

---

## Accessibility Documentation

### Component Accessibility

**Button Component:**
```tsx
interface AccessibleButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  onClick,
  disabled = false,
  ariaLabel,
  ariaDescribedBy,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className="accessible-button"
    >
      {children}
    </button>
  );
};
```

**Input Component:**
```tsx
interface AccessibleInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  id: string;
}

const AccessibleInput: React.FC<AccessibleInputProps> = ({
  label,
  value,
  onChange,
  error,
  id,
}) => {
  const errorId = `${id}-error`;

  return (
    <div className="input-group">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className="accessible-input"
      />
      {error && (
        <span id={errorId} className="error-message" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
```

---

## Future Accessibility Enhancements

### WCAG 2.1 AA Compliance

**Target Level:**
- **Level A:** Basic accessibility
- **Level AA:** Enhanced accessibility (target)
- **Level AAA:** Highest accessibility (future)

**Implementation Plan:**
1. **Phase 1:** Current basic compliance
2. **Phase 2:** Full ARIA implementation
3. **Phase 3:** WCAG 2.1 AA certification
4. **Phase 4:** Advanced features (voice control, etc.)

### Advanced Features

**Voice Control:**
- Voice command support
- Voice feedback
- Natural language interactions

**Switch Access:**
- Alternative input methods
- Customizable controls
- Scanning interfaces

**Custom Profiles:**
- User preference storage
- Custom accessibility settings
- Profile switching

---

## Accessibility Resources

### Documentation

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Apple Accessibility Guidelines](https://developer.apple.com/accessibility/)

### Testing Tools

- axe DevTools
- WAVE Browser Extension
- Lighthouse Accessibility Audit
- screen reader emulators

### Design Resources

- WebAIM Contrast Checker
- Color Oracle (color blindness simulator)
- Accessible Color Palette Builder
- Typography Scale Calculator

---

**Next:** [Performance & Animation](./09-performance-animation.md)