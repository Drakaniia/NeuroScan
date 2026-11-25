# Interaction Patterns

**Session:** User Interactions & Apple Motion Principles  
**Status:** Draft v1  
**Date:** 2026-09-25  

---

## Drag & Drop

### Single Screening

**Drop Zone Behavior:**
- **Default State:** Large dashed border area when no image loaded
- **Hover State:** Border changes to Primary Blue, background Light Blue
- **Success State:** Image loads immediately with fade-in
- **Error State:** Toast notification for unsupported files

**Apple Motion Integration:**
- **Instant feedback on drag-enter** - Border color changes immediately
- **Continuous feedback during drag** - Background follows drag position
- **Smooth transition on drop** - Fade-in animation (150ms)
- **Spring physics for error shake** - Subtle shake on invalid drop

```tsx
const DropZone = ({ onDrop }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true); // Instant feedback
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onDrop(files[0]);
    }
  };

  return (
    <div
      className={`drop-zone ${isDragging ? 'dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        transition: 'border-color 150ms ease, background-color 150ms ease',
      }}
    >
      {isDragging ? (
        <p>Drop MRI scan here</p>
      ) : (
        <p>Drag & drop MRI scan or click to upload</p>
      )}
    </div>
  );
};
```

### Batch Processing

**Folder Drop Behavior:**
- **Entire folder** can be dropped on screen
- **Visual feedback:** Folder icon scales up, border highlights
- **Processing:** Immediate scan start with progress indication
- **Error handling:** Toast for invalid folders

**Apple Motion Integration:**
- **Scale animation on drag-enter** - Folder grows to indicate receptiveness
- **Border highlight follows drag** - Continuous visual feedback
- **Momentum on drop** - Smooth transition to processing state

```tsx
const FolderDropZone = ({ onFolderDrop }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    if (items.length > 0) {
      const item = items[0];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry.isDirectory) {
          onFolderDrop(entry);
        }
      }
    }
  };

  return (
    <div
      className={`folder-drop-zone ${isDragging ? 'dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <FolderIcon className={isDragging ? 'expanded' : ''} />
      <p>Drop folder here to process</p>
    </div>
  );
};
```

---

## Image Manipulation

### Zoom

**Controls:**
- **Controls:** +/- buttons in floating panel
- **Mouse Wheel:** Zoom in/out
- **Pan:** Click and drag when zoomed
- **Reset:** Double-click to reset zoom

**Apple Motion Integration:**
- **1:1 tracking** - Zoom follows mouse wheel exactly
- **Momentum on release** - Smooth deceleration after scroll
- **Rubber-banding at limits** - Progressive resistance at min/max zoom
- **Spring animation on reset** - Smooth return to default zoom

```tsx
const ImageZoom = ({ src }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(3, zoom + delta));
    setZoom(newZoom);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    // Spring animation to reset
    animate(
      { zoom: 1, x: 0, y: 0 },
      { type: 'spring', damping: 1.0, stiffness: 300 }
    );
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div 
      className="image-container"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <img
        src={src}
        alt="MRI scan"
        style={{
          transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      />
    </div>
  );
};
```

### Heatmap Interaction

**Controls:**
- **Toggle:** Single click to show/hide
- **Opacity:** Real-time slider adjustment
- **Colormap:** Immediate preview when changed
- **Intensity:** Live update of threshold values

**Apple Motion Integration:**
- **Instant feedback on toggle** - Opacity changes immediately on click
- **1:1 slider tracking** - Opacity follows slider exactly
- **Live preview on colormap change** - No delay in visual feedback
- **Spring animation on toggle** - Smooth fade transition

```tsx
const HeatmapControls = ({ heatmap, showHeatmap, opacity, colormap, onToggle, onOpacityChange, onColormapChange }) => {
  return (
    <div className="heatmap-controls">
      <button 
        className={`toggle-button ${showHeatmap ? 'active' : ''}`}
        onClick={onToggle}
        style={{
          transition: 'background-color 200ms ease, transform 100ms ease-out',
        }}
        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <HeatmapIcon />
      </button>
      
      {showHeatmap && (
        <div className="heatmap-settings">
          <label>Opacity</label>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity}
            onChange={(e) => onOpacityChange(parseInt(e.target.value))}
            className="opacity-slider"
          />
          
          <label>Colormap</label>
          <select
            value={colormap}
            onChange={(e) => onColormapChange(e.target.value)}
            className="colormap-select"
          >
            <option value="inferno">Inferno</option>
            <option value="viridis">Viridis</option>
            <option value="plasma">Plasma</option>
            <option value="magma">Magma</option>
          </select>
        </div>
      )}
    </div>
  );
};
```

---

## Table Interactions

### Sorting

**Behavior:**
- **Click Header:** Sort ascending/descending
- **Visual Indicator:** Arrow icon shows sort direction
- **Multi-sort:** Shift+click for secondary sort

**Apple Motion Integration:**
- **Instant feedback on click** - Sort happens immediately
- **Arrow animation** - Smooth rotation to indicate direction
- **Row reordering** - Spring animation for row movement

```tsx
const SortableHeader = ({ column, onSort, sortDirection }) => {
  return (
    <th 
      onClick={() => onSort(column)}
      className="sortable-header"
      style={{
        cursor: 'pointer',
        transition: 'background-color 150ms ease',
      }}
    >
      {column}
      {sortDirection && (
        <ArrowIcon 
          className={`sort-arrow ${sortDirection}`}
          style={{
            transform: sortDirection === 'asc' ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      )}
    </th>
  );
};
```

### Selection

**Behavior:**
- **Single Click:** Select row, show preview
- **Checkbox:** Multi-select for bulk operations
- **Ctrl+Click:** Toggle selection
- **Shift+Click:** Range selection

**Apple Motion Integration:**
- **Instant highlight on click** - Row highlights immediately
- **Smooth selection animation** - Fade-in highlight effect
- **Checkbox spring animation** - Slight scale on check

```tsx
const SelectableRow = ({ row, isSelected, onSelect, onCheckboxChange }) => {
  return (
    <tr
      className={`table-row ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(row.id)}
      style={{
        backgroundColor: isSelected ? '#E6F0FF' : 'transparent',
        transition: 'background-color 150ms ease',
      }}
    >
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onCheckboxChange(row.id, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          style={{
            transition: 'transform 100ms ease-out',
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        />
      </td>
      <td>{row.filename}</td>
      <td>{row.verdict}</td>
      <td>{row.probability}%</td>
    </tr>
  );
};
```

### Filtering

**Behavior:**
- **Real-time:** Search filters as you type
- **Debounced:** 300ms delay for performance
- **Clear:** X button to clear individual filters

**Apple Motion Integration:**
- **Instant visual feedback** - Filter icon animates on input
- **Smooth row transitions** - Rows fade in/out during filter
- **Debounce with loading indicator** - Show spinner during filter

```tsx
const FilterableTable = ({ data, onFilter }) => {
  const [filterText, setFilterText] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);

  const handleFilterChange = (e) => {
    const value = e.target.value;
    setFilterText(value);
    setIsFiltering(true);
    
    // Debounced filter
    setTimeout(() => {
      onFilter(value);
      setIsFiltering(false);
    }, 300);
  };

  const clearFilter = () => {
    setFilterText('');
    onFilter('');
  };

  return (
    <div className="filterable-table">
      <div className="filter-bar">
        <input
          type="text"
          value={filterText}
          onChange={handleFilterChange}
          placeholder="Search..."
          className="filter-input"
        />
        {filterText && (
          <button 
            onClick={clearFilter}
            className="clear-button"
            style={{
              transition: 'transform 100ms ease-out',
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <XIcon />
          </button>
        )}
        {isFiltering && <Loader className="filter-loader" />}
      </div>
      
      <table className="data-table">
        {/* Table content */}
      </table>
    </div>
  );
};
```

---

## Keyboard Navigation

### Tab Order

**Principles:**
- **Logical flow** through interactive elements
- **Visible focus indicators** (Primary Blue outline)
- **Skip to main content** option

**Apple Motion Integration:**
- **Instant focus feedback** - Focus ring appears immediately
- **Smooth focus transitions** - Focus ring animates between elements
- **Reduced motion support** - Static focus for reduced motion preference

```css
/* Focus indicators */
:focus-visible {
  outline: 2px solid #0066CC;
  outline-offset: 2px;
  transition: outline-color 150ms ease;
}

:focus:not(:focus-visible) {
  outline: none;
}

/* Skip link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #0066CC;
  color: white;
  padding: 8px 16px;
  z-index: 100;
  transition: top 200ms ease;
}

.skip-link:focus {
  top: 0;
}
```

### Keyboard Shortcuts

**Global Shortcuts:**
- **Ctrl+O:** Open file/folder
- **Ctrl+N:** New screening
- **Ctrl+H:** Go to history
- **Ctrl+E:** Export
- **Escape:** Cancel/Go back
- **Ctrl+Q:** Quit application
- **F1:** Open help
- **Ctrl+F:** Search in history
- **Ctrl+Shift+C:** Clear history
- **Space:** Toggle heatmap in single view

**Context-Specific Shortcuts:**
- **Single Screening:** Space to toggle heatmap, +/- to zoom
- **Batch Processing:** Ctrl+A to select all, Delete to remove
- **History:** Ctrl+F to search, Ctrl+A to select all

**Shortcut Implementation:**
```tsx
const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Global shortcuts
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        // Open file dialog
      }
      
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        // New screening
      }
      
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        // Go to history
      }
      
      if (e.key === 'Escape') {
        // Cancel or go back
      }
      
      // Context-specific shortcuts
      if (e.key === ' ' && currentScreen === 'single') {
        e.preventDefault();
        // Toggle heatmap
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentScreen]);
};
```

---

## Gesture Design

### Tap

**Apple Principles:**
- **Highlight on touch-down** (instant)
- **Commit on touch-up**
- **10px hysteresis** around target
- **Cancel by dragging away**

```tsx
const TapButton = ({ children, onTap }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e) => {
    setIsPressed(true);
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e) => {
    if (isPressed) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - startPos.x, 2) + 
        Math.pow(e.clientY - startPos.y, 2)
      );
      
      // Cancel if dragged beyond 10px
      if (distance > 10) {
        setIsPressed(false);
      }
    }
  };

  const handlePointerUp = (e) => {
    if (isPressed) {
      onTap();
    }
    setIsPressed(false);
  };

  return (
    <button
      className="tap-button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        transform: isPressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'transform 100ms ease-out',
      }}
    >
      {children}
    </button>
  );
};
```

### Drag/Swipe

**Apple Principles:**
- **Small movement threshold** (~10px) before committing
- **1:1 tracking** after threshold
- **Velocity tracking** for momentum
- **Project resting position** for flicks

```tsx
const Swipeable = ({ children, onSwipeLeft, onSwipeRight }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [startTime, setStartTime] = useState(0);
  const historyRef = useRef([]);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    setPosition({ x: 0, y: 0 });
    setStartTime(Date.now());
    historyRef.current = [];
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;

    const newX = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const newY = e.clientY - e.currentTarget.getBoundingClientRect().top;
    
    // Track velocity
    const now = Date.now();
    const dt = now - startTime;
    const vx = (newX - position.x) / dt;
    const vy = (newY - position.y) / dt;
    
    historyRef.current.push({ x: newX, y: newY, vx, vy, time: now });
    if (historyRef.current.length > 5) {
      historyRef.current.shift();
    }

    setPosition({ x: newX, y: newY });
    setVelocity({ x: vx, y: vy });
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Calculate average velocity from history
    const avgVelocity = historyRef.current.reduce(
      (acc, curr) => ({
        x: acc.x + curr.vx / historyRef.current.length,
        y: acc.y + curr.vy / historyRef.current.length,
      }),
      { x: 0, y: 0 }
    );

    // Project resting position
    const projectedX = position.x + project(avgVelocity.x);

    // Determine swipe direction
    if (Math.abs(projectedX) > 100) {
      if (projectedX > 0) {
        onSwipeRight();
      } else {
        onSwipeLeft();
      }
    }

    // Spring back to center
    animate(
      { x: 0, y: 0 },
      { type: 'spring', damping: 1.0, stiffness: 300 }
    );
    setPosition({ x: 0, y: 0 });
  };

  // Apple's momentum projection function
  const project = (velocity, decelerationRate = 0.998) => {
    return (velocity / 1000) * decelerationRate / (1 - decelerationRate);
  };

  return (
    <div
      className="swipeable"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        transform: `translateX(${position.x}px)`,
        transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {children}
    </div>
  );
};
```

---

## Panel Interactions

### Panel Slide

**Apple Principles:**
- **Animate from presentation value** (current on-screen position)
- **Spring physics** for natural motion
- **Interruptible** - Can grab and reverse mid-animation
- **Velocity handoff** - Carry gesture velocity into spring

```tsx
const SlidePanel = ({ isOpen, onClose, children }) => {
  const panelRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!panelRef.current) return;

    const panel = panelRef.current;
    const targetX = isOpen ? 0 : 400; // 400px off-screen

    // Animate from current presentation value
    const currentTransform = getComputedStyle(panel).transform;
    const currentX = currentTransform !== 'none' 
      ? parseFloat(currentTransform.split(',')[4]) 
      : (isOpen ? 400 : 0);

    setIsAnimating(true);

    animate(panel, { 
      x: targetX 
    }, { 
      type: 'spring',
      damping: 0.8,
      stiffness: 300,
      mass: 0.8,
      onComplete: () => setIsAnimating(false)
    });

  }, [isOpen]);

  const handlePointerDown = (e) => {
    if (isAnimating) return;
    // Start drag interaction
  };

  return (
    <div
      ref={panelRef}
      className="slide-panel"
      onPointerDown={handlePointerDown}
      style={{
        transform: isOpen ? 'translateX(0)' : 'translateX(400px)',
        transition: isAnimating ? 'none' : 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {children}
    </div>
  );
};
```

---

## Accessibility in Interactions

### Reduced Motion

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
  
  .swipeable {
    transform: none !important;
  }
}
```

### Focus Management

```tsx
const useFocusTrap = (isActive) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e) => {
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

**Next:** [Error Handling & Feedback](./07-error-handling-feedback.md)