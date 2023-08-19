import type {
  Session,
  loginRequest,
  tokenInfo,
  getUserInfoResponse,
  streamInfo,
  unsubscribe
} from 'acfunlive-backend-js/tauri.js';
import { writable, get, readonly, type Writable } from 'svelte/store';

import type { MessageType, Message } from './message.js';
import { SessionState } from './state.js';

export type LoginData = loginRequest;

export type TokenInfo = tokenInfo;

export type UserInfo = getUserInfoResponse;

export type StreamInfo = streamInfo;

export class SessionData {
  #id: number;

  session: Session;

  #state: Writable<SessionState>;

  #clientID: string;

  liverUID: Writable<number | undefined>;

  loginData: Writable<LoginData | undefined>;

  token: Writable<TokenInfo | undefined>;

  #userInfoMap: Writable<Map<number, UserInfo>>;

  #streamInfoMap: Writable<Map<number, StreamInfo>>;

  #getDanmakuCycleSet: Writable<Set<number>>;

  constructor(session: Session, clientID: string, loginInfo?: loginRequest, liverUID?: number) {
    this.#id = 0;
    this.session = session;
    this.#state = writable(new SessionState());
    this.#clientID = clientID;
    this.liverUID = writable(liverUID);
    this.loginData = writable(loginInfo);
    this.token = writable(undefined);
    this.#userInfoMap = writable(new Map());
    this.#streamInfoMap = writable(new Map());
    this.#getDanmakuCycleSet = writable(new Set());
  }

