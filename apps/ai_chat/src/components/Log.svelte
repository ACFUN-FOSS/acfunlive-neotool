<script lang="ts">
  import { history } from '../scripts/chat';

  import { Modal, TextArea } from 'carbon-components-svelte';

  export let isOpen: boolean;
</script>

<Modal
  bind:open={isOpen}
  modalHeading="记录"
  primaryButtonText="关闭"
  on:submit={() => (isOpen = false)}
>
  <TextArea
    rows={8}
    value={history
      .map((h) => {
        if (h.role === 'assistant') {
          return 'AI回复：' + h.content;
        }

        return h.content;
      })
      .join('\n')}
  ></TextArea>
</Modal>
