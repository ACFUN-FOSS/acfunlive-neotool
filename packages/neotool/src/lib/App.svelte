<script lang="ts">
  import { type UserInfo, SessionData, neotoolID } from '@acfunlive-neotool/shared';
  import tauriSession from 'acfunlive-backend-js/tauri.js';
  import { onDestroy } from 'svelte';
  import { writable, get, readonly, type Writable } from 'svelte/store';
  import type { AppConfig } from 'tauri-plugin-acfunlive-neotool-base-api';

  import { type Config, loadConfig, saveConfig, loadApps } from './scripts/load';

  import LiverUIDDialog from '$lib/components/LiverUIDDialog.svelte';
  import Avatar from './components/Avatar.svelte';
  import SubApp from './components/SubApp.svelte';

  let config: Config | undefined;

  let openUIDDialog = false;

  loadConfig()
    .then((conf) => {
      config = conf;
      conf?.liverUID !== undefined || (openUIDDialog = true);
    })
    .catch((e) => console.log(`failed to load config: ${e}`));

  $: config && saveConfig(config).catch((e) => console.log(`failed to save config: ${e}`));

  type AppConfigData = {
    config: AppConfig;
    enable: Writable<boolean>;
  };

  let appsConfig: AppConfigData[] | undefined;

  let selectedApp = 0;

  $: if (config?.appsDir && !appsConfig) {
    loadApps(config.appsDir)
      .then(
        (configs) =>
          (appsConfig = configs.map((config) => {
            return { config, enable: writable(true) };
          }))
      )
      .catch((e) => console.log(`failed to load Apps config: ${e}`));
  }

  const session = new SessionData(tauriSession(), neotoolID);

  const state = session.stateReadable;

  const userInfoMap = session.userInfoMapReadable;

  const streamInfoMap = session.streamInfoMapReadable;

  const cleanup = session.connect();

  $: if (config?.liverUID !== undefined && config.liverUID > 0) {
    session.liverUID = config.liverUID;
  }

  let userInfo: UserInfo | undefined;

  $: if (config?.liverUID !== undefined && config.liverUID > 0) {
    userInfo = $userInfoMap.get(config.liverUID);
  }

  let isGettingDanmaku = false;

  $: if (config?.liverUID !== undefined && config.liverUID > 0) {
    if ($streamInfoMap.get(config.liverUID)) {
      isGettingDanmaku = true;
    } else {
      isGettingDanmaku = false;
    }
  }

  $: if (
    config?.liverUID !== undefined &&
    config.liverUID > 0 &&
    $state.isConnect() &&
    $state.isLogin()
  ) {
    session.getDanmakuCyclically(config?.liverUID);
  }

  onDestroy(cleanup);
</script>

<div class="flex flex-row justify-between items-center h-16 mx-5">
  <h1>AcFun Neo 直播工具箱</h1>
  <Avatar
    state={$state}
    {userInfo}
    {isGettingDanmaku}
    on:openUIDDialog={() => (openUIDDialog = true)}
  ></Avatar>
</div>
<div class="divider h-0 my-0"></div>

{#if appsConfig && appsConfig.length > 0}
  <div class="drawer drawer-open">
    <input type="checkbox" class="drawer-toggle" />
    <div class="drawer-side">
      <ul class="menu space-y-2">
        {#each appsConfig as appConfig, i (appConfig.config.id)}
          <li>
            <div class="flex flex-row" class:active={selectedApp === i}>
              <button class="btn btn-ghost" on:click={() => (selectedApp = i)}
                >{appConfig.config.name}</button
              >
              <input
                type="checkbox"
                class="toggle toggle-sm"
                checked={get(appConfig.enable)}
                on:change={(e) => appConfig.enable.update(() => e.currentTarget.checked)}
              />
            </div>
          </li>
        {/each}
      </ul>
    </div>
    <div class="drawer-content">
      {#each appsConfig as appConfig, i (appConfig.config.id)}
        <div class:hidden={selectedApp !== i}>
          <SubApp
            config={appConfig.config}
            data={{
              session: session,
              config: appConfig.config,
              enable: readonly(appConfig.enable)
            }}
          ></SubApp>
        </div>
      {/each}
    </div>
  </div>
{/if}

{#if config && (config.liverUID === undefined || openUIDDialog)}
  <LiverUIDDialog
    bind:isOpen={openUIDDialog}
    text={config?.liverUID?.toString()}
    on:liverUID={(uid) => {
      if (config) {
        if (config.liverUID) {
          if (config.liverUID !== uid.detail) {
            // 停止获取旧的弹幕后会重新获取新的弹幕
            session.stopDanmakuCyclically(config.liverUID);
            config.liverUID = uid.detail;
          }
        } else {
          config.liverUID = uid.detail;
        }
      }
    }}
  />
{/if}
