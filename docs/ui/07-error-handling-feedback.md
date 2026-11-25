# Error Handling & Feedback

**Session:** Error States, Loading & Success Feedback  
**Status:** Draft v1  
**Date:** 2026-09-25  

---

## Error Display

### Toast Notifications (Non-blocking)

**Principles:**
- **Non-blocking** - Doesn't interrupt workflow
- **Auto-dismiss** - 5 seconds default
- **Clear messaging** - Specific error description
- **Actionable** - Suggest next steps when possible

**Error Types:**

#### Unsupported File Type
```
Error: file type not supported. Please use PNG or JPG.
```

#### Processing Failure
```
Error: Failed to process [filename]. See details for more information.
```

#### Export Failure
```
Error: Failed to export. Please check destination permissions.
```

#### Load Failure
```
Error: Could not load image. File may be corrupted.
```

**beUI Integration:**
```tsx
// Using beUI animated-toast-stack
import { Toast } from "@/components/ui/animated-toast-stack"
import { useToast } from "@/hooks/use-toast"

const { toast } = useToast();

const showError = (message, type = 'error') => {
  toast({
    title: type === 'error' ? 'Error' : 'Warning',
    description: message,
    variant: type,
    duration: 5000,
  });
};
```

### Error States in UI

**Batch Table:**
- Red status icon
- Error message in tooltip
- Row slightly dimmed

**History:**
- Grayed out row
- Error badge
- Detailed error on click

**Image Preview:**
- Error overlay with retry option
- "Failed to load image" message
- Retry button

**Apple Motion Integration:**
- **Subtle shake animation** on error
- **Fade in error overlay** (200ms)
- **Spring animation on retry** - Optimistic feedback

```tsx
const ErrorOverlay = ({ error, onRetry }) => {
  return (
    <div className="error-overlay">
      <div className="error-content">
        <ErrorIcon className="error-icon" />
        <h3>Error Loading Image</h3>
        <p>{error.message}</p>
        <button 
          className="retry-button"
          onClick={onRetry}
          style={{
            transition: 'transform 100ms ease-out',
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Retry
        </button>
      </div>
    </div>
  );
};
```

### Error Boundary Implementation

```tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## Loading States

### Initial Load

**App Launch:**
- Spinner with "Loading NeuroScan..."
- Centered in viewport
- Fade out when ready

**Model Load:**
- Progress bar with "Loading AI model..."
- Percentage indicator
- Estimated time remaining

**Apple Motion Integration:**
- **Smooth spinner rotation** - Consistent speed
- **Progress bar spring animation** - Natural fill
- **Fade transition** when complete (300ms)

```tsx
const LoadingScreen = ({ message, progress }) => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <Loader className="spinner" />
        <p className="loading-message">{message}</p>
        {progress !== undefined && (
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${progress}%`,
                transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
            <span className="progress-text">{progress}%</span>
          </div>
        )}
      </div>
    </div>
  );
};
```

### Processing States

**Single Screen:**
- Spinner overlay on image
- "Analyzing..." text
- Semi-transparent backdrop

**Batch Processing:**
- Progress bar + detailed status
- Current file indicator
- Elapsed time and ETA
- Statistics summary

**Heatmap Generation:**
- Brief spinner on overlay
- "Generating heatmap..." text
- Quick fade out when complete

**beUI Integration:**
```tsx
// Using beUI loader for various loading states
import { Loader } from "@/components/ui/loader"

<Loader type="spinner" size="lg" className="processing-spinner" />
<Loader type="dots" size="md" className="generating-loader" />
<Loader type="bars" size="sm" className="quick-loader" />
```

### Progress Display

**Components:**
- **Linear Progress Bar:** Visual progress with percentage
- **Circular Progress:** SVG ring with stroke animation
- **Status Text:** Current operation description
- **Time Estimates:** Elapsed and remaining time

```tsx
const ProcessingProgress = ({ 
  progress, 
  currentFile, 
  elapsedTime, 
  estimatedRemaining, 
  processed, 
  total, 
  errors 
}) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="processing-progress">
      <div className="progress-bar-container">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${progress}%`,
              transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </div>
        <span className="progress-percentage">{progress}%</span>
      </div>
      
      <div className="progress-details">
        <div className="detail-item">
          <span className="label">Processing:</span>
          <span className="value">{currentFile}</span>
        </div>
        <div className="detail-item">
          <span className="label">Time elapsed:</span>
          <span className="value">{formatTime(elapsedTime)}</span>
        </div>
        <div className="detail-item">
          <span className="label">ETA:</span>
          <span className="value">{formatTime(estimatedRemaining)}</span>
        </div>
      </div>
      
      <div className="progress-stats">
        <span className="stat">Processed: {processed}/{total}</span>
        <span className="stat error-count">Errors: {errors}</span>
        <span className="stat">Remaining: {total - processed}</span>
      </div>
    </div>
  );
};
```

### Export States

**Progress:**
- "Exporting... X of Y files"
- Linear progress bar
- Current file indicator

**Completion:**
- Success toast with file count
- Optional auto-open destination
- Clear progress indicator

```tsx
const ExportProgress = ({ progress, currentFile, totalFiles, onComplete }) => {
  useEffect(() => {
    if (progress === 100) {
      // Show success toast
      toast({
        title: 'Export Complete',
        description: `Successfully exported ${totalFiles} files`,
        variant: 'success',
      });
      onComplete?.();
    }
  }, [progress, totalFiles, onComplete]);

  return (
    <div className="export-progress">
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ 
            width: `${progress}%`,
            transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      </div>
      <p className="export-status">
        Exporting... {currentFile} of {totalFiles}
      </p>
    </div>
  );
};
```

---

## Success Feedback

### Subtle Confirmation

**Principles:**
- **Non-intrusive** - Doesn't interrupt workflow
- **Brief** - Short, clear messages
- **Visual** - Green checkmarks, highlights
- **Contextual** - Related to specific action

**Toast Messages:**
- "Screening complete" with brief result summary
- "Added to history" with timestamp
- "Exported successfully to [destination]"

**Visual Feedback:**
- Green checkmark on processed items
- Subtle highlight on newly added history entries
- Brief flash on successful operations

**Apple Motion Integration:**
- **Quick checkmark animation** - Scale + fade (200ms)
- **Subtle highlight flash** - Opacity pulse (300ms)
- **Spring animation on success** - Optimistic feedback

```tsx
const SuccessFeedback = ({ message, type = 'success' }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`success-feedback ${isVisible ? 'visible' : ''}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-20px)',
        transition: 'opacity 300ms ease, transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <CheckIcon className="success-icon" />
      <span className="success-message">{message}</span>
    </div>
  );
};
```

### Export Confirmation

**Components:**
- **Toast:** "Exported successfully to [destination]"
- **File Explorer:** Optional auto-open destination folder
- **Summary:** File count and destination path

**beUI Integration:**
```tsx
const showExportSuccess = (destination, fileCount) => {
  toast({
    title: 'Export Complete',
    description: `Successfully exported ${fileCount} files to ${destination}`,
    variant: 'success',
    action: (
      <button 
        onClick={() => openDestination(destination)}
        className="toast-action"
      >
        Open Folder
      </button>
    ),
  });
};
```

### Inline Success States

**Table Rows:**
- Green status icon
- Success badge
- Row briefly highlighted

**Form Submissions:**
- Button changes to success state
- Green checkmark appears
- Brief success message

**Apple Motion Integration:**
```tsx
const SuccessButton = ({ children, onSuccess, isLoading }) => {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClick = async () => {
    try {
      await onSuccess();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      // Handle error
    }
  };

  return (
    <button
      className={`success-button ${showSuccess ? 'success' : ''} ${isLoading ? 'loading' : ''}`}
      onClick={handleClick}
      disabled={isLoading}
      style={{
        transition: 'background-color 200ms ease, transform 100ms ease-out',
      }}
      onMouseDown={(e) => !isLoading && !showSuccess && (e.currentTarget.style.transform = 'scale(0.97)')}
      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      {isLoading ? (
        <Loader className="button-loader" />
      ) : showSuccess ? (
        <>
          <CheckIcon className="success-icon" />
          Success
        </>
      ) : (
        children
      )}
    </button>
  );
};
```

---

## Feedback Timing

### Apple Feedback Principles

**Response Latency:**
- **Instant feedback on pointer-down** - No delay
- **Continuous feedback during interaction** - 1:1 tracking
- **Completion feedback** - Immediate on action finish

**Animation Timing:**
- **Quick interactions:** 150ms
- **Standard transitions:** 200ms
- **Slow transitions:** 300ms
- **Success animations:** 200ms fade out

**Toast Timing:**
- **Success:** 3 seconds
- **Info:** 5 seconds
- **Warning:** 5 seconds
- **Error:** 7 seconds (dismiss manually)

### Feedback Hierarchy

**Priority 1 - Critical:**
- Error states (immediate, persistent)
- Loading states (continuous)
- Critical failures (blocking)

**Priority 2 - Important:**
- Success confirmations (brief)
- Progress updates (continuous)
- Warning states (persistent)

**Priority 3 - Informational:**
- Status updates (brief)
- Help hints (on demand)
- Secondary notifications (brief)

---

## State Management

### Loading States

```tsx
const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const startLoading = () => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
  };

  const updateProgress = (value) => {
    setProgress(value);
  };

  const setErrorState = (errorMessage) => {
    setError(errorMessage);
    setIsLoading(false);
  };

  const finishLoading = () => {
    setIsLoading(false);
    setProgress(100);
  };

  return {
    isLoading,
    error,
    progress,
    startLoading,
    updateProgress,
    setErrorState,
    finishLoading,
  };
};
```

### Error Recovery

```tsx
const useErrorRecovery = () => {
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = (error) => {
    setError(error);
    // Log error for debugging
    console.error('Error occurred:', error);
  };

  const retry = async (operation) => {
    try {
      setRetryCount(prev => prev + 1);
      setError(null);
      await operation();
    } catch (error) {
      handleError(error);
    }
  };

  const dismissError = () => {
    setError(null);
    setRetryCount(0);
  };

  return {
    error,
    retryCount,
    handleError,
    retry,
    dismissError,
  };
};
```

---

## Accessibility in Feedback

### Screen Reader Support

```tsx
const AccessibleToast = ({ message, type }) => {
  return (
    <div 
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={`toast ${type}`}
    >
      <span className="toast-message">{message}</span>
    </div>
  );
};
```

### Focus Management on Errors

```tsx
const ErrorFocus = ({ hasError, errorRef }) => {
  useEffect(() => {
    if (hasError && errorRef.current) {
      errorRef.current.focus();
    }
  }, [hasError, errorRef]);

  return null;
};
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .toast {
    transition: opacity 200ms ease;
    transform: none !important;
  }
  
  .spinner {
    animation: none;
  }
  
  .progress-fill {
    transition: width 500ms ease;
  }
}
```

---

## Testing Error States

### Error Scenarios to Test

**File Operations:**
- [ ] Unsupported file type
- [ ] Corrupted image file
- [ ] File permission errors
- [ ] Network failures (if applicable)

**Processing:**
- [ ] Model load failure
- [ ] Processing timeout
- [ ] Memory errors
- [ ] Invalid input data

**Export:**
- [ ] Export permission errors
- [ ] Disk full errors
- [ ] Invalid destination path
- [ ] File naming conflicts

**UI:**
- [ ] Network connectivity loss
- [ ] Browser crash recovery
- [ ] Memory pressure handling
- [ ] Concurrency issues

---

**Next:** [Accessibility Considerations](./08-accessibility.md)