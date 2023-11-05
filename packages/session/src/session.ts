import { defaultInterval, delay } from '@acfunlive-neotool/utils';
import type {
  Session,
  loginRequest,
  tokenInfo,
  getUserInfoResponse,
  streamInfo,
  unsubscribe
} from 'acfunlive-backend-js/types.js';
import { writable, get, readonly, type Writable, type Readable } from 'svelte/store';

import type { MessageType, Message } from './message.js';
import { SessionState } from './state.js';

export type UserID = number;

export type LoginData = loginRequest;

export type TokenInfo = tokenInfo;

export type UserInfo = getUserInfoResponse;

export type StreamInfo = streamInfo;

export class BackendSession {
  #id: number;

  readonly session: Session;

  readonly #state: Writable<SessionState>;

  readonly #error: Writable<unknown>;

  readonly clientID: string;

  readonly #liverUID: Writable<UserID | undefined>;

  readonly #loginData: Writable<LoginData | undefined>;

  readonly #token: Writable<TokenInfo | undefined>;

  readonly #userInfoMap: Writable<Map<UserID, UserInfo>>;

  readonly #streamInfoMap: Writable<Map<UserID, StreamInfo>>;

  readonly #getDanmakuRepeatedlySet: Writable<Set<UserID>>;

  constructor(
    session: Session,
    clientID: string,
    liverUID?: UserID,
    loginInfo?: LoginData,
    tokenInfo?: TokenInfo
  ) {
    this.#id = 0;
    this.session = session;
    this.#state = writable(new SessionState());
    this.#error = writable(undefined);
    this.clientID = clientID;
    this.#liverUID = writable(liverUID);
    this.#loginData = writable(loginInfo);
    this.#token = writable(tokenInfo);
    this.#userInfoMap = writable(new Map());
    this.#streamInfoMap = writable(new Map());
    this.#getDanmakuRepeatedlySet = writable(new Set());
  }

