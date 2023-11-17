import {
  BackendSession,
  Message,
  MessageType,
  SessionState,
  UserID,
  UserInfo
} from '@acfunlive-neotool/session';
import { defaultInterval } from '@acfunlive-neotool/utils';
import * as TauriEvent from '@tauri-apps/api/event';
import type { comment, danmaku, error, gift } from 'acfunlive-backend-js/types.js';
import { AppConfig } from 'tauri-plugin-acfunlive-neotool-base-api';

export type { UnlistenFn } from '@tauri-apps/api/event';

export type AppData = {
  id: string;
  enable: boolean;
};

type ClientMessage<M extends MessageType> = {
  clientID: string;
  message: Message<M>;
};

export type ErrorEvent = error | string | unknown;

/** 第一个是触发条件，第二个是事件数据，第三个是请求数据 */
export type Events = {
  appConfig: [string, AppConfig, string];
  appData: [string, AppData, string];
  // TODO: 错误记录和通知
  error: [undefined, ErrorEvent, never];
  connectBackend: [undefined, undefined, never];
  disconnectBackend: [undefined, undefined, never];
  /** 状态变化时也会通知 */
  backendState: [undefined, SessionState, undefined];
  /** liverUID变化时也会通知 */
  liverUID: [undefined, UserID | undefined, undefined];
  userInfo: [UserID | undefined, UserInfo, UserID];
  /** 请求的话会不断获取弹幕 */
  getDanmaku: [UserID | undefined, UserID, UserID];
  /** 请求的话会停止不断获取弹幕 */
  stopDanmaku: [UserID | undefined, UserID, UserID];
  danmaku: [UserID | undefined, danmaku<comment>, never];
  gift: [UserID | undefined, danmaku<gift>, never];
};

export async function listen<E extends keyof Events>(
  event: E,
  callback: (data: Events[E][1]) => void,
  filter: Events[E][0]
): Promise<TauriEvent.UnlistenFn> {
  let unlisten: TauriEvent.UnlistenFn;

  switch (event) {
    case 'appConfig':
      unlisten = await TauriEvent.listen<AppConfig>(event, (e) => {
        if (e.payload.id === filter) {
          callback(e.payload);
        }
      });
      break;
    case 'appData':
      unlisten = await TauriEvent.listen<AppData>(event, (e) => {
        if (e.payload.id === filter) {
          callback(e.payload);
        }
      });
      break;
    case 'connectBackend':
    case 'disconnectBackend':
      unlisten = await TauriEvent.listen(event, () => callback(undefined));
      break;
    case 'error':
    case 'liverUID':
      unlisten = await TauriEvent.listen(event, (e) => callback(e.payload));
      break;
    case 'backendState':
      unlisten = await TauriEvent.listen<SessionState>(event, (e) =>
        callback(SessionState.fromState(e.payload))
      );
      break;
    case 'userInfo':
      unlisten = await TauriEvent.listen<UserInfo>(event, (e) => {
        if (filter === undefined || e.payload.userID === filter) {
          callback(e.payload);
        }
      });
      break;
    case 'getDanmaku':
    case 'stopDanmaku':
      unlisten = await TauriEvent.listen<UserID>(event, (e) => {
        if (filter === undefined || e.payload === filter) {
          callback(e.payload);
        }
      });
      break;
    case 'danmaku':
    case 'gift':
      unlisten = await TauriEvent.listen<danmaku<unknown>>(event, (e) => {
        if (filter === undefined || e.payload.liverUID === filter) {
          callback(e.payload);
        }
      });
      break;
    default:
      throw new Error(`未处理的事件: ${event}`);
  }

  return unlisten;
}

// 请求事件要加上'-request'
function requestEvent<E extends keyof Events>(event: E): string {
  return event + '-request';
}

export async function request<E extends keyof Events>(event: E, data: Events[E][2]): Promise<void> {
  await TauriEvent.emit(requestEvent(event), data);
}

export function requestRepeatedly<E extends keyof Events>(
  event: E,
  data: Events[E][2],
  interval: number = defaultInterval
): TauriEvent.UnlistenFn {
  const id = setInterval(() => request(event, data), interval);

  return () => clearInterval(id);
}

const sendMessageEvent = 'sendMessage-request';
const receiveMessageEvent = 'receiveMessage';

export async function sendMessage<M extends MessageType>(
  clientID: string,
  message: Message<M>
): Promise<void> {
  await TauriEvent.emit(sendMessageEvent, { clientID, message });
}

