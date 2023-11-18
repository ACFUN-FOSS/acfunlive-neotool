import { delay } from '@acfunlive-neotool/shared';
import { BaseDirectory, createDir, exists, readTextFile, writeTextFile } from '@tauri-apps/api/fs';
import { join } from '@tauri-apps/api/path';
import { type Input, simulate_input } from 'tauri-plugin-acfunlive-neotool-keyboard-api';

const defaultPrefix = '@';

const defaultInterval = 100;

export class KeyData {
  prefix: string | undefined | null;
  danmaku: string;
  keys: Input[];
  intervals: (number | undefined | null)[];
  enable: boolean;

  constructor(danmaku: string, keys: Input[]) {
    this.prefix = defaultPrefix;
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
        if (interval !== undefined && interval !== null && interval >= 0) {
          await delay(interval);
        } else {
          await delay(defaultInterval);
        }
        index++;
      }
      isKeyDown = false;
    }

    await simulate_input(key);
  }
}

export async function waitInterval(config: KeyConfig | undefined): Promise<void> {
  if (config) {
    if (config.interval !== undefined && config.interval !== null && config.interval >= 0) {
      await delay(config.interval);
    } else {
      await delay(defaultInterval);
    }
  }
}

export type KeyConfig = { interval: number | undefined | null; keys: KeyData[] };

const configDir = 'danmaku_keyboard';

const configFile = 'danmaku_keyboard.conf.json';

const fsOption = { dir: BaseDirectory.AppConfig };

export async function loadConfig(): Promise<KeyConfig> {
  const path = await join(configDir, configFile);
  if (await exists(path, fsOption)) {
    const config: KeyConfig = JSON.parse(await readTextFile(path, fsOption));
    if (config.interval === undefined || config.interval === null || config.interval < 0) {
      config.interval = defaultInterval;
    }
    if (config.keys === undefined || config.keys === null) {
      config.keys = [];
    } else if (config.keys.length > 0) {
      config.keys = config.keys.map((key) => {
        key.prefix ??= defaultPrefix;

        return key;
      });
    }

    return config;
  } else {
    return { interval: defaultInterval, keys: [] };
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
  return new RegExp(
    keys.map((key) => `${key.prefix ?? defaultPrefix}(${key.danmaku})`).join('|'),
    'ig'
  );
}
