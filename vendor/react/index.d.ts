export type ReactNode =
  | Element
  | string
  | number
  | boolean
  | null
  | undefined
  | ReactNode[];

export interface Element {
  type: unknown;
  props: Record<string, unknown>;
  key: string | null;
  ref: unknown;
}

export type Dispatch<A> = (action: A) => void;
export type SetStateAction<S> = S | ((prev: S) => S);

export interface RefObject<T> {
  current: T;
}

export function createElement(
  type: unknown,
  props?: Record<string, unknown> | null,
  ...children: ReactNode[]
): Element;

export function useState<S>(
  initial: S | (() => S),
): [S, Dispatch<SetStateAction<S>>];

export function useReducer<S, A>(
  reducer: (state: S, action: A) => S,
  initial: S,
): [S, Dispatch<A>];

export function useEffect(
  effect: () => void | (() => void),
  deps?: readonly unknown[],
): void;

export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
export function useCallback<T extends (...args: never[]) => unknown>(
  fn: T,
  deps: readonly unknown[],
): T;
export function useRef<T>(initial: T): RefObject<T>;
export function useId(): string;

export function useSyncExternalStore<T>(
  subscribe: (listener: () => void) => () => void,
  getSnapshot: () => T,
): T;

export const Fragment: unique symbol;

export namespace JSX {
  interface Element {
    type: unknown;
    props: Record<string, unknown>;
    key: string | null;
    ref: unknown;
  }
  interface IntrinsicElements {
    [elemName: string]: Record<string, unknown>;
  }
}
