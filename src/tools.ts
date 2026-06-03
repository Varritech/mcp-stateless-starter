export type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
};

export const tools: Omit<Tool, 'handler'>[] = [
  {
    name: 'echo',
    description: 'Echoes the input string back. Useful for connectivity tests.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
    },
  },
  {
    name: 'now',
    description: 'Returns the current server time in ISO 8601 UTC.',
    inputSchema: { type: 'object', properties: {} },
  },
];

const handlers: Record<string, Tool['handler']> = {
  echo: async (args) => ({ content: [{ type: 'text', text: String(args.text ?? '') }] }),
  now: async () => ({ content: [{ type: 'text', text: new Date().toISOString() }] }),
};

export async function callTool(name: string, args: Record<string, unknown>) {
  const handler = handlers[name];
  if (!handler) throw new Error(`unknown tool: ${name}`);
  return handler(args);
}
