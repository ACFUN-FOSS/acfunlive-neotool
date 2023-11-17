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

type SecretKey = {
  service: string;
  user: string;
  target?: string;
};

export class SecretKeyEntry {
  readonly service: string;
  readonly user: string;
  readonly target?: string;

  constructor(service: string, user: string, target?: string) {
    this.service = service;
    this.user = user;
    this.target = target;
  }

  private toType(): SecretKey {
    return {
      service: this.service,
      user: this.user,
      target: this.target
    };
  }

  async get_data(): Promise<string | undefined> {
    return await invoke('plugin:acfunlive-neotool-base|get_secret_key', { key: this.toType() });
  }

  async set_data(content: string): Promise<void> {
    await invoke('plugin:acfunlive-neotool-base|set_secret_key', { key: this.toType(), content });
  }

  async delete_data(): Promise<void> {
    await invoke('plugin:acfunlive-neotool-base|delete_secret_key', { key: this.toType() });
  }
}
