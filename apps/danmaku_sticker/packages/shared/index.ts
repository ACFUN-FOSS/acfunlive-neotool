export const hostname: string = 'localhost';

export const port: number = 25360;

export const danmakuStickerID = 'danmakuSticker';

export const danmakuStickerWebID = 'danmakuStickerWeb';

export enum Direction {
  LeftToRight,
  RightToLeft
}

export const defaultDirection = Direction.RightToLeft;

export const defaultHeight = 150;

export const defaultDuration = 5000;

export class StickerData {
  danmaku: string;
  path: string;
  pathInWeb: string;
  direction: Direction;
  height: number | undefined | null;
  duration: number | undefined | null;
  enable: boolean;

  constructor(danmaku: string, path: string, pathInWeb: string) {
    this.danmaku = danmaku;
    this.path = path;
    this.pathInWeb = pathInWeb;
    this.direction = defaultDirection;
    this.height = defaultHeight;
    this.duration = defaultDuration;
    this.enable = true;
  }
}

export type StickerConfig = {
  stickers: StickerData[];
};

export type UpdateStickers = {
  liverUID: number;
  config: StickerConfig;
};

export type StickerMessage = {
  [danmakuStickerID]: {
    isOnline: undefined;
  };
  [danmakuStickerWebID]: {
    update: UpdateStickers;
    online: undefined;
    offline: undefined;
  };
};
