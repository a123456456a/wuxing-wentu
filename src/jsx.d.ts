export {};

declare global {
  namespace JSX {
    interface IntrinsicAttributes {
      key?: string | number | null;
      ref?: unknown;
    }
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
}
