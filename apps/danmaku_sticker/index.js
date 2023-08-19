/** @returns {void} */
function noop() {}

function run(fn) {
	return fn();
}

function blank_object() {
	return Object.create(null);
}

/**
 * @param {Function[]} fns
 * @returns {void}
 */
function run_all(fns) {
	fns.forEach(run);
}

/**
 * @param {any} thing
 * @returns {thing is Function}
 */
function is_function(thing) {
	return typeof thing === 'function';
}

/** @returns {boolean} */
function safe_not_equal(a, b) {
	return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
}

/** @returns {boolean} */
function is_empty(obj) {
	return Object.keys(obj).length === 0;
}

/**
 * @param {Node} target
 * @param {Node} node
 * @param {Node} [anchor]
 * @returns {void}
 */
function insert(target, node, anchor) {
	target.insertBefore(node, anchor || null);
}

/**
 * @param {Node} node
 * @returns {void}
 */
function detach(node) {
	if (node.parentNode) {
		node.parentNode.removeChild(node);
	}
}

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} name
 * @returns {HTMLElementTagNameMap[K]}
 */
function element(name) {
	return document.createElement(name);
}

/**
 * @param {Element} node
 * @param {string} attribute
 * @param {string} [value]
 * @returns {void}
 */
function attr(node, attribute, value) {
	if (value == null) node.removeAttribute(attribute);
	else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
}

/**
 * @param {Element} element
 * @returns {ChildNode[]}
 */
function children(element) {
	return Array.from(element.childNodes);
}

/**
 * @typedef {Node & {
 * 	claim_order?: number;
 * 	hydrate_init?: true;
 * 	actual_end_child?: NodeEx;
 * 	childNodes: NodeListOf<NodeEx>;
 * }} NodeEx
 */

/** @typedef {ChildNode & NodeEx} ChildNodeEx */

/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

/**
 * @typedef {ChildNodeEx[] & {
 * 	claim_info?: {
 * 		last_index: number;
 * 		total_claimed: number;
 * 	};
 * }} ChildNodeArray
 */

let current_component;

/** @returns {void} */
function set_current_component(component) {
	current_component = component;
}

function get_current_component() {
	if (!current_component) throw new Error('Function called outside component initialization');
	return current_component;
}

/**
 * Schedules a callback to run immediately before the component is unmounted.
 *
 * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
 * only one that runs inside a server-side component.
 *
 * https://svelte.dev/docs/svelte#ondestroy
 * @param {() => any} fn
 * @returns {void}
 */
function onDestroy(fn) {
	get_current_component().$$.on_destroy.push(fn);
}

const dirty_components = [];
const binding_callbacks = [];

let render_callbacks = [];

const flush_callbacks = [];

const resolved_promise = /* @__PURE__ */ Promise.resolve();

let update_scheduled = false;

/** @returns {void} */
function schedule_update() {
	if (!update_scheduled) {
		update_scheduled = true;
		resolved_promise.then(flush);
	}
}

/** @returns {void} */
function add_render_callback(fn) {
	render_callbacks.push(fn);
}

// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();

let flushidx = 0; // Do *not* move this inside the flush() function

/** @returns {void} */
function flush() {
	// Do not reenter flush while dirty components are updated, as this can
	// result in an infinite loop. Instead, let the inner flush handle it.
	// Reentrancy is ok afterwards for bindings etc.
	if (flushidx !== 0) {
		return;
	}
	const saved_component = current_component;
	do {
		// first, call beforeUpdate functions
		// and update components
		try {
			while (flushidx < dirty_components.length) {
				const component = dirty_components[flushidx];
				flushidx++;
				set_current_component(component);
				update(component.$$);
			}
		} catch (e) {
			// reset dirty state to not end up in a deadlocked state and then rethrow
			dirty_components.length = 0;
			flushidx = 0;
			throw e;
		}
		set_current_component(null);
		dirty_components.length = 0;
		flushidx = 0;
		while (binding_callbacks.length) binding_callbacks.pop()();
		// then, once components are updated, call
		// afterUpdate functions. This may cause
		// subsequent updates...
		for (let i = 0; i < render_callbacks.length; i += 1) {
			const callback = render_callbacks[i];
			if (!seen_callbacks.has(callback)) {
				// ...so guard against infinite loops
				seen_callbacks.add(callback);
				callback();
			}
		}
		render_callbacks.length = 0;
	} while (dirty_components.length);
	while (flush_callbacks.length) {
		flush_callbacks.pop()();
	}
	update_scheduled = false;
	seen_callbacks.clear();
	set_current_component(saved_component);
}

