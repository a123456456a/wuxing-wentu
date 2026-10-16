const Fragment = Symbol.for("react.fragment");
const TEXT = Symbol.for("react.text");

const EVENT_PROPS = {
  onClick: "click",
  onDoubleClick: "dblclick",
  onChange: "input",
  onInput: "input",
  onSubmit: "submit",
  onKeyDown: "keydown",
  onKeyUp: "keyup",
  onPointerDown: "pointerdown",
  onPointerUp: "pointerup",
  onPointerMove: "pointermove",
  onMouseDown: "mousedown",
  onMouseUp: "mouseup",
  onMouseEnter: "mouseenter",
  onMouseLeave: "mouseleave",
  onFocus: "focus",
  onBlur: "blur",
  onContextMenu: "contextmenu",
};

const UNITLESS = new Set([
  "opacity",
  "zIndex",
  "fontWeight",
  "lineHeight",
  "flexGrow",
  "flexShrink",
  "order",
  "zoom",
]);

let currentRoot = null;
let hookFiber = null;
let hookIndex = 0;
let scheduled = false;
let rendering = false;
let rerenderQueued = false;
let idCounter = 0;

function normalizeChildren(raw, out = []) {
  if (raw == null || raw === false || raw === true) return out;
  if (Array.isArray(raw)) {
    for (const item of raw) normalizeChildren(item, out);
    return out;
  }
  if (typeof raw === "object" && raw && "type" in raw && "props" in raw) {
    out.push(raw);
    return out;
  }
  out.push({
    type: TEXT,
    props: { nodeValue: String(raw), children: [] },
    key: null,
    ref: null,
  });
  return out;
}

export function createElement(type, config, ...children) {
  const props = {};
  let key = null;
  let ref = null;
  if (config) {
    if (config.key != null) key = String(config.key);
    if (config.ref != null) ref = config.ref;
    for (const name of Object.keys(config)) {
      if (name === "key" || name === "ref" || name === "children") continue;
      props[name] = config[name];
    }
  }
  const source = children.length > 0 ? children : config ? config.children : undefined;
  props.children = normalizeChildren(source);
  return { type, props, key, ref };
}

function depsEqual(a, b) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

function scheduleUpdate() {
  if (!currentRoot) return;
  if (rendering) {
    rerenderQueued = true;
    return;
  }
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    if (currentRoot) perform(currentRoot.dom);
  });
}

function takeHook() {
  if (!hookFiber) throw new Error("Hook called outside of a component");
  const old = hookFiber.alternate?.hooks?.[hookIndex];
  hookIndex += 1;
  return old;
}

export function useReducer(reducer, initial) {
  const old = takeHook();
  const hook = old || { kind: "reducer", state: initial, queue: [] };
  if (!hook.dispatch) {
    hook.dispatch = (action) => {
      hook.queue.push(action);
      scheduleUpdate();
    };
  }
  hook.reducer = reducer;
  for (const action of hook.queue) hook.state = hook.reducer(hook.state, action);
  hook.queue.length = 0;
  hookFiber.hooks.push(hook);
  return [hook.state, hook.dispatch];
}

export function useState(initial) {
  const old = takeHook();
  const hook = old || {
    kind: "state",
    state: typeof initial === "function" ? initial() : initial,
    queue: [],
  };
  if (!hook.dispatch) {
    hook.dispatch = (action) => {
      hook.queue.push(action);
      scheduleUpdate();
    };
  }
  for (const action of hook.queue) {
    hook.state = typeof action === "function" ? action(hook.state) : action;
  }
  hook.queue.length = 0;
  hookFiber.hooks.push(hook);
  return [hook.state, hook.dispatch];
}

export function useEffect(create, deps) {
  const old = takeHook();
  const hook = old || { kind: "effect", deps: undefined, cleanup: null, create: null };
  const changed = !old || !depsEqual(old.deps, deps);
  hook.kind = "effect";
  hook.create = create;
  hook.deps = deps;
  hookFiber.hooks.push(hook);
  if (changed) hookFiber.pendingEffects.push(hook);
}

export function useMemo(factory, deps) {
  const old = takeHook();
  if (old && depsEqual(old.deps, deps)) {
    hookFiber.hooks.push(old);
    return old.value;
  }
  const hook = { kind: "memo", value: factory(), deps };
  hookFiber.hooks.push(hook);
  return hook.value;
}

export function useCallback(fn, deps) {
  return useMemo(() => fn, deps);
}

export function useRef(initial) {
  const old = takeHook();
  const hook = old || { kind: "ref", current: initial };
  hookFiber.hooks.push(hook);
  return hook;
}

