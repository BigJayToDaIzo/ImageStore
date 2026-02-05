# ImageStore

HIPAA-compliant medical image management for cosmetic surgery practices.

## Development

```bash
bun install          # Install dependencies
bun run dev          # Start dev server at localhost:4321
```

## Building Desktop App

```bash
bun run dist:mac       # Mac ARM (M1/M2/M3)
bun run dist:mac-intel # Mac Intel
bun run dist:win       # Windows
bun run dist:linux     # Linux
```

Output is in `release/` folder.

## Tech Stack

- **Frontend:** Astro + Svelte 5
- **Desktop:** Electron
- **Runtime:** Bun

## Documentation

See [CLAUDE.md](./CLAUDE.md) for detailed architecture and development notes.
