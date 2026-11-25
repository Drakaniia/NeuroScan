# Technical Implementation Notes

**Session:** Component Library & Architecture  
**Status:** Draft v1  
**Date:** 2026-09-25  

---

## Component Library

### Recommended Stack

**UI Components:**
- **Radix UI** - Accessible primitives (dialogs, dropdowns, etc.)
- **shadcn/ui** - Styled components built on Radix
- **beUI (@beui)** - Animated components for motion UI

**Icons:**
- **Lucide React** - Consistent, modern, medical-appropriate

**Styling:**
- **Tailwind CSS** - Utility-first styling (already in project)

**Animations:**
- **Framer Motion** - Subtle polish and spring physics
- **Motion** - Apple-style spring animations

### Installation Commands

```bash
# Core UI components
bun add @radix-ui/react-dialog
bun add @radix-ui/react-dropdown-menu
bun add @radix-ui/react-select
bun add @radix-ui/react-slider
bun add @radix-ui/react-tabs
bun add @radix-ui/react-toast

# Icons
bun add lucide-react

# Animation
bun add framer-motion
bun add motion

# beUI components (selective)
bunx --bun shadcn@latest add @beui/animated-toast-stack
bunx --bun shadcn@latest add @beui/drawer
bunx --bun shadcn@latest add @beui/range-slider
bunx --bun shadcn@latest add @beui/loader
```

### Component Architecture

```
apps/desktop/src/
├── components/
│   ├── ui/              # Reusable UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── screens/         # Screen-specific components
│   ├── dashboard/       # Dashboard components
│   │   ├── DashboardCard.tsx
│   │   └── DashboardGrid.tsx
│   ├── single/          # Single screening components
│   │   ├── ImageDisplay.tsx
│   │   ├── FloatingControls.tsx
│   │   ├── ResultsPanel.tsx
│   │   └── HeatmapPanel.tsx
│   ├── batch/           # Batch processing components
│   │   ├── ResultsTable.tsx
│   │   ├── ImagePreview.tsx
│   │   └── ProgressDisplay.tsx
│   ├── history/         # History view components
│   │   ├── HistoryTable.tsx
│   │   ├── FilterBar.tsx
│   │   └── ExportDialog.tsx
│   └── about/           # About/Help components
│       ├── AppInfoCard.tsx
│       ├── DisclaimerCard.tsx
│       └── HelpCard.tsx
├── layouts/
│   ├── DashboardLayout.tsx
│   └── ScreenLayout.tsx
├── hooks/
│   ├── useKeyboardShortcuts.ts
│   ├── useImageLoading.ts
│   ├── useHeatmapControls.ts
│   └── useReducedMotion.ts
├── utils/
│   ├── constants.ts     # Design tokens
│   ├── cn.ts            # Classname utility
│   └── animation.ts      # Animation helpers
└── routes/
    ├── index.tsx        # Dashboard
    ├── single.tsx       # Single screening
    ├── batch.tsx        # Batch processing
    ├── history.tsx      # History view
    └── about.tsx        # About/Help
```

---

## State Management

### Local State

**Component State:**
```tsx
import { useState, useReducer } from 'react';

const ImageDisplay = () => {
  const [image, setImage] = useState<File | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [opacity, setOpacity] = useState(75);
  const [zoom, setZoom] = useState(1);
  
  // Complex state with useReducer
  const [imageState, dispatch] = useReducer(imageReducer, initialState);
  
  return (
    // Component JSX
  );
};
```

### Global State

**TanStack Query for Server State:**
```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const useScreeningHistory = () => {
  return useQuery({
    queryKey: ['screening-history'],
    queryFn: fetchScreeningHistory,
  });
};

const useAddToHistory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: addToHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening-history'] });
    },
  });
};
```

### History Persistence

**Tauri Commands for Disk Operations:**
```typescript
// Tauri commands (src-tauri/src/commands.rs)
#[tauri::command]
async fn save_to_history(entry: HistoryEntry) -> Result<(), String> {
    // Save to local storage
    Ok(())
}

#[tauri::command]
async fn load_history() -> Result<Vec<HistoryEntry>, String> {
    // Load from local storage
    Ok(vec![])
}

#[tauri::command]
async fn clear_history() -> Result<(), String> {
    // Clear history
    Ok(())
}
```

