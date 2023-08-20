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

function subscribe(store, ...callbacks) {
	if (store == null) {
		for (const callback of callbacks) {
			callback(undefined);
		}
		return noop;
	}
	const unsub = store.subscribe(...callbacks);
	return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}

/** @returns {void} */
function component_subscribe(component, store, callback) {
	component.$$.on_destroy.push(subscribe(store, callback));
}

/**
 * @param {Node} target
 * @param {Node} node
 * @returns {void}
 */
function append(target, node) {
	target.appendChild(node);
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
 * @returns {void} */
function destroy_each(iterations, detaching) {
	for (let i = 0; i < iterations.length; i += 1) {
		if (iterations[i]) iterations[i].d(detaching);
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
 * @param {string} data
 * @returns {Text}
 */
function text(data) {
	return document.createTextNode(data);
}

/**
 * @returns {Text} */
function space() {
	return text(' ');
}

/**
 * @returns {Text} */
function empty() {
	return text('');
}

/**
 * @param {EventTarget} node
 * @param {string} event
 * @param {EventListenerOrEventListenerObject} handler
 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
 * @returns {() => void}
 */
function listen(node, event, handler, options) {
	node.addEventListener(event, handler, options);
	return () => node.removeEventListener(event, handler, options);
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

/** @returns {number} */
function to_number(value) {
	return value === '' ? null : +value;
}

/**
 * @param {Element} element
 * @returns {ChildNode[]}
 */
function children(element) {
	return Array.from(element.childNodes);
}

/**
 * @param {Text} text
 * @param {unknown} data
 * @returns {void}
 */
function set_data(text, data) {
	data = '' + data;
	if (text.data === data) return;
	text.data = /** @type {string} */ (data);
}

/**
 * @returns {void} */
function set_input_value(input, value) {
	input.value = value == null ? '' : value;
}

/**
 * @returns {void} */
function toggle_class(element, name, toggle) {
	// The `!!` is required because an `undefined` flag means flipping the current state.
	element.classList.toggle(name, !!toggle);
}

/**
 * @template T
 * @param {string} type
 * @param {T} [detail]
 * @param {{ bubbles?: boolean, cancelable?: boolean }} [options]
 * @returns {CustomEvent<T>}
 */
function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
	return new CustomEvent(type, { detail, bubbles, cancelable });
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

/**
 * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
 * Event dispatchers are functions that can take two arguments: `name` and `detail`.
 *
 * Component events created with `createEventDispatcher` create a
 * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
 * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
 * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
 * property and can contain any type of data.
 *
 * The event dispatcher can be typed to narrow the allowed event names and the type of the `detail` argument:
 * ```ts
 * const dispatch = createEventDispatcher<{
 *  loaded: never; // does not take a detail argument
 *  change: string; // takes a detail argument of type string, which is required
 *  optional: number | null; // takes an optional detail argument of type number
 * }>();
 * ```
 *
 * https://svelte.dev/docs/svelte#createeventdispatcher
 * @template {Record<string, any>} [EventMap=any]
 * @returns {import('./public.js').EventDispatcher<EventMap>}
 */
function createEventDispatcher() {
	const component = get_current_component();
	return (type, detail, { cancelable = false } = {}) => {
		const callbacks = component.$$.callbacks[type];
		if (callbacks) {
			// TODO are there situations where events could be dispatched
			// in a server (non-DOM) environment?
			const event = custom_event(/** @type {string} */ (type), detail, { cancelable });
			callbacks.slice().forEach((fn) => {
				fn.call(component, event);
			});
			return !event.defaultPrevented;
		}
		return true;
	};
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

/** @returns {void} */
function add_flush_callback(fn) {
	flush_callbacks.push(fn);
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
 * @type {Outro}
 */
let outros;

/**
 * @returns {void} */
function group_outros() {
	outros = {
		r: 0,
		c: [],
		p: outros // parent group
	};
}

/**
 * @returns {void} */
function check_outros() {
	if (!outros.r) {
		run_all(outros.c);
	}
	outros = outros.p;
}

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

/**
 * @param {import('./private.js').Fragment} block
 * @param {0 | 1} local
 * @param {0 | 1} [detach]
 * @param {() => void} [callback]
 * @returns {void}
 */
function transition_out(block, local, detach, callback) {
	if (block && block.o) {
		if (outroing.has(block)) return;
		outroing.add(block);
		outros.c.push(() => {
			outroing.delete(block);
			if (callback) {
				if (detach) block.d(1);
				callback();
			}
		});
		block.o(local);
	} else if (callback) {
		callback();
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

// general each functions:

function ensure_array_like(array_like_or_iterator) {
	return array_like_or_iterator?.length !== undefined
		? array_like_or_iterator
		: Array.from(array_like_or_iterator);
}

/** @returns {void} */
function bind(component, name, callback) {
	const index = component.$$.props[name];
	if (index !== undefined) {
		component.$$.bound[index] = callback;
		callback(component.$$.ctx[index]);
	}
}

/** @returns {void} */
function create_component(block) {
	block && block.c();
}

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


function __awaiter$1(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

var d$3=Object.defineProperty;var e=(c,a)=>{for(var b in a)d$3(c,b,{get:a[b],enumerable:!0});};

var w$1={};e(w$1,{convertFileSrc:()=>u$2,invoke:()=>d$2,transformCallback:()=>s$1});function l$2(){return window.crypto.getRandomValues(new Uint32Array(1))[0]}function s$1(r,n=!1){let e=l$2(),t=`_${e}`;return Object.defineProperty(window,t,{value:o=>(n&&Reflect.deleteProperty(window,t),r?.(o)),writable:!1,configurable:!0}),e}async function d$2(r,n={}){return new Promise((e,t)=>{let o=s$1(i=>{e(i),Reflect.deleteProperty(window,`_${a}`);},!0),a=s$1(i=>{t(i),Reflect.deleteProperty(window,`_${o}`);},!0);window.__TAURI_IPC__({cmd:r,callback:o,error:a,...n});})}function u$2(r,n="asset"){let e=encodeURIComponent(r);return navigator.userAgent.includes("Windows")?`https://${n}.localhost/${e}`:`${n}://localhost/${e}`}

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

var _KeyboardListener_id;
class KeyboardListener {
    constructor(id) {
        _KeyboardListener_id.set(this, void 0);
        __classPrivateFieldSet(this, _KeyboardListener_id, id, "f");
    }
    static start_listen(keyDown, keyUp) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = yield d$2('plugin:acfunlive-neotool-keyboard|start_listen', {
                keyDownCallback: s$1(keyDown),
                keyUpCallback: s$1(keyUp)
            });
            return new KeyboardListener(id);
        });
    }
    stop_listen() {
        return __awaiter(this, void 0, void 0, function* () {
            yield d$2('plugin:acfunlive-neotool-keyboard|stop_listen', { id: __classPrivateFieldGet(this, _KeyboardListener_id, "f") });
        });
    }
}
_KeyboardListener_id = new WeakMap();
function simulate_input(input) {
    return __awaiter(this, void 0, void 0, function* () {
        yield d$2('plugin:acfunlive-neotool-keyboard|simulate_input', { input });
    });
}

async function a$1(i){return d$2("tauri",i)}

var x$1={};e(x$1,{BaseDirectory:()=>F$1,Dir:()=>F$1,copyFile:()=>c$1,createDir:()=>d$1,exists:()=>v$1,readBinaryFile:()=>a,readDir:()=>m$1,readTextFile:()=>l$1,removeDir:()=>g$1,removeFile:()=>O,renameFile:()=>_$1,writeBinaryFile:()=>f$1,writeFile:()=>u$1,writeTextFile:()=>u$1});var F$1=(n=>(n[n.Audio=1]="Audio",n[n.Cache=2]="Cache",n[n.Config=3]="Config",n[n.Data=4]="Data",n[n.LocalData=5]="LocalData",n[n.Desktop=6]="Desktop",n[n.Document=7]="Document",n[n.Download=8]="Download",n[n.Executable=9]="Executable",n[n.Font=10]="Font",n[n.Home=11]="Home",n[n.Picture=12]="Picture",n[n.Public=13]="Public",n[n.Runtime=14]="Runtime",n[n.Template=15]="Template",n[n.Video=16]="Video",n[n.Resource=17]="Resource",n[n.App=18]="App",n[n.Log=19]="Log",n[n.Temp=20]="Temp",n[n.AppConfig=21]="AppConfig",n[n.AppData=22]="AppData",n[n.AppLocalData=23]="AppLocalData",n[n.AppCache=24]="AppCache",n[n.AppLog=25]="AppLog",n))(F$1||{});async function l$1(i,t={}){return a$1({__tauriModule:"Fs",message:{cmd:"readTextFile",path:i,options:t}})}async function a(i,t={}){let s=await a$1({__tauriModule:"Fs",message:{cmd:"readFile",path:i,options:t}});return Uint8Array.from(s)}async function u$1(i,t,s){typeof s=="object"&&Object.freeze(s),typeof i=="object"&&Object.freeze(i);let e={path:"",contents:""},r=s;return typeof i=="string"?e.path=i:(e.path=i.path,e.contents=i.contents),typeof t=="string"?e.contents=t??"":r=t,a$1({__tauriModule:"Fs",message:{cmd:"writeFile",path:e.path,contents:Array.from(new TextEncoder().encode(e.contents)),options:r}})}async function f$1(i,t,s){typeof s=="object"&&Object.freeze(s),typeof i=="object"&&Object.freeze(i);let e={path:"",contents:[]},r=s;return typeof i=="string"?e.path=i:(e.path=i.path,e.contents=i.contents),t&&"dir"in t?r=t:typeof i=="string"&&(e.contents=t??[]),a$1({__tauriModule:"Fs",message:{cmd:"writeFile",path:e.path,contents:Array.from(e.contents instanceof ArrayBuffer?new Uint8Array(e.contents):e.contents),options:r}})}async function m$1(i,t={}){return a$1({__tauriModule:"Fs",message:{cmd:"readDir",path:i,options:t}})}async function d$1(i,t={}){return a$1({__tauriModule:"Fs",message:{cmd:"createDir",path:i,options:t}})}async function g$1(i,t={}){return a$1({__tauriModule:"Fs",message:{cmd:"removeDir",path:i,options:t}})}async function c$1(i,t,s={}){return a$1({__tauriModule:"Fs",message:{cmd:"copyFile",source:i,destination:t,options:s}})}async function O(i,t={}){return a$1({__tauriModule:"Fs",message:{cmd:"removeFile",path:i,options:t}})}async function _$1(i,t,s={}){return a$1({__tauriModule:"Fs",message:{cmd:"renameFile",oldPath:i,newPath:t,options:s}})}async function v$1(i,t={}){return a$1({__tauriModule:"Fs",message:{cmd:"exists",path:i,options:t}})}

function n$1(){return navigator.appVersion.includes("Win")}

var q={};e(q,{BaseDirectory:()=>F$1,appCacheDir:()=>g,appConfigDir:()=>s,appDataDir:()=>c,appDir:()=>u,appLocalDataDir:()=>m,appLogDir:()=>n,audioDir:()=>d,basename:()=>V,cacheDir:()=>P,configDir:()=>h,dataDir:()=>l,delimiter:()=>z,desktopDir:()=>_,dirname:()=>F,documentDir:()=>p,downloadDir:()=>y,executableDir:()=>f,extname:()=>H,fontDir:()=>D,homeDir:()=>M,isAbsolute:()=>W,join:()=>E,localDataDir:()=>v,logDir:()=>w,normalize:()=>B,pictureDir:()=>b,publicDir:()=>A,resolve:()=>T,resolveResource:()=>x,resourceDir:()=>C,runtimeDir:()=>L,sep:()=>j,templateDir:()=>R,videoDir:()=>k});async function u(){return s()}async function s(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:21}})}async function c(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:22}})}async function m(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:23}})}async function g(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:24}})}async function d(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:1}})}async function P(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:2}})}async function h(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:3}})}async function l(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:4}})}async function _(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:6}})}async function p(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:7}})}async function y(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:8}})}async function f(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:9}})}async function D(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:10}})}async function M(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:11}})}async function v(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:5}})}async function b(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:12}})}async function A(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:13}})}async function C(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:17}})}async function x(t){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:t,directory:17}})}async function L(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:14}})}async function R(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:15}})}async function k(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:16}})}async function w(){return n()}async function n(){return a$1({__tauriModule:"Path",message:{cmd:"resolvePath",path:"",directory:25}})}var j=n$1()?"\\":"/",z=n$1()?";":":";async function T(...t){return a$1({__tauriModule:"Path",message:{cmd:"resolve",paths:t}})}async function B(t){return a$1({__tauriModule:"Path",message:{cmd:"normalize",path:t}})}async function E(...t){return a$1({__tauriModule:"Path",message:{cmd:"join",paths:t}})}async function F(t){return a$1({__tauriModule:"Path",message:{cmd:"dirname",path:t}})}async function H(t){return a$1({__tauriModule:"Path",message:{cmd:"extname",path:t}})}async function V(t,a){return a$1({__tauriModule:"Path",message:{cmd:"basename",path:t,ext:a}})}async function W(t){return a$1({__tauriModule:"Path",message:{cmd:"isAbsolute",path:t}})}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
const defaultInterval = 100;
class KeyData {
    constructor(danmaku, keys) {
        this.danmaku = danmaku;
        this.keys = keys;
        this.enable = true;
        let isKeyDown = true;
        let num = 0;
        for (const key of keys) {
            if ('KeyDown' in key) {
                isKeyDown = true;
            }
            else if ('KeyUp' in key) {
                if (isKeyDown) {
                    num++;
                }
                isKeyDown = false;
            }
        }
        this.intervals = new Array(num).fill(defaultInterval);
    }
}
function simulate(keyData) {
    return __awaiter$1(this, void 0, void 0, function* () {
        let isKeyDown = true;
        let index = 0;
        for (const key of keyData.keys) {
            if ('KeyDown' in key) {
                isKeyDown = true;
            }
            else if ('KeyUp' in key) {
                if (isKeyDown) {
                    const interval = keyData.intervals[index];
                    if (interval !== undefined && interval !== null && interval >= 0) {
                        yield delay(interval);
                    }
                    else {
                        yield delay(defaultInterval);
                    }
                    index++;
                }
                isKeyDown = false;
            }
            yield simulate_input(key);
        }
    });
}
function waitInterval(config) {
    return __awaiter$1(this, void 0, void 0, function* () {
        if (config) {
            if (config.interval !== undefined && config.interval !== null && config.interval >= 0) {
                yield delay(config.interval);
            }
            else {
                yield delay(defaultInterval);
            }
        }
    });
}
const configDir = 'danmaku_keyboard';
const configFile = 'danmaku_keyboard.conf.json';
const fsOption = { dir: F$1.AppConfig };
function loadConfig() {
    return __awaiter$1(this, void 0, void 0, function* () {
        const path = yield E(configDir, configFile);
        if (yield v$1(path, fsOption)) {
            const config = JSON.parse(yield l$1(path, fsOption));
            if (config.interval === undefined || config.interval === null || config.interval < 0) {
                config.interval = defaultInterval;
            }
            if (config.keys === undefined || config.keys === null) {
                config.keys = [];
            }
            return config;
        }
        else {
            return { interval: defaultInterval, keys: [] };
        }
    });
}
function saveConfig(config) {
    return __awaiter$1(this, void 0, void 0, function* () {
        if (!(yield v$1(configDir, fsOption))) {
            yield d$1(configDir, { dir: fsOption.dir, recursive: true });
        }
        const path = yield E(configDir, configFile);
        yield u$1(path, JSON.stringify(config, null, 2), fsOption);
    });
}
function keysToString(keys) {
    return keys
        .filter((key) => 'KeyDown' in key)
        .map((key) => {
        if ('KeyDown' in key) {
            return key.KeyDown;
        }
    })
        .join(' ');
}
function keysToRegex(keys) {
    return new RegExp(keys.map((key) => `@(${key.danmaku})`).join('|'), 'ig');
}

