# Companion Surface Base

Monorepo for Companion surface plugin libraries.

## Packages

- **[@companion-surface/base](packages/companion-surface-base/)** - Plugin API for writing surface integrations. Small, stable, versioned conservatively.
- **[@companion-surface/host](packages/companion-surface-host/)** - Host-side wrapper that runs plugins in-process. Handles API version compatibility and provides the interface to Companion.

## Development

```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# Run in watch mode
yarn dev

# Lint
yarn lint

# Run tests
yarn unit
```

## Creating a Surface Plugin

Use the [TypeScript template](https://github.com/bitfocus/companion-surface-template-ts) to get started.

Your plugin only needs to depend on `@companion-surface/base`. The host package is used by Companion itself.

## Architecture

Plugins implement the base API (`@companion-surface/base`). The host package wraps these plugins with additional logic, manages lifecycle, and bridges to Companion's core. This separation keeps the plugin API minimal and stable while allowing the host side to evolve more freely.
