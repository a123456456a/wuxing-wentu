import type { Element, ReactNode } from "./index.js";

export function jsx(
  type: unknown,
  props: Record<string, unknown>,
  key?: string,
): Element;
export function jsxs(
  type: unknown,
  props: Record<string, unknown>,
  key?: string,
): Element;
export function jsxDEV(
  type: unknown,
  props: Record<string, unknown>,
  key?: string,
): Element;
export const Fragment: unique symbol;
export type { ReactNode };
