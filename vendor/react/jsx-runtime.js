import { Fragment, createElement } from "./index.js";

function jsx(type, props, key) {
  const next = props ? { ...props } : {};
  if (key !== undefined) next.key = key;
  const children = next.children;
  delete next.children;
  return createElement(type, next, children);
}

export { Fragment, jsx };
export const jsxs = jsx;
export const jsxDEV = jsx;
