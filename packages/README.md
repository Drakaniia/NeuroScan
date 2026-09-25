# Shared Packages

This directory contains shared packages that can be used across the NeuroScan mono-repo.

## Available Packages

### @neuroscan/ui
Shared React UI components for NeuroScan applications.

### @neuroscan/utils
Shared utility functions and helpers.

### @neuroscan/types
Shared TypeScript type definitions and interfaces.

## Usage

Install a package in an app:
```bash
cd apps/desktop
bun add @neuroscan/ui
```

Import in your code:
```typescript
import { Button } from "@neuroscan/ui";
import { formatDate } from "@neuroscan/utils";
import { User } from "@neuroscan/types";
```

## Adding New Packages

1. Create a new directory in `packages/`
2. Add a `package.json` with a scoped name (`@neuroscan/package-name`)
3. Set up TypeScript configuration
4. Add the package to the root `package.json` workspaces array
