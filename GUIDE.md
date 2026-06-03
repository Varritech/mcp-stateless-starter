# How to ship a stateless MCP server in 2026

> The 2026-07-28 MCP spec drops sticky sessions. Here's how to actually deploy one that scales.

## TL;DR

1. Drop the `Mcp-Session-Id` header from your server.
2. Make every tool call self-contained — no in-process memory between requests.
3. Route on `Mcp-Method` header at the LB if you want to shard heavy tools off cheap reads.
4. Set `ttlMs` on `tools/list` so clients cache it and stop hammering the discovery route.

That's it. Plain HTTP. Plain round-robin. No Redis. No sticky.

## The problem with 2025 MCP servers

If you shipped MCP in 2025, you probably did this:

```ts
const sessions = new Map<string, SessionState>();

app.post('/mcp', (req, res) => {
  const sid = req.headers['mcp-session-id'];
  const session = sessions.get(sid) ?? createSession();
  // ... handle request using session state
});
```

This worked until you scaled past one instance. Then:

- Load balancer needed sticky routing (cookie or IP hash) — instant bottleneck.
- Session map didn't survive deploys — every rollout broke active clients.
- Adding Redis "fixed" persistence but added a network hop per request.
- Horizontal scale was capped by the slowest instance holding the largest sessions.

## What the 2026 spec changed

Two headers removed: `Mcp-Session-Id` and `Mcp-Protocol-Version` (for stable clients). Any request lands on any instance. The server is now a pure function: `request → response`.

For state that genuinely belongs to the conversation (user IDs, project context), the **client** carries it — usually inside tool arguments or via a token the client refreshes itself.

## Minimal server (Node + Express)

```ts
import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { tools } from './tools.js';

const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
  const method = req.headers['mcp-method'] as string;
  const body = req.body;

  if (method === 'tools/list') {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json({ tools, ttlMs: 300_000 });
  }

  if (method === 'tools/call') {
    const tool = tools.find(t => t.name === body.params.name);
    if (!tool) return res.status(404).json({ error: 'unknown tool' });
    const result = await tool.handler(body.params.arguments);
    return res.json({ result });
  }

  res.status(400).json({ error: 'unsupported method' });
});

app.listen(3000);
```

That's the whole server. No session map. No background workers. No state.

## Routing on `Mcp-Method`

If you have one expensive tool (e.g. a code-execution sandbox) and a hundred cheap ones, you can shard at the LB without parsing JSON-RPC:

```nginx
location /mcp {
  set $upstream_pool "mcp_default";
  if ($http_mcp_method = "tools/call") {
    set $upstream_pool "mcp_heavy";
  }
  proxy_pass http://$upstream_pool;
}
```

Cheap reads stay on the small autoscaler. Tool calls go to the GPU-backed pool. No application changes.

## Client-side caching

Clients that respect `ttlMs` only call `tools/list` once per TTL window. For a 5-minute TTL on a server with 10K connected clients, you cut discovery traffic by a factor of 300+.

Set it generously — `tools/list` rarely changes, and clients can always invalidate on a 404 from `tools/call`.

## Deploy targets

The stateless model unlocks deploy targets that didn't make sense before:

- **Vercel/Netlify functions** — cold start fine, no persistent connections needed.
- **Cloudflare Workers** — sub-ms cold start, V8 isolates, perfect fit.
- **Cloud Run / Fly.io** — autoscale from zero, scale to zero between bursts.

All three were unusable for sticky-session MCP. All three are now first-class targets.

## When you still need state

Some tools genuinely need persistence — long-running tasks, queued jobs, batch uploads. The 2026 spec moved these into the `tasks` primitive, which uses an explicit task ID the client polls. State lives in your database, keyed by task ID, not in the MCP transport. The transport itself stays stateless.

## Migration checklist

- [ ] Remove every read of `Mcp-Session-Id` from request handlers.
- [ ] Audit tool handlers for closure state — move into request args or external store.
- [ ] Add `ttlMs` to `tools/list` response.
- [ ] Drop sticky routing config from your LB.
- [ ] Delete the Redis session store (or repurpose it for `tasks`).
- [ ] Deploy a second instance, confirm round-robin works.

## What's next

- **MCP Server Cards** (`.well-known/mcp-server`) — discovery without connecting. Ship one.
- **Tasks lifecycle** — retry semantics and expiry policies are landing in the next RC. If you have long-running tools, design for them now.
- **Enterprise extensions** — SSO + audit trails as lightweight add-ons, not core changes.

## Repo

Working example: [github.com/Varritech/mcp-stateless-starter](https://github.com/Varritech/mcp-stateless-starter)

Clone, `npm install`, deploy. Three minutes from zero to a running stateless MCP server.
