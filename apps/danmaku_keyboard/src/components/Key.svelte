<script lang="ts">
  import { trashIcon, editIcon } from '@acfunlive-neotool/shared';
  import { createEventDispatcher } from 'svelte';

  import { KeyData, keysToString } from '../scripts/key';
  import Input from './Input.svelte';

  export let key: KeyData;

  let openInput = false;

  const dispatch = createEventDispatcher<{ delete: undefined }>();
</script>

<tr>
  <td>
    <input class="checkbox checkbox-sm" type="checkbox" bind:checked={key.enable} />
  </td>
  <td>
    <input class="max-w-[80px]" bind:value={key.prefix} />
  </td>
  <td>{key.danmaku}</td>
  <td
    ><div class="badge badge-neutral">
      {keysToString(key.keys)}
    </div></td
  >
  <td>
    <div class="flex flex-col space-y-2">
      {#each key.intervals as interval}
        <input
          class="max-w-[60px]"
          type="number"
          bind:value={interval}
          min="0"
          max="10000000"
          step="100"
        />
      {/each}
    </div>
  </td>
  <td>
    <div class="flex flex-row justify-center">
      <button class="btn btn-ghost w-14" on:click={() => (openInput = true)}
        >{@html editIcon}</button
      >
      <button class="btn btn-ghost w-14" on:click={() => dispatch('delete', undefined)}
        >{@html trashIcon}</button
      >
    </div>
  </td>
</tr>

{#if openInput}
  <Input
    bind:isOpen={openInput}
    danmaku={key.danmaku}
    keys={key.keys}
    on:key={(evnet) => {
      const enable = key.enable;
      key = evnet.detail;
      key.enable = enable;
    }}
  />
{/if}
