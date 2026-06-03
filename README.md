# Stateless MCP Server Starter (2026 Spec)

Production-ready Model Context Protocol server that scales horizontally on plain HTTP — no sticky sessions, no shared Redis, no deep packet inspection at the gateway. Aligned with the **2026-07-28 MCP Specification Release Candidate**.

## Why stateless

The 2025 MCP transport required sticky sessions and a shared session store to survive horizontal scale-out. The 2026 spec drops both. Any MCP request can land on any instance behind a round-robin load balancer.

This repo is the minimum example: an MCP server exposing two tools (`echo`, `now`) using the stateless HTTP transport, deployable to Vercel/Fly/Cloudflare Workers without changes.

## Stack

- Node 22 + TypeScript
- `@modelcontextprotocol/sdk` (HTTP transport)
- Zero state — every request is self-contained
- Routes on `Mcp-Method` header so reverse proxies can shard without parsing JSON-RPC

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000/mcp
npm run test:client  # runs against local server
```

## Deploy

```bash
# Vercel
vercel deploy

# Fly.io
fly launch

# Cloudflare Workers
wrangler deploy
```

All three work because the server holds **zero session state** between requests.

## What changed vs 2025 transport

| 2025 (SSE + sessionId) | 2026 (stateless HTTP) |
|---|---|
| `Mcp-Session-Id` header required | No session header |
| Server holds session map | Server holds nothing |
| Sticky LB required | Round-robin LB works |
| `tools/list` re-requested per session | Cached client-side per `ttlMs` |
| SSE stream for server→client | Server-Sent Events optional, only for `tasks` primitive |

## File map

- `src/server.ts` — Express server, single `/mcp` POST route
- `src/tools.ts` — tool definitions (`echo`, `now`)
- `src/client.ts` — example client that connects + calls a tool
- `vercel.json` — zero-config Vercel deploy
- `Dockerfile` — for Fly/Cloud Run

## Resources

- [2026-07-28 MCP Spec RC](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- [2026 MCP Roadmap](https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/)
- [MCP Server Cards spec](https://modelcontextprotocol.io/development/roadmap)

## License

MIT — fork freely.

---

Built by [Varritech](https://varritech.com). We turn AI prototypes into shipped products.