const trashIcon = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 -256 1792 1792" id="svg3741" version="1.1" inkscape:version="0.48.3.1 r9886" width="100%" height="100%" sodipodi:docname="trash_font_awesome.svg">
  <metadata id="metadata3751">
    <rdf:RDF>
      <cc:Work rdf:about="">
        <dc:format>image/svg+xml</dc:format>
        <dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/>
      </cc:Work>
    </rdf:RDF>
  </metadata>
  <defs id="defs3749"/>
  <sodipodi:namedview pagecolor="#ffffff" bordercolor="#666666" borderopacity="1" objecttolerance="10" gridtolerance="10" guidetolerance="10" inkscape:pageopacity="0" inkscape:pageshadow="2" inkscape:window-width="640" inkscape:window-height="480" id="namedview3747" showgrid="false" inkscape:zoom="0.13169643" inkscape:cx="896" inkscape:cy="896" inkscape:window-x="0" inkscape:window-y="25" inkscape:window-maximized="0" inkscape:current-layer="svg3741"/>
  <g transform="matrix(1,0,0,-1,197.42373,1255.0508)" id="g3743">
    <path d="M 512,800 V 224 q 0,-14 -9,-23 -9,-9 -23,-9 h -64 q -14,0 -23,9 -9,9 -9,23 v 576 q 0,14 9,23 9,9 23,9 h 64 q 14,0 23,-9 9,-9 9,-23 z m 256,0 V 224 q 0,-14 -9,-23 -9,-9 -23,-9 h -64 q -14,0 -23,9 -9,9 -9,23 v 576 q 0,14 9,23 9,9 23,9 h 64 q 14,0 23,-9 9,-9 9,-23 z m 256,0 V 224 q 0,-14 -9,-23 -9,-9 -23,-9 h -64 q -14,0 -23,9 -9,9 -9,23 v 576 q 0,14 9,23 9,9 23,9 h 64 q 14,0 23,-9 9,-9 9,-23 z M 1152,76 v 948 H 256 V 76 Q 256,54 263,35.5 270,17 277.5,8.5 285,0 288,0 h 832 q 3,0 10.5,8.5 7.5,8.5 14.5,27 7,18.5 7,40.5 z M 480,1152 h 448 l -48,117 q -7,9 -17,11 H 546 q -10,-2 -17,-11 z m 928,-32 v -64 q 0,-14 -9,-23 -9,-9 -23,-9 h -96 V 76 q 0,-83 -47,-143.5 -47,-60.5 -113,-60.5 H 288 q -66,0 -113,58.5 Q 128,-11 128,72 v 952 H 32 q -14,0 -23,9 -9,9 -9,23 v 64 q 0,14 9,23 9,9 23,9 h 309 l 70,167 q 15,37 54,63 39,26 79,26 h 320 q 40,0 79,-26 39,-26 54,-63 l 70,-167 h 309 q 14,0 23,-9 9,-9 9,-23 z" id="path3745" inkscape:connector-curvature="0" style="fill:currentColor"/>
  </g>
