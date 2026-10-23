import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
createApp(config).listen(config.port, () => {
  console.warn(`garden-planner listening on :${config.port} (data: ${config.dataDir})`);
});
