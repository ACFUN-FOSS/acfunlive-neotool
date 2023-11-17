import { emitError } from '@acfunlive-neotool/shared';
import { BaseDirectory, createDir, exists, readTextFile, writeTextFile } from '@tauri-apps/api/fs';
import { join } from '@tauri-apps/api/path';
import { get, writable, type Writable, type Unsubscriber } from 'svelte/store';
import { Audio } from 'tauri-plugin-acfunlive-neotool-audio-api';
import { SecretKeyEntry } from 'tauri-plugin-acfunlive-neotool-base-api';
import { type ChatText, sparkChat } from 'tauri-plugin-acfunlive-neotool-spark-api';
import { type AudioSourceId, tts } from 'tauri-plugin-acfunlive-neotool-tts-api';

export type XunFeiKey = {
  appId: string;
  apiSecret: string;
  apiKey: string;
};

export type ChatConfig = {
  vcn: string;
  characterSet: string;
  volumn: number;
};

export enum ChatState {
  Disable,
  Idle,
  Chatting,
  Ignore
}

export class ChatContent {
  readonly user: string;

  readonly content: string;

  constructor(user: string, content: string) {
    this.user = user;
    this.content = content;
  }

  toContent(): string {
    return `“${this.user}”说：“${this.content}”`;
  }
}

const sparkKeyService = 'xunfei_spark_ai';

const ttsKeyService = 'xunfei_tts';

const configDir = 'ai_chat';

const configFile = 'ai_chat.conf.json';

const fsOption = { dir: BaseDirectory.AppConfig };

const historyNum = 10;

const defaultConfig: ChatConfig = {
  vcn: 'xiaoyan',
  characterSet: '你是一只可爱迷人的狐狸娘，名字叫林梦仙',
  volumn: 1.0
};

export const sparkKey: Writable<XunFeiKey | undefined> = writable(undefined);

export const ttsKey: Writable<XunFeiKey | undefined> = writable(undefined);

export const chatConfig: Writable<ChatConfig> = writable({
  ...defaultConfig
});

export const chatState: Writable<ChatState> = writable(ChatState.Disable);

export const history: ChatText[] = [];

let audio: Audio | undefined;

async function loadKey(key: Writable<XunFeiKey | undefined>, service: string) {
  let xkey: XunFeiKey | undefined = { appId: '', apiSecret: '', apiKey: '' };
  let user: keyof XunFeiKey;
  for (user in xkey) {
    const entry = new SecretKeyEntry(service, user);
    const data = await entry.get_data();
    if (data) {
      if (xkey) {
        xkey[user] = data;
      }
    } else {
      xkey = undefined;
    }
  }

  key.set(xkey);
}

async function saveKey(key: XunFeiKey | undefined, service: string): Promise<void> {
  if (key) {
    let user: keyof XunFeiKey;
    for (user in key) {
      const entry = new SecretKeyEntry(service, user);
      await entry.set_data(key[user]);
    }
  }
}

function setKey(target: Writable<XunFeiKey | undefined>, key: XunFeiKey): void {
  if (key.appId.length > 0 && key.apiSecret.length > 0 && key.apiKey.length > 0) {
    target.set(key);
  }
}

export function setSparkKey(key: XunFeiKey): void {
  setKey(sparkKey, key);
}

export function setTtsKey(key: XunFeiKey): void {
  setKey(ttsKey, key);
}

async function loadConfig(): Promise<void> {
  const path = await join(configDir, configFile);
  if (await exists(path, fsOption)) {
    const config: ChatConfig = JSON.parse(await readTextFile(path, fsOption));
    if (!config.vcn) {
      config.vcn = defaultConfig.vcn;
    }
    if (!config.characterSet) {
      config.characterSet = defaultConfig.characterSet;
    }
    if (config.volumn === undefined || config.volumn === null || config.volumn < 0.0) {
      config.volumn = defaultConfig.volumn;
    }

    chatConfig.set(config);
  }
}

