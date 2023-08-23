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
  import { type AppData, delay, webDirName } from '@acfunlive-neotool/shared';
  import { join } from '@tauri-apps/api/path';
  import { onDestroy } from 'svelte';
  import { Server } from 'tauri-plugin-acfunlive-neotool-serve-files-api';

  import './app.css';
  import { loadConfig, saveConfig, saveImage, getPathInWeb, symlinkDataDir } from './scripts/data';
  import Sticker from './components/Sticker.svelte';
  import Pick from './components/Pick.svelte';

  export let data: AppData;

  const session = data.session;

  const state = session.stateReadable;

  const liverUID = session.liverUIDReadable;

  const enable = data.enable;

  join(data.config.path, webDirName).then((path) =>
    symlinkDataDir(path)
      .catch((e) => console.log(`failed to create symlink to data directory: ${e}`))
      .finally(() =>
        Server.startServe(path, hostname, port).catch((e) =>
          console.log(`failed to start the server: ${e}`)
        )
      )
  );

  let config: StickerConfig | undefined;

  loadConfig()
    .then((c) => (config = c))
    .catch((e) => console.log(`failed to load danmaku_sticker config: ${e}`));

  $: if (config) {
    saveConfig(config).catch((e) => console.log(`failed to save danmaku_sticker config: ${e}`));
  }

  $: if ($state.isLogin() && config && $liverUID !== undefined && $liverUID > 0) {
    session.sendMessageCyclically(danmakuStickerWebID, {
      target: danmakuStickerWebID,
      type: 'update',
      data: {
        liverUID: $liverUID,
        config
      }
    });
  }

  let openPick = false;

  $: if ($state.isLogin()) {
    if ($enable) {
      session.sendMessageCyclically(danmakuStickerWebID, {
        target: danmakuStickerWebID,
        type: 'online',
        data: undefined
      });
    } else {
      session.sendMessageCyclically(danmakuStickerWebID, {
        target: danmakuStickerWebID,
        type: 'offline',
        data: undefined
      });
    }
  }

  let isSendingUpdate = false;

  const receiveUnsubscribe = session.onReceiveMessage<StickerMessage>(
    danmakuStickerID,
    async (message) => {
      if (message.type === 'isOnline') {
        if (isSendingUpdate) {
          return;
        } else {
          isSendingUpdate = true;

          while (isSendingUpdate) {
            if ($state.isConnect() && config && $liverUID !== undefined && $liverUID > 0) {
              await session.sendMessageCyclically(danmakuStickerWebID, {
                target: danmakuStickerWebID,
                type: 'update',
                data: {
                  liverUID: $liverUID,
                  config
                }
              });

              break;
            } else {
              await delay(2000);
            }
          }

          isSendingUpdate = false;
        }
      }
    }
  );

  onDestroy(receiveUnsubscribe);
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
