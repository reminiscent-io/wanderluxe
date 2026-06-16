import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { EvalInfraError } from './errors';

export async function connectMcp(baseUrl: string, token: string): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  const client = new Client({ name: 'wanderluxe-evals', version: '0.0.1' });
  try {
    await client.connect(transport);
  } catch (err) {
    throw new EvalInfraError(
      `MCP connect failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return client;
}

// Tool results are { content: [{ type: 'text', text: <JSON> }], isError? }.
export function toolJson(result: unknown): any {
  const content = (result as { content?: Array<{ type: string; text?: string }> }).content;
  const item = content?.[0];
  if (!item || item.type !== 'text' || typeof item.text !== 'string') {
    throw new Error(`tool returned no text content: ${JSON.stringify(result).slice(0, 200)}`);
  }
  return JSON.parse(item.text);
}

export function toolErrorText(result: unknown): string {
  const r = result as { isError?: boolean; content?: Array<{ text?: string }> };
  if (!r.isError) throw new Error('expected an isError tool result');
  return r.content?.[0]?.text ?? '';
}