async function saveConfig(config: ChatConfig): Promise<void> {
  if (!(await exists(configDir, fsOption))) {
    await createDir(configDir, { dir: fsOption.dir, recursive: true });
  }

  const path = await join(configDir, configFile);
  await writeTextFile(path, JSON.stringify(config, null, 2), fsOption);
}

export async function initConfig(): Promise<Unsubscriber> {
  await loadConfig();
  let isSavingConfig = false;
  const configUnsubscriber = chatConfig.subscribe(() => {
    // 延迟2秒保存设置，减少IO
    if (!isSavingConfig) {
      isSavingConfig = true;
      setTimeout(() => {
        saveConfig(get(chatConfig));
        isSavingConfig = false;
      }, 2000);
    }
  });

  await loadKey(sparkKey, sparkKeyService);
  await loadKey(ttsKey, ttsKeyService);
  const sparkUnsubscriber = sparkKey.subscribe((key) => saveKey(key, sparkKeyService));
  const ttsUnsubscriber = ttsKey.subscribe((key) => saveKey(key, ttsKeyService));

  audio = await Audio.newAudio();

  return async () => {
    configUnsubscriber();
    sparkUnsubscriber();
    ttsUnsubscriber();

    try {
      await audio?.delete();
    } catch (e) {
      emitError(`failed to delete audio: ${e}`);
    }
    audio = undefined;
  };
}

function prompt(contents: string[]): string {
  const config = get(chatConfig);
  const content = contents.join('\n');

  return `现在你是一名主播，需要回复观众的弹幕，直接回复你想要说的话即可，不需要带上名字前缀。
你需要遵循以下的设定：
${config.characterSet}
观众的弹幕：
${content}`;
}

export async function chat(
  chatContents: ChatContent[],
  callback: (content: string) => void,
  chatId?: string
): Promise<string | undefined> {
  if (get(chatState) === ChatState.Idle) {
    const key = get(sparkKey);
    if (key && key.appId.length > 0 && key.apiSecret.length > 0 && key.apiKey.length > 0) {
      try {
        let historyList: ChatText[] = [];
        if (history.length < historyNum) {
          historyList = history;
        } else {
          historyList = history.slice(history.length - historyNum);
        }

        const contents = chatContents.map((content) => content.toContent());
        let reply = '';

        chatState.set(ChatState.Chatting);
        await sparkChat(
          {
            ...key,
            chatId,
            history: historyList,
            content: prompt(contents)
          },
          (content) => {
            if (!(get(chatState) === ChatState.Ignore)) {
              reply = reply + content;
              callback(content);
            }
          }
        );

        if (!(get(chatState) === ChatState.Ignore)) {
          history.push(
            ...contents.map((content): ChatText => {
              return { role: 'user', content };
            })
          );
          history.push({ role: 'assistant', content: reply });

          return reply;
        }

        return;
      } finally {
        chatState.set(ChatState.Idle);
      }
    } else {
      throw new Error('no spark key');
    }
  }
}

export async function textToSpeech(
  contents: string[],
  callback: (id: AudioSourceId) => void
): Promise<void> {
  const key = get(ttsKey);
  const vcn = get(chatConfig).vcn;
  if (
    key &&
    key.appId.length > 0 &&
    key.apiSecret.length > 0 &&
    key.apiKey.length > 0 &&
    vcn.length > 0
  ) {
    for (const content of contents) {
      await tts(
        {
          ...key,
          aue: 'lame',
          vcn,
          text: content,
          getAllOnce: true
        },
        (id) => callback(id)
      );
    }
  } else {
    throw new Error('no tts key');
  }
}

export async function playAudio(idList: AudioSourceId[]): Promise<void> {
  await audio?.addAll(idList);
}

export async function stopAudio(): Promise<void> {
  await audio?.stop();
}
