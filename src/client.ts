const base = process.env.MCP_URL ?? 'http://localhost:3000/mcp';

async function call(method: string, body: Record<string, unknown>) {
  const res = await fetch(base, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'mcp-method': method },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, ...body }),
  });
  return res.json();
}

async function main() {
  console.log('tools/list →', await call('tools/list', {}));
  console.log(
    'tools/call echo →',
    await call('tools/call', { params: { name: 'echo', arguments: { text: 'hello stateless' } } }),
  );
  console.log(
    'tools/call now →',
    await call('tools/call', { params: { name: 'now', arguments: {} } }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
