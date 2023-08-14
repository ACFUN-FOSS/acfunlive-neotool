<script lang="ts">
  import { SessionState, type UserInfo } from '@acfunlive-neotool/shared';
  import { createEventDispatcher } from 'svelte';

  export let state: SessionState;

  export let userInfo: UserInfo | undefined;

  const dispatch = createEventDispatcher<{ openUIDDialog: undefined }>();

  let stateClass = '';
  let stateText = '';

  $: switch (state) {
    case SessionState.Disconnect:
      stateClass = 'badge-error';
      stateText = '未连接后端';
      break;
    case SessionState.Connect:
      stateClass = 'badge-warning';
      stateText = '未登陆';
      break;
    case SessionState.Login:
      stateClass = userInfo ? 'badge-neutral' : 'badge-warning';
      stateText = userInfo ? '未开播' : '未登陆';
      break;
    case SessionState.GetDanmaku:
      stateClass = 'badge-success';
      stateText = '正在直播';
      break;
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="hover:cursor-pointer" on:click={() => dispatch('openUIDDialog', undefined)}>
  {#if userInfo}
    <div class="flex flex-row items-center space-x-3">
      <div class="flex flex-col items-center">
        <div class="">{userInfo.nickname}</div>
        <div class="badge {stateClass}">{stateText}</div>
      </div>
      <div class="avatar">
        <div class="w-12 rounded-full">
          <img src={userInfo.avatar} alt="头像" />
        </div>
      </div>
    </div>
  {:else}
    <div class="badge {stateClass}">{stateText}</div>
  {/if}
</div>