export function useId() {
  const old = takeHook();
  const hook = old || { kind: "id", value: ":w" + (++idCounter).toString(36) + ":" };
  hookFiber.hooks.push(hook);
  return hook.value;
}

export function useSyncExternalStore(subscribe, getSnapshot) {
  const snap = getSnapshot();
  const [, setTick] = useState(0);
  const ref = useRef(null);
  ref.current = { getSnapshot, snap };
  useEffect(() => {
    const check = () => {
      const current = ref.current;
      if (!current) return;
      const next = current.getSnapshot();
      if (!Object.is(next, current.snap)) setTick((n) => n + 1);
    };
    check();
    return subscribe(check);
  }, [subscribe]);
  return snap;
}

function renderFunction(fiber) {
  hookFiber = fiber;
  hookIndex = 0;
  fiber.hooks = [];
  fiber.pendingEffects = [];
  const rendered = fiber.type(fiber.props);
  hookFiber = null;
  reconcileChildren(fiber, normalizeChildren(rendered));
}

function reconcileChildren(fiber, children) {
  const oldList = [];
  let cursor = fiber.alternate?.child ?? null;
  while (cursor) {
    oldList.push(cursor);
    cursor = cursor.sibling;
  }
  const used = new Set();
  let first = null;
  let prev = null;
  children.forEach((vnode, index) => {
    const key = vnode.key != null ? vnode.key : index;
    let match = null;
    for (let i = 0; i < oldList.length; i += 1) {
      if (used.has(i)) continue;
      const candidate = oldList[i];
      const candidateKey = candidate.key != null ? candidate.key : candidate.index;
      if (candidateKey === key && candidate.type === vnode.type) {
        match = candidate;
        used.add(i);
        break;
      }
    }
    const child = {
      type: vnode.type,
      props: vnode.props,
      key: vnode.key,
      ref: vnode.ref,
      index,
      dom: match?.dom ?? null,
      alternate: match,
      parent: fiber,
      child: null,
      sibling: null,
      hooks: null,
      pendingEffects: [],
    };
    if (!first) first = child;
    else prev.sibling = child;
    prev = child;
    if (typeof child.type === "function") renderFunction(child);
    else if (child.type === Fragment) reconcileChildren(child, child.props.children || []);
    else if (child.type === TEXT || typeof child.type === "string") {
      if (!child.dom) child.dom = createHostDom(child);
      else updateHostDom(child.dom, match ? match.props : {}, child.props);
      if (typeof child.type === "string") reconcileChildren(child, child.props.children || []);
    }
  });
  fiber.child = first;
  const deletions = fiber.deletions || (fiber.deletions = []);
  oldList.forEach((old, i) => {
    if (!used.has(i)) deletions.push(old);
  });
}

function createHostDom(fiber) {
  if (fiber.type === TEXT) return document.createTextNode(fiber.props.nodeValue ?? "");
  const dom = document.createElement(fiber.type);
  updateHostDom(dom, {}, fiber.props);
  return dom;
}

function applyStyle(dom, style) {
  dom.style.cssText = "";
  if (!style || typeof style !== "object") return;
  for (const [key, value] of Object.entries(style)) {
    if (value == null || value === false) continue;
    const cssKey = key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
    const printed =
      typeof value === "number" && !UNITLESS.has(key) ? value + "px" : String(value);
    dom.style.setProperty(cssKey, printed);
  }
}

function updateHostDom(dom, prevProps, nextProps) {
  if (dom.nodeType === 3) {
    const value = nextProps.nodeValue ?? "";
    if (dom.nodeValue !== value) dom.nodeValue = value;
    return;
  }
  for (const prop of Object.keys(EVENT_PROPS)) {
    const eventName = EVENT_PROPS[prop];
    const oldFn = prevProps[prop];
    const newFn = nextProps[prop];
    if (oldFn === newFn) continue;
    if (oldFn) dom.removeEventListener(eventName, oldFn);
    if (newFn) dom.addEventListener(eventName, newFn);
  }
  const className = nextProps.className ?? "";
  if (dom.className !== className) dom.className = className;
  applyStyle(dom, nextProps.style);

  const skip = new Set([
    "children",
    "className",
    "style",
    "key",
    "ref",
    "nodeValue",
    ...Object.keys(EVENT_PROPS),
  ]);
  for (const key of Object.keys(prevProps)) {
    if (skip.has(key) || key in nextProps) continue;
    if (key.startsWith("aria-") || key.startsWith("data-")) dom.removeAttribute(key);
  }
  for (const [key, value] of Object.entries(nextProps)) {
    if (skip.has(key)) continue;
    if (key.startsWith("aria-") || key.startsWith("data-")) {
      if (value == null || value === false) dom.removeAttribute(key);
      else dom.setAttribute(key, value === true ? "" : String(value));
      continue;
    }
    if (key === "autoFocus") {
      if (value && document.activeElement !== dom) dom.focus();
      continue;
    }
    if (value == null || value === false) {
      dom.removeAttribute(key);
      if (key === "disabled" || key === "checked" || key === "readOnly") dom[key] = false;
      continue;
    }
    if (key === "value") {
      const printed = String(value);
      if (dom.value !== printed) dom.value = printed;
      continue;
    }
    if (key in dom && typeof value !== "object") {
      try {
        dom[key] = value;
        continue;
      } catch {
        /* fall through */
      }
    }
    if (typeof value !== "object") dom.setAttribute(key, String(value));
  }
}

