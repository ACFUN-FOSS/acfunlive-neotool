import { invoke, transformCallback } from '@tauri-apps/api/tauri';

export type Key =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z'
  | 'F1'
  | 'F2'
  | 'F3'
  | 'F4'
  | 'F5'
  | 'F6'
  | 'F7'
  | 'F8'
  | 'F9'
  | 'F10'
  | 'F11'
  | 'F12'
  | 'Escape'
  | 'Space'
  | 'LControl'
  | 'RControl'
  | 'LShift'
  | 'RShift'
  | 'LAlt'
  | 'RAlt'
  | 'Meta'
  | 'Enter'
  | 'Up'
  | 'Down'
  | 'Left'
  | 'Right'
  | 'Backspace'
  | 'CapsLock'
  | 'Tab'
  | 'Home'
  | 'End'
  | 'PageUp'
  | 'PageDown'
  | 'Insert'
  | 'Delete'
  | '+'
  | '*'
  | '`'
  | '-'
  | '='
  | '['
  | ']'
  | '\\'
  | ';'
  | "'"
  | ','
  | '.'
  | '/';

export class KeyboardListener {
  readonly #id: number;

  private constructor(id: number) {
    this.#id = id;
  }

  static async start_listen(
    keyDown: (key: Key) => void,
    keyUp: (key: Key) => void
  ): Promise<KeyboardListener> {
    const id: number = await invoke('plugin:acfunlive-neotool-keyboard|start_listen', {
      keyDownCallback: transformCallback(keyDown),
      keyUpCallback: transformCallback(keyUp)
    });

    return new KeyboardListener(id);
  }

  async stop_listen(): Promise<void> {
    await invoke('plugin:acfunlive-neotool-keyboard|stop_listen', { id: this.#id });
  }
}

export type Input = { KeyDown: Key } | { KeyUp: Key } | { Text: string };

export async function simulate_input(input: Input) {
  await invoke('plugin:acfunlive-neotool-keyboard|simulate_input', { input });
}
