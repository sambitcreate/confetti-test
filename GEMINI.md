# AGENTS.md

## Build Commands
- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- Preferred package manager: `yarn` (lockfile present). Use `yarn dev/build` equivalents locally.

## Code Style Guidelines

### Imports & Formatting
- Use absolute imports with `@/` prefix (configured in vite.config.ts and tsconfig.json)
- React imports: `import React, { useEffect, useRef } from 'react';`
- Group imports: React first, then external libraries, then internal modules
- Keep styling monochrome (black/white) per current New York-inspired theme; avoid text gradients.

### TypeScript
- Use explicit types for interfaces: `React.FC<InterfaceName>`
- Define interfaces in separate files when reused (see utils/types.ts)
- Use `const` for function components with explicit return types

### Naming Conventions
- Components: PascalCase (e.g., `HandController`, `SlingshotCanvas`)
- Functions/variables: camelCase
- Interfaces: PascalCase with descriptive names (e.g., `HandInputData`)
- Constants: UPPER_SNAKE_CASE for exports (e.g., `PRELOAD_IMAGES_SRC`)

### Error Handling
- Use try-catch blocks for async operations
- Provide user-friendly error messages with actionable guidance
- Handle browser-specific errors (camera permissions, API availability)

### React Patterns
- Use `useCallback` for event handlers and functions passed to children
- Use `useEffect` with proper cleanup for subscriptions and media streams
- Prefer functional components with hooks over class components
