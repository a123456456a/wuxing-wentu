import { createElement, useEffect, useRef, useState } from "../vendor/react/index.js";
import { createRoot } from "../vendor/react-dom/client.js";

class Node {
  constructor(type) {
    this.nodeType = type === "#text" ? 3 : 1;
    this.nodeName = type === "#text" ? "#text" : String(type).toUpperCase();
    this.tag = type;
    this.children = [];
    this.parentNode = null;
    this.listeners = new Map();
    this.className = "";
    this.style = {
      cssText: "",
      setProperty(k, v) {
        this[k] = v;
      },
    };
    this.attributes = new Map();
    this.nodeValue = "";
    this.value = "";
    this.disabled = false;
    this.checked = false;
    this.textContent = "";
  }
  get firstChild() {
    return this.children[0] ?? null;
  }
  get nextSibling() {
    if (!this.parentNode) return null;
    const i = this.parentNode.children.indexOf(this);
    return this.parentNode.children[i + 1] ?? null;
  }
  appendChild(node) {
    this.insertBefore(node, null);
    return node;
  }
  insertBefore(node, anchor) {
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this;
    if (!anchor) this.children.push(node);
    else {
      const i = this.children.indexOf(anchor);
      if (i < 0) this.children.push(node);
      else this.children.splice(i, 0, node);
    }
    return node;
  }
  removeChild(node) {
    const i = this.children.indexOf(node);
    if (i >= 0) this.children.splice(i, 1);
    node.parentNode = null;
    return node;
  }
  replaceChildren() {
    for (const child of [...this.children]) this.removeChild(child);
  }
  addEventListener(type, fn) {
    const list = this.listeners.get(type) ?? [];
    list.push(fn);
    this.listeners.set(type, list);
  }
  removeEventListener(type, fn) {
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      list.filter((item) => item !== fn),
    );
  }
  dispatchEvent(event) {
    event.currentTarget = this;
    event.target = this;
    for (const fn of [...(this.listeners.get(event.type) ?? [])]) fn(event);
  }
  setAttribute(name, value) {
    this.attributes.set(name, value);
    if (name === "class") this.className = value;
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
  focus() {
    globalThis.document.activeElement = this;
  }
  get text() {
    if (this.nodeType === 3) return this.nodeValue;
    return this.children.map((child) => child.text).join("");
  }
}

function el(type) {
  return new Node(type);
}

globalThis.document = {
  activeElement: null,
  createElement: el,
  createTextNode(text) {
    const node = new Node("#text");
    node.nodeValue = text;
    return node;
  },
};

const rootEl = el("div");
const root = createRoot(rootEl);
const seen = [];

function Mark() {
  const ref = useRef(null);
  useEffect(() => {
    seen.push("mount:" + (ref.current?.className ?? ""));
    return () => seen.push("unmount");
  }, []);
  return createElement("span", { ref, className: "mark" }, "on");
}

function Counter() {
  const [n, setN] = useState(0);
  const [on, setOn] = useState(true);
  return createElement(
    "section",
    null,
    createElement(
      "button",
      { className: "plus", onClick: () => setN((v) => v + 1) },
      "n=",
      n,
    ),
    on ? createElement(Mark, { key: "a" }) : createElement("em", { key: "b" }, "off"),
    createElement(
      "button",
      { className: "toggle", onClick: () => setOn((v) => !v) },
      "toggle",
    ),
  );
}

root.render(createElement(Counter));
await new Promise((resolve) => setTimeout(resolve, 0));

if (rootEl.text !== "n=0ontoggle") {
  console.error("initial text", JSON.stringify(rootEl.text));
  process.exit(1);
}
if (!seen.includes("mount:mark")) {
  console.error("effect/ref failed", seen);
  process.exit(1);
}

const plus = rootEl.children[0].children[0];
plus.dispatchEvent({ type: "click", preventDefault() {} });
await new Promise((resolve) => setTimeout(resolve, 0));
if (!rootEl.text.includes("n=1")) {
  console.error("click failed", rootEl.text);
  process.exit(1);
}

const toggle = rootEl.children[0].children[2];
toggle.dispatchEvent({ type: "click", preventDefault() {} });
await new Promise((resolve) => setTimeout(resolve, 0));
if (!rootEl.text.includes("off") || !seen.includes("unmount")) {
  console.error("toggle failed", rootEl.text, seen);
  process.exit(1);
}

console.log("react runtime ok");