/** @returns {void} */
function update($$) {
	if ($$.fragment !== null) {
		$$.update();
		run_all($$.before_update);
		const dirty = $$.dirty;
		$$.dirty = [-1];
		$$.fragment && $$.fragment.p($$.ctx, dirty);
		$$.after_update.forEach(add_render_callback);
	}
}

/**
 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
 * @param {Function[]} fns
 * @returns {void}
 */
function flush_render_callbacks(fns) {
	const filtered = [];
	const targets = [];
	render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
	targets.forEach((c) => c());
	render_callbacks = filtered;
}

const outroing = new Set();

/**
 * @param {import('./private.js').Fragment} block
 * @param {0 | 1} [local]
 * @returns {void}
 */
function transition_in(block, local) {
	if (block && block.i) {
		outroing.delete(block);
		block.i(local);
	}
}

/** @typedef {1} INTRO */
/** @typedef {0} OUTRO */
/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

/**
 * @typedef {Object} Outro
 * @property {number} r
 * @property {Function[]} c
 * @property {Object} p
 */

/**
 * @typedef {Object} PendingProgram
 * @property {number} start
 * @property {INTRO|OUTRO} b
 * @property {Outro} [group]
 */

/**
 * @typedef {Object} Program
 * @property {number} a
 * @property {INTRO|OUTRO} b
 * @property {1|-1} d
 * @property {number} duration
 * @property {number} start
 * @property {number} end
 * @property {Outro} [group]
 */

/** @returns {void} */
function mount_component(component, target, anchor) {
	const { fragment, after_update } = component.$$;
	fragment && fragment.m(target, anchor);
	// onMount happens before the initial afterUpdate
	add_render_callback(() => {
		const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
		// if the component was destroyed immediately
		// it will update the `$$.on_destroy` reference to `null`.
		// the destructured on_destroy may still reference to the old array
		if (component.$$.on_destroy) {
			component.$$.on_destroy.push(...new_on_destroy);
		} else {
			// Edge case - component was destroyed immediately,
			// most likely as a result of a binding initialising
			run_all(new_on_destroy);
		}
		component.$$.on_mount = [];
	});
	after_update.forEach(add_render_callback);
}

/** @returns {void} */
function destroy_component(component, detaching) {
	const $$ = component.$$;
	if ($$.fragment !== null) {
		flush_render_callbacks($$.after_update);
		run_all($$.on_destroy);
		$$.fragment && $$.fragment.d(detaching);
		// TODO null out other refs, including component.$$ (but need to
		// preserve final state?)
		$$.on_destroy = $$.fragment = null;
		$$.ctx = [];
	}
}

/** @returns {void} */
function make_dirty(component, i) {
	if (component.$$.dirty[0] === -1) {
		dirty_components.push(component);
		schedule_update();
		component.$$.dirty.fill(0);
	}
	component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
}

/** @returns {void} */
function init(
	component,
	options,
	instance,
	create_fragment,
	not_equal,
	props,
	append_styles,
	dirty = [-1]
) {
	const parent_component = current_component;
	set_current_component(component);
	/** @type {import('./private.js').T$$} */
	const $$ = (component.$$ = {
		fragment: null,
		ctx: [],
		// state
		props,
		update: noop,
		not_equal,
		bound: blank_object(),
		// lifecycle
		on_mount: [],
		on_destroy: [],
		on_disconnect: [],
		before_update: [],
		after_update: [],
		context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
		// everything else
		callbacks: blank_object(),
		dirty,
		skip_bound: false,
		root: options.target || parent_component.$$.root
	});
	append_styles && append_styles($$.root);
	let ready = false;
	$$.ctx = instance
		? instance(component, options.props || {}, (i, ret, ...rest) => {
				const value = rest.length ? rest[0] : ret;
				if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
					if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
					if (ready) make_dirty(component, i);
				}
				return ret;
		  })
		: [];
	$$.update();
	ready = true;
	run_all($$.before_update);
	// `false` as a special case of no DOM component
	$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
	if (options.target) {
		if (options.hydrate) {
			const nodes = children(options.target);
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			$$.fragment && $$.fragment.l(nodes);
			nodes.forEach(detach);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			$$.fragment && $$.fragment.c();
		}
		if (options.intro) transition_in(component.$$.fragment);
		mount_component(component, options.target, options.anchor);
		flush();
	}
	set_current_component(parent_component);
}

