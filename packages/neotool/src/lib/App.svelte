<script lang="ts">
  import { type UserInfo, SessionData } from '@acfunlive-neotool/shared';
  import { default as tauriSession } from 'acfunlive-backend-js/tauri.js';
  import { onDestroy } from 'svelte';
  import { writable, get, readonly, type Writable } from 'svelte/store';
  import type { AppConfig } from 'tauri-plugin-acfunlive-neotool-base-api';

  import { type Config, loadConfig, saveConfig, loadApps } from './scripts/load';

  import LiverUIDDialog from '$lib/components/LiverUIDDialog.svelte';
  import Avatar from './components/Avatar.svelte';
  import SubApp from './components/SubApp.svelte';

  let config: Config | undefined;

  let openUIDDialog = false;

  $: config && saveConfig(config).catch((e) => console.log(`failed to save config: ${e}`));

  let appsConfigs: AppConfig[] | undefined;

  const enableApps: { [name: string]: Writable<boolean> } = {};

  let selectedApp = 0;

  $: if (config?.appsDir && !appsConfigs) {
    loadApps(config.appsDir)
      .then((configs) => {
        appsConfigs = configs;
        for (const config of configs) {
          enableApps[config.id] = writable(true);
        }
      })
      .catch((e) => console.log(`failed to load Apps config: ${e}`));
  }

  const session = new SessionData(tauriSession());

  const state = session.state;

  const token = session.token;

  const userInfoMap = session.userInfoMap;

  let userInfo: UserInfo | undefined;
  $: userInfo = $userInfoMap.get(0);

  const cleanup = session.connect();

  $: if (config?.liverUID && $state.isConnect() && $state.isLogin() && !$state.isGetDanmaku()) {
    session.getDanmakuCyclically(config.liverUID, true);
  }

  loadConfig()
    .then((conf) => {
      config = conf;
      conf?.liverUID || (openUIDDialog = true);
    })
    .catch((e) => console.log(`failed to load config: ${e}`));

  onDestroy(cleanup);
</script>

{#if !config?.liverUID || openUIDDialog}
  <LiverUIDDialog
    bind:isOpen={openUIDDialog}
    text={config?.liverUID?.toString()}
    on:liverUID={(uid) => {
      if (config) {
        if (config.liverUID) {
          if (config.liverUID != uid.detail) {
            const oldLiverUID = config.liverUID;
            config.liverUID = uid.detail;
            // 停止获取弹幕后会重新获取弹幕
            session.stopDanmakuCyclically(oldLiverUID);
          }
        } else {
          config.liverUID = uid.detail;
        }
      }
    }}
  />
{/if}

<div class="flex flex-row justify-between items-center h-16 mx-5">
  <h1>AcFun Neo 直播工具箱</h1>
  <Avatar state={$state} {userInfo} on:openUIDDialog={() => (openUIDDialog = true)}></Avatar>
</div>
<div class="divider h-0 my-0"></div>

{#if appsConfigs && appsConfigs.length > 0}
  <div class="drawer drawer-open">
    <input type="checkbox" class="drawer-toggle" />
    <div class="drawer-side">
      <ul class="menu space-y-2">
        {#each appsConfigs as appConfig, i (appConfig.id)}
          <li>
            <div class="flex flex-row" class:active={selectedApp === i}>
              <button class="btn btn-ghost" on:click={() => (selectedApp = i)}
                >{appConfig.name}</button
              >
              <input
                type="checkbox"
                class="toggle toggle-sm"
                checked={get(enableApps[appConfig.id])}
                on:change={(e) => enableApps[appConfig.id].update(() => e.currentTarget.checked)}
              />
            </div>
          </li>
        {/each}
      </ul>
    </div>
    <div class="drawer-content">
      {#each appsConfigs as appConfig, i (appConfig.id)}
        <div class:hidden={selectedApp !== i}>
          <SubApp
            config={appConfig}
            shared={{
              session: session.session,
              data: {
                state: readonly(state),
                token: readonly(token),
                userInfoMap: readonly(userInfoMap)
              },
              enable: readonly(enableApps[appConfig.id])
            }}
          ></SubApp>
        </div>
      {/each}
    </div>
  </div>
{/if}
