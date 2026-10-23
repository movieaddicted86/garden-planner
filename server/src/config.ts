/** Typed runtime configuration; the only place that reads `process.env`. */
export interface Config {
  port: number;
  dataDir: string;
  /** Directory of the built web app; when unset the server serves the API only. */
  webDist: string | null;
}

/** Reads the configuration from an environment map (injectable for tests). */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = Number(env.PORT ?? 8080);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error(`invalid PORT: ${env.PORT}`);
  return { port, dataDir: env.DATA_DIR ?? '/data', webDist: env.WEB_DIST ?? null };
}