/**
 * Base class for Svelte components. Used when dev=false.
 *
 * @template {Record<string, any>} [Props=any]
 * @template {Record<string, any>} [Events=any]
 */
class SvelteComponent {
	/**
	 * ### PRIVATE API
	 *
	 * Do not use, may change at any time
	 *
	 * @type {any}
	 */
	$$ = undefined;
	/**
	 * ### PRIVATE API
	 *
	 * Do not use, may change at any time
	 *
	 * @type {any}
	 */
	$$set = undefined;

	/** @returns {void} */
	$destroy() {
		destroy_component(this, 1);
		this.$destroy = noop;
	}

	/**
	 * @template {Extract<keyof Events, string>} K
	 * @param {K} type
	 * @param {((e: Events[K]) => void) | null | undefined} callback
	 * @returns {() => void}
	 */
	$on(type, callback) {
		if (!is_function(callback)) {
			return noop;
		}
		const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
		callbacks.push(callback);
		return () => {
			const index = callbacks.indexOf(callback);
			if (index !== -1) callbacks.splice(index, 1);
		};
	}

	/**
	 * @param {Partial<Props>} props
	 * @returns {void}
	 */
	$set(props) {
		if (this.$$set && !is_empty(props)) {
			this.$$.skip_bound = true;
			this.$$set(props);
			this.$$.skip_bound = false;
		}
	}
}

/**
 * @typedef {Object} CustomElementPropDefinition
 * @property {string} [attribute]
 * @property {boolean} [reflect]
 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
 */

// generated during release, do not modify

const PUBLIC_VERSION = '4';

