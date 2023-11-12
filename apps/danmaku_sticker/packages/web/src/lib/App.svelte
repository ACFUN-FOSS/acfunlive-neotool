<script lang="ts">
  import {
    danmakuStickerWebID,
    danmakuStickerID,
    defaultDuration,
    type StickerMessage,
    type StickerConfig
  } from '@acfunlive-neotool/danmaku-sticker-shared';
  import { BackendSession, neotoolID, type SessionState } from '@acfunlive-neotool/session';
  import { type unsubscribe, default as webApiSession } from 'acfunlive-backend-js/webapi.js';
  import { onDestroy, onMount } from 'svelte';
  import type { Readable } from 'svelte/store';

  import Danmaku from './components/Danmaku.svelte';
  import { stickersToRegex, gap, type Sticker } from './scripts/danmaku';

  let session: BackendSession | undefined;

  let state: Readable<SessionState> | undefined;

  let sessionCleanup: unsubscribe | undefined;

  let liverUID: number | undefined;

  let config: StickerConfig | undefined;

  let isOnline: boolean = true;

  let width: number | undefined;

  let id: number = 0;

  let data: Sticker[] = [];

  let regex: RegExp | undefined;

  $: if (session && state && $state!.hasClientId() && isOnline) {
    session.sendMessageRepeatedly<StickerMessage>(neotoolID, {
      target: danmakuStickerID,
      type: 'isOnline',
      data: undefined
    });
  }

  $: if (config && config.stickers.length > 0) {
    regex = stickersToRegex(config.stickers);
  } else {
    regex = undefined;
  }

  $: if (session && liverUID !== undefined && liverUID > 0) {
    if (isOnline) {
      session.getDanmakuRepeatedly(liverUID);
    } else {
      session.stopDanmakuRepeatedly(liverUID);
    }
  }

  let commentUnsubscribe: unsubscribe | undefined;

  $: if (session) {
    if (commentUnsubscribe) {
      commentUnsubscribe();
      commentUnsubscribe = undefined;
    }

    commentUnsubscribe = session.session.on('comment', (comment) => {
      if (isOnline && regex && comment.liverUID === liverUID) {
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
    });
  }

  let receiveUnsubscribe: unsubscribe | undefined;

  $: if (session) {
    if (receiveUnsubscribe) {
      receiveUnsubscribe();
      receiveUnsubscribe = undefined;
    }

    receiveUnsubscribe = session.onReceiveMessage<StickerMessage>(
      danmakuStickerWebID,
      (message) => {
        if (message.type === 'online') {
          isOnline = true;
        } else if (message.type === 'offline') {
          isOnline = false;
        } else if (message.type === 'update') {
          if (
            session &&
            liverUID !== undefined &&
            liverUID > 0 &&
            liverUID !== message.data.liverUID
          ) {
            session.stopDanmakuRepeatedly(liverUID);
          }
          liverUID = message.data.liverUID;
          config = message.data.config;
        }
      }
    );
  }

  onMount(() => {
    session = new BackendSession(webApiSession(), danmakuStickerWebID);
    state = session.stateReadable;
    sessionCleanup = session.connect();
  });

  onDestroy(() => {
    if (commentUnsubscribe) {
      commentUnsubscribe();
      commentUnsubscribe = undefined;
    }
    if (receiveUnsubscribe) {
      receiveUnsubscribe();
      receiveUnsubscribe = undefined;
    }
    if (sessionCleanup) {
      sessionCleanup();
      sessionCleanup = undefined;
    }
  });
</script>

<svelte:window bind:innerWidth={width} />

{#if config && width !== undefined && width > 0}
  {#each data as sticker (sticker.id)}
    <Danmaku {sticker} windowWidth={width} />
  {/each}
{/if}
