import type {
  Session,
  loginRequest,
  tokenInfo,
  getUserInfoResponse
} from 'acfunlive-backend-js/tauri.js';
import { writable, get, type Writable } from 'svelte/store';

import { SessionState } from './state.js';

export type UserInfo = {
  userID: number;
  nickname: string;
  avatar: string;
};

export class SessionData {
  id: number;
  session: Session;
  state: Writable<SessionState>;
  loginInfo: Writable<loginRequest | undefined>;
  token: Writable<tokenInfo | undefined>;
  /** key为0时是主播的信息 */
  userInfoMap: Writable<Map<number, UserInfo>>;

  constructor(session: Session, loginInfo?: loginRequest) {
    this.id = 0;
    this.session = session;
    this.state = writable(new SessionState());
    this.loginInfo = writable(loginInfo);
    this.token = writable(undefined);
    this.userInfoMap = writable(new Map());
  }

  connect(): () => void {
    this.session.connect();
    const openUnsubscribe = this.session.on('websocketOpen', () => {
      this.id += 1;
      this.state.update((state) => state.connect());
      this.loginCyclically();
    });
    const closeUnsubscribe = this.session.on('websocketClose', () => {
      // 断开会自动重连
      this.state.update((state) => state.disconnect());
    });
    const errorUnsubscribe = this.session.on('websocketError', () => {
      // 出现错误会断开重连
      this.state.update((state) => state.disconnect());
    });
    const danmakuStopUnsubscribe = this.session.on('danmakuStop', () => {
      if (this.session.isConnecting() && get(this.state).isGetDanmaku()) {
        this.state.update((state) => state.cancelGetDanmaku());
      }
    });
    const danmakuStopErrorUnsubscribe = this.session.on('danmakuStopError', () => {
      if (this.session.isConnecting() && get(this.state).isGetDanmaku()) {
        this.state.update((state) => state.cancelGetDanmaku());
      }
    });

    return () => {
      this.state.update((state) => state.disconnect());
      this.token.set(undefined);
      openUnsubscribe();
      closeUnsubscribe();
      errorUnsubscribe();
      danmakuStopUnsubscribe();
      danmakuStopErrorUnsubscribe();
      this.session.disConnect();
    };
  }

  async login(id?: number): Promise<void> {
    if (id === undefined) {
      id = this.id;
    }

    function canContinue(session: SessionData): boolean {
      return session.session.isConnecting() && session.id === id && get(session.state).isConnect();
    }

    if (canContinue(this)) {
      let token = get(this.token);
      if (token) {
        await this.session.asyncRequest('setToken', token);
        if (canContinue(this)) {
          this.state.update((state) => state.login());
        }
      } else {
        token = (
          await this.session.asyncRequest(
            'login',
            get(this.loginInfo) || { account: '', password: '' }
          )
        ).data;
        if (canContinue(this)) {
          this.token.set(token);
          this.state.update((state) => state.login());
        }
      }
    }
  }

  async loginCyclically(): Promise<void> {
    const id = this.id;

    for (;;) {
      try {
        await this.login(id);

        return;
      } catch {
        await delay(10000);
      }
    }
  }

  async getDanmaku(liverUID: number, isLiver: boolean = false, id?: number): Promise<void> {
    if (liverUID <= 0) {
      throw new Error(`liver UID is less than 1: ${liverUID}`);
    }
    if (id === undefined) {
      id = this.id;
    }

    function canContinue(session: SessionData): boolean {
      return (
        session.session.isConnecting() &&
        session.id === id &&
        get(session.token) !== undefined &&
        get(session.state).isLogin()
      );
    }

    function updateUserInfo(session: SessionData, liverUID: number, info: getUserInfoResponse) {
      const user = get(session.userInfoMap).get(liverUID);
      if (
        !(
          user &&
          user.userID === info.userID &&
          user.nickname === info.nickname &&
          user.avatar === info.avatar
        )
      ) {
        session.userInfoMap.update((map) => map.set(liverUID, info));
      }
    }

    if (canContinue(this)) {
      const info = (await this.session.asyncRequest('getUserInfo', { userID: liverUID })).data;
      updateUserInfo(this, liverUID, info);
      if (canContinue(this)) {
        if (isLiver) {
          updateUserInfo(this, 0, info);
        }

        if (info.liveID.length > 0) {
          await this.session.asyncRequest('getDanmaku', { liverUID });
          if (canContinue(this)) {
            this.state.update((state) => state.getDanmaku());
          }
        }
      }
    }
  }

  async getDanmakuCyclically(liverUID: number, isLiver: boolean = false): Promise<void> {
    const id = this.id;

    for (;;) {
      try {
        return await this.getDanmaku(liverUID, isLiver, id);
      } catch {
        await delay(10000);
      }
    }
  }

  async stopDanmaku(liverUID: number, id?: number): Promise<void> {
    if (liverUID <= 0) {
      throw new Error(`liver UID is less than 1: ${liverUID}`);
    }
    if (id === undefined) {
      id = this.id;
    }

    if (
      this.session.isConnecting() &&
      this.id === id &&
      get(this.token) &&
      get(this.state).isGetDanmaku()
    ) {
      await this.session.asyncRequest('stopDanmaku', { liverUID: liverUID });
    }
  }

  async stopDanmakuCyclically(liverUID: number): Promise<void> {
    const id = this.id;

    for (;;) {
      try {
        await this.stopDanmaku(liverUID, id);

        return;
      } catch {
        await delay(10000);
      }
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
