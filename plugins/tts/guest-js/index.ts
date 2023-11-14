import { invoke, transformCallback } from '@tauri-apps/api/tauri';

export type Aue = 'raw' | 'lame';

export type Auf = 'audio8kRate' | 'audio16kRate';

export type Bgs = 'noBackgroundSound' | 'hasBackgroundSound';

export type Reg = 'autoWord' | 'alphabet' | 'autoAlphabet';

export type Rdn = 'auto' | 'number' | 'string' | 'stringPriority';

export type TtsRequest = {
  appId: string;
  apiSecret: string;
  apiKey: string;
  aue: Aue;
  auf?: Auf;
  vcn: string;
  speed?: number;
  volume?: number;
  pitch?: number;
  bgs?: Bgs;
  reg?: Reg;
  rdn?: Rdn;
  text: string;
};

export async function tts(
  request: TtsRequest,
  callback: (audioSourceId: number) => void
): Promise<void> {
  return await invoke('acfunlive-neotool-tts|tts', {
    request,
    callback: transformCallback(callback)
  });
}
