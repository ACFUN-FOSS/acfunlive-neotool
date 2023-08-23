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

export async function hashFileSha256(path: string): Promise<string> {
  return await invoke('plugin:acfunlive-neotool-base|hash_file_sha256', { path });
}

export async function symlinkDir(source: string, destination: string): Promise<void> {
  return await invoke('plugin:acfunlive-neotool-base|symlink_dir', { source, destination });
}
