<script lang="ts">
  import {
    danmakuStickerWebID,
    type StickerMessage
  } from '@acfunlive-neotool/danmaku-sticker-shared';
  import { SessionData, neotoolID } from '@acfunlive-neotool/shared';
  import webApiSession from 'acfunlive-backend-js/webapi.js';
  import { onDestroy } from 'svelte';

  const session = new SessionData(webApiSession(), danmakuStickerWebID);

  const cleanup = session.connect();

  const openUnsubscribe = session.session.on('websocketOpen', () =>
    session.sendMessageCyclically<StickerMessage>(neotoolID, {
      target: 'danmakuSticker',
      type: 'isOnline',
      data: undefined
    })
  );

  const receiveUnsubscribe = session.onReceiveMessage<StickerMessage>(
    'danmakuStickerWeb',
    (message) => {
      console.log('receive: ', message);
    }
  );

  onDestroy(() => {
    openUnsubscribe();
    receiveUnsubscribe();
    cleanup();
  });
</script>

<h1>hello</h1>
