import { convertFileSrc } from '@tauri-apps/api/tauri';
import { BaseDirectory, createDir, exists, readTextFile, writeTextFile } from '@tauri-apps/api/fs';
import { join } from '@tauri-apps/api/path';
import {
  loadAppsConfig,
  canonicalize,
  type AppConfig
} from 'tauri-plugin-acfunlive-neotool-base-api';

export type Config = {
  liverUID?: number;
  appsDir: string;
};

const configFile = 'neotool.conf.json';

const defaultAppsDir = './apps';

const fsOption = { dir: BaseDirectory.AppConfig };

export async function loadConfig(): Promise<Config> {
  if (await exists(configFile, fsOption)) {
    const config: Config = JSON.parse(await readTextFile(configFile, fsOption));
    if ((config.liverUID !== undefined && config.liverUID <= 0) || config.liverUID === null) {
      config.liverUID = undefined;
    }
    config.appsDir = config.appsDir || defaultAppsDir;

    return config;
  } else {
    return { appsDir: defaultAppsDir };
  }
}

export async function saveConfig(config: Config): Promise<void> {
  if (!(await exists(configFile, fsOption))) {
    await createDir('', { dir: fsOption.dir, recursive: true });
  }

  await writeTextFile(configFile, JSON.stringify(config, null, 2), fsOption);
}

export async function loadApp(jsPath: string, target: Element, cssPath?: string): Promise<void> {
  if (cssPath) {
    if (import.meta.env?.DEV) {
      await import(/* @vite-ignore */ cssPath);
    } else {
      const css = convertFileSrc(cssPath);
      document
        .getElementsByTagName('head')[0]
        .insertAdjacentHTML('beforeend', `<link rel="stylesheet" href="${css}" />`);
    }
  }
  const module = import.meta.env?.DEV
    ? await import(/* @vite-ignore */ jsPath)
    : await import(/* @vite-ignore */ convertFileSrc(jsPath));
  const component = module.default;

  new component({
    target: target
  });
}

export async function loadApps(appsDir: string): Promise<AppConfig[]> {
  const configs = await loadAppsConfig(appsDir);
  for (const config of configs) {
    config.entry = await canonicalize(await join(config.path, config.entry));
    if (config.css) {
      config.css = await canonicalize(await join(config.path, config.css));
    }
  }

  return configs;
}
