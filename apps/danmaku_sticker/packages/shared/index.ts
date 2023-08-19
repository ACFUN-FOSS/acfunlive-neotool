export const hostname: string = 'localhost';

export const port: number = 25360;

export const danmakuStickerID = 'danmakuSticker';

export const danmakuStickerWebID = 'danmakuStickerWeb';

export type StickerData = {
  danmaku: string;
  path: string;
  height: number;
};

export type StickerMessage = {
  [danmakuStickerID]: {
    isOnline: undefined;
    isOffline: undefined;
  };
  [danmakuStickerWebID]: {
    updateData: StickerData[];
    online: undefined;
    offline: undefined;
  };
};
