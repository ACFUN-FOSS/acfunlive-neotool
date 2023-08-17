import { invoke } from '@tauri-apps/api/tauri';

export type AppConfig = {
  id: string;
  name: string;
  path: string;
  description?: string;
  entry: string;
  css?: string;
};

export async function loadAppsConfig(appsDir: string): Promise<AppConfig[]> {
  return await invoke('plugin:acfunlive-neotool-base|load_apps_config', { appsDir });
}

export async function canonicalize(path: string): Promise<string> {
  return await invoke('plugin:acfunlive-neotool-base|canonicalize', { path });
}
