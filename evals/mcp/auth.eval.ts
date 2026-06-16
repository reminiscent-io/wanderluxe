import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { signInEvalUser } from '../helpers/auth';
import { missingEnv } from '../helpers/env';
import { connectMcp, toolErrorText } from '../helpers/mcpClient';
import { recordSuiteSkip, runCase } from '../helpers/runCase';
import { INACCESSIBLE_TRIP_ID } from '../fixtures/trips';

const REQUIRED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'EVAL_USER_EMAIL', 'EVAL_USER_PASSWORD'];
const missing = missingEnv(REQUIRED);
recordSuiteSkip('mcp-auth', missing);

const INITIALIZE_RPC = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'wanderluxe-evals', version: '0.0.1' },
  },
};

function postMcp(baseUrl: string, headers: Record<string, string>) {
  return fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: JSON.stringify(INITIALIZE_RPC),
  });
}

describe.skipIf(missing.length > 0)('mcp auth & discovery', () => {
  const baseUrl = () => process.env.EVALS_BASE_URL!;

  it('missing Authorization → 401 with resource_metadata hint', () =>
    runCase('mcp-auth', 'no-token-401', async () => {
      const res = await postMcp(baseUrl(), {});
      expect(res.status).toBe(401);
      const www = res.headers.get('www-authenticate') ?? '';
      expect(www).toContain('Bearer');
      expect(www).toContain('resource_metadata=');
      expect(www).toContain('/.well-known/oauth-protected-resource/mcp');
    }));

  it('garbage and unsigned tokens → 401', () =>
    runCase('mcp-auth', 'bad-token-401', async () => {
      const garbage = await postMcp(baseUrl(), { Authorization: 'Bearer not-a-jwt' });
      expect(garbage.status).toBe(401);
      // Structurally valid JWT, but not signed by the Supabase issuer.
      const forged =
        'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJhdWQiOiJhdXRoZW50aWNhdGVkIn0.' +
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const forgedRes = await postMcp(baseUrl(), { Authorization: `Bearer ${forged}` });
      expect(forgedRes.status).toBe(401);
    }));

  describe('with a valid token', () => {
    let client: Client;

    beforeAll(async () => {
      const { token } = await signInEvalUser();
      client = await connectMcp(baseUrl(), token);
    });

    afterAll(async () => {
      await client?.close();
    });

    it('invisible trip → indistinguishable "not found" tool error (RLS)', () =>
      runCase('mcp-auth', 'rls-indistinguishable', async () => {
        const result = await client.callTool({
          name: 'get_trip',
          arguments: { trip_id: INACCESSIBLE_TRIP_ID },
        });
        expect((result as { isError?: boolean }).isError).toBe(true);
        expect(toolErrorText(result)).toBe('Trip not found, or you do not have access to it.');
      }));

    it('budget for invisible trip → same indistinguishable error', () =>
      runCase('mcp-auth', 'rls-budget', async () => {
        const result = await client.callTool({
          name: 'get_trip_budget',
          arguments: { trip_id: INACCESSIBLE_TRIP_ID },
        });
        expect((result as { isError?: boolean }).isError).toBe(true);
        expect(toolErrorText(result)).toBe('Trip not found, or you do not have access to it.');
      }));

    it('malformed (non-UUID) trip_id → schema validation error', () =>
      runCase('mcp-auth', 'schema-validation', async () => {
        // The McpServer enforces the zod .uuid() input schema and surfaces the
        // failure as an isError tool result (JSON-RPC -32602 "Invalid params"),
        // not as a thrown protocol error — the SDK only throws for transport or
        // handshake failures, not tool-input validation.
        const result = await client.callTool({ name: 'get_trip', arguments: { trip_id: 'not-a-uuid' } });
        expect((result as { isError?: boolean }).isError).toBe(true);
        expect(toolErrorText(result)).toMatch(/validation|uuid|invalid/i);
      }));
  });

  it('discovery: protected-resource metadata names the Supabase issuer', () =>
    runCase('mcp-auth', 'discovery', async () => {
      const res = await fetch(`${baseUrl()}/.well-known/oauth-protected-resource/mcp`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.resource).toMatch(/\/mcp$/);
      expect(body.authorization_servers).toEqual([`${process.env.VITE_SUPABASE_URL}/auth/v1`]);
      expect(body.bearer_methods_supported).toContain('header');
    }));
});
