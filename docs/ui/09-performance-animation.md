# Performance & Animation

**Session:** Optimization & Apple Motion Principles  
**Status:** Draft v1  
**Date:** 2026-09-25  

---

## Animation Guidelines (Subtle Polish)

### Transition Timing

| Animation Type | Duration | Spring Parameters | Use Case |
|----------------|----------|-------------------|----------|
| **Standard Transitions** | 200ms | damping 1.0, response 0.3s | Hover effects, state changes |
| **Quick Interactions** | 150ms | damping 1.0, response 0.2s | Button presses, quick feedback |
| **Slow Transitions** | 300ms | damping 0.8, response 0.4s | Modal open, major layout changes |
| **Page Transitions** | 150ms | cross-fade (reduced motion) | Screen changes, route transitions |
| **Momentum Gestures** | Variable | damping 0.8, response 0.3s | Flicks, throws, drag releases |

### Animation Types

**Hover Effects:**
- Subtle lift + shadow increase
- Scale to 0.97 on press (instant feedback)
- 200ms cubic-bezier easing

**Page Transitions:**
- Fade-in (150ms) for screen changes
- Cross-fade for reduced motion
- No layout shifts during transition

**Panel Slides:**
- Smooth slide-in/out (200ms)
- Spring physics (damping 0.8)
- Interruptible and reversible

**Loading States:**
- Smooth progress bars
- Gentle spinners
- Consistent timing

### Apple Motion Physics

**Spring Parameters:**
```typescript
// Default UI spring (critically damped)
const defaultSpring = {
  type: 'spring',
  damping: 1.0,      // No overshoot
  stiffness: 300,    // Snappy response
  mass: 0.8,        // Natural weight
};

// Momentum spring (slight bounce)
const momentumSpring = {
  type: 'spring',
  damping: 0.8,      // Slight overshoot
  stiffness: 300,    // Snappy response
  mass: 0.8,        // Natural weight
};

// Modal spring (more bounce)
const modalSpring = {
  type: 'spring',
  damping: 0.7,      // More overshoot
  stiffness: 250,    // Slightly softer
  mass: 1.0,        // Heavier feel
};
```

**Velocity Handoff:**
```typescript
// Carry gesture velocity into spring
const animateWithVelocity = (element: HTMLElement, target: number, velocity: number) => {
  const currentTransform = getComputedStyle(element).transform;
  const currentValue = parseFloat(currentTransform.split(',')[4]) || 0;
  
  // Normalize velocity for spring
  const relativeVelocity = velocity / (target - currentValue);
  
  animate(element, { 
    x: target 
  }, { 
    type: 'spring',
    damping: 0.8,
    stiffness: 300,
    velocity: relativeVelocity,
  });
};
```

**Momentum Projection:**
```typescript
// Apple's momentum projection function
const projectMomentum = (velocity: number, decelerationRate = 0.998): number => {
  return (velocity / 1000) * decelerationRate / (1 - decelerationRate);
};

// Usage in flick gesture
const handleFlick = (releaseVelocity: number) => {
  const projectedEndpoint = currentPosition + projectMomentum(releaseVelocity);
  const target = nearestSnapPoint(projectedEndpoint);
  
  animateToTarget(target, {
    velocity: releaseVelocity,
    damping: 0.8,
  });
};
```

---

## Performance Considerations

### GPU Acceleration

**Animate Only Compositor-Friendly Properties:**
- ✅ `transform` (translate, scale, rotate)
- ✅ `opacity`
- ❌ `width`, `height`, `top`, `left`
- ❌ `margin`, `padding`
- ❌ `box-shadow` (use sparingly)

**Implementation:**
```css
.animated-element {
  will-change: transform, opacity;
  transform: translateZ(0); /* Force GPU layer */
}

/* Remove will-change after animation */
.animated-element.finished {
  will-change: auto;
}
```

**React Implementation:**
```tsx
const AnimatedComponent = () => {
  const [isAnimating, setIsAnimating] = useState(false);

  return (
    <div
      className={isAnimating ? 'animating' : ''}
      style={{
        transform: isAnimating ? 'translateY(-10px)' : 'translateY(0)',
        opacity: isAnimating ? 0.8 : 1,
        transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease',
      }}
    >
      Content
    </div>
  );
};
```

### Reduced Motion