</svg>`;
const editIcon = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 -256 1850 1850" id="svg3025" version="1.1" inkscape:version="0.48.3.1 r9886" width="100%" height="100%" sodipodi:docname="edit_font_awesome.svg">
  <metadata id="metadata3035">
    <rdf:RDF>
      <cc:Work rdf:about="">
        <dc:format>image/svg+xml</dc:format>
        <dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/>
      </cc:Work>
    </rdf:RDF>
  </metadata>
  <defs id="defs3033"/>
  <sodipodi:namedview pagecolor="#ffffff" bordercolor="#666666" borderopacity="1" objecttolerance="10" gridtolerance="10" guidetolerance="10" inkscape:pageopacity="0" inkscape:pageshadow="2" inkscape:window-width="640" inkscape:window-height="480" id="namedview3031" showgrid="false" inkscape:zoom="0.13169643" inkscape:cx="896" inkscape:cy="896" inkscape:window-x="0" inkscape:window-y="25" inkscape:window-maximized="0" inkscape:current-layer="svg3025"/>
  <g transform="matrix(1,0,0,-1,30.372881,1373.7966)" id="g3027">
    <path d="M 888,352 1004,468 852,620 736,504 v -56 h 96 v -96 h 56 z m 440,720 q -16,16 -33,-1 L 945,721 q -17,-17 -1,-33 16,-16 33,1 l 350,350 q 17,17 1,33 z m 80,-594 V 288 Q 1408,169 1323.5,84.5 1239,0 1120,0 H 288 Q 169,0 84.5,84.5 0,169 0,288 v 832 Q 0,1239 84.5,1323.5 169,1408 288,1408 h 832 q 63,0 117,-25 15,-7 18,-23 3,-17 -9,-29 l -49,-49 q -14,-14 -32,-8 -23,6 -45,6 H 288 q -66,0 -113,-47 -47,-47 -47,-113 V 288 q 0,-66 47,-113 47,-47 113,-47 h 832 q 66,0 113,47 47,47 47,113 v 126 q 0,13 9,22 l 64,64 q 15,15 35,7 20,-8 20,-29 z M 1312,1216 1600,928 928,256 H 640 v 288 z m 444,-132 -92,-92 -288,288 92,92 q 28,28 68,28 40,0 68,-28 l 152,-152 q 28,-28 28,-68 0,-40 -28,-68 z" id="path3029" inkscape:connector-curvature="0" style="fill:currentColor"/>
  </g>
</svg>`;

