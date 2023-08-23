<script lang="ts">
  import { convertFileSrc } from '@tauri-apps/api/tauri';
  import { createEventDispatcher } from 'svelte';

  import { pickImage } from '../scripts/data';

  export let isOpen: boolean;

  export let danmaku: string | undefined = undefined;

  const allowPickImage = danmaku === undefined;

  let imagePath: string | undefined;

  const dispatch = createEventDispatcher<{
    sticker: { danmaku: string; imagePath: string | undefined };
  }>();
</script>

<div class="modal" class:modal-open={isOpen}>
  <div class="modal-box">
    <div class="flex flex-col items-start space-y-5">
      <input
        type="text"
        bind:value={danmaku}
        placeholder="触发弹幕"
        class="input input-bordered w-64"
      />
      {#if imagePath}
        <img src={convertFileSrc(imagePath)} alt="图片" class="max-w-[150px] max-h-[150px]" />
      {/if}
    </div>
    <div class="modal-action">
      {#if allowPickImage}
        <button
          class="btn"
          on:click={() =>
            pickImage()
              .then((path) => (imagePath = path))
              .catch((e) => console.log(`failed to pick image: ${e}`))}>选择图片</button
        >
      {/if}
      {#if danmaku && (!allowPickImage || imagePath)}
        <button
          class="btn"
          on:click={() => {
            if (danmaku) {
              dispatch('sticker', { danmaku, imagePath });
            }
            isOpen = false;
          }}>确定</button
        >
      {/if}
      <button class="btn" on:click={() => (isOpen = false)}>取消</button>
    </div>
  </div>
</div>
