import { invoke } from '@tauri-apps/api/tauri';

export class Audio {
  readonly #id: number;

  private constructor(id: number) {
    this.#id = id;
  }

  static async newAudio(): Promise<Audio> {
    const id: number = await invoke('plugin:acfunlive-neotool-audio|new_audio');

    return new Audio(id);
  }

  async delete(): Promise<void> {
    await invoke('plugin:acfunlive-neotool-audio|delete_audio', { audioId: this.#id });
  }

  async isEmpty(): Promise<boolean> {
    return await invoke('plugin:acfunlive-neotool-audio|is_audio_queue_empty', {
      audioId: this.#id
    });
  }

  async add(audioSourceId: number): Promise<void> {
    await invoke('plugin:acfunlive-neotool-audio|add_audio', { audioId: this.#id, audioSourceId });
  }

  async volume(): Promise<number> {
    return await invoke('plugin:acfunlive-neotool-audio|get_volume', { audioId: this.#id });
  }

  async setVolume(volume: number): Promise<void> {
    await invoke('plugin:acfunlive-neotool-audio|set_volume', { audioId: this.#id, volume });
  }

  async play(): Promise<void> {
    await invoke('plugin:acfunlive-neotool-audio|play_audio', { audioId: this.#id });
  }

  async pause(): Promise<void> {
    await invoke('plugin:acfunlive-neotool-audio|pause_audio', { audioId: this.#id });
  }

  async stop(): Promise<void> {
    await invoke('plugin:acfunlive-neotool-audio|stop_audio', { audioId: this.#id });
  }

  async clear(): Promise<void> {
    await invoke('plugin:acfunlive-neotool-audio|clear_audio', { audioId: this.#id });
  }
}
