# @companion-surface/base

This module provides the base class and framework needed to write a surface integration for [Companion 4.x](https://github.com/bitfocus/companion) and later in NodeJS.

In the future it may be possible to write modules in other languages, but it is not recommended as it will reduce the change of gettings other in the community to contribute features and fixes. If you interested in doing this then reach out and we can work together on creating an alternate framework for the language you are using.

## Inspiration

This library is based on the [@companion-module/base](https://github.com/bitfocus/companion-module-base/) library, but is not a 1-1 match in design.

Key differences:

- In this library, each module/plugin handles all surfaces of the given type.
- Threading is handled in the host application. This is to allow greater ability for the host to provide some class implementations (TBD if this is a good idea)

## Supported versions of this library

Each version of Companion supports a limited range of versions of this library listed below. Any patch version (the third number) are not relevant for the compatibility check, so are not listed here

| Companion | Module-base               |
| --------- | ------------------------- |
| v4.x      | v1.0 - v1.0 (unconfirmed) |

## Getting started with a new surface

To get started with creating a new surface, you should start with one of the following templates. These should be kept up to date, but you should make sure all the dependencies are up to date before you begin.

- https://github.com/bitfocus/companion-surface-template-ts (TypeScript)

## Documentation

You can view detailed generated documentation [here](https://bitfocus.github.io/companion-surface-base/).

Or refer to [the wiki](https://github.com/bitfocus/companion-surface-base/wiki) for a more handwritten version