function collectHostNodes(fiber, acc) {
  let child = fiber.child;
  while (child) {
    if (child.dom) acc.push(child.dom);
    else collectHostNodes(child, acc);
    child = child.sibling;
  }
}

function commitHost(fiber) {
  if (!fiber.dom) return;
  const wanted = [];
  collectHostNodes(fiber, wanted);
  const keep = new Set(wanted);
  let cursor = fiber.dom.firstChild;
  for (const node of wanted) {
    if (cursor === node) {
      cursor = node.nextSibling;
      continue;
    }
    fiber.dom.insertBefore(node, cursor);
  }
  while (cursor) {
    const next = cursor.nextSibling;
    if (!keep.has(cursor)) cursor.parentNode.removeChild(cursor);
    cursor = next;
  }
  let child = fiber.child;
  while (child) {
    commitTree(child);
    child = child.sibling;
  }
}

function assignRef(fiber) {
  if (!fiber.ref) return;
  const value = fiber.dom ?? null;
  if (typeof fiber.ref === "function") fiber.ref(value);
  else fiber.ref.current = value;
}

function commitTree(fiber) {
  if (!fiber || fiber.type === "ROOT") return;
  if (fiber.dom) commitHost(fiber);
  else {
    let child = fiber.child;
    while (child) {
      commitTree(child);
      child = child.sibling;
    }
  }
  assignRef(fiber);
}

function runEffects(fiber) {
  if (!fiber) return;
  if (fiber.pendingEffects) {
    for (const hook of fiber.pendingEffects) {
      if (typeof hook.cleanup === "function") {
        const cleanup = hook.cleanup;
        hook.cleanup = null;
        cleanup();
      }
      const next = hook.create();
      hook.cleanup = typeof next === "function" ? next : null;
    }
    fiber.pendingEffects = [];
  }
  runEffects(fiber.child);
  runEffects(fiber.sibling);
}

function unmount(fiber) {
  if (!fiber || fiber.unmounted) return;
  fiber.unmounted = true;
  let child = fiber.child;
  while (child) {
    unmount(child);
    child = child.sibling;
  }
  if (fiber.hooks) {
    for (const hook of fiber.hooks) {
      if (hook.kind === "effect" && typeof hook.cleanup === "function") {
        const cleanup = hook.cleanup;
        hook.cleanup = null;
        cleanup();
      }
    }
  }
  if (fiber.ref) {
    if (typeof fiber.ref === "function") fiber.ref(null);
    else fiber.ref.current = null;
  }
  if (fiber.dom?.parentNode) fiber.dom.parentNode.removeChild(fiber.dom);
}

function flushDeletions(fiber) {
  if (!fiber) return;
  if (fiber.deletions) {
    for (const dead of fiber.deletions) unmount(dead);
    fiber.deletions = [];
  }
  flushDeletions(fiber.child);
  flushDeletions(fiber.sibling);
}

function perform(container) {
  const vnode = container.__vnode;
  rendering = true;
  const root = {
    type: "ROOT",
    dom: container,
    props: { children: normalizeChildren(vnode) },
    alternate: currentRoot && currentRoot.dom === container ? currentRoot : null,
    child: null,
    sibling: null,
    parent: null,
    hooks: null,
    key: null,
    ref: null,
    index: 0,
    pendingEffects: [],
    deletions: [],
  };
  reconcileChildren(root, root.props.children);
  flushDeletions(root);
  commitHost(root);
  runEffects(root);
  currentRoot = root;
  rendering = false;
  if (rerenderQueued) {
    rerenderQueued = false;
    scheduleUpdate();
  }
}

export function render(element, container) {
  container.__vnode = element;
  perform(container);
}

export { Fragment, TEXT };
