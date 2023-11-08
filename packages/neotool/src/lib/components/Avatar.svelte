<script lang="ts">
  import { UserAvatarFilledAlt } from 'carbon-icons-svelte';

  export let avatar: string | undefined;
</script>

<div class="flex justify-center">
  {#if avatar}
    <img src={avatar} alt="头像" class="w-10 rounded-full" />
  {:else}
    <UserAvatarFilledAlt size={32}></UserAvatarFilledAlt>
  {/if}
</div>
