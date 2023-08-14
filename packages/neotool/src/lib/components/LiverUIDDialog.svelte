<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let isOpen: boolean;

  export let text: string | undefined = undefined;

  let showError = false;

  const dispatch = createEventDispatcher<{ liverUID: number }>();

  function submit() {
    if (text) {
      const uid = parseInt(text, 10);
      if (!Number.isNaN(uid)) {
        if (uid > 0 && uid <= 2147483647) {
          showError = false;
          isOpen = false;
          dispatch('liverUID', uid);

          return;
        }
      }
    }

    showError = true;
  }
</script>

<div class="modal" class:modal-open={isOpen}>
  <div class="modal-box min-w-[15rem]">
    <div class="form-control min-w-[10rem] max-w-xs">
      <input
        id="liverUID"
        type="text"
        bind:value={text}
        placeholder="AcFun帐号ID"
        class="input input-bordered w-full"
      />
      {#if showError}
        <label for="liverUID" class="label text-error">请输入AcFun帐号ID（纯数字）</label>
      {/if}
    </div>
    <div class="modal-action">
      <button class="btn" on:click={submit}>确定</button>
    </div>
  </div>
</div>
