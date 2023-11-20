<script lang="ts">
  import { emitError, listen, request, type UnlistenFn } from '@acfunlive-neotool/shared';
  import { onDestroy } from 'svelte';

  import {
    chat,
    chatConfig,
    ChatDanmaku,
    ChatGift,
    chatState,
    ChatState,
    initConfig,
    setSparkKey,
    setTtsKey,
    sparkKey,
    stopAudio,
    playAudio,
    textToSpeech,
    ttsKey,
    ChatContent
  } from './scripts/chat';

  import { Button, Checkbox, Slider, TextArea } from 'carbon-components-svelte';

  import KeyDialog from './components/KeyDialog.svelte';
  import Log from './components/Log.svelte';

  import './app.css';
  import appConfigJson from '../neotool.app.json';

  let openSparkKeyDialog = false;
  let sparkKeyDialogKey = {};

  let openTtsKeyDialog = false;
  let ttsKeyDialogKey = {};

  let openLogDialog = false;
  let logDialogKey = {};

  let cleanups: UnlistenFn[] = [];

  let enable = false;

  let liverUID: number | undefined;

  let liveID: string | undefined;

  let contents: ChatContent[] = [];
  let danmakuList: string[] = [];
  let giftCombo: Map<string, any> = new Map();

  let reply = '';
  let replyList: string[] = [];

  let audioSourceList: number[] = [];

  $: if (enable) {
    $chatState = ChatState.Idle;
  } else {
    $chatState = ChatState.Disable;
    contents = [];
    danmakuList = [];
    reply = '';
    replyList = [];
    audioSourceList = [];
    stopAudio().catch((e) => emitError(`failed to stop audio: ${e}`));
  }

  $: if (enable && liveID && $chatState === ChatState.Idle && contents.length > 0) {
    danmakuList = contents.map((content) => content.toString());
    let isChatting = false;
    chat(
      contents,
      (content) => {
        if (enable) {
          if (isChatting) {
            reply = reply + content;
          } else {
            reply = content;
            isChatting = true;
          }
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
    contents = [];
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
              contents.push(new ChatDanmaku(danmaku.data));
              contents = contents;
            }
          },
          undefined
        ),
        await listen(
          'gift',
          (gift) => {
            const giftLiverUID = gift.liverUID;
            if (enable && $chatConfig.thanksGift && giftLiverUID === liverUID) {
              const comboID = gift.data.comboID;
              const chatGift = new ChatGift(gift.data);
              const timeoutID = giftCombo.get(comboID);
              if (timeoutID !== undefined) {
                clearTimeout(timeoutID);
              }
              giftCombo.set(
                comboID,
                setTimeout(() => {
                  if (enable && $chatConfig.thanksGift && giftLiverUID === liverUID) {
                    contents.push(chatGift);
                    contents = contents;
                  }
                  giftCombo.delete(comboID);
                }, 3500)
              );
            }
          },
          undefined
        )
      );

      await request('appData', appConfigJson.id);
      await request('liverUID', undefined);
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
  <div class="flex flex-col space-y-4">
    {#if $sparkKey === undefined}
      <div class="text-red-600">请设置讯飞星火模型</div>
    {/if}
    {#if $ttsKey === undefined}
      <div class="text-red-600">请设置讯飞语音</div>
    {/if}
    <div class="flex flex-row space-x-4">
      <Button
        on:click={() => {
          openSparkKeyDialog = true;
          sparkKeyDialogKey = {};
        }}>设置讯飞星火</Button
      >
      <Button
        on:click={() => {
          openTtsKeyDialog = true;
          ttsKeyDialogKey = {};
        }}>设置讯飞语音</Button
      >
    </div>
    <div>
      <Checkbox bind:checked={$chatConfig.thanksGift} labelText="AI感谢礼物"></Checkbox>
    </div>
  </div>
  <div class="pt-4">
    <TextArea
      labelText="AI人设（越详细越好，但最好不要超过一千字）"
      bind:value={$chatConfig.characterSet}
    ></TextArea>
  </div>
  <div class="flex flex-col space-y-4 pt-4">
    <TextArea readonly labelText="弹幕" rows={2} value={danmakuList.join('\n')}></TextArea>
    <TextArea readonly labelText="AI回复" value={reply}></TextArea>
    <div class="flex flex-row">
      <Slider
        hideTextInput
        labelText="音量"
        value={$chatConfig.volumn * 50}
        on:change={(e) => {
          const volumn = e.detail;
          if (typeof volumn === 'number') {
            $chatConfig.volumn = volumn / 50;
          }
        }}
      ></Slider>
      <Slider
        hideTextInput
        labelText="语速（改变后在下一个语音生效）"
        bind:value={$chatConfig.speed}
      ></Slider>
      <Button
        disabled={$chatState !== ChatState.Chatting}
        on:click={() => ($chatState = ChatState.Ignore)}>忽略本次生成</Button
      >
      <Button
        on:click={() => {
          openLogDialog = true;
          logDialogKey = {};
        }}>记录</Button
      >
    </div>
  </div>
</div>

{#key sparkKeyDialogKey}
  <KeyDialog
    bind:isOpen={openSparkKeyDialog}
    header="讯飞星火模型"
    appId={$sparkKey?.appId}
    apiSecret={$sparkKey?.apiSecret}
    apiKey={$sparkKey?.apiKey}
    on:key={(e) => setSparkKey(e.detail)}
  ></KeyDialog>
{/key}

{#key ttsKeyDialogKey}
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
{/key}

{#key logDialogKey}
  <Log bind:isOpen={openLogDialog}></Log>
{/key}
