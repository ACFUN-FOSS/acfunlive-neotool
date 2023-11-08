<script lang="ts">
  import { listen, request, type UnlistenFn } from '@acfunlive-neotool/shared';
  import { onDestroy } from 'svelte';

  import {
    loadConfig,
    saveConfig,
    keysToRegex,
    simulate,
    waitInterval,
    type KeyConfig
  } from './scripts/key';
  import KeyComponent from './components/Key.svelte';
  import Input from './components/Input.svelte';

  import './app.css';
  import appConfigJson from '../neotool.app.json';

  let cleanups: UnlistenFn[] = [];

  let enable = false;
  listen('appData', (data) => (enable = data.enable), appConfigJson.id)
    .then(async (unlisten) => {
      cleanups.push(unlisten);
      await request('appData', appConfigJson.id);
    })
    .catch((e) => console.log(`failed to listen appData: ${e}`));

  let liverUID: number | undefined;
  listen('liverUID', (uid) => (liverUID = uid), undefined)
    .then(async (unlisten) => {
      cleanups.push(unlisten);
      await request('liverUID', undefined);
    })
    .catch((e) => console.log(`failed to listen liverUID: ${e}`));

  let config: KeyConfig | undefined;

  let regex: RegExp | undefined;

  let openInput = false;

  loadConfig()
    .then((c) => (config = c))
    .catch((e) => console.log(`failed to load danmaku_keyboard config: ${e}`));

  $: if (config) {
    saveConfig(config).catch((e) => console.log(`failed to save danmaku_keyboard config: ${e}`));
    if (config.keys.length > 0) {
      regex = keysToRegex(config.keys);
    } else {
      regex = undefined;
    }
  }

  listen(
    'danmaku',
    async (danmaku) => {
      if (enable && regex && danmaku.liverUID === liverUID) {
        for (const match of danmaku.data.content.matchAll(regex)) {
          for (const [i, group] of match.slice(1).entries()) {
            if (group) {
              const key = config?.keys[i];
              if (key?.enable) {
                try {
                  await simulate(key);
                } catch (e) {
                  console.log(`failed to simulate keyboard input: ${e}`);
                }

                break;
              }
            }
          }

          await waitInterval(config);
        }
      }
    },
    undefined
  )
    .then((unlisten) => cleanups.push(unlisten))
    .catch((e) => console.log(`failed to listen danmaku: ${e}`));

  onDestroy(() => {
    for (const cleanup of cleanups) {
      cleanup();
    }
    cleanups = [];
  });
</script>

<div class="flex flex-col content-between p-5 space-y-5">
  <div>说明：弹幕文字前面需要添加 @ 符号来触发</div>

  {#if config}
    <div class="flex flex-row space-x-3">
      <div>单个弹幕连续触发按键的间隔时长（毫秒）</div>
      <input type="number" bind:value={config.interval} min="0" max="10000000" step="100" />
    </div>

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
          <KeyComponent
            bind:key
            on:delete={() => {
              if (config) {
                config.keys.splice(i, 1);
                config.keys = config.keys;
              }
            }}
          ></KeyComponent>
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
        config.keys = config.keys;
      }
    }}
  />
{/if}