/* src/components/Input.svelte generated by Svelte v4.2.0 */

function create_if_block_2(ctx) {
	let div;
	let t_value = keysToString(/*keys*/ ctx[2]) + "";
	let t;

	return {
		c() {
			div = element("div");
			t = text(t_value);
			attr(div, "class", "badge badge-neutral");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
		},
		p(ctx, dirty) {
			if (dirty & /*keys*/ 4 && t_value !== (t_value = keysToString(/*keys*/ ctx[2]) + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}
		}
	};
}

// (37:6) {:else}
function create_else_block(ctx) {
	let button;
	let mounted;
	let dispose;

	return {
		c() {
			button = element("button");
			button.textContent = "开始输入";
			attr(button, "class", "btn");
		},
		m(target, anchor) {
			insert(target, button, anchor);

			if (!mounted) {
				dispose = listen(button, "click", /*click_handler*/ ctx[8]);
				mounted = true;
			}
		},
		p: noop,
		d(detaching) {
			if (detaching) {
				detach(button);
			}

			mounted = false;
			dispose();
		}
	};
}

// (35:6) {#if listerner}
function create_if_block_1$1(ctx) {
	let button;
	let mounted;
	let dispose;

	return {
		c() {
			button = element("button");
			button.textContent = "停止输入";
			attr(button, "class", "btn");
		},
		m(target, anchor) {
			insert(target, button, anchor);

			if (!mounted) {
				dispose = listen(button, "click", /*stopListen*/ ctx[6]);
				mounted = true;
			}
		},
		p: noop,
		d(detaching) {
			if (detaching) {
				detach(button);
			}

			mounted = false;
			dispose();
		}
	};
}

// (57:6) {#if danmaku && danmaku.length > 0 && keys.length > 0}
function create_if_block$2(ctx) {
	let button;
	let mounted;
	let dispose;

	return {
		c() {
			button = element("button");
			button.textContent = "确定";
			attr(button, "class", "btn");
		},
		m(target, anchor) {
			insert(target, button, anchor);

			if (!mounted) {
				dispose = listen(button, "click", /*click_handler_1*/ ctx[9]);
				mounted = true;
			}
		},
		p: noop,
		d(detaching) {
			if (detaching) {
				detach(button);
			}

			mounted = false;
			dispose();
		}
	};
}

function create_fragment$2(ctx) {
	let div3;
	let div2;
	let div0;
	let input;
	let input_disabled_value;
	let t0;
	let t1;
	let div1;
	let t2;
	let t3;
	let button;
	let mounted;
	let dispose;
	let if_block0 = /*keys*/ ctx[2].length > 0 && create_if_block_2(ctx);

	function select_block_type(ctx, dirty) {
		if (/*listerner*/ ctx[3]) return create_if_block_1$1;
		return create_else_block;
	}

	let current_block_type = select_block_type(ctx);
	let if_block1 = current_block_type(ctx);
	let if_block2 = /*danmaku*/ ctx[1] && /*danmaku*/ ctx[1].length > 0 && /*keys*/ ctx[2].length > 0 && create_if_block$2(ctx);

	return {
		c() {
			div3 = element("div");
			div2 = element("div");
			div0 = element("div");
			input = element("input");
			t0 = space();
			if (if_block0) if_block0.c();
			t1 = space();
			div1 = element("div");
			if_block1.c();
			t2 = space();
			if (if_block2) if_block2.c();
			t3 = space();
			button = element("button");
			button.textContent = "取消";
			attr(input, "type", "text");
			attr(input, "placeholder", "触发弹幕");
			attr(input, "class", "input input-bordered w-64");
			input.disabled = input_disabled_value = /*listerner*/ ctx[3] !== undefined;
			attr(div0, "class", "flex flex-col space-y-5");
			attr(button, "class", "btn");
			attr(div1, "class", "modal-action");
			attr(div2, "class", "modal-box");
			attr(div3, "class", "modal");
			toggle_class(div3, "modal-open", /*isOpen*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, div3, anchor);
			append(div3, div2);
			append(div2, div0);
			append(div0, input);
			set_input_value(input, /*danmaku*/ ctx[1]);
			append(div0, t0);
			if (if_block0) if_block0.m(div0, null);
			append(div2, t1);
			append(div2, div1);
			if_block1.m(div1, null);
			append(div1, t2);
			if (if_block2) if_block2.m(div1, null);
			append(div1, t3);
			append(div1, button);

			if (!mounted) {
				dispose = [
					listen(input, "input", /*input_input_handler*/ ctx[7]),
					listen(button, "click", /*click_handler_2*/ ctx[10])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*listerner*/ 8 && input_disabled_value !== (input_disabled_value = /*listerner*/ ctx[3] !== undefined)) {
				input.disabled = input_disabled_value;
			}

			if (dirty & /*danmaku*/ 2 && input.value !== /*danmaku*/ ctx[1]) {
				set_input_value(input, /*danmaku*/ ctx[1]);
			}

			if (/*keys*/ ctx[2].length > 0) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_2(ctx);
					if_block0.c();
					if_block0.m(div0, null);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
				if_block1.p(ctx, dirty);
			} else {
				if_block1.d(1);
				if_block1 = current_block_type(ctx);

				if (if_block1) {
					if_block1.c();
					if_block1.m(div1, t2);
				}
			}

			if (/*danmaku*/ ctx[1] && /*danmaku*/ ctx[1].length > 0 && /*keys*/ ctx[2].length > 0) {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block$2(ctx);
					if_block2.c();
					if_block2.m(div1, t3);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}

			if (dirty & /*isOpen*/ 1) {
				toggle_class(div3, "modal-open", /*isOpen*/ ctx[0]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) {
				detach(div3);
			}

			if (if_block0) if_block0.d();
			if_block1.d();
			if (if_block2) if_block2.d();
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	let { isOpen } = $$props;
	let { danmaku = undefined } = $$props;
	let { keys = [] } = $$props;
	let listerner;
	const dispatch = createEventDispatcher();

	function trigger() {
		$$invalidate(2, keys);
	}

	function stopListen() {
		listerner === null || listerner === void 0
		? void 0
		: listerner.stop_listen().then(() => $$invalidate(3, listerner = undefined)).catch(e => console.log(`faled to stop listen keyboard: ${e}`));
	}

	onDestroy(stopListen);

	function input_input_handler() {
		danmaku = this.value;
		$$invalidate(1, danmaku);
	}

	const click_handler = () => {
		$$invalidate(2, keys = []);

		KeyboardListener.start_listen(
			key => {
				keys.push({ KeyDown: key });
				trigger();
			},
			key => {
				keys.push({ KeyUp: key });
				trigger();
			}
		).then(l => $$invalidate(3, listerner = l)).catch(e => console.log(`faled to start listen keyboard: ${e}`));
	};

	const click_handler_1 = () => {
		stopListen();

		if (danmaku && danmaku.length > 0 && keys.length > 0) {
			dispatch('key', new KeyData(danmaku, keys));
		}

		$$invalidate(0, isOpen = false);
	};

	const click_handler_2 = () => {
		stopListen();
		$$invalidate(0, isOpen = false);
	};

	$$self.$$set = $$props => {
		if ('isOpen' in $$props) $$invalidate(0, isOpen = $$props.isOpen);
		if ('danmaku' in $$props) $$invalidate(1, danmaku = $$props.danmaku);
		if ('keys' in $$props) $$invalidate(2, keys = $$props.keys);
	};

	return [
		isOpen,
		danmaku,
		keys,
		listerner,
		dispatch,
		trigger,
		stopListen,
		input_input_handler,
		click_handler,
		click_handler_1,
		click_handler_2
	];
}

class Input extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { isOpen: 0, danmaku: 1, keys: 2 });
	}
}

/* src/components/Key.svelte generated by Svelte v4.2.0 */

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[9] = list[i];
	child_ctx[10] = list;
	child_ctx[11] = i;
	return child_ctx;
}

