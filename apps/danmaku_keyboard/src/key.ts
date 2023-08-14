import { type Input, simulate_input } from 'tauri-plugin-acfunlive-neotool-keyboard-api';
import { BaseDirectory, createDir, exists, readTextFile, writeTextFile } from '@tauri-apps/api/fs';
import { join } from '@tauri-apps/api/path';

function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

const defaultInterval = 100;

export class KeyData {
  danmaku: string;
  keys: Input[];
  intervals: number[];
  enable: boolean;

  constructor(danmaku: string, keys: Input[]) {
    this.danmaku = danmaku;
    this.keys = keys;
    this.enable = true;

    let isKeyDown = true;
    let num = 0;
    for (const key of keys) {
      if ('KeyDown' in key) {
        isKeyDown = true;
      } else if ('KeyUp' in key) {
        if (isKeyDown) {
          num++;
        }
        isKeyDown = false;
      }
    }

    this.intervals = new Array(num).fill(defaultInterval);
  }
}

export async function simulate(keyData: KeyData): Promise<void> {
  let isKeyDown = true;
  let index = 0;
  for (const key of keyData.keys) {
    if ('KeyDown' in key) {
      isKeyDown = true;
    } else if ('KeyUp' in key) {
      if (isKeyDown) {
        const interval = keyData.intervals[index];
        if (interval !== undefined) {
          await delay(interval);
          index++;
        }
      }
      isKeyDown = false;
    }

    await simulate_input(key);
  }
}

export type KeyConfig = { keys: KeyData[] };

const configDir = 'danmaku_keyboard';

const configFile = 'danmaku_keyboard.conf';

const fsOption = { dir: BaseDirectory.AppConfig };

export async function loadConfig(): Promise<KeyConfig> {
  const path = await join(configDir, configFile);
  if (await exists(path, fsOption)) {
    return JSON.parse(await readTextFile(path, fsOption));
  } else {
    return { keys: [] };
  }
}

export async function saveConfig(config: KeyConfig): Promise<void> {
  if (!(await exists(configDir, fsOption))) {
    await createDir(configDir, { dir: fsOption.dir, recursive: true });
  }

  const path = await join(configDir, configFile);
  await writeTextFile(path, JSON.stringify(config, null, 2), fsOption);
}

export function keysToString(keys: Input[]): string {
  return keys
    .filter((key) => 'KeyDown' in key)
    .map((key) => {
      if ('KeyDown' in key) {
        return key.KeyDown;
      }
    })
    .join(' ');
}

export function keysToRegex(keys: KeyData[]): RegExp {
  return new RegExp(keys.map((key) => `@(${key.danmaku})[ ]?`).join('|'), 'i');
}
