<script lang="ts">
  import { hostname, port, type StickerMessage } from '@acfunlive-neotool/danmaku-sticker-shared';
  import { type AppData, onReceiveMessage } from '@acfunlive-neotool/shared';
  import { join } from '@tauri-apps/api/path';
  import { onDestroy } from 'svelte';
  import { Server } from 'tauri-plugin-acfunlive-neotool-serve-files-api';

  import './app.css';

  export let data: AppData;

  let server: Server | undefined;

  join(data.config.path, 'web').then((path) =>
    Server.startServe(path, hostname, port)
      .then((s) => (server = s))
      .catch((e) => console.log(`failed to start the server: ${e}`))
  );

  const receiveUnsubscribe = onReceiveMessage<StickerMessage>(
    data.session,
    'danmakuSticker',
    (message) => {
      console.log('receive: ', message);
    }
  );

  onDestroy(() => {
    server?.stopServe();
    receiveUnsubscribe();
  });
</script>

<h6 class="flex">hello</h6>
