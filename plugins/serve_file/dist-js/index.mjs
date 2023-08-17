import { invoke } from '@tauri-apps/api/tauri';

function checkPort(port) {
    if (port < 1024 || port > 65535) {
        throw new Error(`the port number is out of range: ${port}`);
    }
}
function checkServerAvailable(hostname, port) {
    checkPort(port);
    invoke('plugin:acfunlive-neotool-serve-file|check_server_available', { hostname, port });
}
function serve(dir, hostname, port) {
    if (port !== undefined) {
        checkPort(port);
    }
    invoke('plugin:acfunlive-neotool-serve-file|serve', { dir, hostname, port });
}

export { checkServerAvailable, serve };
//# sourceMappingURL=index.mjs.map
