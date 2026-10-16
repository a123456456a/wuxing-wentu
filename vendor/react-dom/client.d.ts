import type { Element as ReactElement } from "react";

export interface Root {
  render(element: ReactElement): void;
  unmount(): void;
}

export function createRoot(container: globalThis.Element): Root;
