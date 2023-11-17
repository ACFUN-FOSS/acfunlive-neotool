<script lang="ts">
  import { emitError, listen, request, type UnlistenFn } from '@acfunlive-neotool/shared';
  import { onDestroy } from 'svelte';

  import {
    chat,
    chatConfig,
    ChatContent,
    chatState,
    ChatState,
    initConfig,
    setSparkKey,
    setTtsKey,
    sparkKey,
    stopAudio,
    playAudio,
    textToSpeech,
    ttsKey
  } from './scripts/chat';

  import { Button, TextArea } from 'carbon-components-svelte';

  import KeyDialog from './components/KeyDialog.svelte';

  import './app.css';
  import appConfigJson from '../neotool.app.json';

  let hasInit = false;

  let openSparkKeyDialog = false;

  let openTtsKeyDialog = false;

  let cleanups: UnlistenFn[] = [];

  let enable = false;

  let liverUID: number | undefined;

  let liveID: string | undefined;

  let danmakuList: ChatContent[] = [];

  let reply = '';
  let replyList: string[] = [];

  let audioSourceList: number[] = [];

  $: if (enable) {
    $chatState = ChatState.Idle;
  } else {
    $chatState = ChatState.Disable;
    danmakuList = [];
    reply = '';
    replyList = [];
    audioSourceList = [];
    stopAudio().catch((e) => emitError(`failed to stop audio: ${e}`));
  }

  $: console.log('liveID', liveID);
  $: console.log('chatState', $chatState);

  $: if (enable && liveID && $chatState === ChatState.Idle && danmakuList.length > 0) {
    let isChatting = false;
    chat(
      [...danmakuList],
      (content) => {
        if (isChatting) {
          reply = reply + content;
        } else {
          reply = content;
          isChatting = true;
        }
      },
      liveID
    )
      .then((content) => {
        if (enable && content) {
          replyList.push(content);
          replyList = replyList;
        }
      })
      .catch((e) => emitError(`AI chat error: ${e}`));
    danmakuList = [];
  }

  let isTts = false;
  $: if (enable && !isTts && replyList.length > 0) {
    isTts = true;
    textToSpeech([...replyList], (id) => {
      if (enable) {
        audioSourceList.push(id);
        audioSourceList = audioSourceList;
      }
    })
      .catch((e) => emitError(`tts error: ${e}`))
      .finally(() => (isTts = false));
    replyList = [];
  }

  let isPlayingAudio = false;
  $: if (enable && !isPlayingAudio && audioSourceList.length > 0) {
    isPlayingAudio = true;
    playAudio([...audioSourceList])
      .catch((e) => emitError(`audio error: ${e}`))
      .finally(() => (isPlayingAudio = false));
    audioSourceList = [];
  }

  async function init(): Promise<void> {
    try {
      cleanups.push(
        await initConfig(),
        await listen('appData', (data) => (enable = data.enable), appConfigJson.id),
        await listen(
          'liverUID',
          (uid) => {
            liverUID = uid;
            if (uid !== undefined && uid > 0) {
              request('userInfo', uid);
            }
          },
          undefined
        ),
        await listen(
          'userInfo',
          (info) => {
            if (info.userID === liverUID && info.liveID.length > 0) {
              liveID = info.liveID;
            }
          },
          undefined
        ),
        await listen(
          'danmaku',
          (danmaku) => {
            if (enable && danmaku.liverUID === liverUID) {
              danmakuList.push(
                new ChatContent(danmaku.data.danmuInfo.userInfo.nickname, danmaku.data.content)
              );
              danmakuList = danmakuList;
            }
          },
          undefined
        )
      );

      await request('appData', appConfigJson.id);
      await request('liverUID', undefined);

      hasInit = true;
    } catch (e) {
      await emitError(`${appConfigJson.id} init error: ${e}`);
    }
  }

  init();

  onDestroy(() => {
    for (const cleanup of cleanups) {
      cleanup();
    }
    cleanups = [];
  });
</script>

<div class="flex flex-col space-y-4 divide-y divide-dashed">
  <div>
    {#if $sparkKey === undefined}
      <div class="text-red-600">请设置讯飞星火模型</div>
    {/if}
    {#if $ttsKey === undefined}
      <div class="text-red-600">请设置讯飞语音</div>
    {/if}
    <div>
      <Button on:click={() => (openSparkKeyDialog = true)}>设置讯飞星火</Button>
      <Button on:click={() => (openTtsKeyDialog = true)}>设置讯飞语音</Button>
    </div>
  </div>
  <div class="pt-4">
    <TextArea labelText="AI人设" bind:value={$chatConfig.characterSet}></TextArea>
  </div>
  <div class="pt-4">
    <TextArea readonly labelText="AI回复" bind:value={reply}></TextArea>
  </div>
</div>

{#if hasInit}
  <KeyDialog
    bind:isOpen={openSparkKeyDialog}
    header="讯飞星火模型"
    appId={$sparkKey?.appId}
    apiSecret={$sparkKey?.apiSecret}
    apiKey={$sparkKey?.apiKey}
    on:key={(e) => setSparkKey(e.detail)}
  ></KeyDialog>

  <KeyDialog
    bind:isOpen={openTtsKeyDialog}
    header="讯飞语音"
    appId={$ttsKey?.appId}
    apiSecret={$ttsKey?.apiSecret}
    apiKey={$ttsKey?.apiKey}
    vcn={$chatConfig.vcn}
    on:key={(e) => setTtsKey(e.detail)}
    on:vcn={(e) => ($chatConfig.vcn = e.detail)}
  ></KeyDialog>
{/if}