// (22:6) {#each key.intervals as interval}
function create_each_block$1(ctx) {
	let input;
	let mounted;
	let dispose;

	function input_input_handler() {
		/*input_input_handler*/ ctx[4].call(input, /*each_value*/ ctx[10], /*interval_index*/ ctx[11]);
	}

	return {
		c() {
			input = element("input");
			attr(input, "type", "number");
			attr(input, "min", "0");
			attr(input, "max", "10000000");
			attr(input, "step", "100");
		},
		m(target, anchor) {
			insert(target, input, anchor);
			set_input_value(input, /*interval*/ ctx[9]);

			if (!mounted) {
				dispose = listen(input, "input", input_input_handler);
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (dirty & /*key*/ 1 && to_number(input.value) !== /*interval*/ ctx[9]) {
				set_input_value(input, /*interval*/ ctx[9]);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(input);
			}

			mounted = false;
			dispose();
		}
	};
}

// (39:0) {#if openInput}
function create_if_block$1(ctx) {
	let input;
	let updating_isOpen;
	let current;

	function input_isOpen_binding(value) {
		/*input_isOpen_binding*/ ctx[7](value);
	}

	let input_props = {
		danmaku: /*key*/ ctx[0].danmaku,
		keys: /*key*/ ctx[0].keys
	};

	if (/*openInput*/ ctx[1] !== void 0) {
		input_props.isOpen = /*openInput*/ ctx[1];
	}

	input = new Input({ props: input_props });
	binding_callbacks.push(() => bind(input, 'isOpen', input_isOpen_binding));
	input.$on("key", /*key_handler*/ ctx[8]);

	return {
		c() {
			create_component(input.$$.fragment);
		},
		m(target, anchor) {
			mount_component(input, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const input_changes = {};
			if (dirty & /*key*/ 1) input_changes.danmaku = /*key*/ ctx[0].danmaku;
			if (dirty & /*key*/ 1) input_changes.keys = /*key*/ ctx[0].keys;

			if (!updating_isOpen && dirty & /*openInput*/ 2) {
				updating_isOpen = true;
				input_changes.isOpen = /*openInput*/ ctx[1];
				add_flush_callback(() => updating_isOpen = false);
			}

			input.$set(input_changes);
		},
		i(local) {
			if (current) return;
			transition_in(input.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(input.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(input, detaching);
		}
	};
}

function create_fragment$1(ctx) {
	let tr;
	let td0;
	let input;
	let t0;
	let td1;
	let t1_value = /*key*/ ctx[0].danmaku + "";
	let t1;
	let t2;
	let td2;
	let div0;
	let t3_value = keysToString(/*key*/ ctx[0].keys) + "";
	let t3;
	let t4;
	let td3;
	let div1;
	let t5;
	let td4;
	let div2;
	let button0;
	let t6;
	let button1;
	let t7;
	let if_block_anchor;
	let current;
	let mounted;
	let dispose;
	let each_value = ensure_array_like(/*key*/ ctx[0].intervals);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
	}

	let if_block = /*openInput*/ ctx[1] && create_if_block$1(ctx);

	return {
		c() {
			tr = element("tr");
			td0 = element("td");
			input = element("input");
			t0 = space();
			td1 = element("td");
			t1 = text(t1_value);
			t2 = space();
			td2 = element("td");
			div0 = element("div");
			t3 = text(t3_value);
			t4 = space();
			td3 = element("td");
			div1 = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t5 = space();
			td4 = element("td");
			div2 = element("div");
			button0 = element("button");
			t6 = space();
			button1 = element("button");
			t7 = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
			attr(input, "type", "checkbox");
			attr(input, "class", "checkbox checkbox-sm");
			attr(div0, "class", "badge badge-neutral");
			attr(div1, "class", "flex flex-col space-y-2");
			attr(button0, "class", "btn btn-ghost w-14");
			attr(button1, "class", "btn btn-ghost w-14");
			attr(div2, "class", "flex flex-row justify-center");
		},
		m(target, anchor) {
			insert(target, tr, anchor);
			append(tr, td0);
			append(td0, input);
			input.checked = /*key*/ ctx[0].enable;
			append(tr, t0);
			append(tr, td1);
			append(td1, t1);
			append(tr, t2);
			append(tr, td2);
			append(td2, div0);
			append(div0, t3);
			append(tr, t4);
			append(tr, td3);
			append(td3, div1);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(div1, null);
				}
			}

			append(tr, t5);
			append(tr, td4);
			append(td4, div2);
			append(div2, button0);
			button0.innerHTML = editIcon;
			append(div2, t6);
			append(div2, button1);
			button1.innerHTML = trashIcon;
			insert(target, t7, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;

			if (!mounted) {
				dispose = [
					listen(input, "change", /*input_change_handler*/ ctx[3]),
					listen(button0, "click", /*click_handler*/ ctx[5]),
					listen(button1, "click", /*click_handler_1*/ ctx[6])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*key*/ 1) {
				input.checked = /*key*/ ctx[0].enable;
			}

			if ((!current || dirty & /*key*/ 1) && t1_value !== (t1_value = /*key*/ ctx[0].danmaku + "")) set_data(t1, t1_value);
			if ((!current || dirty & /*key*/ 1) && t3_value !== (t3_value = keysToString(/*key*/ ctx[0].keys) + "")) set_data(t3, t3_value);

			if (dirty & /*key*/ 1) {
				each_value = ensure_array_like(/*key*/ ctx[0].intervals);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$1(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div1, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			if (/*openInput*/ ctx[1]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*openInput*/ 2) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$1(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) {
				detach(tr);
				detach(t7);
				detach(if_block_anchor);
			}

			destroy_each(each_blocks, detaching);
			if (if_block) if_block.d(detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let { key } = $$props;
	let openInput = false;
	const dispatch = createEventDispatcher();

	function input_change_handler() {
		key.enable = this.checked;
		$$invalidate(0, key);
	}

	function input_input_handler(each_value, interval_index) {
		each_value[interval_index] = to_number(this.value);
		$$invalidate(0, key);
	}

	const click_handler = () => $$invalidate(1, openInput = true);
	const click_handler_1 = () => dispatch('delete', undefined);

	function input_isOpen_binding(value) {
		openInput = value;
		$$invalidate(1, openInput);
	}

	const key_handler = evnet => {
		const enable = key.enable;
		$$invalidate(0, key = evnet.detail);
		$$invalidate(0, key.enable = enable, key);
	};

	$$self.$$set = $$props => {
		if ('key' in $$props) $$invalidate(0, key = $$props.key);
	};

	return [
		key,
		openInput,
		dispatch,
		input_change_handler,
		input_input_handler,
		click_handler,
		click_handler_1,
		input_isOpen_binding,
		key_handler
	];
}

class Key extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { key: 0 });
	}
}

/* src/App.svelte generated by Svelte v4.2.0 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[16] = list[i];
	child_ctx[17] = list;
	child_ctx[18] = i;
	return child_ctx;
}

// (73:2) {#if config}
function create_if_block_1(ctx) {
	let div1;
	let div0;
	let t1;
	let input;
	let t2;
	let table;
	let thead;
	let t10;
	let tbody;
	let current;
	let mounted;
	let dispose;
	let each_value = ensure_array_like(/*config*/ ctx[0].keys);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			div0.textContent = "单个弹幕连续触发按键的间隔时长（毫秒）";
			t1 = space();
			input = element("input");
			t2 = space();
			table = element("table");
			thead = element("thead");
			thead.innerHTML = `<tr><th></th> <th class="text-base">触发弹幕</th> <th class="text-base">触发按键</th> <th class="text-base">按键时长（毫秒）</th> <th></th></tr>`;
			t10 = space();
			tbody = element("tbody");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(input, "type", "number");
			attr(input, "min", "0");
			attr(input, "max", "10000000");
			attr(input, "step", "100");
			attr(div1, "class", "flex flex-row space-x-3");
			attr(table, "class", "table table-zebra");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);
			append(div1, t1);
			append(div1, input);
			set_input_value(input, /*config*/ ctx[0].interval);
			insert(target, t2, anchor);
			insert(target, table, anchor);
			append(table, thead);
			append(table, t10);
			append(table, tbody);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(tbody, null);
				}
			}

			current = true;

			if (!mounted) {
				dispose = listen(input, "input", /*input_input_handler*/ ctx[9]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*config*/ 1 && to_number(input.value) !== /*config*/ ctx[0].interval) {
				set_input_value(input, /*config*/ ctx[0].interval);
			}

			if (dirty & /*config*/ 1) {
				each_value = ensure_array_like(/*config*/ ctx[0].keys);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(tbody, null);
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) {
				detach(div1);
				detach(t2);
				detach(table);
			}

			destroy_each(each_blocks, detaching);
			mounted = false;
			dispose();
		}
	};
}

