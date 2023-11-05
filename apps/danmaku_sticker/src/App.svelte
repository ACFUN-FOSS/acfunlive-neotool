<script lang="ts">
  import {
    hostname,
    port,
    danmakuStickerWebID,
    danmakuStickerID,
    StickerData,
    type StickerMessage,
    type StickerConfig
  } from '@acfunlive-neotool/danmaku-sticker-shared';
  import {
    delay,
    listen,
    receiveMessage,
    request,
    sendMessage,
    SessionState,
    UnlistenFn,
    webDirName
  } from '@acfunlive-neotool/shared';
  import { join } from '@tauri-apps/api/path';
  import { onDestroy } from 'svelte';
  import type { AppConfig } from 'tauri-plugin-acfunlive-neotool-base-api';
  import { Server } from 'tauri-plugin-acfunlive-neotool-serve-files-api';

  import './app.css';
  import appConfigJson from '../neotool.app.json';
  import { loadConfig, saveConfig, saveImage, getPathInWeb, symlinkDataDir } from './scripts/data';
  import Sticker from './components/Sticker.svelte';
  import Pick from './components/Pick.svelte';

  let cleanups: UnlistenFn[] = [];

  let appConfig: AppConfig | undefined;
  listen('appConfig', (config) => (appConfig = config), appConfigJson.id)
    .then(async (unlisten) => {
      cleanups.push(unlisten);
      await request('appConfig', appConfigJson.id);
    })
    .catch((e) => console.log(`failed to listen appConfig: ${e}`));

  let enable = false;
  listen('appEnabled', (enabled) => (enable = enabled.enable), appConfigJson.id)
    .then(async (unlisten) => {
      cleanups.push(unlisten);
      await request('appEnabled', appConfigJson.id);
    })
    .catch((e) => console.log(`failed to listen appEnabled: ${e}`));

  let state = new SessionState();
  listen('backendState', (s) => (state = s), undefined)
    .then(async (unlisten) => {
      cleanups.push(unlisten);
      await request('backendState', undefined);
    })
    .catch((e) => console.log(`failed to listen backend state: ${e}`));

  let liverUID: number | undefined;
  listen('liverUID', (uid) => (liverUID = uid), undefined)
    .then(async (unlisten) => {
      cleanups.push(unlisten);
      await request('liverUID', undefined);
    })
    .catch((e) => console.log(`failed to listen liverUID: ${e}`));

  let server: Server | undefined;
  $: if (appConfig && server === undefined) {
    join(appConfig.path, webDirName).then((path) =>
      symlinkDataDir(path)
        .catch((e) => console.log(`failed to create symlink to data directory: ${e}`))
        .finally(() =>
          Server.startServe(path, hostname, port)
            .then((s) => (server = s))
            .catch((e) => console.log(`failed to start the server: ${e}`))
        )
    );
  }

  let config: StickerConfig | undefined;

  loadConfig()
    .then((c) => (config = c))
    .catch((e) => console.log(`failed to load danmaku_sticker config: ${e}`));

  $: if (config) {
    saveConfig(config).catch((e) => console.log(`failed to save danmaku_sticker config: ${e}`));
  }

  $: if (state.hasClientId() && config && liverUID !== undefined && liverUID > 0) {
    sendMessage<StickerMessage>(danmakuStickerWebID, {
      target: danmakuStickerWebID,
      type: 'update',
      data: {
        liverUID,
        config
      }
    }).catch((e) => console.log(`failed to send message: ${e}`));
  }

  let openPick = false;

  $: if (state.hasClientId()) {
    if (enable) {
      sendMessage<StickerMessage>(danmakuStickerWebID, {
        target: danmakuStickerWebID,
        type: 'online',
        data: undefined
      }).catch((e) => console.log(`failed to send message: ${e}`));
    } else {
      sendMessage<StickerMessage>(danmakuStickerWebID, {
        target: danmakuStickerWebID,
        type: 'offline',
        data: undefined
      }).catch((e) => console.log(`failed to send message: ${e}`));
    }
  }

  let isSendingUpdate = false;
  receiveMessage<StickerMessage>(danmakuStickerID, async (message) => {
    if (message.type === 'isOnline') {
      if (isSendingUpdate) {
        return;
      } else {
        isSendingUpdate = true;

        while (isSendingUpdate) {
          if (state.hasClientId() && config && liverUID !== undefined && liverUID > 0) {
            await sendMessage<StickerMessage>(danmakuStickerWebID, {
              target: danmakuStickerWebID,
              type: 'update',
              data: {
                liverUID,
                config
              }
            }).catch((e) => console.log(`failed to send message: ${e}`));

            break;
          } else {
            await delay(2000);
          }
        }

        isSendingUpdate = false;
      }
    }
  })
    .then((unlisten) => cleanups.push(unlisten))
    .catch((e) => console.log(`failed to receive message: ${e}`));

  onDestroy(() => {
    for (const cleanup of cleanups) {
      cleanup();
    }
    cleanups = [];
  });
</script>

<div class="flex flex-col content-between p-5 space-y-5">
  <div>说明：弹幕文字前面需要添加 # 符号来触发</div>
  <div>在OBS里添加网页 http://localhost:25360/</div>

  {#if config}
    <table class="table table-zebra">
      <thead>
        <tr>
          <th></th>
          <th class="text-base">触发弹幕</th>
          <th class="text-base">图片</th>
          <th class="text-base">方向</th>
          <th class="text-base">高度（像素）</th>
          <th class="text-base">持续时长（毫秒）</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each config.stickers as sticker, i}
          <Sticker
            bind:sticker
            on:delete={() => {
              if (config) {
                config.stickers.splice(i, 1);
                config.stickers = config.stickers;
              }
            }}
          />
        {/each}
      </tbody>
    </table>
  {/if}

  <button class="btn btn-primary text-3xl" on:click={() => (openPick = true)}>+</button>
</div>

{#if openPick}
  <Pick
    bind:isOpen={openPick}
    on:sticker={(event) => {
      if (event.detail.imagePath) {
        saveImage(event.detail.imagePath)
          .then((path) =>
            getPathInWeb(path)
              .then((pathInWeb) => {
                if (config) {
                  config.stickers.push(new StickerData(event.detail.danmaku, path, pathInWeb));
                  config.stickers = config.stickers;
                }
              })
              .catch((e) => console.log(`failed to get image path of web: ${e}`))
          )
          .catch((e) => console.log(`failed to save image: ${e}`));
      }
    }}
  />
{/if}
