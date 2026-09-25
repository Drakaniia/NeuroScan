# NeuroScan Desktop

The Tauri desktop application for NeuroScan.

## Tech Stack

- **Tauri** - Desktop app framework
- **TanStack Router** - File-based routing
- **React** - UI framework
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

## Development

Install dependencies:
```bash
bun install
```

Run development server:
```bash
bun run dev
```

Run Tauri dev mode:
```bash
bun run tauri dev
```

Build for production:
```bash
bun run tauri build
```

## Project Structure

```
src/
├── routes/           # TanStack Router file-based routes
│   ├── __root.tsx    # Root layout
│   └── index.tsx     # Home page
├── components/       # React components
├── main.tsx          # App entry point
└── index.css         # Global styles

src-tauri/
├── src/
│   └── main.rs       # Rust entry point
├── Cargo.toml        # Rust dependencies
└── tauri.conf.json   # Tauri configuration
```

## Routing

This project uses TanStack Router with file-based routing. Routes are defined in the `src/routes/` directory following the pattern:
- `__root.tsx` - Root layout
- `index.tsx` - Home page (/)
- `about.tsx` - About page (/about)
- `dashboard.tsx` - Dashboard page (/dashboard)
