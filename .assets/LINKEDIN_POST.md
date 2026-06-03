# LinkedIn Post — Hormozi (Hook · Retain · Reward)

The 2026 MCP spec just deleted the hardest part of running an MCP server in production.

If you've been fighting sticky sessions, Redis session stores, and load-balancer hacks to keep your MCP server running across more than one instance — that work just became unnecessary.

The new transport (2026-07-28 RC) is **stateless HTTP**. No `Mcp-Session-Id` header. No session map. No sticky routing. Any request lands on any instance. Plain round-robin works.

Three things that change overnight:

1. **Deploy targets unlock.** Cloudflare Workers, Vercel functions, Cloud Run autoscale — all unusable for sticky-session MCP. All now first-class.
2. **Discovery traffic collapses.** Server returns `ttlMs` on `tools/list`, clients cache. 10K clients × 5min TTL = ~300× less discovery traffic.
3. **The session map dies.** State that genuinely needs to persist (long-running tasks, queued jobs) moves into the explicit `tasks` primitive — keyed by task ID, stored in your DB. The transport itself stays stateless.

I built a starter that compresses the migration into one diff. Node 22, TypeScript, Express, ~80 LOC. Deploys to Vercel, Fly, or Cloudflare Workers without code changes.

Fork it: https://github.com/Varritech/mcp-stateless-starter

What's still being figured out: retry semantics for `tasks` lifecycle, expiry policies for completed tasks, audit trails for enterprise. Worth tracking before you build long-running tools on top of it.

If you ship MCP servers, the 2026 spec is the moment to drop the session-map code. The protocol now agrees with you.
