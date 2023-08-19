import { invoke } from '@tauri-apps/api/tauri';

function checkPort(port: number) {
  if (port < 1024 || port > 65535) {
    throw new Error(`the port number is out of range: ${port}`);
  }
}

export function isAddressAvailable(hostname: string, port: number) {
  checkPort(port);

  invoke('plugin:acfunlive-neotool-serve-files|is_address_available', { hostname, port });
}

export class Server {
  #id: number;

  private constructor(id: number) {
    this.#id = id;
  }

  static async startServe(dir: string, hostname: string, port: number): Promise<Server> {
    checkPort(port);

    const id: number = await invoke('plugin:acfunlive-neotool-serve-files|start_serve', {
      dir,
      hostname,
      port
    });

    return new Server(id);
  }

  async stopServe(): Promise<void> {
    await invoke('plugin:acfunlive-neotool-serve-files|stop_serve', { id: this.#id });
  }

  async isServing(): Promise<boolean> {
    return await invoke('plugin:acfunlive-neotool-serve-files|is_serving', { id: this.#id });
  }
}
