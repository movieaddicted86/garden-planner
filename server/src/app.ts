import express, { type Express } from 'express';
import { SCHEMA_VERSION } from '@garden-planner/shared';
import type { Config } from './config.js';

/** Builds the Express app: API routes first, then the built web app (if configured). */
export function createApp(config: Config): Express {
  const app = express();
  app.disable('x-powered-by');
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', schemaVersion: SCHEMA_VERSION });
  });
  if (config.webDist) app.use(express.static(config.webDist));
  return app;
}