// (89:8) {#each config.keys as key, i}
function create_each_block(ctx) {
	let keydata;
	let updating_key;
	let current;

	function keydata_key_binding(value) {
		/*keydata_key_binding*/ ctx[10](value, /*key*/ ctx[16], /*each_value*/ ctx[17], /*i*/ ctx[18]);
	}

	function delete_handler() {
		return /*delete_handler*/ ctx[11](/*i*/ ctx[18]);
	}

	let keydata_props = {};

	if (/*key*/ ctx[16] !== void 0) {
		keydata_props.key = /*key*/ ctx[16];
	}

	keydata = new Key({ props: keydata_props });
	binding_callbacks.push(() => bind(keydata, 'key', keydata_key_binding));
	keydata.$on("delete", delete_handler);

	return {
		c() {
			create_component(keydata.$$.fragment);
		},
		m(target, anchor) {
			mount_component(keydata, target, anchor);
			current = true;
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			const keydata_changes = {};

			if (!updating_key && dirty & /*config*/ 1) {
				updating_key = true;
				keydata_changes.key = /*key*/ ctx[16];
				add_flush_callback(() => updating_key = false);
			}

			keydata.$set(keydata_changes);
		},
		i(local) {
			if (current) return;
			transition_in(keydata.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(keydata.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(keydata, detaching);
		}
	};
}

// (105:0) {#if openInput}
function create_if_block(ctx) {
	let input;
	let updating_isOpen;
	let current;

	function input_isOpen_binding(value) {
		/*input_isOpen_binding*/ ctx[13](value);
	}

	let input_props = {};

	if (/*openInput*/ ctx[1] !== void 0) {
		input_props.isOpen = /*openInput*/ ctx[1];
	}

	input = new Input({ props: input_props });
	binding_callbacks.push(() => bind(input, 'isOpen', input_isOpen_binding));
	input.$on("key", /*key_handler*/ ctx[14]);

	return {
		c() {
			create_component(input.$$.fragment);
		},
		m(target, anchor) {
			mount_component(input, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const input_changes = {};

			if (!updating_isOpen && dirty & /*openInput*/ 2) {
				updating_isOpen = true;
				input_changes.isOpen = /*openInput*/ ctx[1];
				add_flush_callback(() => updating_isOpen = false);
			}

			input.$set(input_changes);
		},
		i(local) {
			if (current) return;
			transition_in(input.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(input.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(input, detaching);
		}
	};
}

function create_fragment(ctx) {
	let div1;
	let div0;
	let t1;
	let t2;
	let button;
	let t4;
	let if_block1_anchor;
	let current;
	let mounted;
	let dispose;
	let if_block0 = /*config*/ ctx[0] && create_if_block_1(ctx);
	let if_block1 = /*openInput*/ ctx[1] && create_if_block(ctx);

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			div0.textContent = "说明：弹幕前面需要加 @ 符号来触发";
			t1 = space();
			if (if_block0) if_block0.c();
			t2 = space();
			button = element("button");
			button.textContent = "+";
			t4 = space();
			if (if_block1) if_block1.c();
			if_block1_anchor = empty();
			attr(button, "class", "btn btn-primary text-3xl");
			attr(div1, "class", "flex flex-col content-between p-5 space-y-5");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);
			append(div1, t1);
			if (if_block0) if_block0.m(div1, null);
			append(div1, t2);
			append(div1, button);
			insert(target, t4, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert(target, if_block1_anchor, anchor);
			current = true;

			if (!mounted) {
				dispose = listen(button, "click", /*click_handler*/ ctx[12]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (/*config*/ ctx[0]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);

					if (dirty & /*config*/ 1) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_1(ctx);
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(div1, t2);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (/*openInput*/ ctx[1]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);

					if (dirty & /*openInput*/ 2) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block(ctx);
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(if_block1);
			current = true;
		},
		o(local) {
			transition_out(if_block0);
			transition_out(if_block1);
			current = false;
		},
		d(detaching) {
			if (detaching) {
				detach(div1);
				detach(t4);
				detach(if_block1_anchor);
			}

			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d(detaching);
			mounted = false;
			dispose();
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let $liverUID;
	let $enable;

	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
		function adopt(value) {
			return value instanceof P
			? value
			: new P(function (resolve) {
						resolve(value);
					});
		}

		return new (P || (P = Promise))(function (resolve, reject) {
				function fulfilled(value) {
					try {
						step(generator.next(value));
					} catch(e) {
						reject(e);
					}
				}

				function rejected(value) {
					try {
						step(generator["throw"](value));
					} catch(e) {
						reject(e);
					}
				}

				function step(result) {
					result.done
					? resolve(result.value)
					: adopt(result.value).then(fulfilled, rejected);
				}

				step((generator = generator.apply(thisArg, _arguments || [])).next());
			});
	};

	let { data } = $$props;
	const enable = data.enable;
	component_subscribe($$self, enable, value => $$invalidate(8, $enable = value));
	const liverUID = data.data.liverUID;
	component_subscribe($$self, liverUID, value => $$invalidate(7, $liverUID = value));
	let config;
	let regex;
	let openInput = false;
	loadConfig().then(c => $$invalidate(0, config = c)).catch(e => console.log(`failed to load danmaku_keyboard config: ${e}`));
	let unsubscribe;

	onDestroy(() => {
		if (unsubscribe) {
			unsubscribe();
			$$invalidate(6, unsubscribe = undefined);
		}
	});

	function input_input_handler() {
		config.interval = to_number(this.value);
		$$invalidate(0, config);
	}

	function keydata_key_binding(value, key, each_value, i) {
		each_value[i] = value;
		$$invalidate(0, config);
	}

	const delete_handler = i => {
		config?.keys.splice(i, 1);
		$$invalidate(0, config);
	};

	const click_handler = () => $$invalidate(1, openInput = true);

	function input_isOpen_binding(value) {
		openInput = value;
		$$invalidate(1, openInput);
	}

	const key_handler = event => {
		if (config) {
			config.keys.push(event.detail);
			$$invalidate(0, config);
		}
	};

	$$self.$$set = $$props => {
		if ('data' in $$props) $$invalidate(4, data = $$props.data);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*config*/ 1) {
			if (config) {
				saveConfig(config).catch(e => console.log(`failed to save danmaku_keyboard config: ${e}`));

				if (config.keys.length > 0) {
					$$invalidate(5, regex = keysToRegex(config.keys));
				} else {
					$$invalidate(5, regex = undefined);
				}
			}
		}

		if ($$self.$$.dirty & /*unsubscribe, $liverUID, data, $enable, regex, config*/ 497) {
			{
				if (unsubscribe) {
					unsubscribe();
					$$invalidate(6, unsubscribe = undefined);
				}

				if ($liverUID) {
					$$invalidate(6, unsubscribe = data.session.on(
						'comment',
						damaku => __awaiter(void 0, void 0, void 0, function* () {
							if ($enable && regex) {
								for (const match of damaku.data.content.matchAll(regex)) {
									for (const [i, group] of match.slice(1).entries()) {
										if (group) {
											const key = config === null || config === void 0
											? void 0
											: config.keys[i];

											if (key === null || key === void 0 ? void 0 : key.enable) {
												try {
													yield simulate(key);
												} catch(e) {
													console.log(`failed to simulate keyboard input: ${e}`);
												}

												break;
											}
										}
									}

									yield waitInterval(config);
								}
							}
						}),
						$liverUID
					));
				}
			}
		}
	};

	return [
		config,
		openInput,
		enable,
		liverUID,
		data,
		regex,
		unsubscribe,
		$liverUID,
		$enable,
		input_input_handler,
		keydata_key_binding,
		delete_handler,
		click_handler,
		input_isOpen_binding,
		key_handler
	];
}

class App extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, { data: 4 });
	}
}

export { App as default };
