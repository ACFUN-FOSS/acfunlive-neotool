<script lang="ts">
  import type { AppShared } from '@acfunlive-neotool/shared';
  import { onDestroy } from 'svelte';

  import { loadConfig, saveConfig, keysToRegex, simulate, type KeyConfig } from './scripts/key';
  import KeyData from './components/Key.svelte';
  import Input from './components/Input.svelte';

  import './app.css';

  export let shared: AppShared;

  const enable = shared.enable;

  let config: KeyConfig | undefined;

  let regex: RegExp | undefined;

  let openInput = false;

  $: if (config) {
    saveConfig(config).catch((e) => console.log(`failed to save danmaku_keyboard config: ${e}`));
    if (config.keys.length > 0) {
      regex = keysToRegex(config.keys);
    } else {
      regex = undefined;
    }
  }

  loadConfig()
    .then((c) => (config = c))
    .catch((e) => console.log(`failed to load danmaku_keyboard config: ${e}`));

  const unsubscribe = shared.session.on('comment', (damaku) => {
    if ($enable && regex) {
      let match = damaku.data.content.match(regex);
      if (match) {
        for (const [i, group] of match.slice(1).entries()) {
          if (group) {
            const key = config?.keys[i];
            if (key?.enable) {
              simulate(key).catch((e) => console.log(`failed to simulate keyboard input: ${e}`));
              return;
            }
          }
        }
      }
    }
  });

  onDestroy(unsubscribe);
</script>

<div class="flex flex-col content-between p-5 space-y-5 overflow-auto">
  {#if config}
    <table class="table table-zebra">
      <thead>
        <tr>
          <th></th>
          <th class="text-base">触发弹幕</th>
          <th class="text-base">触发按键</th>
          <th class="text-base">按键时长（毫秒）</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each config.keys as key, i}
          <KeyData
            bind:key
            on:delete={() => {
              config?.keys.splice(i, 1);
              config = config;
            }}
          ></KeyData>
        {/each}
      </tbody>
    </table>
  {/if}

  <button class="btn btn-primary text-3xl" on:click={() => (openInput = true)}>+</button>
</div>

{#if openInput}
  <Input
    bind:isOpen={openInput}
    on:key={(event) => {
      if (config) {
        config.keys.push(event.detail);
        config = config;
      }
    }}
  />
{/if}