export async function receiveMessage<M extends MessageType>(
  target: keyof M,
  callback: (message: Message<M>) => void
): Promise<TauriEvent.UnlistenFn> {
  return await TauriEvent.listen<string>(receiveMessageEvent, (e) => {
    const message: Message<M> = JSON.parse(e.payload);
    try {
      if (message.target === target) {
        callback(message);
      }
    } catch (error) {
      emitError(error);
    }
  });
}

async function emitTauriEvent<E extends keyof Events>(event: E, data: Events[E][1]): Promise<void> {
  await TauriEvent.emit(event, data);
}

export async function emitError(error: ErrorEvent): Promise<void> {
  await emitTauriEvent('error', error);
}

export class EventHandler {
  readonly session: BackendSession;

  private readonly configs: Map<string, AppConfig>;

  private readonly data: Map<string, AppData>;

  private unlisteners: TauriEvent.UnlistenFn[];

  #isInited: boolean = false;

  constructor(session: BackendSession, configs: AppConfig[], data: AppData[]) {
    this.session = session;
    this.configs = new Map(configs.map((config) => [config.id, config]));
    this.data = new Map(data.map((d) => [d.id, d]));
    this.unlisteners = [];

    this.unlisteners.push(
      this.session.onError(emitError),
      this.session.session.on('websocketOpen', () => emitTauriEvent('connectBackend', undefined)),
      this.session.session.on('websocketClose', () =>
        emitTauriEvent('disconnectBackend', undefined)
      ),
      this.session.stateReadable.subscribe((state) => emitTauriEvent('backendState', state)),
      this.session.liverUIDReadable.subscribe((liverUID) => emitTauriEvent('liverUID', liverUID)),
      this.session.session.on(
        'getUserInfo',
        (info) => emitTauriEvent('userInfo', info.data),
        undefined,
        emitError
      ),
      this.session.session.on(
        'getDanmaku',
        (msg) => emitTauriEvent('getDanmaku', msg.data.liverUID),
        undefined,
        emitError
      ),
      this.session.session.on('danmakuStop', (msg) => emitTauriEvent('stopDanmaku', msg.liverUID)),
      this.session.session.on('danmakuStopError', (msg) =>
        emitTauriEvent('stopDanmaku', msg.liverUID)
      ),
      this.session.session.on('comment', (danmaku) => emitTauriEvent('danmaku', danmaku)),
      this.session.session.on('gift', (danmaku) => emitTauriEvent('gift', danmaku)),
      this.session.session.on('receiveForward', (msg) =>
        TauriEvent.emit(receiveMessageEvent, msg.data.message)
      )
    );
  }

  get isInited(): boolean {
    return this.#isInited;
  }

  private async handleRequest<E extends keyof Events>(
    event: E,
    handler: (data: Events[E][2]) => void
  ): Promise<void> {
    this.unlisteners.push(
      await TauriEvent.listen<Events[E][2]>(requestEvent(event), (e) => handler(e.payload))
    );
  }

  async init(): Promise<void> {
    if (!this.#isInited) {
      await this.handleRequest('appConfig', (id) => {
        const config = this.configs.get(id);
        if (config) {
          emitTauriEvent('appConfig', config);
        } else {
          emitError(`AppConfig ${id} does not exist`);
        }
      });
      await this.handleRequest('appData', (id) => {
        const data = this.data.get(id);
        if (data) {
          emitTauriEvent('appData', data);
        } else {
          emitError(`appData ${id} does not exist`);
        }
      });
      await this.handleRequest('backendState', () =>
        emitTauriEvent('backendState', this.session.state)
      );
      await this.handleRequest('liverUID', () => emitTauriEvent('liverUID', this.session.liverUID));
      await this.handleRequest('userInfo', (userID) =>
        this.session.session.request('getUserInfo', { userID })
      );
      await this.handleRequest('getDanmaku', (liverUID) =>
        this.session.getDanmakuRepeatedly(liverUID)
      );
      await this.handleRequest('stopDanmaku', (liverUID) =>
        this.session.stopDanmakuRepeatedly(liverUID)
      );

      this.unlisteners.push(
        await TauriEvent.listen<ClientMessage<MessageType>>(sendMessageEvent, (e) =>
          this.session.sendMessageRepeatedly<MessageType>(e.payload.clientID, e.payload.message)
        )
      );

      this.#isInited = true;
    }
  }

  appData(id: string): AppData | undefined {
    return this.data.get(id);
  }

  async setAppEnabled(id: string, enable: boolean): Promise<void> {
    const data = this.data.get(id);
    if (data) {
      data.enable = enable;
      this.data.set(id, data);
      await emitTauriEvent('appData', data);
    } else {
      await emitError(`appData ${id} does not exist`);
    }
  }

  cleanup(): void {
    for (const fn of this.unlisteners) {
      fn();
    }
    this.unlisteners = [];
  }
}
