import type { AppShared } from '@acfunlive-neotool/shared';
import { BaseDirectory, createDir, exists, readTextFile, writeTextFile } from '@tauri-apps/api/fs';
import { join } from '@tauri-apps/api/path';
import { loadAppsConfig, type AppConfig } from 'tauri-plugin-acfunlive-neotool-base-api';

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

export async function loadApp(
  jsPath: string,
  target: Element,
  shared: AppShared,
  cssPath?: string
): Promise<void> {
  if (cssPath) {
    await import(cssPath);
  }
  const module = await import(jsPath);
  const component = module.default;

  new component({
    target: target,
    props: { shared }
  });
}

export async function loadApps(appsDir: string): Promise<AppConfig[]> {
  const configs = await loadAppsConfig(appsDir);
  for (const config of configs) {
    config.entry = await join(config.path, config.entry);
    if (config.css) {
      config.css = await join(config.path, config.css);
    }
  }

  return configs;
}
