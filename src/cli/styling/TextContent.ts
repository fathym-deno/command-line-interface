import type { StyleOptions } from "./StyleKeys.ts";

export type TextContent = {
  Styles?: StyleOptions | StyleOptions[];

  Text: string;
};
