<script lang="ts">
  import type { Session, loginResponse } from 'acfunlive-backend-js/tauri.js';
  import { SessionState, type UserInfo } from '@acfunlive-neotool/shared';
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

  type SessionData = {
    id: number;
    session: Session;
  };

  const session: SessionData = {
    id: 0,
    session: tauriSession()
  };

  const state: Writable<SessionState> = writable(SessionState.Disconnect);

  const token: Writable<loginResponse | undefined> = writable(undefined);

  const userInfo: Writable<UserInfo | undefined> = writable(undefined);

  async function getDanmaku(id: number) {
    if (
      session.session.isConnecting() &&
      $token &&
      session.id === id &&
      $state === SessionState.Login
    ) {
      if (config?.liverUID) {
        try {
          const info = (
            await session.session.asyncRequest('getUserInfo', {
              userID: config.liverUID
            })
          ).data;
          if (
            session.session.isConnecting() &&
            $token &&
            session.id === id &&
            $state === SessionState.Login
          ) {
            const user = $userInfo;
            if (
              !user ||
              user.userID !== info.userID ||
              user.nickname !== info.nickname ||
              user.avatar !== info.avatar
            ) {
              $userInfo = info;
            }

            if (config?.liverUID && info.liveID.length !== 0) {
              await session.session.asyncRequest('getDanmaku', { liverUID: config.liverUID });
              $state = SessionState.GetDanmaku;

              return;
            }
          } else {
            return;
          }
        } catch {}
      }

      setTimeout(() => getDanmaku(id), 10000);
    }
  }

  async function getNewDanmaku(id: number, oldLiverUID: number) {
    if (
      session.session.isConnecting() &&
      config?.liverUID &&
      $token &&
      $userInfo &&
      session.id === id &&
      $state === SessionState.GetDanmaku
    ) {
      try {
        await session.session.asyncRequest('stopDanmaku', { liverUID: oldLiverUID });

        return;
      } catch {}

      setTimeout(() => getNewDanmaku(id, oldLiverUID), 10000);
    }
  }

  async function login(id: number) {
    if (session.session.isConnecting() && session.id === id && $state === SessionState.Connect) {
      try {
        let userToken = (await session.session.asyncRequest('login', { account: '', password: '' }))
          .data;
        if (
          session.session.isConnecting() &&
          session.id === id &&
          $state === SessionState.Connect
        ) {
          $token = userToken;
          $state = SessionState.Login;
          getDanmaku(id);
        }

        return;
      } catch {
        setTimeout(() => login(id), 10000);
      }
    }
  }

  session.session.connect();
  const openUnsubscribe = session.session.on('websocketOpen', () => {
    session.id += 1;
    $state = SessionState.Connect;
    $token = undefined;
    login(session.id);
  });
  const closeUnsubscribe = session.session.on('websocketClose', () => {
    // 断开会自动重连
    $state = SessionState.Disconnect;
    $token = undefined;
  });
  const errorUnsubscribe = session.session.on('websocketError', () => {
    // 出现错误会断开重连
    $state = SessionState.Disconnect;
    $token = undefined;
  });
  const danmakuStopUnsubscribe = session.session.on('danmakuStop', (_) => {
    if (session.session.isConnecting() && $state === SessionState.GetDanmaku) {
      $state = SessionState.Login;
      getDanmaku(session.id);
    }
  });
  const danmakuStopErrorUnsubscribe = session.session.on('danmakuStopError', (_) => {
    if (session.session.isConnecting() && $state === SessionState.GetDanmaku) {
      $state = SessionState.Login;
      getDanmaku(session.id);
    }
  });

  loadConfig()
    .then((conf) => {
      config = conf;
      conf?.liverUID || (openUIDDialog = true);
    })
    .catch((e) => console.log(`failed to load config: ${e}`));

  onDestroy(() => {
    $state = SessionState.Disconnect;
    $token = undefined;
    openUnsubscribe();
    closeUnsubscribe();
    errorUnsubscribe();
    danmakuStopUnsubscribe();
    danmakuStopErrorUnsubscribe();
    session.session.disConnect();
  });
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
            getNewDanmaku(session.id, oldLiverUID);
          }
        } else {
          config.liverUID = uid.detail;
        }
      }
    }}
  />
{/if}

<div class="sticky top-0 z-30 backdrop-blur w-full">
  <div class="flex flex-row justify-between items-center h-16 mx-5">
    <h1>AcFun Neo 直播工具箱</h1>
    <Avatar state={$state} userInfo={$userInfo} on:openUIDDialog={() => (openUIDDialog = true)}
    ></Avatar>
  </div>
</div>
<div class="divider h-0 my-0"></div>
{#if appsConfigs && appsConfigs.length > 0}
  <div class="drawer drawer-open">
    <input type="checkbox" class="drawer-toggle" />
    <div class="drawer-side">
      <ul class="menu">
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
                userInfo: readonly(userInfo)
              },
              enable: readonly(enableApps[appConfig.id])
            }}
          ></SubApp>
        </div>
      {/each}
    </div>
  </div>
{/if}
