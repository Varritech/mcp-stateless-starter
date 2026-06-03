import express, { Request, Response } from 'express';
import { tools, callTool } from './tools.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.post('/mcp', async (req: Request, res: Response) => {
  const method = String(req.headers['mcp-method'] ?? req.body?.method ?? '');

  if (method === 'tools/list') {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json({
      jsonrpc: '2.0',
      id: req.body?.id ?? null,
      result: { tools, ttlMs: 300_000 },
    });
  }

  if (method === 'tools/call') {
    const name = req.body?.params?.name;
    const args = req.body?.params?.arguments ?? {};
    try {
      const result = await callTool(name, args);
      return res.json({ jsonrpc: '2.0', id: req.body?.id ?? null, result });
    } catch (err) {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: req.body?.id ?? null,
        error: { code: -32602, message: (err as Error).message },
      });
    }
  }

  res.status(400).json({
    jsonrpc: '2.0',
    id: req.body?.id ?? null,
    error: { code: -32601, message: `unsupported method: ${method}` },
  });
});

app.get('/.well-known/mcp-server', (_req, res) => {
  res.json({
    name: 'mcp-stateless-starter',
    version: '0.1.0',
    transport: { type: 'http', url: '/mcp' },
    capabilities: { tools: true, tasks: false },
  });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`mcp-stateless-starter listening on :${port}/mcp`);
});
