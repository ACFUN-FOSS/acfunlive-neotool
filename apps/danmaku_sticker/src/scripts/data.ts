import { defaultPrefix, type StickerConfig } from '@acfunlive-neotool/danmaku-sticker-shared';
import { open } from '@tauri-apps/api/dialog';
import {
  BaseDirectory,
  createDir,
  exists,
  readTextFile,
  writeTextFile,
  copyFile
} from '@tauri-apps/api/fs';
import { join, extname, appDataDir, basename } from '@tauri-apps/api/path';
import { hashFileSha256, symlinkDir } from 'tauri-plugin-acfunlive-neotool-base-api';

const dirName = 'danmaku_sticker';

const configFile = 'danmaku_sticker.conf.json';

const configFsOption = { dir: BaseDirectory.AppConfig };

const dataFsOption = { dir: BaseDirectory.AppData };

const hashLength = 20;

export async function loadConfig(): Promise<StickerConfig> {
  const path = await join(dirName, configFile);
  if (await exists(path, configFsOption)) {
    const config: StickerConfig = JSON.parse(await readTextFile(path, configFsOption));
    if (config.stickers === undefined || config.stickers === null) {
      config.stickers = [];
    } else if (config.stickers.length > 0) {
      config.stickers = config.stickers.map((s) => {
        s.prefix ??= defaultPrefix;

        return s;
      });
    }

    return config;
  } else {
    return { stickers: [] };
  }
}

export async function saveConfig(config: StickerConfig): Promise<void> {
  if (!(await exists(dirName, configFsOption))) {
    await createDir(dirName, { dir: configFsOption.dir, recursive: true });
  }

  const path = await join(dirName, configFile);
  await writeTextFile(path, JSON.stringify(config, null, 2), configFsOption);
}

export async function pickImage(): Promise<string | undefined> {
  const file = await open({
    title: '图片',
    directory: false,
    multiple: false,
    filters: [{ name: 'Image', extensions: ['apng', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp'] }]
  });

  if (typeof file === 'string') {
    return file;
  }
}

export async function saveImage(path: string): Promise<string> {
  if (!(await exists(dirName, dataFsOption))) {
    await createDir(dirName, { dir: dataFsOption.dir, recursive: true });
  }

  const hash = await hashFileSha256(path);
  if (hash.length < hashLength) {
    throw new Error(`the hash length is too less: ${hash}`);
  }
  const dataDir = await appDataDir();
  const destination = await join(
    dataDir,
    dirName,
    hash.slice(0, hashLength) + '.' + (await extname(path))
  );
  if (await exists(destination)) {
    return destination;
  }
  await copyFile(path, destination);

  return destination;
}

export async function symlinkDataDir(path: string): Promise<void> {
  if (!(await exists(dirName, dataFsOption))) {
    await createDir(dirName, { dir: dataFsOption.dir, recursive: true });
  }

  const source = await join(await appDataDir(), dirName);
  const destination = await join(path, dirName);
  await symlinkDir(source, destination);
}

export async function getPathInWeb(path: string): Promise<string> {
  return await join(dirName, await basename(path));
}
