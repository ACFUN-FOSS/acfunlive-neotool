<script lang="ts">
  import {
    BackendSession,
    EventHandler,
    listen,
    neotoolID,
    type UnlistenFn,
    type UserInfo
  } from '@acfunlive-neotool/shared';
  import tauriSession from 'acfunlive-backend-js/tauri.js';
  import { onDestroy } from 'svelte';
  import type { AppConfig } from 'tauri-plugin-acfunlive-neotool-base-api';

  import { type Config, loadConfig, saveConfig, loadApps } from './scripts/load';

  import LiverUIDDialog from '$lib/components/LiverUIDDialog.svelte';
  import Avatar from './components/Avatar.svelte';
  import SubApp from './components/SubApp.svelte';

  let config: Config | undefined;

  let openUIDDialog = false;

  // 读取设置
  loadConfig()
    .then((conf) => {
      config = conf;
      conf?.liverUID !== undefined || (openUIDDialog = true);
    })
    .catch((e) => console.log(`failed to load config: ${e}`));

  // 设置发生变化时保存设置
  $: config && saveConfig(config).catch((e) => console.log(`failed to save config: ${e}`));

  let appsConfig: AppConfig[] | undefined;

  let selectedApp = 0;

  const session = new BackendSession(tauriSession(), neotoolID);

  let eventHandler: EventHandler | undefined;

  // 读取App设置
  $: if (config?.appsDir && !appsConfig) {
    loadApps(config.appsDir)
      .then((configs) => {
        appsConfig = configs;
        eventHandler = new EventHandler(
          session,
          configs,
          configs.map((config) => {
            return { id: config.id, enable: true };
          })
        );
      })
      .catch((e) => console.log(`failed to load Apps config: ${e}`));
  }

  let isEventHandlerInited = eventHandler?.isInited ?? false;
  $: if (eventHandler && !isEventHandlerInited) {
    eventHandler
      .init()
      .then(() => (isEventHandlerInited = true))
      .catch((e) => console.log(`falied to init event handler: ${e}`));
  }

  let errorUnlisten: UnlistenFn | undefined;
  listen('error', (e) => console.log(`event error: ${e}`), undefined)
    .then((unlisten) => (errorUnlisten = unlisten))
    .catch((e) => console.log(`failed to listen event error: ${e}`));

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
    $state.isConnecting() &&
    $state.isLogin()
  ) {
    session.getDanmakuRepeatedly(config?.liverUID);
  }

  onDestroy(() => {
    if (errorUnlisten) {
      errorUnlisten();
      errorUnlisten = undefined;
    }
    eventHandler?.cleanup();
    cleanup();
  });
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

{#if appsConfig && appsConfig.length > 0 && eventHandler && isEventHandlerInited}
  <div class="drawer drawer-open">
    <input type="checkbox" class="drawer-toggle" />
    <div class="drawer-side">
      <ul class="menu space-y-2">
        {#each appsConfig as appConfig, i (appConfig.id)}
          <li>
            <div class="flex flex-row" class:active={selectedApp === i}>
              <button class="btn btn-ghost" on:click={() => (selectedApp = i)}
                >{appConfig.name}</button
              >
              <input
                type="checkbox"
                class="toggle toggle-sm"
                checked={eventHandler.appEnabled(appConfig.id)?.enable}
                on:change={(e) =>
                  eventHandler?.setAppEnabled(appConfig.id, e.currentTarget.checked)}
              />
            </div>
          </li>
        {/each}
      </ul>
    </div>
    <div class="drawer-content">
      {#each appsConfig as appConfig, i (appConfig.id)}
        <div class:hidden={selectedApp !== i}>
          <SubApp config={appConfig}></SubApp>
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
            session.stopDanmakuRepeatedly(config.liverUID);
            config.liverUID = uid.detail;
          }
        } else {
          config.liverUID = uid.detail;
        }
      }
    }}
  />
{/if}
