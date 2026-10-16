import { render } from "../react/index.js";

export function createRoot(container) {
  return {
    render(element) {
      render(element, container);
    },
    unmount() {
      container.replaceChildren();
      container.__vnode = null;
    },
  };
}
