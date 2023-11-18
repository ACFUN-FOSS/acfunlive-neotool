<script lang="ts">
  import { StickerData, Direction } from '@acfunlive-neotool/danmaku-sticker-shared';
  import { trashIcon, editIcon } from '@acfunlive-neotool/shared';
  import { convertFileSrc } from '@tauri-apps/api/tauri';
  import { createEventDispatcher } from 'svelte';

  import Pick from './Pick.svelte';

  export let sticker: StickerData;

  let openPick = false;

  let isDropdownOpen = false;

  const dispatch = createEventDispatcher<{ delete: undefined }>();
</script>

<tr>
  <td>
    <input type="checkbox" bind:checked={sticker.enable} class="checkbox checkbox-sm" />
  </td>
  <td>
    <input class="max-w-[80px]" bind:value={sticker.prefix} />
  </td>
  <td>{sticker.danmaku}</td>
  <td><img src={convertFileSrc(sticker.path)} alt="图片" class="max-w-[100px] max-h-[100px]" /></td>
  <td
    ><details class="dropdown" bind:open={isDropdownOpen}>
      <summary class="btn mx-2 w-24"
        >{sticker.direction === Direction.LeftToRight ? '从左到右' : '从右到左'}</summary
      >
      <ul class="dropdown-content menu bg-base-100 z-10 rounded-box shadow">
        <li>
          <!-- svelte-ignore a11y-missing-attribute -->
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <a
            on:click={() => {
              sticker.direction = Direction.LeftToRight;
              isDropdownOpen = false;
            }}>从左到右</a
          >
        </li>
        <li>
          <!-- svelte-ignore a11y-missing-attribute -->
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <a
            on:click={() => {
              sticker.direction = Direction.RightToLeft;
              isDropdownOpen = false;
            }}>从右到左</a
          >
        </li>
      </ul>
    </details></td
  >
  <td>
    <input type="number" bind:value={sticker.height} min="0" max="10000" />
  </td>
  <td>
    <input type="number" bind:value={sticker.duration} min="0" max="10000000" step="100" />
  </td>
  <td>
    <div class="flex flex-row justify-center">
      <button class="btn btn-ghost w-14" on:click={() => (openPick = true)}>{@html editIcon}</button
      >
      <button class="btn btn-ghost w-14" on:click={() => dispatch('delete', undefined)}
        >{@html trashIcon}</button
      >
    </div>
  </td>
</tr>

{#if openPick}
  <Pick
    bind:isOpen={openPick}
    danmaku={sticker.danmaku}
    on:sticker={(event) => (sticker.danmaku = event.detail.danmaku)}
  />
{/if}