**React Integration:**
```tsx
import { invoke } from '@tauri-apps/api/tauri';

const useHistoryPersistence = () => {
  const saveToHistory = async (entry: HistoryEntry) => {
    await invoke('save_to_history', { entry });
  };

  const loadHistory = async () => {
    return await invoke('load_history');
  };

  const clearHistory = async () => {
    await invoke('clear_history');
  };

  return { saveToHistory, loadHistory, clearHistory };
};
```

---

## File Structure

### Component Organization

**UI Components (Shared):**
```tsx
// components/ui/button.tsx
import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'button',
          `button-${variant}`,
          `button-${size}`,
          className
        )}
        {...props}
      />
    );
  }
);
```

**Screen Components:**
```tsx
// components/single/ImageDisplay.tsx
import { Button } from '@/components/ui/button';
import { useImageLoading } from '@/hooks/useImageLoading';

export const ImageDisplay = ({ src, onImageLoad }) => {
  const { isLoading, error } = useImageLoading(src);
  
  return (
    <div className="image-display">
      {isLoading && <Loader />}
      {error && <ErrorOverlay error={error} />}
      {!isLoading && !error && <img src={src} alt="MRI scan" />}
    </div>
  );
};
```

### Layout Components

**Dashboard Layout:**
```tsx
// layouts/DashboardLayout.tsx
export const DashboardLayout = ({ children }) => {
  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <h1>NeuroScan</h1>
        <WindowControls />
      </header>
      
      <main className="dashboard-main">
        {children}
      </main>
      
      <footer className="dashboard-footer">
        <StatusBar />
      </footer>
    </div>
  );
};
```

**Screen Layout:**
```tsx
// layouts/ScreenLayout.tsx
interface ScreenLayoutProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}

export const ScreenLayout = ({ title, onBack, children }) => {
  return (
    <div className="screen-layout">
      <header className="screen-header">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeftIcon />
        </Button>
        <h2>{title}</h2>
        <WindowControls />
      </header>
      
      <main className="screen-main">
        {children}
      </main>
    </div>
  );
};
```

---

## Custom Hooks

### Keyboard Shortcuts

```tsx
// hooks/useKeyboardShortcuts.ts
export const useKeyboardShortcuts = (shortcuts: Record<string, () => void>) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const combo = [
        e.ctrlKey && 'ctrl',
        e.shiftKey && 'shift',
        e.altKey && 'alt',
        key,
      ].filter(Boolean).join('+');

      if (shortcuts[combo]) {
        e.preventDefault();
        shortcuts[combo]();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

// Usage
const shortcuts = {
  'ctrl+o': () => openFileDialog(),
  'ctrl+n': () => startNewScreening(),
  'escape': () => goBack(),
};

useKeyboardShortcuts(shortcuts);
```

### Image Loading

```tsx
// hooks/useImageLoading.ts
export const useImageLoading = (src: string | null) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const img = new Image();
    img.onload = () => {
      setIsLoading(false);
    };
    img.onerror = () => {
      setError('Failed to load image');
      setIsLoading(false);
    };
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return { isLoading, error };
};
```

### Heatmap Controls

```tsx
// hooks/useHeatmapControls.ts
export const useHeatmapControls = () => {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [opacity, setOpacity] = useState(75);
  const [colormap, setColormap] = useState('inferno');
  const [intensityMin, setIntensityMin] = useState(0);
  const [intensityMax, setIntensityMax] = useState(100);

  const toggleHeatmap = () => {
    setShowHeatmap(prev => !prev);
  };

  const updateOpacity = (value: number) => {
    setOpacity(value);
  };

  const updateColormap = (value: string) => {
    setColormap(value);
  };

  const updateIntensity = (min: number, max: number) => {
    setIntensityMin(min);
    setIntensityMax(max);
  };

  return {
    showHeatmap,
    opacity,
    colormap,
    intensityMin,
    intensityMax,
    toggleHeatmap,
    updateOpacity,
    updateColormap,
    updateIntensity,
  };
};
```

### Reduced Motion

```tsx
// hooks/useReducedMotion.ts
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
};
```

---

## Utility Functions

### Classname Utility

