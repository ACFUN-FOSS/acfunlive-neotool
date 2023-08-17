import type { Session, loginResponse } from 'acfunlive-backend-js/tauri.js';
import type { Readable } from 'svelte/store';

import type { UserInfo } from './src/session.js';
import type { SessionState } from './src/state.js';

export * from './src/session.js';
export * from './src/state.js';

export type SharedData = {
  state: Readable<SessionState>;
  token: Readable<loginResponse | undefined>;
  userInfoMap: Readable<Map<number, UserInfo>>;
};

export type AppShared = {
  session: Session;
  data: SharedData;
  enable: Readable<boolean>;
};
