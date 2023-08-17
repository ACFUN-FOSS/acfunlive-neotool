import { invoke } from '@tauri-apps/api/tauri';

function checkPort(port: number) {
  if (port < 1024 || port > 65535) {
    throw new Error(`the port number is out of range: ${port}`);
  }
}

export function checkServerAvailable(hostname: string, port: number) {
  checkPort(port);

  invoke('plugin:acfunlive-neotool-serve-file|check_server_available', { hostname, port });
}

export function serve(dir: string, hostname?: string, port?: number) {
  if (port !== undefined) {
    checkPort(port);
  }

  invoke('plugin:acfunlive-neotool-serve-file|serve', { dir, hostname, port });
}
