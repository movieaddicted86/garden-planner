import assert from 'node:assert/strict';
import { test } from 'node:test';
import { APP_NAME } from './app-info.js';

test('the app has a name', () => {
  assert.equal(APP_NAME, 'Garden Planner');
});
