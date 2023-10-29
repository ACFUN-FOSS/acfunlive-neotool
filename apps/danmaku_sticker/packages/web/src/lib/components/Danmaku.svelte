<script lang="ts">
  import {
    defaultHeight,
    defaultDuration,
    Direction
  } from '@acfunlive-neotool/danmaku-sticker-shared';
  import { onDestroy } from 'svelte';

  import {
    gap,
    addDanmaku,
    removeDanmaku,
    type Sticker,
    type DanmakuData
  } from '../scripts/danmaku';

  export let sticker: Sticker;

  export let windowWidth: number;

  let width: number | undefined;

  let height: number | undefined;

  let position: number | undefined;

  let data: DanmakuData | undefined;

  $: if (
    width !== undefined &&
    width > 0 &&
    height !== undefined &&
    height > 0 &&
    position === undefined &&
    !data
  ) {
    position = sticker.data.direction === Direction.LeftToRight ? -width : windowWidth;
    data = addDanmaku(sticker, width, height, windowWidth);
  }

  $: if (position !== undefined && data) {
    setTimeout(() => {
      if (width !== undefined && width > 0) {
        position = sticker.data.direction === Direction.LeftToRight ? windowWidth : -width;
      }
    }, gap);
  }

  onDestroy(() => removeDanmaku(sticker.id));
</script>

<div
  bind:clientWidth={width}
  bind:clientHeight={height}
  style:opacity={position !== undefined && data ? '1' : '0'}
  style:position="absolute"
  style:top={position !== undefined && data ? `${data.top}px` : ''}
  style:left={position !== undefined && data ? `${position}px` : ''}
  style:transition={position !== undefined && data
    ? `left ${sticker.data.duration || defaultDuration}ms linear`
    : ''}
>
  <img
    src={sticker.data.pathInWeb}
    alt="图片"
    style:max-height={`${sticker.data.height || defaultHeight}px`}
    style:width="auto"
  />
</div>
