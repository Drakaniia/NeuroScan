# NeuroScan

A Tauri desktop application for neuroscan analysis with TanStack Router.

## Project Structure

This is a mono-repo organized as follows:

```
NeuroScan/
├── apps/              # Applications
│   └── desktop/       # Tauri desktop app (React + TanStack Router)
├── packages/          # Shared packages
├── docs/              # Research and documentation
│   ├── chapters/      # Thesis chapters
│   ├── figures/       # Diagrams and visualizations
│   ├── scripts/       # Build and utility scripts
│   └── sources/       # Verified research sources
├── .agent/            # Agent configuration
├── .freebuff/         # Freebuff configuration
└── AGENTS.md          # Agent instructions
```

## Development

The desktop application uses:
- **Tauri** - Desktop app framework
- **TanStack Router** - File-based routing
- **React** - UI framework
- **Bun** - Package manager

## Documentation

Research documentation, thesis chapters, and related materials are located in the `docs/` directory.

## Getting Started

1. Install dependencies:
   ```bash
   bun install
   ```

2. Run the desktop app:
   ```bash
   cd apps/desktop
   bun run tauri dev
   ```

## License

[Your License Here]
