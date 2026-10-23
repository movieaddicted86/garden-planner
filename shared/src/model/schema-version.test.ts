import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SCHEMA_VERSION } from './schema-version.js';

test('the schema version is a positive integer', () => {
  assert.ok(Number.isInteger(SCHEMA_VERSION) && SCHEMA_VERSION >= 1);
});
