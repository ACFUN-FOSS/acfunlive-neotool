<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  import type { XunFeiKey } from '../scripts/chat';

  import { FluidForm, Modal, TextInput } from 'carbon-components-svelte';

  export let isOpen: boolean;

  export let header: string;

  export let appId: string | undefined;

  export let apiSecret: string | undefined;

  export let apiKey: string | undefined;

  export let vcn: string | undefined = undefined;

  const dispatch = createEventDispatcher<{ key: XunFeiKey; vcn: string }>();

  const hasVcn = vcn !== undefined;

  let isAppIdInvalid = false;
  $: if (appId && appId.length > 0) {
    isAppIdInvalid = false;
  } else {
    isAppIdInvalid = true;
  }

  let isApiSecretInvalid = false;
  $: if (apiSecret && apiSecret.length > 0) {
    isApiSecretInvalid = false;
  } else {
    isApiSecretInvalid = true;
  }

  let isApiKeyInvalid = false;
  $: if (apiKey && apiKey.length > 0) {
    isApiKeyInvalid = false;
  } else {
    isApiKeyInvalid = true;
  }

  let isVcnInvalid = false;
  $: if (!hasVcn || (vcn && vcn.length > 0)) {
    isVcnInvalid = false;
  } else {
    isVcnInvalid = true;
  }
</script>

<Modal
  bind:open={isOpen}
  id="hideCloseButton"
  preventCloseOnClickOutside
  modalHeading={header}
  primaryButtonText="确定"
  selectorPrimaryFocus="#appIdInput"
  on:submit={() => {
    if (
      appId &&
      appId.length > 0 &&
      apiSecret &&
      apiSecret.length > 0 &&
      apiKey &&
      apiKey.length > 0 &&
      (!hasVcn || (vcn && vcn.length > 0))
    ) {
      dispatch('key', { appId, apiSecret, apiKey });
      if (hasVcn && vcn) {
        dispatch('vcn', vcn);
      }
      isOpen = false;
    }
  }}
>
  <FluidForm>
    <TextInput
      id="appIdInput"
      required
      bind:invalid={isAppIdInvalid}
      labelText="APPID"
      invalidText="请输入APPID"
      bind:value={appId}
    ></TextInput>
    <TextInput
      required
      bind:invalid={isApiSecretInvalid}
      labelText="APISecret"
      invalidText="请输入APISecret"
      bind:value={apiSecret}
    ></TextInput>
    <TextInput
      required
      bind:invalid={isApiKeyInvalid}
      labelText="APIKey"
      invalidText="请输入APIKey"
      bind:value={apiKey}
    ></TextInput>
    {#if hasVcn}
      <TextInput
        required
        bind:invalid={isVcnInvalid}
        labelText="发音人参数vcn"
        invalidText="请输入发音人的vcn参数"
        bind:value={vcn}
      ></TextInput>
    {/if}
  </FluidForm>
</Modal>
