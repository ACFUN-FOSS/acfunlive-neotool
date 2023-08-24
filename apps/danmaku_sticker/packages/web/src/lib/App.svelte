<script lang="ts">
  import {
    danmakuStickerWebID,
    danmakuStickerID,
    defaultDuration,
    type StickerMessage,
    type StickerConfig
  } from '@acfunlive-neotool/danmaku-sticker-shared';
  import { SessionData, neotoolID } from '@acfunlive-neotool/shared';
  import webApiSession from 'acfunlive-backend-js/webapi.js';
  import { onDestroy } from 'svelte';

  import Danmaku from './components/Danmaku.svelte';
  import { stickersToRegex, gap, type Sticker } from './scripts/danmaku';

  const session = new SessionData(webApiSession(), danmakuStickerWebID);

  const state = session.stateReadable;

  const cleanup = session.connect();

  let liverUID: number | undefined;

  let config: StickerConfig | undefined;

  let isOnline: boolean = true;

  let width: number | undefined;

  let id: number = 0;

  let data: Sticker[] = [];

  let regex: RegExp | undefined;

  $: if ($state.isLogin() && isOnline) {
    session.sendMessageCyclically<StickerMessage>(neotoolID, {
      target: danmakuStickerID,
      type: 'isOnline',
      data: undefined
    });
  }

  $: if (config && config.stickers.length > 0) {
    regex = stickersToRegex(config.stickers);
  }

  $: if (liverUID !== undefined && liverUID > 0) {
    session.getDanmakuCyclically(liverUID);
  }

  let commentUnsubscribe: (() => void) | undefined;

  $: {
    if (commentUnsubscribe) {
      commentUnsubscribe();
      commentUnsubscribe = undefined;
    }

    if (liverUID !== undefined && liverUID > 0) {
      commentUnsubscribe = session.session.on(
        'comment',
        (comment) => {
          if (isOnline && regex) {
            for (const match of comment.data.content.matchAll(regex)) {
              for (const [i, group] of match.slice(1).entries()) {
                if (group) {
                  const sticker = config?.stickers[i];
                  if (sticker?.enable) {
                    const newId = id++;
                    data.push({ id: newId, data: sticker });
                    data = data;

                    setTimeout(
                      () => {
                        const index = data.findIndex((s) => s.id === newId);
                        if (index >= 0) {
                          data.splice(index, 1);
                          data = data;
                        }
                      },
                      (sticker.duration || defaultDuration) + gap
                    );

                    return;
                  }
                }
              }
            }
          }
        },
        liverUID
      );
    }
  }

  const receiveUnsubscribe = session.onReceiveMessage<StickerMessage>(
    danmakuStickerWebID,
    (message) => {
      if (message.type === 'online') {
        isOnline = true;
      } else if (message.type === 'offline') {
        isOnline = false;
      } else if (message.type === 'update') {
        if (liverUID !== undefined && liverUID > 0 && liverUID !== message.data.liverUID) {
          session.stopDanmakuCyclically(liverUID);
        }
        liverUID = message.data.liverUID;
        config = message.data.config;
      }
    }
  );

  onDestroy(() => {
    if (commentUnsubscribe) {
      commentUnsubscribe();
    }
    receiveUnsubscribe();
    cleanup();
  });
</script>

<svelte:window bind:innerWidth={width} />

{#if config && width !== undefined && width > 0}
  {#each data as sticker (sticker.id)}
    <Danmaku {sticker} windowWidth={width} />
  {/each}
{/if}