if (typeof window !== 'undefined')
	// @ts-ignore
	(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

const hostname = 'localhost';
const port = 25360;

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


typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

var StateFlag;
(function (StateFlag) {
    StateFlag[StateFlag["Disconnect"] = 0] = "Disconnect";
    StateFlag[StateFlag["Connect"] = 1] = "Connect";
    StateFlag[StateFlag["Login"] = 2] = "Login";
})(StateFlag || (StateFlag = {}));

function onReceiveMessage(session, target, callback) {
    return session.on('receiveForward', (m) => {
        const message = JSON.parse(m.data.message);
        try {
            if (message.target === target) {
                callback(message);
            }
        }
        catch (e) {
            console.log(`receive forwarding message error: ${e}`);
        }
    });
}

function n$1(){return navigator.appVersion.includes("Win")}

var d$3=Object.defineProperty;var e=(c,a)=>{for(var b in a)d$3(c,b,{get:a[b],enumerable:!0});};

var w$1={};e(w$1,{convertFileSrc:()=>u$2,invoke:()=>d$2,transformCallback:()=>s$1});function l$2(){return window.crypto.getRandomValues(new Uint32Array(1))[0]}function s$1(r,n=!1){let e=l$2(),t=`_${e}`;return Object.defineProperty(window,t,{value:o=>(n&&Reflect.deleteProperty(window,t),r?.(o)),writable:!1,configurable:!0}),e}async function d$2(r,n={}){return new Promise((e,t)=>{let o=s$1(i=>{e(i),Reflect.deleteProperty(window,`_${a}`);},!0),a=s$1(i=>{t(i),Reflect.deleteProperty(window,`_${o}`);},!0);window.__TAURI_IPC__({cmd:r,callback:o,error:a,...n});})}function u$2(r,n="asset"){let e=encodeURIComponent(r);return navigator.userAgent.includes("Windows")?`https://${n}.localhost/${e}`:`${n}://localhost/${e}`}

async function a$1(i){return d$2("tauri",i)}

var x$1={};e(x$1,{BaseDirectory:()=>F$1,Dir:()=>F$1,copyFile:()=>c$1,createDir:()=>d$1,exists:()=>v$1,readBinaryFile:()=>a,readDir:()=>m$1,readTextFile:()=>l$1,removeDir:()=>g$1,removeFile:()=>O,renameFile:()=>_$1,writeBinaryFile:()=>f$1,writeFile:()=>u$1,writeTextFile:()=>u$1});var F$1=(n=>(n[n.Audio=1]="Audio",n[n.Cache=2]="Cache",n[n.Config=3]="Config",n[n.Data=4]="Data",n[n.LocalData=5]="LocalData",n[n.Desktop=6]="Desktop",n[n.Document=7]="Document",n[n.Download=8]="Download",n[n.Executable=9]="Executable",n[n.Font=10]="Font",n[n.Home=11]="Home",n[n.Picture=12]="Picture",n[n.Public=13]="Public",n[n.Runtime=14]="Runtime",n[n.Template=15]="Template",n[n.Video=16]="Video",n[n.Resource=17]="Resource",n[n.App=18]="App",n[n.Log=19]="Log",n[n.Temp=20]="Temp",n[n.AppConfig=21]="AppConfig",n[n.AppData=22]="AppData",n[n.AppLocalData=23]="AppLocalData",n[n.AppCache=24]="AppCache",n[n.AppLog=25]="AppLog",n))(F$1||{});async function l$1(i,t={}){return a$1({__tauriModule:"Fs",message:{cmd:"readTextFile",path:i,options:t}})}async function a(i,t={}){let s=await a$1({__tauriModule:"Fs",message:{cmd:"readFile",path:i,options:t}});return Uint8Array.from(s)}async function u$1(i,t,s){typeof s=="object"&&Object.freeze(s),typeof i=="object"&&Object.freeze(i);let e={path:"",contents:""},r=s;return typeof i=="string"?e.path=i:(e.path=i.path,e.contents=i.contents),typeof t=="string"?e.contents=t??"":r=t,a$1({__tauriModule:"Fs",message:{cmd:"writeFile",path:e.path,contents:Array.from(new TextEncoder().encode(e.contents)),options:r}})}async function f$1(i,t,s){typeof s=="object"&&Object.freeze(s),typeof i=="object"&&Object.freeze(i);let e={path:"",contents:[]},r=s;return typeof i=="string"?e.path=i:(e.path=i.path,e.contents=i.contents),t&&"dir"in t?r=t:typeof i=="string"&&(e.contents=t??[]),a$1({__tauriModule:"Fs",message:{cmd:"writeFile",path:e.path,contents:Array.from(e.contents instanceof ArrayBuffer?new Uint8Array(e.contents):e.contents),options:r}})}async function m$1(i,t={}){return a$1({__tauriModule:"Fs",message:{cmd:"readDir",path:i,options:t}})}async function d$1(i,t={}){return a$1({__tauriModule:"Fs",message:{cmd:"createDir",path:i,options:t}})}async function g$1(i,t={}){return a$1({__tauriModule:"Fs",message:{cmd:"removeDir",path:i,options:t}})}async function c$1(i,t,s={}){return a$1({__tauriModule:"Fs",message:{cmd:"copyFile",source:i,destination:t,options:s}})}async function O(i,t={}){return a$1({__tauriModule:"Fs",message:{cmd:"removeFile",path:i,options:t}})}async function _$1(i,t,s={}){return a$1({__tauriModule:"Fs",message:{cmd:"renameFile",oldPath:i,newPath:t,options:s}})}async function v$1(i,t={}){return a$1({__tauriModule:"Fs",message:{cmd:"exists",path:i,options:t}})}

var q={};e(q,{BaseDirectory:()=>F$1,appCacheDir:()=>g,appConfigDir:()=>s,appDataDir:()=>c,appDir:()=>u,appLocalDataDir:()=>m,appLogDir:()=>n,audioDir:()=>d,basename:()=>V,cacheDir:()=>P,configDir:()=>h,dataDir:()=>l,delimiter:()=>z,desktopDir:()=>_,dirname:()=>F,documentDir:()=>p,downloadDir:()=>y,executableDir:()=>f,extname:()=>H,fontDir:()=>D,homeDir:()=>M,isAbsolute:()=>W,join:()=>E,localDataDir:()=>v,logDir:()=>w,normalize:()=>B,pictureDir:()=>b,publicDir:()=>A,resolve:()=>T,resolveResource:()=>x,resourceDir:()=>C,runtimeDir:()=>L,sep:()=>j,templateDir:()=>R,videoDir:()=>k});async function u(){return s()}async function s(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:21}})}async function c(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:22}})}async function m(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:23}})}async function g(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:24}})}async function d(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:1}})}async function P(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:2}})}async function h(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:3}})}async function l(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:4}})}async function _(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:6}})}async function p(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:7}})}async function y(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:8}})}async function f(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:9}})}async function D(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:10}})}async function M(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:11}})}async function v(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:5}})}async function b(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:12}})}async function A(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:13}})}async function C(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:17}})}async function x(t){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:t,directory:17}})}async function L(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:14}})}async function R(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:15}})}async function k(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:16}})}async function w(){return n()}async function n(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:25}})}var j=n$1()?"\\":"/",z=n$1()?";":":";async function T(...t){return a$1({__tauriModule:"Path",message:{cmd:"resolve",paths:t}})}async function B(t){return a$1({__tauriModule:"Path",message:{cmd:"normalize",path:t}})}async function E(...t){return a$1({__tauriModule:"Path",message:{cmd:"join",paths:t}})}async function F(t){return a$1({__tauriModule:"Path",message:{cmd:"dirname",path:t}})}async function H(t){return a$1({__tauriModule:"Path",message:{cmd:"extname",path:t}})}async function V(t,a){return a$1({__tauriModule:"Path",message:{cmd:"basename",path:t,ext:a}})}async function W(t){return a$1({__tauriModule:"Path",message:{cmd:"isAbsolute",path:t}})}

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
class Server {
    constructor(id) {
        _Server_id.set(this, void 0);
        __classPrivateFieldSet(this, _Server_id, id, "f");
    }
    static startServe(dir, hostname, port) {
        return __awaiter(this, void 0, void 0, function* () {
            checkPort(port);
            const id = yield d$2('plugin:acfunlive-neotool-serve-files|start_serve', {
                dir,
                hostname,
                port
            });
            return new Server(id);
        });
    }
    stopServe() {
        return __awaiter(this, void 0, void 0, function* () {
            yield d$2('plugin:acfunlive-neotool-serve-files|stop_serve', { id: __classPrivateFieldGet(this, _Server_id, "f") });
        });
    }
    isServing() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield d$2('plugin:acfunlive-neotool-serve-files|is_serving', { id: __classPrivateFieldGet(this, _Server_id, "f") });
        });
    }
}
_Server_id = new WeakMap();

/* src/App.svelte generated by Svelte v4.2.0 */

function create_fragment(ctx) {
	let h6;

	return {
		c() {
			h6 = element("h6");
			h6.textContent = "hello";
			attr(h6, "class", "flex");
		},
		m(target, anchor) {
			insert(target, h6, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) {
				detach(h6);
			}
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { data } = $$props;
	let server;
	E(data.config.path, 'web').then(path => Server.startServe(path, hostname, port).then(s => server = s).catch(e => console.log(`failed to start the server: ${e}`)));

	const receiveUnsubscribe = onReceiveMessage(data.session, 'danmakuSticker', message => {
		console.log('receive: ', message);
	});

	onDestroy(() => {
		server === null || server === void 0
		? void 0
		: server.stopServe();

		receiveUnsubscribe();
	});

	$$self.$$set = $$props => {
		if ('data' in $$props) $$invalidate(0, data = $$props.data);
	};

	return [data];
}

class App extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, { data: 0 });
	}
}

export { App as default };
