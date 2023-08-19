import { invoke } from '@tauri-apps/api/tauri';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

var _Server_id;
function checkPort(port) {
    if (port < 1024 || port > 65535) {
        throw new Error(`the port number is out of range: ${port}`);
    }
}
function isAddressAvailable(hostname, port) {
    checkPort(port);
    invoke('plugin:acfunlive-neotool-serve-files|is_address_available', { hostname, port });
}
class Server {
    constructor(id) {
        _Server_id.set(this, void 0);
        __classPrivateFieldSet(this, _Server_id, id, "f");
    }
    static startServe(dir, hostname, port) {
        return __awaiter(this, void 0, void 0, function* () {
            checkPort(port);
            const id = yield invoke('plugin:acfunlive-neotool-serve-files|start_serve', {
                dir,
                hostname,
                port
            });
            return new Server(id);
        });
    }
    stopServe() {
        return __awaiter(this, void 0, void 0, function* () {
            yield invoke('plugin:acfunlive-neotool-serve-files|stop_serve', { id: __classPrivateFieldGet(this, _Server_id, "f") });
        });
    }
    isServing() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield invoke('plugin:acfunlive-neotool-serve-files|is_serving', { id: __classPrivateFieldGet(this, _Server_id, "f") });
        });
    }
}
_Server_id = new WeakMap();

export { Server, isAddressAvailable };
//# sourceMappingURL=index.mjs.map