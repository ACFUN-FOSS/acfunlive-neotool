<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  import { Modal, NumberInput } from 'carbon-components-svelte';

  export let isOpen: boolean;

  export let liverUID: number | undefined | null;

  const dispatch = createEventDispatcher<{ liverUID: number }>();

  let forceInputLiverUID = liverUID === undefined || liverUID === null || liverUID <= 0;
</script>

<Modal
  bind:open={isOpen}
  id={forceInputLiverUID ? 'hideCloseButton' : 'liverUIDDialog'}
  modalHeading="AcFun帐号ID"
  primaryButtonText="确定"
  selectorPrimaryFocus="#liverUID"
  preventCloseOnClickOutside={forceInputLiverUID}
  on:submit={() => {
    if (liverUID && liverUID > 0 && liverUID <= 2147483647) {
      dispatch('liverUID', liverUID);
      isOpen = false;
    }
  }}
>
  <NumberInput id="liverUID" bind:value={liverUID} min={1} max={2147483647} hideSteppers
  ></NumberInput>
</Modal>
