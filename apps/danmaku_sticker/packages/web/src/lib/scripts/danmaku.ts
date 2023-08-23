import {
  defaultDuration,
  type Direction,
  type StickerData
} from '@acfunlive-neotool/danmaku-sticker-shared';

export const gap = 100;

const padding = 10;

export type Sticker = {
  id: number;
  data: StickerData;
};

export type DanmakuData = {
  id: number;
  direction: Direction;
  start: number;
  end: number;
  top: number;
  bottom: number;
};

const danmakuList: DanmakuData[] = [];

export function addDanmaku(
  sticker: Sticker,
  width: number,
  height: number,
  windowWidth: number
): DanmakuData {
  const duration = sticker.data.duration || defaultDuration;
  const start = Date.now();
  const end = start + duration + gap;
  let top: number = 0;
  let bottom: number = height + padding;

  if (danmakuList.length === 0) {
    const data = {
      id: sticker.id,
      direction: sticker.data.direction,
      start,
      end,
      top: top + padding,
      bottom: bottom + padding
    };
    danmakuList.push(data);

    return data;
  }

  for (const danmaku of danmakuList) {
    if (danmaku.top >= bottom) {
      break;
    }
    if (danmaku.direction !== sticker.data.direction) {
      top = danmaku.bottom;
      bottom = top + height + padding;
      continue;
    }

    const disapper = start + gap + ((windowWidth - padding) / (width + windowWidth)) * duration;
    if (disapper < danmaku.end) {
      top = danmaku.bottom;
    } else {
      top = danmaku.top;
    }
    bottom = top + height + padding;
  }

  const data = {
    id: sticker.id,
    direction: sticker.data.direction,
    start,
    end,
    top,
    bottom
  };
  danmakuList.push(data);
  danmakuList.sort((a, b) => {
    if (a.top < b.top) {
      return -1;
    } else if (a.top > b.top) {
      return 1;
    } else if (a.start < b.start) {
      return -1;
    } else if (a.start > b.start) {
      return 1;
    } else {
      return 0;
    }
  });

  return data;
}

export function removeDanmaku(id: number): void {
  const index = danmakuList.findIndex((danmaku) => danmaku.id === id);
  if (index >= 0) {
    console.log('aaa ', id, index, danmakuList[index]);
    danmakuList.splice(index, 1);
  }
}

export function stickersToRegex(stickers: StickerData[]): RegExp {
  return new RegExp(stickers.map((sticker) => `#(${sticker.danmaku})`).join('|'), 'ig');
}
