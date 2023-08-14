<script lang="ts">
  import type { AppShared } from '@acfunlive-neotool/shared';
  import { onMount } from 'svelte';
  import type { AppConfig } from 'tauri-plugin-acfunlive-neotool-base-api';

  import { loadApp } from '../scripts/load';

  export let config: AppConfig;
  export let shared: AppShared;

  let element: Element | undefined;

  onMount(() => {
    if (element) {
      loadApp(config.entry, element, shared, config.css).catch((e) =>
        console.log(`failed to load App ${config.id} : ${e}`)
      );
    }
  });
</script>

<div bind:this={element}></div>
