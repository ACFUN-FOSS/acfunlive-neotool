import type { Session, loginResponse } from 'acfunlive-backend-js/tauri.js';
import type { Readable } from 'svelte/store';

export enum SessionState {
  Disconnect,
  Connect,
  Login,
  GetDanmaku
}

export type UserInfo = {
  userID: number;
  nickname: string;
  avatar: string;
};

export type SharedData = {
  state: Readable<SessionState>;
  token: Readable<loginResponse | undefined>;
  userInfo: Readable<UserInfo | undefined>;
};

export type AppShared = {
  session: Session;
  data: SharedData;
  enable: Readable<boolean>;
};
