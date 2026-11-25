# NeuroScan Agent Instructions

## Project Structure

This is a mono-repo organized as follows:

```
NeuroScan/
├── apps/              # Applications
│   └── desktop/       # Tauri desktop app (React + TanStack Router)
├── packages/          # Shared packages
│   ├── ui/           # Shared React components
│   ├── utils/        # Shared utility functions
│   └── types/        # Shared TypeScript types
├── docs/              # Research and documentation
│   ├── chapters/      # Thesis chapters
│   ├── figures/       # Diagrams and visualizations
│   ├── research/      # Research materials and specifications
│   ├── scripts/       # Build and utility scripts
│   └── sources/       # Verified research sources
├── .agent/            # Agent configuration
└── AGENTS.md          # This file
```

## Development Stack

- **Tauri** - Desktop app framework
- **TanStack Router** - File-based routing
- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **pnpm** - Package manager

## Key Rules

1. **Always read SKILL.md** - Don't skip it! (Located at project root for source-grounded writing)
2. **Follow mono-repo conventions** - Use workspaces for package management
3. **File-based routing** - Routes are defined in `apps/desktop/src/routes/`
4. **Shared code** - Place reusable code in `packages/` only when used by 3+ features
5. **Research materials** - All academic content goes in `docs/`

## Working with Research

When working with thesis chapters or research materials:
- All source citations must be verified in `docs/sources/verified-sources.md`
- Follow the source-grounded writing methodology
- Academic claims require citations; app assertions do not

## Development Commands

- `pnpm install` - Install all dependencies
- `pnpm run dev` - Run desktop app dev server
- `pnpm run tauri:dev` - Run Tauri dev mode
- `pnpm run tauri:build` - Build for production