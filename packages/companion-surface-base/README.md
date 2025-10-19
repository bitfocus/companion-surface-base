# @companion-surface/base

Plugin API for writing surface integrations for [Companion](https://github.com/bitfocus/companion).

## Installation

```bash
yarn add @companion-surface/base
```

## Usage

Implement the `SurfacePlugin` interface to create a surface integration. Your plugin handles all surfaces of a given type.

```typescript
import { SurfacePlugin, SurfaceContext } from '@companion-surface/base'

export const MySurfacePlugin: SurfacePlugin = {
  async init(): Promise<void> {
    // Initialize your plugin
  }

  async destroy(): Promise<void> {
    // Clean up
  }

  // Implement detection or manual connection methods
}
```

Check the [template repository](https://github.com/bitfocus/companion-surface-template-ts) for a complete example.

## Supported Versions

| Companion | Module-base |
| --------- | ----------- |
| v4.x      | v1.0        |

## Documentation

- [Generated API docs](https://bitfocus.github.io/companion-surface-base/)
- [Wiki](https://github.com/bitfocus/companion-surface-base/wiki)

## Development

This package is part of a monorepo. See the root README for development instructions.
