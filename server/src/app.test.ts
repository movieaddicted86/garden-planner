import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { SCHEMA_VERSION } from '@garden-planner/shared';
import { createApp } from './app.js';

test('GET /api/health reports ok and the schema version', async () => {
  const server = createApp({ port: 0, dataDir: '/tmp', webDist: null }).listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok', schemaVersion: SCHEMA_VERSION });
  } finally {
    server.close();
  }
});
