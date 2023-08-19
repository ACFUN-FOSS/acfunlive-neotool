import type { Session } from 'acfunlive-backend-js/tauri.js';
import { type Readable, readonly } from 'svelte/store';

import type { TokenInfo, UserInfo, StreamInfo, SessionData } from './src/session.js';
import type { SessionState } from './src/state.js';

export * from './src/message.js';
export * from './src/session.js';
export * from './src/state.js';

export type AppConfig = {
  id: string;
  name: string;
  path: string;
  description?: string;
  entry: string;
  css?: string;
};

export class SharedData {
  state: Readable<SessionState>;

  liverUID: Readable<number | undefined>;

  token: Readable<TokenInfo | undefined>;

  userInfoMap: Readable<Map<number, UserInfo>>;

  streamInfoMap: Readable<Map<number, StreamInfo>>;

  getDanmakuCycleSet: Readable<Set<number>>;

  constructor(session: SessionData) {
    this.state = session.stateReadable;
    this.liverUID = readonly(session.liverUID);
    this.token = readonly(session.token);
    this.userInfoMap = session.userInfoMapReadable;
    this.streamInfoMap = session.streamInfoMapReadable;
    this.getDanmakuCycleSet = session.getDanmakuCycleSetReadable;
  }
}

export type AppData = {
  session: Session;
  config: AppConfig;
  data: SharedData;
  enable: Readable<boolean>;
};
