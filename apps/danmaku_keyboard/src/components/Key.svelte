<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  import { KeyData, keysToString } from '../scripts/key';
  import { trashIcon, editIcon } from '../scripts/svg';
  import Input from './Input.svelte';

  export let key: KeyData;

  let openInput = false;

  const dispatch = createEventDispatcher<{ delete: undefined }>();
</script>

<tr>
  <td>
    <input type="checkbox" bind:checked={key.enable} class="checkbox checkbox-sm" />
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
        <input type="number" bind:value={interval} min="0" max="10000000" step="100" />
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