  get state() {
    return get(this.#state);
  }

  get stateReadable() {
    return readonly(this.#state);
  }

  get clientID() {
    return this.#clientID;
  }

  get userInfoMap() {
    return get(this.#userInfoMap);
  }

  get userInfoMapReadable() {
    return readonly(this.#userInfoMap);
  }

  get streamInfoMap() {
    return get(this.#streamInfoMap);
  }

  get streamInfoMapReadable() {
    return readonly(this.#streamInfoMap);
  }

  get getDanmakuCycleSet() {
    return get(this.#getDanmakuCycleSet);
  }

  get getDanmakuCycleSetReadable() {
    return readonly(this.#getDanmakuCycleSet);
  }

  userInfo(liverUID: number): UserInfo | undefined {
    return this.userInfoMap.get(liverUID);
  }

  streamInfo(liverUID: number): StreamInfo | undefined {
    return this.streamInfoMap.get(liverUID);
  }

  isGettingDanmaku(liverUID: number): boolean {
    return this.streamInfoMap.has(liverUID);
  }

  isGettingDanmakuCyclically(liverUID: number): boolean {
    return this.getDanmakuCycleSet.has(liverUID);
  }

  connect(): () => void {
    this.session.connect();
    const openUnsubscribe = this.session.on('websocketOpen', () => {
      this.#id += 1;
      this.#state.update((state) => state.connect());
      this.#setClientIDCyclically();
      this.#loginCyclically();
    });
    const closeUnsubscribe = this.session.on('websocketClose', () => {
      // 断开会自动重连
      this.#state.update((state) => state.disconnect());
      this.#streamInfoMap.set(new Map());
      //this.#getDanmakuCycleSet.set(new Set());
    });
    const errorUnsubscribe = this.session.on('websocketError', () => {
      // 出现错误会断开重连
      this.#state.update((state) => state.disconnect());
      this.#streamInfoMap.set(new Map());
    });
    const loginUnsubscribe = this.session.on('login', () => {
      for (const liverUID of this.getDanmakuCycleSet) {
        if (!this.isGettingDanmaku(liverUID)) {
          this.#getDanmakuCyclically(liverUID);
        }
      }
    });
    const setTokenUnsubscribe = this.session.on('setToken', () => {
      for (const liverUID of this.getDanmakuCycleSet) {
        if (!this.isGettingDanmaku(liverUID)) {
          this.#getDanmakuCyclically(liverUID);
        }
      }
    });
    const danmakuStopUnsubscribe = this.session.on('danmakuStop', (danmaku) => {
      if (this.session.isConnecting()) {
        this.#streamInfoMap.update((map) => {
          map.delete(danmaku.liverUID);

          return map;
        });
        if (this.isGettingDanmakuCyclically(danmaku.liverUID)) {
          this.#getDanmakuCyclically(danmaku.liverUID);
        }
      }
    });
    const danmakuStopErrorUnsubscribe = this.session.on('danmakuStopError', (danmaku) => {
      if (this.session.isConnecting()) {
        this.#streamInfoMap.update((map) => {
          map.delete(danmaku.liverUID);

          return map;
        });
        if (this.isGettingDanmakuCyclically(danmaku.liverUID)) {
          this.#getDanmakuCyclically(danmaku.liverUID);
        }
      }
    });

    return () => {
      this.#state.update((state) => state.disconnect());
      this.token.set(undefined);
      this.#streamInfoMap.set(new Map());
      this.#getDanmakuCycleSet.set(new Set());
      openUnsubscribe();
      closeUnsubscribe();
      errorUnsubscribe();
      loginUnsubscribe();
      setTokenUnsubscribe();
      danmakuStopUnsubscribe();
      danmakuStopErrorUnsubscribe();
      this.session.disConnect();
    };
  }

  async setClientID(clientID: string, id?: number): Promise<boolean> {
    if (id === undefined) {
      id = this.#id;
    }

    function canContinue(session: SessionData): boolean {
      return session.session.isConnecting() && session.#id === id && session.state.isConnect();
    }

    if (canContinue(this)) {
      await this.session.asyncRequest('setClientID', { clientID });
      if (canContinue(this)) {
        this.#clientID = clientID;

        return true;
      }
    }

    return false;
  }

  async #setClientIDCyclically(): Promise<void> {
    const id = this.#id;

    for (;;) {
      try {
        await this.setClientID(this.#clientID, id);

        return;
      } catch {
        await delay(10000);
      }
    }
  }

  async login(id?: number): Promise<boolean> {
    if (id === undefined) {
      id = this.#id;
    }

    function canContinue(session: SessionData): boolean {
      return session.session.isConnecting() && session.#id === id && session.state.isConnect();
    }

    if (canContinue(this)) {
      let token = get(this.token);
      if (token) {
        await this.session.asyncRequest('setToken', token);
        if (canContinue(this)) {
          this.#state.update((state) => state.login());

          return true;
        }
      } else {
        token = (
          await this.session.asyncRequest(
            'login',
            get(this.loginData) || { account: '', password: '' }
          )
        ).data;
        if (canContinue(this)) {
          this.token.set(token);
          this.#state.update((state) => state.login());

          return true;
        }
      }
    }

    return false;
  }

  async #loginCyclically(): Promise<void> {
    const id = this.#id;

    for (;;) {
      try {
        await this.login(id);

        return;
      } catch {
        await delay(10000);
      }
    }
  }

  async getDanmaku(liverUID: number, id?: number): Promise<boolean> {
    if (liverUID <= 0) {
      throw new Error(`liver UID is less than 1: ${liverUID}`);
    }
    if (id === undefined) {
      id = this.#id;
    }

    function canContinue(session: SessionData): boolean {
      return (
        session.session.isConnecting() &&
        session.#id === id &&
        get(session.token) !== undefined &&
        session.state.isLogin()
      );
    }

    if (canContinue(this)) {
      const info = (await this.session.asyncRequest('getUserInfo', { userID: liverUID })).data;
      const user = this.userInfo(liverUID);
      if (
        !(
          user &&
          user.userID === info.userID &&
          user.nickname === info.nickname &&
          user.avatar === info.avatar
        )
      ) {
        this.#userInfoMap.update((map) => map.set(liverUID, info));
      }

      if (canContinue(this)) {
        if (info.liveID.length > 0) {
          const stream = (await this.session.asyncRequest('getDanmaku', { liverUID })).data;
          if (canContinue(this)) {
            if (stream) {
              this.#streamInfoMap.update((map) => map.set(liverUID, stream));
            }

            return true;
          }
        }
      }
    }

    return false;
  }

  async #getDanmakuCyclically(liverUID: number): Promise<void> {
    const id = this.#id;

    while (this.isGettingDanmakuCyclically(liverUID)) {
      try {
        if (await this.getDanmaku(liverUID, id)) {
          return;
        }

        await delay(10000);
      } catch {
        await delay(10000);
      }
    }
  }

  async getDanmakuCyclically(liverUID: number): Promise<void> {
    if (liverUID <= 0) {
      throw new Error(`liver UID is less than 1: ${liverUID}`);
    }

    if (!this.isGettingDanmakuCyclically(liverUID)) {
      this.#getDanmakuCycleSet.update((set) => set.add(liverUID));
      if (!this.isGettingDanmaku(liverUID)) {
        await this.#getDanmakuCyclically(liverUID);
      }
    }
  }

  async stopDanmaku(liverUID: number, id?: number): Promise<void> {
    if (liverUID <= 0) {
      throw new Error(`liver UID is less than 1: ${liverUID}`);
    }
    if (id === undefined) {
      id = this.#id;
    }

    if (
      this.session.isConnecting() &&
      this.#id === id &&
      get(this.token) &&
      this.isGettingDanmaku(liverUID)
    ) {
      await this.session.asyncRequest('stopDanmaku', { liverUID: liverUID });
    }
  }

  async #stopDanmakuCyclically(liverUID: number): Promise<void> {
    const id = this.#id;

    while (!this.isGettingDanmakuCyclically(liverUID)) {
      try {
        await this.stopDanmaku(liverUID, id);

        return;
      } catch {
        await delay(10000);
      }
    }
  }

  async stopDanmakuCyclically(liverUID: number): Promise<void> {
    if (liverUID <= 0) {
      throw new Error(`liver UID is less than 1: ${liverUID}`);
    }

    if (this.isGettingDanmakuCyclically(liverUID)) {
      this.#getDanmakuCycleSet.update((set) => {
        set.delete(liverUID);

        return set;
      });
      if (this.isGettingDanmaku(liverUID)) {
        await this.#stopDanmakuCyclically(liverUID);
      }
    }
  }

  async sendMessage<M extends MessageType>(
    clientID: string,
    message: Message<M>,
    id?: number
  ): Promise<boolean> {
    if (id === undefined) {
      id = this.#id;
    }

    function canContinue(session: SessionData): boolean {
      return session.session.isConnecting() && session.#id === id && session.state.isConnect();
    }

    if (canContinue(this)) {
      await this.session.asyncRequest('requestForward', {
        clientID,
        message: JSON.stringify(message)
      });
      if (canContinue(this)) {
        return true;
      }
    }

    return false;
  }

  async sendMessageCyclically<M extends MessageType>(
    clientID: string,
    message: Message<M>
  ): Promise<void> {
    const id = this.#id;

    for (;;) {
      try {
        await this.sendMessage(clientID, message, id);

        return;
      } catch {
        await delay(10000);
      }
    }
  }

  onReceiveMessage<M extends MessageType>(
    target: keyof M,
    callback: (message: Message<M>) => void
  ): unsubscribe {
    return onReceiveMessage(this.session, target, callback);
  }
}

export function onReceiveMessage<M extends MessageType>(
  session: Session,
  target: keyof M,
  callback: (message: Message<M>) => void
): unsubscribe {
  return session.on('receiveForward', (m) => {
    const message: Message<M> = JSON.parse(m.data.message);
    try {
      if (message.target === target) {
        callback(message);
      }
    } catch (e) {
      console.log(`receive forwarding message error: ${e}`);
    }
  });
}

function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
