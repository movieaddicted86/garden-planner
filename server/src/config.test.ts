import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadConfig } from './config.js';

test('defaults', () => {
  assert.deepEqual(loadConfig({}), { port: 8080, dataDir: '/data', webDist: null });
});

test('reads the environment', () => {
  assert.deepEqual(loadConfig({ PORT: '3000', DATA_DIR: '/x', WEB_DIST: '/w' }), { port: 3000, dataDir: '/x', webDist: '/w' });
});

test('rejects an invalid port', () => {
  assert.throws(() => loadConfig({ PORT: 'abc' }), /invalid PORT/);
});