**Respect System Preferences:**
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
  
  .modal {
    transition: opacity 200ms ease;
    transform: none !important;
  }
}
```

**React Hook:**
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

### Battery Awareness

**Reduce Animations on Battery:**
```tsx
const useBatteryAwareAnimation = () => {
  const [isLowBattery, setIsLowBattery] = useState(false);

  useEffect(() => {
    const checkBattery = async () => {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        setIsLowBattery(battery.level < 0.2);
        
        battery.addEventListener('levelchange', () => {
          setIsLowBattery(battery.level < 0.2);
        });
      }
    };

    checkBattery();
  }, []);

  return isLowBattery;
};
```

---

## Rendering Performance

### Image Handling

**Lazy Loading:**
```tsx
const LazyImage = ({ src, alt, placeholder }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(placeholder);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
    img.src = src;
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={isLoaded ? 'loaded' : 'loading'}
      style={{
        opacity: isLoaded ? 1 : 0.5,
        transition: 'opacity 300ms ease',
      }}
    />
  );
};
```

**Thumbnail Generation:**
```typescript
const generateThumbnail = async (imageFile: File): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 200;
      canvas.height = 200;
      ctx?.drawImage(img, 0, 0, 200, 200);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    
    img.src = URL.createObjectURL(imageFile);
  });
};
```

**Memory Management:**
```tsx
const useImageMemory = () => {
  const imageRefs = useRef<Map<string, HTMLImageElement>>(new Map());

  const loadImage = (src: string): HTMLImageElement => {
    if (imageRefs.current.has(src)) {
      return imageRefs.current.get(src)!;
    }

    const img = new Image();
    img.src = src;
    imageRefs.current.set(src, img);
    return img;
  };

  const unloadImage = (src: string) => {
    const img = imageRefs.current.get(src);
    if (img) {
      img.src = '';
      imageRefs.current.delete(src);
    }
  };

  const cleanup = () => {
    imageRefs.current.forEach((img) => {
      img.src = '';
    });
    imageRefs.current.clear();
  };

  return { loadImage, unloadImage, cleanup };
};
```

### Table Performance

**Virtual Scrolling:**
```tsx
const VirtualTable = ({ items, itemHeight = 50 }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportHeight = 400;

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(viewportHeight / itemHeight) + 1,
    items.length
  );

  const visibleItems = items.slice(startIndex, endIndex);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div
      ref={containerRef}
      className="virtual-table-container"
      style={{ height: viewportHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={startIndex + index}
            style={{
              position: 'absolute',
              top: (startIndex + index) * itemHeight,
              height: itemHeight,
            }}
          >
            {item.content}
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Debounced Filtering:**
```tsx
const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Usage in search
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

useEffect(() => {
  // Perform search with debounced value
  performSearch(debouncedSearch);
}, [debouncedSearch]);
```

**Pagination:**
```tsx
const PaginatedTable = ({ data, itemsPerPage = 25 }) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  return (
    <div className="paginated-table">
      <table>
        {/* Table content */}
      </table>
      
      <div className="pagination">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        
        <span>Page {currentPage} of {totalPages}</span>
        
        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};
```

---

## Animation Performance

### Frame-Level Smoothness

**Request Animation Frame:**
```tsx
const useAnimationFrame = (callback: () => void) => {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  const animate = (time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      callback();
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [callback]);
};
```

**Motion Blur for Fast Motion:**
```css
.fast-motion {
  filter: blur(2px);
  transition: filter 100ms ease;
}
```

### Will-Change Optimization

**Strategic Use:**
```css
/* Use sparingly, only for elements that will animate */
.card.will-animate {
  will-change: transform, opacity;
}

/* Remove after animation */
.card.finished {
  will-change: auto;
}
```

**React Implementation:**
```tsx
const OptimizedAnimation = ({ children, isAnimating }) => {
  return (
    <div
      className={isAnimating ? 'will-animate' : 'finished'}
      style={{
        transform: isAnimating ? 'scale(1.05)' : 'scale(1)',
        opacity: isAnimating ? 0.8 : 1,
      }}
    >
      {children}
    </div>
  );
};
```

---

## Performance Monitoring

### FPS Monitoring

```tsx
const useFPS = () => {
  const [fps, setFPS] = useState(60);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    const updateFPS = () => {
      frameCount.current++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime.current >= 1000) {
        setFPS(frameCount.current);
        frameCount.current = 0;
        lastTime.current = currentTime;
      }
      
      requestAnimationFrame(updateFPS);
    };

    requestAnimationFrame(updateFPS);
  }, []);

  return fps;
};
```

### Memory Monitoring

```tsx
const useMemoryUsage = () => {
  const [memoryUsage, setMemoryUsage] = useState({ used: 0, total: 0 });

  useEffect(() => {
    const updateMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryUsage({
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
        });
      }
    };

    const interval = setInterval(updateMemory, 5000);
    return () => clearInterval(interval);
  }, []);

  return memoryUsage;
};
```

---

## Optimization Strategies

### Code Splitting

```tsx
// Lazy load heavy components
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

const App = () => {
  return (
    <React.Suspense fallback={<Loader />}>
      <HeavyComponent />
    </React.Suspense>
  );
};
```

### Image Optimization

```typescript
const optimizeImage = async (file: File): Promise<Blob> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Resize if too large
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

### Bundle Optimization

```typescript
// vite.config.ts or webpack config
export default {
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
};
```

---

## Performance Testing

### Lighthouse Integration

```bash
# Run Lighthouse CI
npm install -g @lhci/cli
lhci autorun
```

### Performance Budgets

```json
{
  "budgets": [
    {
      "resourceSizes": [
        {
          "resourceType": "script",
          "maximumKb": 200
        },
        {
          "resourceType": "image",
          "maximumKb": 500
        }
      ]
    }
  ]
}
```

---

**Next:** [Technical Implementation Notes](./10-technical-implementation.md)