# RCT Hub

The official website and match platform for **Ranka's Chess Tournament**.

## Tech Stack

- Next.js 16, React 19, App Router
- HeroUI v3, TanStack Query v5
- Tailwind CSS v4
- GraphQL Codegen (client preset)
- MDX content for `/rules`, `/news`, `/format`, `/prizes`

## Scripts

```bash
pnpm dev               # local development
pnpm build             # production build (uses output: "standalone" — see next.config.ts)
pnpm start             # serve the built bundle
pnpm typecheck
pnpm lint
pnpm test              # vitest, both unit and component projects
pnpm codegen           # regenerate GraphQL operations from schema.graphql
```

## Deployment

The app is built with `output: "standalone"` — `pnpm build` emits a
self-contained `server.js` plus `.next/static/`, no `node_modules` required at
runtime. The `Dockerfile` in this repo packages the standalone output.

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_BASE=https://api.example.com \
  --build-arg NEXT_PUBLIC_WS_BASE=wss://api.example.com \
  --build-arg NEXT_PUBLIC_SITE_URL=https://www.example.com \
  -t rct-hub:prod .

docker run --rm -p 3000:3000 -e PORT=3000 -e HOSTNAME=0.0.0.0 rct-hub:prod
```

Configuration values starting with `NEXT_PUBLIC_` are **baked into the
client bundle at build time** — they cannot be changed by environment variables
at runtime. If you need different URLs, rebuild the image.

Recommended production topology on Aliyun:

1. Build the image locally or in CI, push to Alibaba Container Registry
2. Run on the same ECS as the backend (loopback:3000 → nginx → 443)
3. Front static + MDX content through Aliyun DCDN; let `/admin`,
   `/auth/*`, and `/rooms/*` fall through to the SSR origin
4. WebSocket endpoints (`/ws/match`) are not cached by CDN; clients open them
   directly against `wss://api.example.com/ws/match`

See `rctHubBackend/deploy/README.md` for the full operator guide covering
backend + frontend together.
