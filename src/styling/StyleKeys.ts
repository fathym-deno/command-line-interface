import type { Colors } from "../.deps.ts";

type RGB8Styles = Pick<typeof Colors, "rgb8" | "bgRgb8">;

type RGB24Styles = Pick<typeof Colors, "rgb24" | "bgRgb24">;

export type RGB8StyleKeys = keyof RGB8Styles;

export type RGB24StyleKeys = keyof RGB24Styles;

export type RGBStyleKeys = RGB8StyleKeys | RGB24StyleKeys;

export type RGBStyleOptions =
  | `${RGB24StyleKeys}:${number}:${number}:${number}`
  | `${RGB24StyleKeys | RGB8StyleKeys}:${number}`;

type Styles = Omit<
  typeof Colors,
  | "setColorEnabled"
  | "getColorEnabled"
  | "reset"
  | "stripAnsiCode"
  | "rgb24"
  | "rgb8"
  | "bgRgb24"
  | "bgRgb8"
>;

export type StyleKeys = keyof Styles;

/**
 * The collection of available color effects that can be applied to text.
 */
export type StyleOptions = StyleKeys | RGBStyleOptions;
