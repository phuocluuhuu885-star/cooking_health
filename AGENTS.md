# Project Instructions

Before starting work in this repository, read and follow this file.

## UI and React

- Do not define functions inline in JSX or render expressions. Keep event handlers and helpers as named functions outside the JSX; use `useCallback` when a stable callback is useful.
- Optimize rendering and runtime performance. Avoid unnecessary work, state, effects, and abstractions.
- Keep React hook dependencies complete and minimal: include every value used by the hook, and do not add unrelated dependencies.
- Build responsive screens that work across supported device sizes.
- Use `borderRadius: 10` for boxes and cards, and `borderRadius: 8` for buttons.

## User-facing text

- Make descriptions clear, direct, and specific to the relevant context.
- Avoid generic copy that merely explains what a feature does.
