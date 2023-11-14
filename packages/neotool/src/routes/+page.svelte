<script lang="ts">
  import { listen, emitError, type UnlistenFn, type UserInfo } from '@acfunlive-neotool/shared';
  import { onDestroy, onMount } from 'svelte';

  import { saveConfig } from '$lib/scripts/load';
  import type { LayoutData } from './$types';

  import {
    Content,
    Header,
    HeaderAction,
    HeaderPanelLink,
    HeaderPanelLinks,
    HeaderUtilities,
    SideNav,
    SideNavItems,
    SideNavLink,
    SkipToContent,
    Tag,
    Toggle
  } from 'carbon-components-svelte';

  import Avatar from '$lib/components/Avatar.svelte';
  import LiverUIDDialog from '$lib/components/LiverUIDDialog.svelte';
  import SubApp from '$lib/components/SubApp.svelte';

  export let data: LayoutData;

  let openSideNav = false;
  let openUIDDialog = false;
  let openPanel = false;
  let selectedApp: number | undefined;

  const config = data.config;
  const appConfigs = data.appConfigs;
  const session = data.session;
  const eventHandler = data.eventHandler;

  const state = session.stateReadable;
  const liverUID = session.liverUIDReadable;
  const userInfoMap = session.userInfoMapReadable;
  const streamInfoMap = session.streamInfoMapReadable;

  let errorUnlisten: UnlistenFn | undefined;

  function handleError(error: unknown) {
    // 因为listen有可能失败
    if (errorUnlisten) {
      emitError(error);
    } else {
      console.log(`error: ${error}`);
    }
  }

  // 设置发生变化时保存设置
  $: saveConfig(config).catch(handleError);

  const sessionCleanup = session.connect();

  // 设置liverUID
  $: if (config.liverUID && config.liverUID > 0 && $liverUID !== config.liverUID) {
    session.liverUID = config.liverUID;
  }

  // 获取主播的帐号信息
  let userInfo: UserInfo | undefined;
  $: if ($userInfoMap && $liverUID && $liverUID > 0) {
    userInfo = session.getUserInfo($liverUID);
  }

  // 是否正在获取弹幕
  let isGettingDanmaku = false;
  $: if ($streamInfoMap && $liverUID && $liverUID > 0) {
    if (session.isGettingDanmaku($liverUID)) {
      isGettingDanmaku = true;
    } else {
      isGettingDanmaku = false;
    }
  }

  // 主播ID变化时获取弹幕
  $: if ($liverUID && $liverUID > 0 && $state.isConnecting() && $state.isLogin()) {
    session.getDanmakuRepeatedly($liverUID);
  }

  // 没有主播ID时强制要求输入ID
  $: if (config.liverUID === undefined || config.liverUID <= 0) {
    openUIDDialog = true;
  }

  let tagType: 'blue' | 'cool-gray' | 'gray' | 'red' = 'red';
  let stateText = '';
  $: if (!$state.isConnecting()) {
    tagType = 'red';
    stateText = '未连接后端';
  } else if (!$state.isLogin()) {
    tagType = 'cool-gray';
    stateText = '未登陆';
  } else if (!isGettingDanmaku) {
    tagType = userInfo ? 'gray' : 'cool-gray';
    stateText = userInfo ? '未开播' : '未登陆';
  } else {
    tagType = 'blue';
    stateText = '正在直播';
  }

  onMount(async () => {
    try {
      errorUnlisten = await listen('error', (e) => console.log(`event error: ${e}`), undefined);
    } catch (e) {
      console.log(`failed to listen event error: ${e}`);
    }
  });

  onDestroy(() => {
    if (errorUnlisten) {
      errorUnlisten();
    }
    eventHandler.cleanup();
    if (sessionCleanup) {
      sessionCleanup();
    }
  });
</script>

<Header bind:isSideNavOpen={openSideNav} company="AcFun" platformName="Neo 直播工具箱">
  <svelte:fragment slot="skip-to-content">
    <SkipToContent />
  </svelte:fragment>
  <HeaderUtilities>
    {#if userInfo}
      <div class="flex flex-col items-center">
        <div>{userInfo.nickname}</div>
        <Tag type={tagType} size="sm">{stateText}</Tag>
      </div>
    {:else}
      <Tag type={tagType} size="sm">{stateText}</Tag>
    {/if}
    <HeaderAction bind:isOpen={openPanel}>
      <Avatar avatar={userInfo?.avatar} slot="icon"></Avatar>
      <Avatar avatar={userInfo?.avatar} slot="closeIcon"></Avatar>
      <HeaderPanelLinks>
        <HeaderPanelLink
          on:click={() => {
            openUIDDialog = true;
            openPanel = false;
          }}>帐号</HeaderPanelLink
        >
      </HeaderPanelLinks>
    </HeaderAction>
  </HeaderUtilities>
</Header>

<SideNav bind:isOpen={openSideNav} rail>
  <SideNavItems>
    {#each appConfigs as appConfig, i (appConfig.id)}
      <SideNavLink isSelected={selectedApp === i} on:click={() => (selectedApp = i)}>
        <div class="flex flex-row items-center space-x-4">
          <div>{appConfig.name}</div>
          <Toggle
            size="sm"
            hideLabel
            labelA=""
            labelB=""
            toggled={eventHandler.appData(appConfig.id)?.enable ?? false}
            on:click={(e) => e.stopPropagation()}
            on:toggle={(e) => {
              eventHandler.setAppEnabled(appConfig.id, e.detail.toggled);
              config.appData[appConfig.id] = { enable: e.detail.toggled };
              config.appData = config.appData;
            }}
          ></Toggle>
        </div>
      </SideNavLink>
    {/each}
  </SideNavItems>
</SideNav>

<Content>
  {#if selectedApp === undefined}
    <h1>AcFun Neo 直播工具箱</h1>
  {/if}

  {#each appConfigs as appConfig, i (appConfig.id)}
    <div class:hidden={selectedApp !== i}>
      <SubApp config={appConfig}></SubApp>
    </div>
  {/each}
</Content>

<LiverUIDDialog
  bind:isOpen={openUIDDialog}
  liverUID={config.liverUID}
  on:liverUID={(uid) => {
    if (uid.detail > 0) {
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
