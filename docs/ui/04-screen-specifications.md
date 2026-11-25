# Screen Specifications

**Session:** Detailed Screen Layouts & Components  
**Status:** Draft v1  
**Date:** 2026-09-25  

---

## Dashboard (Home Screen)

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Header: NeuroScan Logo + Window Controls                │
├─────────────────────────────────────────────────────────┤
│ Main Content: 2x2 Grid of Cards                         │
│                                                         │
│ [ Single Screening ] [ Batch Processing ]               │
│                                                         │
│ [ View History    ] [ About/Help      ]                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Footer: Status Bar                                       │
└─────────────────────────────────────────────────────────┘
```

### Card Design Specifications

**Standard Card Properties:**
- **Background:** White
- **Border Radius:** 8px
- **Shadow:** `0 2px 8px rgba(0,0,0,0.1)`
- **Padding:** 24px
- **Hover:** Lift effect + stronger shadow
- **Cursor:** Pointer
- **Transition:** 200ms ease-in-out

### Card Contents

#### 1. Single Screening Card
- **Icon:** Image/MRI scan icon (line style)
- **Title:** "Single Screening"
- **Description:** "Analyze individual MRI scans"

#### 2. Batch Processing Card
- **Icon:** Folder/Stack icon (line style)
- **Title:** "Batch Processing"
- **Description:** "Process entire folders of scans"

#### 3. View History Card
- **Icon:** Clock/History icon (line style)
- **Title:** "View History"
- **Description:** "Browse past screening results"

#### 4. About/Help Card
- **Icon:** Info/Help icon (line style)
- **Title:** "About & Help"
- **Description:** "App information and documentation"

### Apple Motion Integration

**Card Interactions:**
- **Press feedback:** Scale to 0.97 on pointer-down (instant)
- **Hover lift:** Subtle elevation with shadow increase
- **Active state:** Slight scale down when pressed
- **Reduced motion:** Opacity cross-fade instead of transform

```css
.card {
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.card:active {
  transform: scale(0.97);
  transition: transform 100ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .card {
    transition: opacity 200ms ease;
    transform: none !important;
  }
}
```

---

## Single Screening Screen

### Layout: Fullscreen with Overlay

```
┌─────────────────────────────────────────────────────────┐
│ Header: Back Button + "Single Screening" Title          │
├─────────────────────────────────────────────────────────┤
│ Main Image Area (Fullscreen)                           │
│                                                         │
│ [ MRI Scan Display - Takes Most Space ]                │
│                                                         │
│ [ Floating Controls Overlay ]                           │
│ - Toggle Heatmap                                        │
│ - Advanced Heatmap Panel Button                         │
│ - Upload/Open Button                                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Results Panel (Bottom Overlay)                         │
│ [ Detailed Metrics Display ]                           │
└─────────────────────────────────────────────────────────┘
```

### Image Display States

**Default State:**
- Large drag-drop zone with instructions
- Dashed border, light blue background
- "Drag & drop MRI scan or click to upload"

**Loaded State:**
- Fullscreen image display
- Fit to container with zoom/pan controls
- Heatmap overlay toggleable

**Heatmap Overlay:**
- Toggleable with opacity control
- Default: Inferno colormap
- Adjustable intensity threshold

### Floating Controls

**Position:** Top-right corner of image area
**Style:** Semi-transparent white background, rounded corners

**Controls:**
- **Upload/Open button** (solid icon)
- **Heatmap toggle** (line icon, changes when active)
- **Advanced heatmap settings** (gear icon)
- **Zoom controls** (+/-)

```tsx
<div className="floating-controls">
  <button className="icon-button" title="Upload/Open">
    <UploadIcon />
  </button>
  <button className="icon-button" title="Toggle Heatmap">
    <HeatmapIcon />
  </button>
  <button className="icon-button" title="Advanced Settings">
    <SettingsIcon />
  </button>
  <div className="zoom-controls">
    <button className="icon-button" title="Zoom In">
      <PlusIcon />
    </button>
    <button className="icon-button" title="Zoom Out">
      <MinusIcon />
    </button>
  </div>
</div>
```

### Results Panel

**Position:** Bottom overlay, slides up when results available
**Style:** White background, shadow, rounded top corners

**Content:**
- **Verdict Badge:** Large, color-coded (green/red)
- **Probability:** Percentage with confidence indicator
- **Confidence Metrics:** Processing time, model version
- **Threshold Marker:** Visual indicator on probability scale
- **Action Buttons:** Add to History, Export, New Scan

```tsx
<div className="results-panel">
  <div className="verdict-section">
    <div className={`verdict-badge ${verdict}`}>
      {verdict === 'tumor' ? 'Tumor Detected' : 'No Tumor'}
    </div>
    <div className="probability">
      <span className="percentage">{probability}%</span>
      <span className="confidence">Confidence: {confidence}</span>
    </div>
  </div>
  
  <div className="metrics-section">
    <div className="metric">
      <span className="label">Processing Time:</span>
      <span className="value">{processingTime}</span>
    </div>
    <div className="metric">
      <span className="label">Model Version:</span>
      <span className="value">{modelVersion}</span>
    </div>
  </div>
  
  <div className="threshold-scale">
    <div className="scale-track">
      <div className="threshold-marker" style={{ left: `${threshold}%` }} />
    </div>
  </div>
  
  <div className="action-buttons">
    <button className="secondary-button">Add to History</button>
    <button className="secondary-button">Export</button>
    <button className="primary-button">New Scan</button>
  </div>
</div>
```

### Advanced Heatmap Panel

**Trigger:** Gear icon in floating controls
**Position:** Slide-in panel from right side
**Animation:** Spring slide with damping 0.8

**Controls:**
- **Colormap Selector:** Dropdown (Inferno, Viridis, Plasma, etc.)
- **Opacity Slider:** 0-100% with preset buttons
- **Intensity Threshold:** Min/max value adjustment
- **Export Settings:** Heatmap-only vs combined export

```tsx
<div className="heatmap-panel">
  <div className="panel-header">
    <h3>Heatmap Settings</h3>
    <button className="close-button">
      <XIcon />
    </button>
  </div>
  
  <div className="panel-content">
    <div className="control-group">
      <label>Colormap</label>
      <select className="dropdown">
        <option value="inferno">Inferno</option>
        <option value="viridis">Viridis</option>
        <option value="plasma">Plasma</option>
        <option value="magma">Magma</option>
        <option value="coolwarm">Coolwarm</option>
      </select>
    </div>
    
    <div className="control-group">
      <label>Opacity</label>
      <input type="range" min="0" max="100" value={opacity} />
      <div className="preset-buttons">
        <button>25%</button>
        <button>50%</button>
        <button>75%</button>
        <button>100%</button>
      </div>
    </div>
    
    <div className="control-group">
      <label>Intensity Threshold</label>
      <div className="threshold-controls">
        <input type="number" placeholder="Min" />
        <input type="number" placeholder="Max" />
      </div>
    </div>
    
    <div className="control-group">
      <label>Export Settings</label>
      <div className="radio-group">
        <label>
          <input type="radio" name="export" value="combined" checked />
          Combined (Image + Heatmap)
        </label>
        <label>
          <input type="radio" name="export" value="heatmap" />
          Heatmap Only
        </label>
      </div>
    </div>
  </div>
</div>
```

---

## Batch Processing Screen

### Layout: Workbench

`/batch` is a full-bleed route: the toolbar, the list, the stage and the run
dock own the window. Nothing on the page scrolls — the list does.

```
┌ TitleBar · light · app chrome ─────────────────────────────────┐
├ BatchToolbar · light · full bleed ─────────────────────────────┤
│ [←] Batch Processing [▤ 37 scans · 2 failed] [Export][Choose]  │
├─────────────────────────────────────┬──────────────────────────┤
│ LIST (light, no card)               │ STAGE (dark, edge to edge) │
│ [All][Tumor][No tumor][Low][Errors] │ filename        [◉][↓]    │
│ FILE            VERDICT   P   ·     │  ┌────────────────────┐  │
│ ░ brain…        ● Tumor  34.2% ·    │  │ MRI + CAM overlay  │  │
│ ░ brain…        ● No     12.8% ·    │  └────────────────────┘  │
│ …                                   │  ● No tumor 12.8% P      │
│                                     │  τ 0.45 · 412 ms         │
│                                     │  Overlay ⌃               │
├─────────────────────────────────────┴──────────────────────────┤
│ ▬▬▬▬ progress hairline ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ │
│ ● Processing brain_t2_0041.png 12/37 · 2 failed · ETA 00:41    │
│ Research/educational screening aid — not a medical device.    │
└─────────────────────────────────────────────────────────────────┘
```

Below `lg` the workspace becomes one scrolling column (list over stage) and
the dock stays pinned to the bottom of the window.

### Results List (Left Region)

**Columns:** File (thumbnail, name, folder path or inline failure reason),
Verdict (or row state: Queued / Analyzing / Error), Probability, Actions.
Status is folded into the verdict cell; a settled row's status is its verdict.

**Features:**
- **Sorting:** Click column headers to sort; `aria-sort` follows. Unscored rows stay last
- **Filtering:** All, Tumor, No Tumor, Low Confidence, Errors, with live counts
- **Row Selection:** Click to open on the stage; ↑/↓/Home/End move the selection and focus
- **Bulk Actions:** Checking rows swaps the filter row for "N selected · Remove · Clear selection"; Ctrl+A selects every row currently listed
- **Row Actions:** Export CSV and remove, always visible
- **Empty States:** The drop state when the batch is empty; "No scans match this filter." under an empty filter
- **Dropping:** A drop anywhere on the workspace lands here; the list takes an inset accent ring and a one-line capsule that says the drop adds rather than replaces

```tsx
<table className="results-table">
  <thead>
    <tr>
      <th onClick={() => handleSort('filename')}>File</th>
      <th onClick={() => handleSort('verdict')}>Verdict</th>
      <th onClick={() => handleSort('probability')}>Probability</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {files.map(file => (
      <tr 
        key={file.id} 
        className={selectedFile === file.id ? 'selected' : ''}
        onClick={() => selectFile(file.id)}
      >
        <td>{file.filename}</td>
        <td>
          <span className={`verdict-badge ${file.verdict}`}>
            {file.verdict}
          </span>
        </td>
        <td>{file.probability}%</td>
        <td>
          <button className="icon-button" title="Export">
            <DownloadIcon />
          </button>
          <button className="icon-button" title="Remove">
            <TrashIcon />
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

### Scan Stage (Right Region)

**The stage is dark, permanent and edge to edge.** The empty state lives on it.

**Default:** "Select a scan to preview" placeholder.

**Active:**
- Scan and CAM overlay drawn on one box fitted to the scan's natural rect (`object-fill` on both layers), so the two can never drift apart
- Header carries the file name and its actions (heatmap toggle, export); there is no "Preview" label
- Answer block under the viewer: verdict pill, `P(tumor)` figure in the verdict hue, τ, then time / model / input size
- Colormap and overlay opacity live behind a one-level "Overlay" disclosure
- Queued, analyzing and error rows state themselves here, with Retry on a failure

```tsx
<div className="image-preview">
  {selectedFile ? (
    <>
      <div className="preview-image">
        <img src={selectedFile.image} alt={selectedFile.filename} />
        {showHeatmap && (
          <div className="heatmap-overlay">
            <img src={selectedFile.heatmap} alt="Heatmap" />
          </div>
        )}
      </div>
      
      <div className="preview-controls">
        <button className="icon-button" onClick={toggleHeatmap}>
          <HeatmapIcon />
        </button>
        <button className="icon-button" onClick={exportSingle}>
          <DownloadIcon />
        </button>
      </div>
      
      <div className="preview-metrics">
        <div className="metric">
          <span className="label">Verdict:</span>
          <span className={`value ${selectedFile.verdict}`}>
            {selectedFile.verdict}
          </span>
        </div>
        <div className="metric">
          <span className="label">Probability:</span>
          <span className="value">{selectedFile.probability}%</span>
        </div>
        <div className="metric">
          <span className="label">Processing Time:</span>
          <span className="value">{selectedFile.processingTime}</span>
        </div>
      </div>
    </>
  ) : (
    <div className="placeholder">
      <ImageIcon />
      <p>Select an image to preview</p>
    </div>
  )}
</div>
```

### Run Dock

A full-width dark dock at the bottom of the window, in flow, always present.

**Components:**
- **Progress Hairline:** the dock's top edge — `processed/total` is the percentage; there is no separate track and no "N% complete" line
- **State Dot + Headline:** running ("Processing <file>"), paused ("Paused — N scans still queued"), complete, or empty
- **Counts:** `processed/total`, failures, ETA and elapsed, all tabular
- **Actions:** Cancel ⇄ Resume in one slot, plus Clear (disabled while running)
- **Safety Line:** always visible at 10–11px

The dock's live region announces run boundaries only — started, paused,
finished — never one message per file.

### Batch Controls

**Actions:**
- **Choose Folder:** Primary toolbar action (Ctrl+O); drag-and-drop adds too
- **Export CSV:** Toolbar action for settled rows (Ctrl+E)
- **Cancel / Resume:** Dock slot
- **Clear:** Dock action, disabled while running

---

## History View

### Layout: Filterable Table

```
┌─────────────────────────────────────────────────────────┐
│ Header: Back + "History" + Search + Filter + Export Btn │
├─────────────────────────────────────────────────────────┤
│ Filter Bar                                              │
│ [ Search ] [ Date Range ] [ Verdict Filter ] [ Sort ]   │
├─────────────────────────────────────────────────────────┤
│ Results Table                                           │
│ Columns: Date, Filename, Verdict, Probability, Actions  │
│                                                         │
│ [ Data Rows with Pagination ]                          │
├─────────────────────────────────────────────────────────┤
│ Footer: Row count + Pagination controls                │
└─────────────────────────────────────────────────────────┘
```

### Filter Bar

**Components:**
- **Search:** Text search for filenames
- **Date Range:** Date picker for filtering by date
- **Verdict Filter:** Dropdown (All, Tumor, No Tumor, Low Confidence)
- **Sort:** Dropdown (Date, Filename, Probability)
- **Clear Filters:** Reset button

```tsx
<div className="filter-bar">
  <input 
    type="text" 
    placeholder="Search filenames..." 
    className="search-input"
  />
  
  <input 
    type="date" 
    className="date-picker"
  />
  
  <select className="filter-dropdown">
    <option value="all">All Verdicts</option>
    <option value="tumor">Tumor Detected</option>
    <option value="no-tumor">No Tumor</option>
    <option value="low-confidence">Low Confidence</option>
  </select>
  
  <select className="sort-dropdown">
    <option value="date">Sort by Date</option>
    <option value="filename">Sort by Filename</option>
    <option value="probability">Sort by Probability</option>
  </select>
  
  <button className="secondary-button">Clear Filters</button>
</div>
```

### Results Table

**Columns:**
- **Date/Time:** Timestamp of screening
- **Filename:** Original file name
- **Verdict:** Color-coded badge
- **Probability:** Percentage with confidence indicator
- **Actions:** View details, Export, Delete

**Features:**
- **Sortable:** Click column headers
- **Selectable:** Checkbox for bulk operations
- **Pagination:** 25/50/100 items per page
- **Row Hover:** Highlight with quick action preview

### Export Dialog

**Options:**
- **Export CSV:** Checkbox (default: checked)
- **Export Annotated Images:** Checkbox (default: checked)
- **Selected Only:** Checkbox for bulk operations
- **Destination:** Folder picker

---

## About/Help Screen

### Layout: Informational Cards

```
┌─────────────────────────────────────────────────────────┐
│ Header: Back + "About & Help"                           │
├─────────────────────────────────────────────────────────┤
│ App Information Card                                    │
│ - App Name, Version, Build Info                         │
│ - License, Attribution                                  │
├─────────────────────────────────────────────────────────┤
│ Disclaimer Card (Prominent)                             │
│ - Medical Disclaimer Text                               │
│ - Not a medical device warning                          │
├─────────────────────────────────────────────────────────┤
│ Help & Documentation Card                               │
│ - User Guide Link                                       │
│ - Keyboard Shortcuts                                    │
│ - FAQ Section                                           │
├─────────────────────────────────────────────────────────┤
│ Technical Information Card                              │
│ - Model Version, Training Data                          │
│ - System Requirements                                   │
└─────────────────────────────────────────────────────────┘
```

### Disclaimer Content

**Prominent Display:** Larger card, warning icon
**Text:** "NeuroScan is a research/educational screening aid. It is not a medical device and does not provide a diagnosis. A qualified clinician makes final decisions."
**Attribution:** Credits to dataset authors (Ahmed Hamada, Masoud Nickparvar)

### Keyboard Shortcuts (Comprehensive)

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

---

**Next:** [Component Specifications](./05-component-specifications.md)