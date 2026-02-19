# ImageStore

HIPAA-compliant medical image management for cosmetic surgery practices.

## Development

```bash
bun install          # Install dependencies
bun run dev          # Start dev server at localhost:4321
```

## Building Desktop App

```bash
bun run tauri:build                    # Build for current platform
bun run tauri:build --bundles appimage # Linux AppImage
```

CI builds all platforms (Linux, Windows, Mac ARM, Mac Intel) on tag push.

## Tech Stack

- **Frontend:** Astro + Svelte 5
- **Desktop:** Tauri 2
- **Runtime:** Bun (dev), Node 22 (bundled sidecar)

## Documentation

See [CLAUDE.md](./CLAUDE.md) for detailed architecture and development notes.