  get state(): SessionState {
    return get(this.#state);
  }

  get stateReadable(): Readable<SessionState> {
    return readonly(this.#state);
  }

  get liverUID(): UserID | undefined {
    return get(this.#liverUID);
  }

  set liverUID(uid: UserID | undefined) {
    this.#liverUID.set(uid);
  }

  get liverUIDReadable(): Readable<UserID | undefined> {
    return readonly(this.#liverUID);
  }

  get loginData(): LoginData | undefined {
    return get(this.#loginData);
  }

  private set loginData(data: LoginData | undefined) {
    this.#loginData.set(data);
  }

  get loginDataReadable(): Readable<LoginData | undefined> {
    return readonly(this.#loginData);
  }

  get token(): TokenInfo | undefined {
    return get(this.#token);
  }

  private set token(t: TokenInfo) {
    this.#token.set(t);
  }

  get tokenReadable(): Readable<TokenInfo | undefined> {
    return readonly(this.#token);
  }

  private get userInfoMap(): Map<UserID, UserInfo> {
    return get(this.#userInfoMap);
  }

  get userInfoMapReadable(): Readable<Map<UserID, UserInfo>> {
    return readonly(this.#userInfoMap);
  }

  private get streamInfoMap(): Map<UserID, StreamInfo> {
    return get(this.#streamInfoMap);
  }

  get streamInfoMapReadable(): Readable<Map<UserID, StreamInfo>> {
    return readonly(this.#streamInfoMap);
  }

  private get getDanmakuRepeatedlySet(): Set<UserID> {
    return get(this.#getDanmakuRepeatedlySet);
  }

  get getDanmakuRepeatedlySetReadable(): Readable<Set<UserID>> {
    return readonly(this.#getDanmakuRepeatedlySet);
  }

  getUserInfo(liverUID: UserID): UserInfo | undefined {
    return this.userInfoMap.get(liverUID);
  }

  getStreamInfo(liverUID: UserID): StreamInfo | undefined {
    return this.streamInfoMap.get(liverUID);
  }

  isGettingDanmaku(liverUID: UserID): boolean {
    return this.streamInfoMap.has(liverUID);
  }

  isGettingDanmakuRepeatedly(liverUID: UserID): boolean {
    return this.getDanmakuRepeatedlySet.has(liverUID);
  }

  /**
   * 连接后端
   * @returns 进行清理和断开和后端连接的函数
   */
  connect(): () => void {
    this.session.connect();
    const openUnsubscribe = this.session.on('websocketOpen', () => {
      this.#id += 1;
      this.#state.update((state) => state.connect());
      this.setClientIdRepeatedly();
      this.loginRepeatedly();
    });
    const closeUnsubscribe = this.session.on('websocketClose', () => {
      // 断开会自动重连
      this.#state.update((state) => state.disconnect());
      this.#streamInfoMap.set(new Map());
    });
    const errorUnsubscribe = this.session.on('websocketError', () => {
      // 出现错误会断开重连
      this.#state.update((state) => state.disconnect());
      this.#streamInfoMap.set(new Map());
    });
    const loginUnsubscribe = this.session.on('login', () => {
      for (const liverUID of this.getDanmakuRepeatedlySet) {
        if (!this.isGettingDanmaku(liverUID)) {
          this.toGetDanmakuRepeatedly(liverUID);
        }
      }
    });
    const setTokenUnsubscribe = this.session.on('setToken', () => {
      for (const liverUID of this.getDanmakuRepeatedlySet) {
        if (!this.isGettingDanmaku(liverUID)) {
          this.toGetDanmakuRepeatedly(liverUID);
        }
      }
    });
    const danmakuStopUnsubscribe = this.session.on('danmakuStop', (danmaku) => {
      if (this.session.isConnecting()) {
        this.#streamInfoMap.update((map) => {
          map.delete(danmaku.liverUID);

          return map;
        });
        if (this.isGettingDanmakuRepeatedly(danmaku.liverUID)) {
          this.toGetDanmakuRepeatedly(danmaku.liverUID);
        }
      }
    });
    const danmakuStopErrorUnsubscribe = this.session.on('danmakuStopError', (danmaku) => {
      if (this.session.isConnecting()) {
        this.#streamInfoMap.update((map) => {
          map.delete(danmaku.liverUID);

          return map;
        });
        if (this.isGettingDanmakuRepeatedly(danmaku.liverUID)) {
          this.toGetDanmakuRepeatedly(danmaku.liverUID);
        }
      }
    });

    return () => {
      this.#state.update((state) => state.disconnect());
      this.#token.set(undefined);
      this.#streamInfoMap.set(new Map());
      this.#getDanmakuRepeatedlySet.set(new Set());
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

  private notifyError(error: unknown): void {
    this.#error.set(error);
  }

  onError(callback: (error: unknown) => void): unsubscribe {
    return this.#error.subscribe((error) => callback(error));
  }

  /**
   * 设置客户端ID
   * @param id
   * @returns 设置客户端ID是否成功
   */
  private async setClientId(id?: number): Promise<boolean> {
    id ??= this.#id;

    function canContinue(session: BackendSession): boolean {
      const state = session.state;

      // 不允许重复设置客户端ID
      return (
        session.session.isConnecting() &&
        session.#id === id &&
        state.isConnecting() &&
        !state.hasClientId()
      );
    }

    if (canContinue(this)) {
      await this.session.asyncRequest('setClientID', { clientID: this.clientID });
      if (canContinue(this)) {
        this.#state.update((state) => state.hasSetClientId());

        return true;
      }
    }

    return false;
  }

  private async setClientIdRepeatedly(): Promise<void> {
    const id = this.#id;

    for (;;) {
      try {
        // 不管设置是否成功都返回，除非有异常
        await this.setClientId(id);

        return;
      } catch (e) {
        this.notifyError(e);
      }

      await delay(defaultInterval);
    }
  }

  /**
   * 登陆
   * @param id
   * @returns 登陆是否成功
   */
  private async login(id?: number): Promise<boolean> {
    id ??= this.#id;

    function canContinue(session: BackendSession): boolean {
      const state = session.state;

      // 不允许重复登陆
      return (
        session.session.isConnecting() &&
        session.#id === id &&
        state.isConnecting() &&
        !state.isLogin()
      );
    }

    if (canContinue(this)) {
      let token = this.token;
      if (token) {
        await this.session.asyncRequest('setToken', token);
        if (canContinue(this)) {
          this.#state.update((state) => state.login());

          return true;
        }
      } else {
        token = (
          await this.session.asyncRequest('login', this.loginData ?? { account: '', password: '' })
        ).data;
        if (canContinue(this)) {
          this.token = token;
          this.#state.update((state) => state.login());

          return true;
        }
      }
    }

    return false;
  }

  private async loginRepeatedly(): Promise<void> {
    const id = this.#id;

    for (;;) {
      try {
        // 不管登陆是否成功都返回，除非有异常
        await this.login(id);

        return;
      } catch (e) {
        this.notifyError(e);
      }

      await delay(defaultInterval);
    }
  }

  /**
   * 获取弹幕
   * @param liverUID
   * @param id
   * @returns 是否成功获取弹幕
   */
  private async getDanmaku(liverUID: UserID, id?: number): Promise<boolean> {
    if (liverUID <= 0) {
      throw new Error(`liver UID is less than 1: ${liverUID}`);
    }
    id ??= this.#id;

    function canContinue(session: BackendSession): boolean {
      return (
        session.session.isConnecting() &&
        session.#id === id &&
        session.token !== undefined &&
        session.state.isLogin()
      );
    }

    if (canContinue(this)) {
      const info = (await this.session.asyncRequest('getUserInfo', { userID: liverUID })).data;
      const user = this.getUserInfo(liverUID);
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
            // 后端不会重复返回弹幕，如果重复了`stream.streamInfo`为`undefined`
            if (stream.streamInfo) {
              this.#streamInfoMap.update((map) => map.set(liverUID, stream.streamInfo!));
            }

            return true;
          }
        }
      }
    }

    return false;
  }

  /** 不会改动`#getDanmakuRepeatedlySet` */
  private async toGetDanmakuRepeatedly(liverUID: UserID): Promise<void> {
    const id = this.#id;

    while (this.isGettingDanmakuRepeatedly(liverUID)) {
      try {
        if (await this.getDanmaku(liverUID, id)) {
          return;
        }
      } catch (e) {
        this.notifyError(e);
      }

      await delay(defaultInterval);
    }
  }

  async getDanmakuRepeatedly(liverUID: UserID): Promise<void> {
    if (liverUID <= 0) {
      throw new Error(`liver UID is less than 1: ${liverUID}`);
    }

    if (!this.isGettingDanmakuRepeatedly(liverUID)) {
      this.#getDanmakuRepeatedlySet.update((set) => set.add(liverUID));
      if (!this.isGettingDanmaku(liverUID)) {
        await this.toGetDanmakuRepeatedly(liverUID);
      }
    }
  }

  private async stopDanmaku(liverUID: UserID, id?: number): Promise<void> {
    if (liverUID <= 0) {
      throw new Error(`liver UID is less than 1: ${liverUID}`);
    }
    id ??= this.#id;

    if (
      this.session.isConnecting() &&
      this.#id === id &&
      this.token &&
      this.isGettingDanmaku(liverUID)
    ) {
      // `#streamInfoMap`会在danmakuStop的回调中进行清理
      await this.session.asyncRequest('stopDanmaku', { liverUID: liverUID });
    }
  }

  async stopDanmakuRepeatedly(liverUID: UserID): Promise<void> {
    if (liverUID <= 0) {
      throw new Error(`liver UID is less than 1: ${liverUID}`);
    }

    if (this.isGettingDanmakuRepeatedly(liverUID)) {
      this.#getDanmakuRepeatedlySet.update((set) => {
        set.delete(liverUID);

        return set;
      });
      if (this.isGettingDanmaku(liverUID)) {
        const id = this.#id;

        // 防止意外取消另外的获取弹幕的请求
        while (!this.isGettingDanmakuRepeatedly(liverUID)) {
          try {
            await this.stopDanmaku(liverUID, id);

            return;
          } catch (e) {
            this.notifyError(e);
          }

          await delay(defaultInterval);
        }
      }
    }
  }

  /**
   * 发送消息到另外的客户端
   * @param clientID
   * @param message
   * @param id
   * @returns 消息是否发送成功
   */
  private async sendMessage<M extends MessageType>(
    clientID: string,
    message: Message<M>,
    id?: number
  ): Promise<boolean> {
    id ??= this.#id;

    function canContinue(session: BackendSession): boolean {
      const state = session.state;

      return (
        session.session.isConnecting() &&
        session.#id === id &&
        state.isConnecting() &&
        state.hasClientId()
      );
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

  /** 会不断循环直到客户端ID被设置 */
  async sendMessageRepeatedly<M extends MessageType>(
    clientID: string,
    message: Message<M>
  ): Promise<void> {
    const id = this.#id;

    for (;;) {
      if (this.state.hasClientId()) {
        try {
          // 不管发送消息是否成功都返回，除非有异常
          await this.sendMessage(clientID, message, id);

          return;
        } catch (e) {
          this.notifyError(e);
        }
      }

      await delay(defaultInterval);
    }
  }

  onReceiveMessage<M extends MessageType>(
    target: keyof M,
    callback: (message: Message<M>) => void
  ): unsubscribe {
    return this.session.on('receiveForward', (m) => {
      const message: Message<M> = JSON.parse(m.data.message);
      try {
        if (message.target === target) {
          callback(message);
        }
      } catch (e) {
        this.notifyError(e);
      }
    });
  }
}
