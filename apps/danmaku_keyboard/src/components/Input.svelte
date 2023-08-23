<script lang="ts">
  import { KeyboardListener, type Input } from 'tauri-plugin-acfunlive-neotool-keyboard-api';
  import { createEventDispatcher, onDestroy } from 'svelte';

  import { KeyData, keysToString } from '../scripts/key';

  export let isOpen: boolean;

  export let danmaku: string | undefined = undefined;

  export let keys: Input[] = [];

  let listerner: KeyboardListener | undefined;

  const dispatch = createEventDispatcher<{ key: KeyData }>();

  function trigger() {
    keys = keys;
  }

  function stopListen() {
    listerner
      ?.stop_listen()
      .then(() => (listerner = undefined))
      .catch((e) => console.log(`faled to stop listen keyboard: ${e}`));
  }

  onDestroy(stopListen);
</script>

<div class="modal" class:modal-open={isOpen}>
  <div class="modal-box">
    <div class="flex flex-col space-y-5">
      <input
        type="text"
        bind:value={danmaku}
        placeholder="触发弹幕"
        class="input input-bordered w-64"
        disabled={listerner !== undefined}
      />
      {#if keys.length > 0}
        <div class="badge badge-neutral">
          {keysToString(keys)}
        </div>
      {/if}
    </div>
    <div class="modal-action">
      {#if listerner}
        <button class="btn" on:click={stopListen}>停止输入</button>
      {:else}
        <button
          class="btn"
          on:click={() => {
            keys = [];
            KeyboardListener.start_listen(
              (key) => {
                keys.push({ KeyDown: key });
                trigger();
              },
              (key) => {
                keys.push({ KeyUp: key });
                trigger();
              }
            )
              .then((l) => (listerner = l))
              .catch((e) => console.log(`faled to start listen keyboard: ${e}`));
          }}>开始输入</button
        >
      {/if}
      {#if danmaku && keys.length > 0}
        <button
          class="btn"
          on:click={() => {
            stopListen();
            if (danmaku && keys.length > 0) {
              dispatch('key', new KeyData(danmaku, keys));
            }
            isOpen = false;
          }}>确定</button
        >
      {/if}
      <button
        class="btn"
        on:click={() => {
          stopListen();
          isOpen = false;
        }}>取消</button
      >
    </div>
  </div>
</div>
