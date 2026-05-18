# openx

An Electron application with React, TypeScript, Vite, and shadcn/ui.

## Stack

- **Electron** - Desktop app framework
- **React 19** - UI library
- **Vite 7** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **shadcn/ui** - Component library
- **electron-vite** - Build tooling
- **electron-builder** - Packaging

## Project Structure

```
src/
├── main/           # Electron main process (Node.js)
├── preload/        # Preload scripts (context bridge)
└── renderer/       # React app (Chromium)
    └── src/
        ├── components/ui/   # shadcn components
        ├── lib/utils.ts     # Utility functions (cn helper)
        └── App.tsx          # Root component
```

## Setup

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm dev
```

### Build

```bash
# For Windows
npm build:win

# For macOS
npm build:mac

# For Linux
npm build:linux
```

### Adding shadcn Components

```bash
# Add a component
npx shadcn@latest add button

# Add multiple components
npx shadcn@latest add button dialog card
```

## Key Configuration Files

| File                      | Purpose                               |
| ------------------------- | ------------------------------------- |
| `electron.vite.config.ts` | Vite config for main/preload/renderer |
| `electron-builder.yml`    | Packaging config for installers       |
| `components.json`         | shadcn CLI configuration              |
| `tsconfig.web.json`       | TypeScript config with path aliases   |

## Path Aliases

The project uses these path aliases:

- `@/*` → `src/renderer/src/*` (for shadcn components)
- `@renderer/*` → `src/renderer/src/*` (legacy)

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
