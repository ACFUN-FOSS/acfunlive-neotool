import type { Readable } from 'svelte/store';

import type { SessionData } from './src/session.js';

export * from './src/message.js';
export * from './src/session.js';
export * from './src/state.js';
export * from './src/svg.js';

export const webDirName = 'web';

export type AppConfig = {
  id: string;
  name: string;
  path: string;
  description?: string;
  entry: string;
  css?: string;
};

export type AppData = {
  session: SessionData;
  config: AppConfig;
  enable: Readable<boolean>;
};
