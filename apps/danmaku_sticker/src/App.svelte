<script lang="ts">
  import {
    danmakuStickerID,
    danmakuStickerWebID,
    hostname,
    port,
    type StickerConfig,
    StickerData,
    type StickerMessage
  } from '@acfunlive-neotool/danmaku-sticker-shared';
  import {
    delay,
    emitError,
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
  import { isAddressAvailable, Server } from 'tauri-plugin-acfunlive-neotool-serve-files-api';

  import Sticker from './components/Sticker.svelte';
  import Pick from './components/Pick.svelte';
  import { getPathInWeb, loadConfig, saveConfig, saveImage, symlinkDataDir } from './scripts/data';

  import './app.css';
  import appConfigJson from '../neotool.app.json';

  let cleanups: UnlistenFn[] = [];

  let appConfig: AppConfig | undefined;

  let enable = false;

  let state = new SessionState();

  let liverUID: number | undefined;

  let server: Server | undefined;

  let isStartingServer = false;

  async function startServer(): Promise<void> {
    if (!isStartingServer) {
      isStartingServer = true;

      if (appConfig) {
        try {
          const path = await join(appConfig.path, webDirName);
          await symlinkDataDir(path);

          while (true) {
            if (server === undefined && (await isAddressAvailable(hostname, port))) {
              if (enable) {
                server = await Server.startServe(path, hostname, port);
              }

              break;
            }

            delay(5000);
          }
        } catch (e) {
          emitError(`failed to start server: ${e}`);
        }
      }

      isStartingServer = false;
    }
  }

  async function stopServer(): Promise<void> {
    const server_ = server;
    server = undefined;

    try {
      if ((await server_?.isServing()) ?? false) {
        await server_?.stopServe();
      }
    } catch (e) {
      emitError(`failed to stop server: ${e}`);
    }
  }

  $: if (appConfig) {
    if (enable) {
      startServer();
    } else {
      stopServer();
    }
  }

  let config: StickerConfig | undefined;
  $: if (config) {
    saveConfig(config).catch((e) => emitError(`failed to save danmaku_sticker config: ${e}`));
  }

  $: if (state.hasClientId() && config && liverUID !== undefined && liverUID > 0) {
    sendMessage<StickerMessage>(danmakuStickerWebID, {
      target: danmakuStickerWebID,
      type: 'update',
      data: {
        liverUID,
        config
      }
    }).catch((e) => emitError(`failed to send message: ${e}`));
  }

  let openPick = false;

  $: if (state.hasClientId()) {
    if (enable) {
      sendMessage<StickerMessage>(danmakuStickerWebID, {
        target: danmakuStickerWebID,
        type: 'online',
        data: undefined
      }).catch((e) => emitError(`failed to send message: ${e}`));
    } else {
      sendMessage<StickerMessage>(danmakuStickerWebID, {
        target: danmakuStickerWebID,
        type: 'offline',
        data: undefined
      }).catch((e) => emitError(`failed to send message: ${e}`));
    }
  }

  let hasSetAppConfig = false;
  let isSendingUpdate = false;

  async function init(): Promise<void> {
    try {
      cleanups.push(
        await listen(
          'appConfig',
          (config) => {
            if (!hasSetAppConfig) {
              appConfig = config;
              hasSetAppConfig = true;
            }
          },
          appConfigJson.id
        ),
        await listen('appData', (data) => (enable = data.enable), appConfigJson.id),
        await listen('backendState', (s) => (state = s), undefined),
        await listen('liverUID', (uid) => (liverUID = uid), undefined),
        await receiveMessage<StickerMessage>(danmakuStickerID, async (message) => {
          if (message.type === 'isOnline') {
            if (!isSendingUpdate) {
              isSendingUpdate = true;

              while (true) {
                if (state.hasClientId() && config && liverUID !== undefined && liverUID > 0) {
                  try {
                    await sendMessage<StickerMessage>(danmakuStickerWebID, {
                      target: danmakuStickerWebID,
                      type: 'update',
                      data: {
                        liverUID,
                        config
                      }
                    });
                  } catch (e) {
                    emitError(`failed to send message: ${e}`);
                  }

                  break;
                } else {
                  await delay(2000);
                }
              }

              isSendingUpdate = false;
            }
          }
        })
      );

      await request('appConfig', appConfigJson.id);
      await request('appData', appConfigJson.id);
      await request('backendState', undefined);
      await request('liverUID', undefined);

      config = await loadConfig();
    } catch (e) {
      await emitError(`${appConfigJson.id} init error: ${e}`);
    }
  }

  init();

  onDestroy(() => {
    stopServer();
    for (const cleanup of cleanups) {
      cleanup();
    }
    cleanups = [];
  });
</script>

<div class="flex flex-col content-between p-5 space-y-5">
  <div>说明：弹幕文字前面需要添加对应的前缀来触发</div>
  <div>在OBS里添加网页 http://localhost:25360/</div>

  {#if config}
    <table class="table table-zebra">
      <thead>
        <tr>
          <th></th>
          <th class="text-base">触发弹幕前缀</th>
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
    on:sticker={async (event) => {
      if (event.detail.imagePath) {
        try {
          const path = await saveImage(event.detail.imagePath);
          const pathInWeb = await getPathInWeb(path);
          if (config) {
            config.stickers.push(new StickerData(event.detail.danmaku, path, pathInWeb));
            config.stickers = config.stickers;
          }
        } catch (e) {
          emitError(`failed to save image or config: ${e}`);
        }
      }
    }}
  />
{/if}