```typescript
// utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Animation Helpers

```typescript
// utils/animation.ts
import { animate, type AnimationOptions } from 'motion';

export const springAnimation = (element: HTMLElement, to: any, options?: AnimationOptions) => {
  return animate(element, to, {
    type: 'spring',
    damping: 1.0,
    stiffness: 300,
    mass: 0.8,
    ...options,
  });
};

export const momentumAnimation = (element: HTMLElement, to: any, velocity?: number) => {
  return animate(element, to, {
    type: 'spring',
    damping: 0.8,
    stiffness: 300,
    mass: 0.8,
    velocity,
  });
};

export const projectMomentum = (velocity: number, decelerationRate = 0.998): number => {
  return (velocity / 1000) * decelerationRate / (1 - decelerationRate);
};
```

### Design Tokens

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

## Routing Implementation

### TanStack Router Setup

```typescript
// routes/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { DashboardLayout } from '@/layouts/DashboardLayout';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <DashboardLayout>
      <DashboardGrid />
    </DashboardLayout>
  );
}
```

```typescript
// routes/single.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ScreenLayout } from '@/layouts/ScreenLayout';
import { ImageDisplay } from '@/components/single/ImageDisplay';

export const Route = createFileRoute('/single')({
  component: SingleScreen,
});

function SingleScreen() {
  const navigate = useNavigate();

  return (
    <ScreenLayout 
      title="Single Screening" 
      onBack={() => navigate({ to: '/' })}
    >
      <ImageDisplay />
    </ScreenLayout>
  );
}
```

---

## Type Definitions

### Component Props

```typescript
// types/components.ts
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  success?: boolean;
}

export interface CardProps {
  children: React.ReactNode;
  interactive?: boolean;
  onClick?: () => void;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
```

### Data Types

```typescript
// types/data.ts
export interface ScreeningResult {
  id: string;
  filename: string;
  verdict: 'tumor' | 'no-tumor' | 'low-confidence';
  probability: number;
  confidence: number;
  processingTime: number;
  timestamp: Date;
  imagePath: string;
  heatmapPath?: string;
}

export interface HistoryEntry extends ScreeningResult {
  modelVersion: string;
  threshold: number;
}

export interface BatchProgress {
  total: number;
  processed: number;
  errors: number;
  currentFile: string;
  elapsedTime: number;
  estimatedRemaining: number;
}
```

---

## Testing Strategy

### Component Testing

```tsx
// components/__tests__/Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies correct variant classes', () => {
    const { container } = render(<Button variant="primary">Primary</Button>);
    expect(container.firstChild).toHaveClass('button-primary');
  });

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Integration Testing

```tsx
// screens/__tests__/SingleScreen.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SingleScreen } from '../single';

describe('SingleScreen', () => {
  it('navigates back on button click', () => {
    const mockNavigate = vi.fn();
    render(<SingleScreen onBack={mockNavigate} />);
    
    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);
    
    expect(mockNavigate).toHaveBeenCalled();
  });
});
```

---

## Build Configuration

### Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0066CC',
        secondary: '#004C99',
        'light-blue': '#E6F0FF',
        'dark-blue': '#003366',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-in',
        'slide-up': 'slideUp 200ms ease-out',
        'slide-down': 'slideDown 200ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'motion': ['framer-motion', 'motion'],
        },
      },
    },
  },
});
```

---

## Performance Optimization

### Code Splitting

```tsx
// Lazy load heavy components
const AdvancedHeatmapPanel = React.lazy(() => import('./AdvancedHeatmapPanel'));

const ImageDisplay = () => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div>
      <button onClick={() => setShowAdvanced(true)}>
        Advanced Settings
      </button>
      
      {showAdvanced && (
        <React.Suspense fallback={<Loader />}>
          <AdvancedHeatmapPanel />
        </React.Suspense>
      )}
    </div>
  );
};
```

### Image Optimization

```typescript
// Optimize images before processing
const optimizeImage = async (file: File): Promise<Blob> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const maxSize = 1920;
      let width = img.width;
      let height = img.height;
      
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/jpeg', 0.85);
    };
    
    img.src = URL.createObjectURL(file);
  });
};
```

---

**Next:** [Future Enhancements](./11-future-enhancements.md)