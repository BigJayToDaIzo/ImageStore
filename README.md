# ImageStore

HIPAA-compliant medical image management for cosmetic surgery practices.

## Development

```bash
bun install          # Install dependencies
bun run dev          # Start dev server at localhost:4321
bun run preview      # Build + run in Wrangler (Cloudflare emulator)
bun test             # Run tests
```

**Requires Chrome** — File System Access API is not supported in Firefox or Safari at this time.

## Deployment

```bash
bun run deploy       # Build + push to Cloudflare Pages
```

## Tech Stack

- **Frontend:** Astro 5 + Svelte 5
- **Storage:** File System Access API + IndexedDB
- **Hosting:** Cloudflare Pages
- **Runtime:** Bun

## Documentation

See [CLAUDE.md](./CLAUDE.md) for detailed architecture and development notes.
